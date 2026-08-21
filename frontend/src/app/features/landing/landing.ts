/**
 * ============================================================================
 * COMPONENTE: LANDING
 * ----------------------------------------------------------------------------
 * Página pública de presentación del proyecto: explica qué es SecureScan
 * Web, qué analiza, cómo funciona y ofrece el acceso a registro/login.
 * Es la ruta raíz para visitantes no autenticados.
 * ============================================================================
 */

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  /** Estado de sesión: adapta las llamadas a la acción del héroe. */
  protected readonly auth = inject(AuthService);

  /**
   * Capacidades presentadas en la sección de características.
   * Cada tarjeta: icono, título y descripción breve.
   */
  protected readonly features = [
    {
      icon: '🔐',
      title: 'HTTPS / TLS y certificados',
      text: 'Verifica el cifrado del transporte y la validez del certificado del objetivo.'
    },
    {
      icon: '🛡️',
      title: 'Security Headers',
      text: 'CSP, HSTS, X-Content-Type-Options, Referrer-Policy, clickjacking y más.'
    },
    {
      icon: '🍪',
      title: 'Cookies seguras',
      text: 'Revisa los atributos Secure, HttpOnly y SameSite de cada cookie.'
    },
    {
      icon: '🌐',
      title: 'Configuración HTTP',
      text: 'Métodos peligrosos, códigos de error y cadenas de redirección excesivas.'
    },
    {
      icon: '🔎',
      title: 'Tecnologías y CVEs',
      text: 'Identifica servidor, frameworks y librerías, y cruza versiones con vulnerabilidades conocidas.'
    },
    {
      icon: '📡',
      title: 'Información expuesta',
      text: 'Busca rutas sensibles publicadas por descuido (.env, .git, paneles, backups).'
    }
  ];

  /**
   * Pasos del flujo de uso mostrados en "Cómo funciona".
   */
  protected readonly steps = [
    {
      num: '1',
      title: 'Regístrate gratis',
      text: 'Crea tu cuenta con correo y contraseña. Tu historial será privado.'
    },
    {
      num: '2',
      title: 'Ingresa la URL',
      text: 'Confirma que tienes autorización sobre el objetivo y lanza el análisis.'
    },
    {
      num: '3',
      title: 'Recibe tu informe',
      text: 'Risk Score por hallazgo, Security Score explicado y PDF descargable.'
    }
  ];

  /**
   * Tecnologías con las que está construida la plataforma.
   */
  protected readonly stack = [
    'Angular 20',
    'Node.js + Express',
    'TypeScript',
    'Prisma + SQLite',
    'PDFKit',
    'JWT + bcrypt'
  ];
}
