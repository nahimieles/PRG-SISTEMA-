/**
 * lib/platforms/connectors/supercias.js
 * 
 * Conector para Superintendencia de Compañías.
 * 
 * Fase 1: Redirección simple al portal.
 * Fase 2: Login automático vía Playwright.
 */

import { BasePlatformConnector } from './base';

export class SuperciasConnector extends BasePlatformConnector {
    // Fase 1: hereda access() del BasePlatformConnector

    // Fase 2: Implementar login específico
    // async authenticate(credentials, context) { ... }
}
