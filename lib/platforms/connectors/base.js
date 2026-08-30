
import { getCredentials } from '../../credentials/credentialService';
import { chromium } from 'playwright';

export class BasePlatformConnector {
        constructor(platformConfig) {
        this.platform = platformConfig;
    }

        async access(context) {
        if (!this.platform.requiereCredenciales) {
            return {
                success: true,
                url: this.platform.url,
                method: 'redirect',
            };
        }

        const credentials = await getCredentials(context.empresaId, this.platform.slug);

        if (!credentials) {
            return {
                success: false,
                error: 'No se encontraron credenciales para esta plataforma',
                method: 'error'
            };
        }

        return await this.authenticate(credentials, context);
    }

        async authenticate(credentials, context) {
        throw new Error(`authenticate() no implementado para ${this.platform.slug}`);
    }

        async authenticateBackground(credentials, loginLogic, fallbackLogic, finalUrl) {
        let tempBrowser;
        try {

            tempBrowser = await chromium.launch({ headless: true });
            const tempContext = await tempBrowser.newContext();
            const page = await tempContext.newPage();

            await loginLogic(page, credentials);

            const storageState = await tempContext.storageState();
            await tempBrowser.close();
            tempBrowser = null;

            const finalBrowser = await chromium.launch({ headless: false });
            const finalContext = await finalBrowser.newContext({ storageState });
            const finalPage = await finalContext.newPage();

            if (finalUrl) {
                await finalPage.goto(finalUrl);
            }

            return { success: true, method: 'playwright' };
        } catch (error) {

            if (tempBrowser) await tempBrowser.close().catch(()=>{});

            return await fallbackLogic(credentials);
        }
    }
}
