import { ParsedData, Metadata, ColumnMeta } from './types';
import { anonymizeValue } from './utils';

export function anonymizeDataset(parsedData: ParsedData, metadata: Metadata | null): ParsedData {
    if (!parsedData || !parsedData.headers || !parsedData.rows) return parsedData;

    const out: ParsedData = {
        ...parsedData,
        headers: [...parsedData.headers],
        rows: [],
    };

    const piiCols = (metadata && metadata.columns)
        ? metadata.columns.map((c, idx) => ({ idx, isPII: !!c.isPII, name: c.name, dataType: c.dataType }))
        : [];

    for (const row of parsedData.rows) {
        const newRow = [...row];
        for (const pc of piiCols) {
            if (pc.isPII && newRow[pc.idx] != null) {
                newRow[pc.idx] = anonymizeValue(newRow[pc.idx], pc.name, pc.dataType);
            }
        }
        out.rows.push(newRow);
    }
    return out;
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

export interface ExportOptions {
    anonymize?: boolean;
}

export function exportJSON(parsedData: ParsedData, metadata: Metadata | null, options: ExportOptions = {}): string {
    const shouldAnonymize = options.anonymize && metadata;
    const data = shouldAnonymize ? anonymizeDataset(parsedData, metadata) : parsedData;
    const meta = shouldAnonymize ? anonymizeMetadata(metadata) : metadata;

    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        data: data,
        metadata: meta,
        privacyMode: shouldAnonymize ? 'anonymized' : 'none'
    }, null, 2);
}

export function exportDataCSV(parsedData: ParsedData | null): string {
    if (!parsedData || !parsedData.headers) return '';
    const escape = (v: any) => '"' + String(v != null ? v : '').replace(/"/g, '""') + '"';
    const header = parsedData.headers.map(escape).join(',');
    const rows = (parsedData.rows || []).map((r: any[]) => r.map(v => escape(v)).join(','));
    return [header, ...rows].join('\n');
}

export function exportMetadataCSV(metadata: Metadata | null): string {
    if (!metadata || !metadata.columns) return '';
    const header = ['Column', 'Type', 'Null%', 'Unique', 'Quality'];
    const rows = metadata.columns.map(c => [
        c.name,
        c.dataType || 'unknown',
        c.nullPercent != null ? c.nullPercent : 0,
        c.uniqueCount != null ? c.uniqueCount : 0,
        (c as any).qualityScore != null ? (c as any).qualityScore : 0
    ]);
    const esc = (v: any) => '"' + String(v).replace(/"/g, '""') + '"';
    return [header.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
}

export function exportChartPNG(canvasId: string): string | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    return canvas ? canvas.toDataURL('image/png') : null;
}

export function downloadFile(content: string, filename: string, mimeType?: string) {
    if (!content || typeof document === 'undefined') return;

    if (typeof content === 'string' && content.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = content;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    const blob = new Blob([content], { type: mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function exportJSONAndDownload(parsedData: ParsedData, metadata: Metadata | null, options: ExportOptions = {}) {
    downloadFile(exportJSON(parsedData, metadata, options), 'data_export.json', 'application/json');
}

export function exportDataCSVAndDownload(parsedData: ParsedData | null) {
    if (parsedData) {
        downloadFile(exportDataCSV(parsedData), 'data_export.csv', 'text/csv');
    }
}

export function exportMetadataCSVAndDownload(metadata: Metadata | null) {
    if (metadata) {
        downloadFile(exportMetadataCSV(metadata), 'metadata_export.csv', 'text/csv');
    }
}

export function exportChartPNGAndDownload(canvasId: string, filename?: string) {
    const dataURL = exportChartPNG(canvasId);
    if (dataURL) {
        downloadFile(dataURL, filename || 'chart.png', 'image/png');
    }
}
