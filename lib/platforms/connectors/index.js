
import { getPlatform } from '../registry';
import { BasePlatformConnector } from './base';
import { SRIConnector } from './sri';
import { IESSConnector } from './iess';
import { SuperciasConnector } from './supercias';
import { MinisterioTrabajoConnector } from './ministerioTrabajo';
import { ContificoConnector } from './contifico';
import { PerseoConnector } from './perseo';

const CONNECTOR_MAP = {
    sri: SRIConnector,
    iess: IESSConnector,
    supercias: SuperciasConnector,
    ministerio_trabajo: MinisterioTrabajoConnector,
    contifico: ContificoConnector,
    perseo: PerseoConnector,
};

export function createConnector(slug) {
    const platform = getPlatform(slug);
    if (!platform) {
        throw new Error(`Plataforma no registrada: "${slug}"`);
    }

    const ConnectorClass = CONNECTOR_MAP[slug] || BasePlatformConnector;
    return new ConnectorClass(platform);
}
