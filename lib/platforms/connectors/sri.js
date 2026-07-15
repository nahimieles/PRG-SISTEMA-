/**
 * lib/platforms/connectors/sri.js
 * 
 * Conector para SRI en Línea.
 * 
 * Fase 1: Redirección simple al portal.
 * Fase 2: Login automático con RUC + clave vía Playwright.
 */

import { BasePlatformConnector } from './base';
import { chromium } from 'playwright';

export class SRIConnector extends BasePlatformConnector {
    async authenticate(credentials, context) {
        const loginLogic = async (page, creds) => {
            const loginUrl = this.platform.url;
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            
            const userSelector = 'input[id="usuario"], input[name="usuario"], input[formcontrolname="usuario"]';
            await page.waitForSelector(userSelector, { timeout: 15000 });
            await page.fill(userSelector, creds.username);
            
            const passSelector = 'input[type="password"]';
            await page.fill(passSelector, creds.password);
            
            const submitBtn = 'button[type="submit"], input[type="submit"], button.p-button, #kc-login';
            await page.click(submitBtn).catch(() => console.log('Botón submit SRI no encontrado/clicable en primer intento'));
            
            // Esperar a que el login sea exitoso (ej. redirección interna)
            await page.waitForURL('**/sri-en-linea/contribuyente/perfil**', { timeout: 15000 });
        };

        const fallbackLogic = async (creds) => {
            try {
                const browser = await chromium.launch({ headless: false });
                const page = await browser.newPage();
                
                await page.goto(this.platform.url, { waitUntil: 'domcontentloaded' });
                
                const userSelector = 'input[id="usuario"], input[name="usuario"], input[formcontrolname="usuario"]';
                await page.waitForSelector(userSelector, { timeout: 60000 });
                await page.fill(userSelector, creds.username);
                
                const passSelector = 'input[type="password"]';
                await page.fill(passSelector, creds.password);
                
                const submitBtn = 'button[type="submit"], input[type="submit"], button.p-button, #kc-login';
                await page.click(submitBtn).catch(() => console.log('Botón submit SRI no encontrado/clicable en primer intento'));

                return { success: true, method: 'playwright' };
            } catch (error) {
                console.error('Playwright error (SRI):', error);
                return { success: false, error: 'Fallo al automatizar el inicio de sesión del SRI. ' + error.message };
            }
        };

        return await this.authenticateBackground(
            credentials,
            loginLogic,
            fallbackLogic,
            'https://srienlinea.sri.gob.ec/sri-en-linea/contribuyente/perfil'
        );
    }
}
