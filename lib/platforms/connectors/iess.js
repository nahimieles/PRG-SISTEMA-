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
        try {
            const browser = await chromium.launch({ headless: false });
            const page = await browser.newPage();
            
            // Navegar directamente al portal de Empleadores del IESS
            const loginUrl = 'https://www.iess.gob.ec/empleador-web';
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            
            // Esperar a que el campo de RUC/Cédula esté disponible
            // NOTA: IESS usa IDs variables, pero generalmente incluyen "cedula" o "ruc"
            const userSelector = 'input[id*="cedula"], input[id*="ruc"], input[name*="cedula"], input[name*="ruc"]';
            await page.waitForSelector(userSelector, { timeout: 15000 });
            
            // Escribir usuario instantáneamente
            await page.fill(userSelector, credentials.username);
            
            // Ingresar la contraseña de la misma manera
            const passSelector = 'input[type="password"]';
            await page.fill(passSelector, credentials.password);
            
            // Hacer clic en el botón de entrar
            const submitBtn = 'input[type="submit"], button[type="submit"]';
            await page.click(submitBtn).catch(() => console.log('Botón submit IESS no encontrado en primer intento'));
            
            // Dejamos el navegador abierto.
            // Si hay un teclado virtual o captcha, el usuario puede completarlo manualmente.
            return {
                success: true,
                method: 'playwright',
            };
        } catch (error) {
            console.error('Playwright error (IESS):', error);
            return { success: false, error: 'Fallo al automatizar el inicio de sesión del IESS. ' + error.message };
        }
    }
}
