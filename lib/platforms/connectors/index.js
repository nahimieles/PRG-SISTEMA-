/**
 * lib/platforms/connectors/index.js
 * 
 * ConnectorFactory — Mapea slugs de plataforma a sus conectores.
 * 
 * Para agregar una nueva plataforma:
 *   1. Crear su conector en este directorio
 *   2. Importarlo aquí
 *   3. Agregarlo al CONNECTOR_MAP
 */

import { getPlatform } from '../registry';
import { BasePlatformConnector } from './base';
import { SRIConnector } from './sri';
import { IESSConnector } from './iess';
import { SuperciasConnector } from './supercias';
import { MinisterioTrabajoConnector } from './ministerioTrabajo';
import { ContificoConnector } from './contifico';
import { PerseoConnector } from './perseo';

/**
 * Mapeo de slug → clase de conector.
 * Si un slug no tiene conector específico, se usa BasePlatformConnector.
 */
const CONNECTOR_MAP = {
    sri: SRIConnector,
    iess: IESSConnector,
    supercias: SuperciasConnector,
    ministerio_trabajo: MinisterioTrabajoConnector,
    contifico: ContificoConnector,
    perseo: PerseoConnector,
};

/**
 * Crea una instancia del conector apropiado para una plataforma.
 * @param {string} slug - Slug de la plataforma
 * @returns {BasePlatformConnector} Instancia del conector
 * @throws {Error} Si el slug no existe en el PlatformRegistry
 */
export function createConnector(slug) {
    const platform = getPlatform(slug);
    if (!platform) {
        throw new Error(`Plataforma no registrada: "${slug}"`);
    }

    const ConnectorClass = CONNECTOR_MAP[slug] || BasePlatformConnector;
    return new ConnectorClass(platform);
}
