
import { BasePlatformConnector } from './base';
import { chromium } from 'playwright';
export class PerseoConnector extends BasePlatformConnector {
    async authenticate(credentials, context) {
        const loginLogic = async (page, creds) => {
            const loginUrl = this.platform.url;
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            const rucSelector = 'input[placeholder*="RUC"], input[placeholder*="Cédula"], input[placeholder*="pasaporte"], input[name="ruc"], input[name="identificacion"], input[type="text"]';
            const passSelector = 'input[type="password"]';
            let rucInputExists = false;
            try {
                await page.waitForSelector(rucSelector, { timeout: 3000 });
                rucInputExists = true;
            } catch (e) {
            }
            if (rucInputExists) {
                await page.fill(rucSelector, creds.username);
                const searchBtn = await page.evaluateHandle(() => {
                    return Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.toLowerCase().includes('buscar')) || document.querySelector('button[type="submit"]');
                });
                if (searchBtn) {
                    await searchBtn.click();
                }
            }
            await page.waitForSelector(passSelector, { timeout: 15000 });
            await page.fill(passSelector, creds.password);
            const loginBtn = await page.evaluateHandle(() => {
                return Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => {
                    const text = (b.innerText || b.value || '').toLowerCase();
                    return text.includes('ingresar') || text.includes('iniciar');
                }) || document.querySelector('button[type="submit"]');
            });
            if (loginBtn) {
                await loginBtn.click();
            }
            await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        };
        const fallbackLogic = async (creds) => {
            try {
                const browser = await chromium.launch({ headless: false });
                const page = await browser.newPage();
                await page.goto(this.platform.url, { waitUntil: 'domcontentloaded' });
                const rucSelector = 'input[placeholder*="RUC"], input[placeholder*="Cédula"], input[placeholder*="pasaporte"], input[name="ruc"], input[name="identificacion"], input[type="text"]';
                const passSelector = 'input[type="password"]';
                let rucInputExists = false;
                try {
                    await page.waitForSelector(rucSelector, { timeout: 3000 });
                    rucInputExists = true;
                } catch (e) { }
                if (rucInputExists) {
                    await page.fill(rucSelector, creds.username);
                    const searchBtn = await page.evaluateHandle(() => {
                        return Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.toLowerCase().includes('buscar')) || document.querySelector('button[type="submit"]');
                    });
                    if (searchBtn) {
                        await searchBtn.click();
                    }
                }
                await page.waitForSelector(passSelector, { timeout: 30000 });
                await page.fill(passSelector, creds.password);
                const loginBtn = await page.evaluateHandle(() => {
                    return Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => {
                        const text = (b.innerText || b.value || '').toLowerCase();
                        return text.includes('ingresar') || text.includes('iniciar');
                    }) || document.querySelector('button[type="submit"]');
                });
                if (loginBtn) {
                    await loginBtn.click();
                }
                return { success: true, method: 'playwright' };
            } catch (error) {
                return { success: false, error: 'Fallo al automatizar el inicio de sesión de Perseo. ' + error.message };
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
