/**
 * lib/platforms/connectors/base.js
 * 
 * BasePlatformConnector — Clase base para todos los conectores de plataforma.
 * 
 * En Fase 1: solo retorna la URL para redirección.
 * En Fase 2: cada conector sobreescribirá authenticate() con lógica de Playwright.
 * 
 * Cada plataforma tiene su propio conector para que pueda evolucionar
 * de forma independiente sin afectar al resto del sistema.
 */

import { getCredentials } from '../../credentials/credentialService';

export class BasePlatformConnector {
    /**
     * @param {import('../registry').PlatformConfig} platformConfig
     */
    constructor(platformConfig) {
        this.platform = platformConfig;
    }

    /**
     * Accede a la plataforma.
     * Si requiere credenciales, recupera la credencial cifrada y ejecuta la automatización.
     * Si no, retorna la URL para redirección simple.
     * 
     * @param {Object} context
     * @param {string} context.empresaId
     * @param {string} context.userId
     */
    async access(context) {
        if (!this.platform.requiereCredenciales) {
            return {
                success: true,
                url: this.platform.url,
                method: 'redirect',
            };
        }

        // Fase 2: Recuperar credenciales descifradas (seguras, solo en servidor)
        const credentials = await getCredentials(context.empresaId, this.platform.slug);
        
        if (!credentials) {
            return {
                success: false,
                error: 'No se encontraron credenciales para esta plataforma',
                method: 'error'
            };
        }

        // Delegar la automatización al conector específico
        return await this.authenticate(credentials, context);
    }

    /**
     * Autenticación automática mediante Playwright.
     * Cada conector debe implementar su propio flujo.
     */
    async authenticate(credentials, context) {
        throw new Error(`authenticate() no implementado para ${this.platform.slug}`);
    }
}
