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
        try {
            // Se asume ejecución local/desktop app. 
            // Para la nube, headless debe ser true y retornar la sesión/cookies.
            const browser = await chromium.launch({ headless: false });
            const page = await browser.newPage();
            
            // Navegar a la URL oficial del SRI, que redirigirá automáticamente a Keycloak
            const loginUrl = this.platform.url;
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            
            // Esperar a que el campo de usuario esté disponible
            // NOTA: El SRI suele tener input id "usuario" o "ruc"
            const userSelector = 'input[id="usuario"], input[name="usuario"], input[formcontrolname="usuario"]';
            await page.waitForSelector(userSelector, { timeout: 15000 });
            
            // Hacer clic en el campo y simular teclado humano para evitar bloqueos de copy-paste
            await page.click(userSelector);
            await page.keyboard.type(credentials.username, { delay: 50 });
            
            // Ingresar la contraseña de la misma manera
            const passSelector = 'input[type="password"]';
            await page.click(passSelector);
            await page.keyboard.type(credentials.password, { delay: 50 });
            
            // Hacer clic en ingresar
            const submitBtn = 'button[type="submit"], input[type="submit"], button.p-button, #kc-login';
            await page.click(submitBtn).catch(() => console.log('Botón submit SRI no encontrado/clicable en primer intento'));

            // Dejamos el navegador abierto intencionalmente para que el usuario opere
            // Si el SRI pide un Captcha (imagen o Recaptcha), el usuario lo resolverá visualmente.
            return {
                success: true,
                method: 'playwright',
            };
        } catch (error) {
            console.error('Playwright error (SRI):', error);
            return { success: false, error: 'Fallo al automatizar el inicio de sesión del SRI. ' + error.message };
        }
    }
}
