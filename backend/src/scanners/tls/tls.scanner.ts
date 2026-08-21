/**
 * ============================================================================
 * ANALIZADOR TLS
 * ----------------------------------------------------------------------------
 * Responsable de recolectar la información TLS del objetivo (handshake en el
 * puerto 443, certificado, protocolo negociado). La evaluación de reglas y
 * generación de hallazgos vive en tls.rules.ts (RNF-009: módulos
 * independientes con responsabilidades separadas).
 * ============================================================================
 */

import * as tls from 'tls';
import { env } from '../../config/env';
import { TlsInfo } from './tls.types';

/**
 * Establece una conexión TLS con el host indicado y extrae la información
 * observable del certificado y del protocolo negociado.
 *
 * La validación del certificado se desactiva deliberadamente
 * (`rejectUnauthorized:false`) para poder INSPECCIONAR certificados
 * inválidos y reportarlos como hallazgo; la validez real se evalúa con el
 * flag `authorized`.
 *
 * Nunca lanza: ante cualquier fallo devuelve `available:false` con el motivo.
 *
 * @param host Hostname del objetivo.
 */
export function collectTlsInfo(host: string): Promise<TlsInfo> {
  return new Promise((resolve) => {
    // Bandera para resolver la promesa una única vez.
    let settled = false;
    const finish = (info: TlsInfo) => {
      if (!settled) {
        settled = true;
        resolve(info);
      }
    };

    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: host, // SNI necesario para servidores con múltiples dominios.
        rejectUnauthorized: false,
        timeout: env.scanTimeoutMs
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          const authorized = socket.authorized;
          const authorizationError = socket.authorizationError
            ? String(socket.authorizationError)
            : undefined;

          // Calcula los días restantes hasta la expiración del certificado.
          const validTo = cert?.valid_to;
          const daysRemaining =
            validTo && !isNaN(Date.parse(validTo))
              ? Math.ceil((Date.parse(validTo) - Date.now()) / 86_400_000)
              : undefined;

          finish({
            available: true,
            protocol: socket.getProtocol() ?? undefined,
            cipher: socket.getCipher()?.name,
            authorized,
            authorizationError,
            certificate: {
              subject: first(cert?.subject?.CN),
              issuer: first(cert?.issuer?.O) ?? first(cert?.issuer?.CN),
              validFrom: cert?.valid_from,
              validTo,
              daysRemaining
            }
          });
          socket.end();
        } catch (error) {
          finish({
            available: true,
            error: error instanceof Error ? error.message : 'certificate-read-error'
          });
          socket.end();
        }
      }
    );

    // Fallo de conexión: el servicio HTTPS no está disponible.
    socket.on('error', (error) => {
      finish({ available: false, error: error.message });
    });

    // Timeout: se destruye el socket y se reporta como no disponible.
    socket.on('timeout', () => {
      socket.destroy();
      finish({ available: false, error: 'connection-timeout' });
    });
  });
}

/**
 * Normaliza valores del certificado que Node puede devolver como string o
 * array de strings.
 *
 * @param value Valor crudo del campo del certificado.
 */
function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
