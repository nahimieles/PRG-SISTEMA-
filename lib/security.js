const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const RUC_PATTERN = /^\d{13}$/;
const HTML_TAGS = /<[^>]*>?/gm; 

export function cleanText(value, maxLength = 255) {
    if (value === null || value === undefined) return null;

    return String(value)
        .replace(CONTROL_CHARS, '')
        .replace(HTML_TAGS, '')
        .trim()
        .slice(0, maxLength);
}

export function normalizeRuc(value) {
    const cleaned = cleanText(value, 20);
    if (!cleaned) return null;
    const digits = cleaned.replace(/\D/g, '');
    return RUC_PATTERN.test(digits) ? digits : null;
}

export function getRucNinthDigit(ruc) {
    const normalized = normalizeRuc(ruc);
    return normalized ? normalized[8] : null;
}

export function normalizeHttpUrl(value, maxLength = 2048) {
    const cleaned = cleanText(value, maxLength);
    if (!cleaned) return null;

    try {
        const url = new URL(cleaned);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        return url.toString();
    } catch {
        return null;
    }
}

export function pickAllowedFields(source, allowed) {
    const payload = {};
    for (const field of allowed) {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
            payload[field] = source[field];
        }
    }
    return payload;
}
