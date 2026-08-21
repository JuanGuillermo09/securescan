/**
 * ============================================================================
 * SERVICIO DE ACCESO A LA API
 * ----------------------------------------------------------------------------
 * Único punto de comunicación con el backend (RNF-012). Encapsula las
 * llamadas HTTP de auditorías y la construcción de la URL del informe PDF.
 * Inyectable en toda la aplicación sin autenticación (RNF-002).
 * ============================================================================
 */

import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditDetail, AuditSummary } from '../../shared/models/audit.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  /** URL base de la API tomada del entorno activo. */
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Crea una nueva auditoría sobre el objetivo indicado.
   * El backend lanza el análisis en segundo plano y responde con el resumen.
   *
   * @param url        URL objetivo validada en el cliente.
   * @param authorized Confirmación de autorización (siempre `true` aquí;
   *                   el botón del formulario ya la exige al usuario).
   */
  createAudit(url: string, authorized: boolean): Observable<AuditSummary> {
    return this.http.post<AuditSummary>(`${this.baseUrl}/audits`, { url, authorized });
  }

  /**
   * Obtiene el detalle completo de una auditoría (hallazgos, tecnologías,
   * resultados crudos). Se consulta en bucle mientras esté en ejecución.
   *
   * @param id Identificador de la auditoría.
   */
  getAudit(id: string): Observable<AuditDetail> {
    return this.http.get<AuditDetail>(`${this.baseUrl}/audits/${id}`);
  }

  /**
   * Lista el historial de auditorías más recientes primero (RF-028, RF-029).
   */
  getAudits(): Observable<AuditSummary[]> {
    return this.http.get<AuditSummary[]>(`${this.baseUrl}/audits`);
  }

  /**
   * Elimina una auditoría propia del historial (RF-029).
   * El backend rechaza con 409 si se trata del ejemplo.
   *
   * @param id Identificador de la auditoría.
   */
  deleteAudit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/audits/${id}`);
  }

  /**
   * Elimina todas las auditorías del usuario excepto los ejemplos (RF-029).
   * El backend responde con cuántas fueron borradas.
   */
  deleteAllAudits(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.baseUrl}/audits`);
  }

  /**
   * Descarga el informe PDF de una auditoría como blob autenticado (RF-030).
   * Se usa en lugar de un enlace directo porque la petición necesita la
   * cabecera Authorization que solo añade el interceptor HTTP.
   *
   * @param id Identificador de la auditoría.
   */
  downloadReport(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/reports/${id}/report.pdf`, {
      responseType: 'blob',
      observe: 'response'
    });
  }
}
