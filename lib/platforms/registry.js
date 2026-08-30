
const PLATFORMS = {
    sri: {
        slug: 'sri',
        nombre: 'SRI en Línea',
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
        url: 'https://app.contifico.com/sistema/accounts/login/?next=/sistema/',
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
export function getPlatform(slug) {
    return PLATFORMS[slug] || null;
}
export function getStandardPlatforms() {
    return Object.values(PLATFORMS).filter(p => p.categoria !== 'contable');
}
export function getAccountingPlatforms() {
    return Object.values(PLATFORMS).filter(p => p.categoria === 'contable');
}
export function getAccountingPlatform(slug) {
    const platform = PLATFORMS[slug];
    if (!platform || platform.categoria !== 'contable') return null;
    return platform;
}
export function getAllPlatformSlugs() {
    return Object.keys(PLATFORMS);
}
export function getAllPlatforms() {
    return Object.values(PLATFORMS);
}
export function resolvePlatformsForCompany(permisosUsuario, sistemaContableSlug) {
    const platforms = [];
    const standardPlatforms = getStandardPlatforms();
    for (const platform of standardPlatforms) {
        if (permisosUsuario.includes(platform.slug)) {
            platforms.push(platform);
        }
    }
    if (sistemaContableSlug) {
        const accountingPlatform = getAccountingPlatform(sistemaContableSlug);
        if (accountingPlatform) {
            platforms.push(accountingPlatform);
        }
    }
    return platforms;
}
