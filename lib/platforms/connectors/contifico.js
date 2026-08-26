/**
 * lib/platforms/connectors/contifico.js
 * 
 * Conector para Contífico (Sistema Contable).
 * 
 * Fase 1: Redirección simple al portal.
 * Fase 2: Login automático vía Playwright.
 */

import { BasePlatformConnector } from './base';
import { chromium } from 'playwright';

export class ContificoConnector extends BasePlatformConnector {
    async authenticate(credentials, context) {
        const loginLogic = async (page, creds) => {
            const loginUrl = this.platform.url;
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            
            const userSelector = 'input[type="text"], input[type="email"], input[name*="login"], input[name*="email"], input[name="username"]';
            await page.waitForSelector(userSelector, { timeout: 15000 });
            await page.fill(userSelector, creds.username);
            
            const passSelector = 'input[type="password"]';
            await page.fill(passSelector, creds.password);
            
            const submitBtn = 'button[type="submit"], input[type="submit"]';
            await page.click(submitBtn).catch(() => console.log('Botón submit Contífico no encontrado en primer intento'));
            
            await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        };

        const fallbackLogic = async (creds) => {
            try {
                const browser = await chromium.launch({ headless: false });
                const page = await browser.newPage();
                
                await page.goto(this.platform.url, { waitUntil: 'domcontentloaded' });
                
                const userSelector = 'input[type="text"], input[type="email"], input[name*="login"], input[name*="email"], input[name="username"]';
                await page.waitForSelector(userSelector, { timeout: 60000 });
                await page.fill(userSelector, creds.username);
                
                const passSelector = 'input[type="password"]';
                await page.fill(passSelector, creds.password);
                
                const submitBtn = 'button[type="submit"], input[type="submit"]';
                await page.click(submitBtn).catch(() => console.log('Botón submit Contífico no encontrado en modo visible'));

                return { success: true, method: 'playwright' };
            } catch (error) {
                console.error('Playwright error (Contifico):', error);
                return { success: false, error: 'Fallo al automatizar el inicio de sesión de Contífico. ' + error.message };
            }
        };

        return await this.authenticateBackground(
            credentials,
            loginLogic,
            fallbackLogic,
            null
        );
    }
}
