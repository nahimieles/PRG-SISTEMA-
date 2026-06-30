/**
 * lib/platforms/connectors/ministerioTrabajo.js
 * 
 * Conector para Ministerio del Trabajo (SUT).
 * 
 * Fase 1: Redirección simple al portal.
 * Fase 2: Login automático vía Playwright.
 */

import { BasePlatformConnector } from './base';

export class MinisterioTrabajoConnector extends BasePlatformConnector {
    // Fase 1: hereda access() del BasePlatformConnector

    // Fase 2: Implementar login específico
    // async authenticate(credentials, context) { ... }
}
