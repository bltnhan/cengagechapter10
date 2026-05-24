export interface PrivacyPattern {
    name: string;
    pattern: RegExp;
    replacement: string;
}

export const PRIVACY_PATTERNS: PrivacyPattern[] = [
    // Email addresses
    {
        name: 'Email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
        replacement: '[EMAIL]'
    },
    // Vietnamese phone numbers (mobile)
    {
        name: 'Vietnamese Phone',
        pattern: /(?:(?:^|\s)(?:\+84|84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7})(?:\s|$)/gi,
        replacement: '[PHONE]'
    },
    // International phone numbers (generic)
    {
        name: 'International Phone',
        pattern: /\+?[1-9]\d{1,14}\b/g,
        replacement: '[PHONE]'
    },
    // Credit card numbers (Visa, MC, Amex, etc.)
    {
        name: 'Credit Card',
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b/g,
        replacement: '[CREDIT_CARD]'
    },
    // US Social Security Numbers
    {
        name: 'SSN',
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN]'
    },
    // Vietnamese Citizen ID (CMND/CCCD)
    {
        name: 'Vietnamese ID',
        pattern: /\b\d{9,12}\b/g,
        replacement: '[ID]'
    },
    // IP Addresses
    {
        name: 'IP Address',
        pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        replacement: '[IP]'
    },
    // URLs with potential credentials
    {
        name: 'URL with Password',
        pattern: /\b(?:https?:\/\/)?(?:[\w-]+\.)?[\w-]+\.[\w-]+(?::\d+)?\/[^\s]*?(?:password|pwd|pass|secret|key|token)=[^\s&]+/gi,
        replacement: '[URL_WITH_CREDENTIALS]'
    },
    // AWS Access Keys
    {
        name: 'AWS Access Key',
        pattern: /\b(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
        replacement: '[AWS_KEY]'
    },
    // Generic API Keys (32+ hex chars)
    {
        name: 'API Key',
        pattern: /\b[a-f0-9]{32,64}\b/gi,
        replacement: '[API_KEY]'
    }
];

export interface PrivacyShieldResult {
    masked: string;
    redactions: { type: string; count: number }[];
}

export function applyPrivacyShield(text: string): PrivacyShieldResult {
    if (!text) {
        return { masked: text, redactions: [] };
    }

    let masked = text;
    const redactions: { type: string; count: number }[] = [];

    for (const { name, pattern, replacement } of PRIVACY_PATTERNS) {
        // Reset lastIndex before each use
        pattern.lastIndex = 0;
        const matches = masked.match(pattern);
        if (matches && matches.length > 0) {
            redactions.push({ type: name, count: matches.length });
            masked = masked.replace(pattern, replacement);
        }
    }

    return { masked, redactions };
}

// Models that support vision/image input
export const VISION_SUPPORTED_MODELS = [
    'gemma-3',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-1.0-pro-vision',
    'gemini-pro-vision'
];

export function isVisionSupportedModel(model: string): boolean {
    return VISION_SUPPORTED_MODELS.some(m =>
        model.toLowerCase().includes(m.toLowerCase())
    );
}

export function getVisionModelRecommendation(): string {
    return 'gemini-3-flash-preview';
}