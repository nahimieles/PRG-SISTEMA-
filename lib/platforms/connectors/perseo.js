/**
 * lib/platforms/connectors/perseo.js
 * 
 * Conector para Perseo (Sistema Contable).
 * 
 * Fase 1: Redirección simple al portal.
 * Fase 2: Login automático vía Playwright.
 */

import { BasePlatformConnector } from './base';

export class PerseoConnector extends BasePlatformConnector {
    // Fase 1: hereda access() del BasePlatformConnector

    // Fase 2: Implementar login específico
    // async authenticate(credentials, context) { ... }
}
