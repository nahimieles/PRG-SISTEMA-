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
import { chromium } from 'playwright';

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

    /**
     * Helper para autenticación en segundo plano (Fase 2).
     * Intenta hacer login con headless: true. Si tiene éxito, abre headless: false
     * inyectando la sesión. Si falla (ej. captcha), invoca el fallback visible.
     */
    async authenticateBackground(credentials, loginLogic, fallbackLogic, finalUrl) {
        let tempBrowser;
        try {
            // Paso 1: Intentar login en background (headless)
            tempBrowser = await chromium.launch({ headless: true });
            const tempContext = await tempBrowser.newContext();
            const page = await tempContext.newPage();
            
            await loginLogic(page, credentials);

            // Guardar estado
            const storageState = await tempContext.storageState();
            await tempBrowser.close();
            tempBrowser = null;

            // Paso 2: Abrir navegador visible (headless: false) con la sesión inyectada
            const finalBrowser = await chromium.launch({ headless: false });
            const finalContext = await finalBrowser.newContext({ storageState });
            const finalPage = await finalContext.newPage();
            
            // Navegar directamente a la URL final
            if (finalUrl) {
                await finalPage.goto(finalUrl);
            }

            return { success: true, method: 'playwright' };
        } catch (error) {
            console.warn(`Login silencioso falló para ${this.platform.slug}, intentando modo visible (fallback):`, error.message);
            if (tempBrowser) await tempBrowser.close().catch(()=>{});
            
            // FALLBACK a modo visible
            return await fallbackLogic(credentials);
        }
    }
}
