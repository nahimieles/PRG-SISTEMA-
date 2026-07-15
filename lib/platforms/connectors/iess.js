/**
 * lib/platforms/connectors/iess.js
 * 
 * Conector para IESS.
 * 
 * Fase 1: Redirección simple al portal.
 * Fase 2: Login automático con cédula/RUC + clave vía Playwright.
 */

import { BasePlatformConnector } from './base';
import { chromium } from 'playwright';

export class IESSConnector extends BasePlatformConnector {
    async authenticate(credentials, context) {
        const loginLogic = async (page, creds) => {
            const loginUrl = 'https://www.iess.gob.ec/empleador-web';
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            
            const userSelector = 'input[id*="cedula"], input[id*="ruc"], input[name*="cedula"], input[name*="ruc"]';
            await page.waitForSelector(userSelector, { timeout: 15000 });
            await page.fill(userSelector, creds.username);
            
            const passSelector = 'input[type="password"]';
            await page.fill(passSelector, creds.password);
            
            const submitBtn = 'input[type="submit"], button[type="submit"]';
            await page.click(submitBtn).catch(() => console.log('Botón submit IESS no encontrado en primer intento'));
            
            // Check for success via navigation
            await page.waitForURL('**/empleador-web/**', { timeout: 15000 });
        };

        const fallbackLogic = async (creds) => {
            try {
                const browser = await chromium.launch({ headless: false });
                const page = await browser.newPage();
                
                const loginUrl = 'https://www.iess.gob.ec/empleador-web';
                await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
                
                const userSelector = 'input[id*="cedula"], input[id*="ruc"], input[name*="cedula"], input[name*="ruc"]';
                await page.waitForSelector(userSelector, { timeout: 60000 });
                await page.fill(userSelector, creds.username);
                
                const passSelector = 'input[type="password"]';
                await page.fill(passSelector, creds.password);
                
                const submitBtn = 'input[type="submit"], button[type="submit"]';
                await page.click(submitBtn).catch(() => console.log('Botón submit IESS no encontrado en primer intento'));
                
                return { success: true, method: 'playwright' };
            } catch (error) {
                console.error('Playwright error (IESS):', error);
                return { success: false, error: 'Fallo al automatizar el inicio de sesión del IESS. ' + error.message };
            }
        };

        return await this.authenticateBackground(
            credentials,
            loginLogic,
            fallbackLogic,
            'https://www.iess.gob.ec/empleador-web'
        );
    }
}
