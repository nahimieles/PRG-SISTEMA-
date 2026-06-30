/**
 * lib/platforms/registry.js
 * 
 * PlatformRegistry — Fuente de verdad estática para plataformas externas.
 * 
 * Las URLs, iconos y nombres de plataformas son configuración de la aplicación,
 * NO datos del negocio. Por eso viven en código y no en la base de datos.
 * 
 * Para agregar una nueva plataforma:
 *   1. Agregar entrada aquí
 *   2. Crear conector en lib/platforms/connectors/
 *   3. Registrarlo en lib/platforms/connectors/index.js
 */

/**
 * @typedef {Object} PlatformConfig
 * @property {string} slug - Identificador único
 * @property {string} nombre - Nombre para mostrar en el UI
 * @property {string} url - URL del portal externo
 * @property {string} icono - Nombre del componente Lucide React
 * @property {string} color - Color hex para el UI
 * @property {string} categoria - 'gobierno' | 'contable' | 'laboral'
 * @property {boolean} requiereCredenciales - Si necesita login automático (fase 2)
 */

const PLATFORMS = {
    sri: {
        slug: 'sri',
        nombre: 'SRI en Línea',
        // Al intentar acceder al perfil, el SRI Angular App nos redirigirá automáticamente a Keycloak con tokens frescos
        url: 'https://srienlinea.sri.gob.ec/sri-en-linea/contribuyente/perfil',
        icono: 'FileText',
        color: '#dc2626',
        categoria: 'gobierno',
        requiereCredenciales: true,
    },
    iess: {
        slug: 'iess',
        nombre: 'IESS',
        url: 'https://www.iess.gob.ec',
        icono: 'Shield',
        color: '#2563eb',
        categoria: 'gobierno',
        requiereCredenciales: true,
    },
    supercias: {
        slug: 'supercias',
        nombre: 'Supercias',
        url: 'https://www.supercias.gob.ec/portalscvs/',
        icono: 'Landmark',
        color: '#7c3aed',
        categoria: 'gobierno',
        requiereCredenciales: true,
    },
    ministerio_trabajo: {
        slug: 'ministerio_trabajo',
        nombre: 'Ministerio del Trabajo',
        url: 'https://sut.trabajo.gob.ec',
        icono: 'Briefcase',
        color: '#059669',
        categoria: 'laboral',
        requiereCredenciales: true,
    },
    contifico: {
        slug: 'contifico',
        nombre: 'Contífico',
        url: 'https://app.contifico.com',
        icono: 'Calculator',
        color: '#0891b2',
        categoria: 'contable',
        requiereCredenciales: true,
    },
    perseo: {
        slug: 'perseo',
        nombre: 'Perseo',
        url: 'https://perseo.ec',
        icono: 'Calculator',
        color: '#4f46e5',
        categoria: 'contable',
        requiereCredenciales: true,
    },
};

// ============================================================
// API PÚBLICA
// ============================================================

/**
 * Obtiene la configuración de una plataforma por su slug.
 * @param {string} slug
 * @returns {PlatformConfig|null}
 */
export function getPlatform(slug) {
    return PLATFORMS[slug] || null;
}

/**
 * Obtiene todas las plataformas estándar (no contables).
 * Estas son comunes a todas las empresas.
 * @returns {PlatformConfig[]}
 */
export function getStandardPlatforms() {
    return Object.values(PLATFORMS).filter(p => p.categoria !== 'contable');
}

/**
 * Obtiene todas las plataformas contables.
 * @returns {PlatformConfig[]}
 */
export function getAccountingPlatforms() {
    return Object.values(PLATFORMS).filter(p => p.categoria === 'contable');
}

/**
 * Obtiene una plataforma contable específica por slug.
 * @param {string} slug - 'contifico', 'perseo', etc.
 * @returns {PlatformConfig|null}
 */
export function getAccountingPlatform(slug) {
    const platform = PLATFORMS[slug];
    if (!platform || platform.categoria !== 'contable') return null;
    return platform;
}

/**
 * Obtiene todos los slugs válidos.
 * Útil para validación de inputs.
 * @returns {string[]}
 */
export function getAllPlatformSlugs() {
    return Object.keys(PLATFORMS);
}

/**
 * Obtiene todas las plataformas.
 * @returns {PlatformConfig[]}
 */
export function getAllPlatforms() {
    return Object.values(PLATFORMS);
}


/**
 * Obtiene las plataformas disponibles para un usuario en una empresa específica.
 * Combina PlatformRegistry (datos estáticos) con permisos (datos DB)
 * y el sistema contable de la empresa.
 * 
 * @param {string[]} permisosUsuario - Slugs de plataformas permitidas para este usuario+empresa
 * @param {string|null} sistemaContableSlug - Slug del sistema contable de la empresa
 * @returns {Object[]} Array de plataformas con datos para el UI
 */
export function resolvePlatformsForCompany(permisosUsuario, sistemaContableSlug) {
    const platforms = [];

    // 1. Plataformas estándar (gobierno, laboral) filtradas por permisos
    const standardPlatforms = getStandardPlatforms();
    for (const platform of standardPlatforms) {
        if (permisosUsuario.includes(platform.slug)) {
            platforms.push(platform);
        }
    }

    // 2. Sistema contable de la empresa (si tiene y el usuario tiene permiso)
    if (sistemaContableSlug) {
        const accountingPlatform = getAccountingPlatform(sistemaContableSlug);
        if (accountingPlatform && permisosUsuario.includes(accountingPlatform.slug)) {
            platforms.push(accountingPlatform);
        }
    }

    return platforms;
}
