import { ParsedData, Metadata, ColumnMeta } from './types';

// ── Number Formatting ──
export function formatNumber(n: number | null | undefined, decimals = 0): string {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(n);
}

export function formatPercent(n: number | null | undefined, decimals = 1): string {
    if (n == null || isNaN(n)) return '—';
    return n.toFixed(decimals) + '%';
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

// ── String Helpers ──
export function renderCellValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) {
        return val.toLocaleDateString('vi-VN', { timeZone: 'UTC' }); // Use UTC to prevent timezone shifts from SheetJS parsing
    }
    return String(val);
}

export function truncate(str: string | null | undefined, len = 30): string {
    if (!str) return '';
    const s = String(str);
    return s.length > len ? s.slice(0, len) + '…' : s;
}

export function capitalize(str: string | null | undefined): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── PII Detection (Enhanced for Vietnam) ──
const PII_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/,
    idNumber: /^\d{9,12}$/,
    creditCard: /^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/,
    cmnd: /^\d{9}$/,
    cccd: /^\d{12}$/,
    cmtnd: /^\d{9}$|^\d{12}$/,
    mst: /^\d{10}$|^\d{13}$/,
    bhxh: /^\d{10}$|^\d{13}$/,
    bankAccount: /^\d{8,20}$/,
    sdt: /^0\d{9,10}$/,
    sdtCoDinh: /^0\d{2,3}\d{7,8}$/
};

const PII_COLUMN_NAMES = [
    'email', 'mail', 'thư điện tử',
    'sdt', 'dienthoai', 'phone', 'tel', 'mobile', 'di động', 'điện thoại',
    'sodienthoai', 'so_dt', 'so_dienthoai',
    'cmnd', 'cccd', 'cmtnd', 'id_card', 'passport', 'căn cước', 'chứng minh',
    'so_cmnd', 'so_cccd', 'so_cmtnd',
    'ten', 'name', 'ho_ten', 'hoten', 'fullname', 'nguoi', 'người',
    'firstname', 'lastname', 'familyname',
    'ten_kh', 'tenkh', 'ten_congty', 'ten_cty',
    'diachi', 'dia_chi', 'address', 'địa chỉ', 'address_line',
    'so_nha', 'sonha', 'thon', 'phuong', 'xa', 'quan', 'huyen', 'tinh',
    'ngaysinh', 'ngay_sinh', 'dob', 'birthday', 'ngày sinh', 'birthdate',
    'mst', 'tax', 'taxcode', 'mã số thuế', 'masothue', 'mst_thue',
    'bhxh', 'baohiem', 'sobhxh', 'social_insurance',
    'taikhoan', 'tk_nganhang', 'bank_account', 'sotaikhoan', 'stk',
    'nganhang', 'bank_name', 'chinhanh',
    'password', 'passwd', 'pwd', 'matkhau', 'mk', 'secret', 'token', 'api_key', 'apikey'
];

export function detectPII(columnName: string, sampleValues: any[]): boolean {
    const nameLower = columnName.toLowerCase().replace(/[\s_.-]/g, '');

    for (const pii of PII_COLUMN_NAMES) {
        if (nameLower.includes(pii)) return true;
    }

    if (sampleValues && sampleValues.length > 0) {
        const strValues = sampleValues.filter(v => typeof v === 'string');
        for (const val of strValues.slice(0, 10)) {
            for (const [, regex] of Object.entries(PII_PATTERNS)) {
                if (regex.test(val.trim())) return true;
            }
        }
    }

    return false;
}

// ── Anonymization ──
let anonCounters: Record<string, number> = {};

export function resetAnonymization() {
    anonCounters = {};
}

export function anonymizeValue(value: any, columnName: string, dataType: string): any {
    if (value == null || value === '') return value;

    const key = columnName || 'default';
    if (!anonCounters[key]) anonCounters[key] = 0;
    anonCounters[key]++;
    const idx = anonCounters[key];

    const strValue = String(value);

    switch (dataType) {
        case 'text':
            if (PII_PATTERNS.email.test(strValue)) return `user_${String(idx).padStart(2, '0')}@domain.com`;
            if (PII_PATTERNS.phone.test(strValue)) return `09xx-xxx-${String(idx).padStart(3, '0')}`;
            if (PII_PATTERNS.cmnd.test(strValue) || PII_PATTERNS.cccd.test(strValue)) return `[ID-${String(idx).padStart(4, '0')}]`;
            if (PII_PATTERNS.mst.test(strValue)) return `[TAX-${String(idx).padStart(4, '0')}]`;
            if (PII_PATTERNS.bhxh.test(strValue)) return `[BH-${String(idx).padStart(4, '0')}]`;
            if (PII_PATTERNS.bankAccount.test(strValue)) return `[ACC-${String(idx).padStart(4, '0')}]`;
            return `${capitalize(key)}_${String(idx).padStart(3, '0')}`;
        case 'number':
        case 'currency':
            return value;
        case 'date':
            return value;
        default:
            return `Value_${String(idx).padStart(3, '0')}`;
    }
}

export function anonymizeDataset(parsedData: ParsedData | null, metadata: Metadata | null): ParsedData | null {
    if (!parsedData || !parsedData.rows) return parsedData;

    const result: ParsedData = {
        fileName: parsedData.fileName,
        fileSize: parsedData.fileSize,
        headers: [...parsedData.headers],
        rows: [],
        totalRows: parsedData.totalRows,
        totalCols: parsedData.totalCols,
        activeSheet: parsedData.activeSheet,
        sheetNames: parsedData.sheetNames
    };

    const piiColumnIndices: number[] = [];
    if (metadata && metadata.columns) {
        metadata.columns.forEach((col, idx) => {
            if (col.isPII) {
                piiColumnIndices.push(idx);
            }
        });
    }

    for (const row of parsedData.rows) {
        const newRow = [...row];
        for (const idx of piiColumnIndices) {
            const colName = parsedData.headers[idx];
            const colMeta = metadata?.columns?.[idx];
            newRow[idx] = anonymizeValue(newRow[idx], colName, colMeta?.dataType || 'text');
        }
        result.rows.push(newRow);
    }

    return result;
}

export function anonymizeMetadata(metadata: Metadata | null): Metadata | null {
    if (!metadata || !metadata.columns) return metadata;

    return {
        ...metadata,
        columns: metadata.columns.map((col, idx) => ({
            ...col,
            name: col.isPII ? `Column_${idx + 1}` : col.name,
            sampleValues: col.isPII ? ['[REDACTED]'] : col.sampleValues
        }))
    };
}

// ── Date Detection ──
const DATE_FORMATS = [
    { regex: /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, format: 'YYYY-MM-DD' },
    { regex: /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/, format: 'DD/MM/YYYY' },
    { regex: /^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/, format: 'DD/MM/YY' },
    { regex: /^\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}/, format: 'YYYY-MM-DD HH:mm' },
    { regex: /^\d{1,2}[-/]\d{1,2}[-/]\d{4}\s+\d{1,2}:\d{2}/, format: 'DD/MM/YYYY HH:mm' },
];

export function detectDateFormat(value: any): string | null {
    const str = String(value).trim();
    for (const { regex, format } of DATE_FORMATS) {
        if (regex.test(str)) return format;
    }
    const num = Number(str);
    if (!isNaN(num) && num > 1 && num < 100000 && Number.isInteger(num)) {
        return 'EXCEL_SERIAL';
    }
    return null;
}

export function isDateValue(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') return detectDateFormat(value) !== null;
    if (typeof value === 'number') {
        return value > 30000 && value < 60000;
    }
    return false;
}

// ── Currency Detection ──
export function isCurrencyValue(value: any): boolean {
    if (typeof value === 'string') {
        return /^[\s]*[$€£¥₫₩]?\s*[\d,.]+\s*(VND|VNĐ|đ|₫|USD|\$)?[\s]*$/i.test(value);
    }
    return false;
}

// ── Data Privacy ──
export function obfuscateString(value: any): string {
    if (value == null) return '';
    const str = String(value);
    const len = str.length;
    if (len <= 2) return '*'.repeat(len);
    if (len <= 5) return str.charAt(0) + '***' + str.charAt(len - 1);
    return str.substring(0, 2) + '***' + str.substring(len - 2);
}

// ── Statistics ──
export function computeStats(values: any[]) {
    const nums = values.filter(v => v != null && !isNaN(Number(v))).map(Number);
    if (nums.length === 0) return null;

    nums.sort((a, b) => a - b);
    const n = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const median = n % 2 === 0
        ? (nums[n / 2 - 1] + nums[n / 2]) / 2
        : nums[Math.floor(n / 2)];

    const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);

    return {
        count: n,
        min: nums[0],
        max: nums[n - 1],
        sum,
        mean,
        median,
        stddev,
        q1: nums[Math.floor(n * 0.25)],
        q3: nums[Math.floor(n * 0.75)]
    };
}

// ── Clipboard ──
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-999px;top:-999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
    }
}

// ── Debounce ──
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
    let timer: any;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ── ID Generator ──
export function generateId(): string {
    return 'dl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── API Key Encryption ──
const _encryptionCache = new Map<string, string>();

function _getEncryptionKey(): string {
    if (typeof window === 'undefined') return 'server_key';
    const factors = [
        window.location?.origin || 'local',
        window.navigator?.userAgent || '',
        window.screen?.colorDepth || 0,
        window.screen?.width || 0,
        window.screen?.height || 0,
        window.navigator?.language || ''
    ].join('|');

    let hash = 0;
    for (let i = 0; i < factors.length; i++) {
        const char = factors.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'dl_enc_key_' + Math.abs(hash).toString(16);
}

async function _deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const salt = encoder.encode(_getEncryptionKey());
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptForStorage(plaintext: string): Promise<string> {
    if (!plaintext) return plaintext;
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
        return _fallbackEncrypt(plaintext);
    }

    try {
        const key = await _deriveKey(_getEncryptionKey());
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(plaintext)
        );

        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return 'ENC:V1:' + btoa(String.fromCharCode.apply(null, combined as any));
    } catch (e) {
        return _fallbackEncrypt(plaintext);
    }
}

export async function decryptFromStorage(ciphertext: string): Promise<string> {
    if (!ciphertext) return ciphertext;
    if (!ciphertext.startsWith('ENC:V1:')) return ciphertext;

    if (typeof window === 'undefined' || !window.crypto?.subtle) {
        return _fallbackDecrypt(ciphertext.replace('ENC:V1:', ''));
    }

    try {
        const data = ciphertext.replace('ENC:V1:', '');
        const combined = new Uint8Array(
            atob(data).split('').map(c => c.charCodeAt(0))
        );

        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        const key = await _deriveKey(_getEncryptionKey());

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return '';
    }
}

function _fallbackEncrypt(plaintext: string): string {
    const key = 'DataLens2024Secure';
    let result = '';
    for (let i = 0; i < plaintext.length; i++) {
        result += String.fromCharCode(
            plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return 'ENC:FALLBACK:' + btoa(result);
}

function _fallbackDecrypt(ciphertext: string): string {
    try {
        if (ciphertext.startsWith('ENC:FALLBACK:')) {
            ciphertext = ciphertext.replace('ENC:FALLBACK:', '');
        }
        const key = 'DataLens2024Secure';
        const data = atob(ciphertext);
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(
                data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return result;
    } catch {
        return '';
    }
}

export function setCachedApiKey(key: string) {
    _encryptionCache.set('apiKey', key);
}

export function getCachedApiKey() {
    return _encryptionCache.get('apiKey') || '';
}

export function clearCachedApiKey() {
    _encryptionCache.delete('apiKey');
}
