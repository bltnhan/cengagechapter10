export interface ColumnMeta {
    name: string;
    type: string; // 'numeric', 'string', 'date', 'boolean', 'empty'
    dataType: string; // inferred deeper type
    uniqueCount: number;
    nullCount: number;
    nullPercent: number;
    sampleValues: any[];
    qualityScore: number;
    issues: string[];
    isPII: boolean;
    min?: number;
    max?: number;
    avg?: number;
    median?: number;
    stdev?: number;
    sum?: number;
    cv?: number; // coefficient of variation
    stats?: any;
    dateFormats?: string[];
    textStats?: any;
    skewness?: number;
    drift?: number;
}

export interface Metadata {
    fileName: string;
    fileSize: number;
    totalRows: number;
    totalCols: number;
    sheetName?: string;
    columns: ColumnMeta[];
    readiness?: {
        isReady: boolean;
        score: number;
        reasons: string[];
        radar: { category: string; score: number }[];
    };
    qualityScore: number;
    insights?: any[];
    relationships?: any[];
    correlationMatrix?: {
        columns: string[];
        matrix: { name: string; correlations: number[] }[];
    } | null;
}

export interface ParsedData {
    fileName: string;
    fileSize: number;
    headers: string[];
    rows: any[][];
    totalRows: number;
    totalCols: number;
    activeSheet?: string;
    sheetNames?: string[];
    rawWorkbook?: any; // Reference to parsed workbook if needed
    sheets?: Record<string, any>; // Used by formula graph engine for cross-sheet
}

export interface AppSettings {
    apiKey: string;
    model: string;
    privacyShield: boolean;
}

export interface ChartData {
    labels: string[];
    datasets: any[];
}

export interface InsightItem {
    id: string;
    title: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    description: string;
    action?: string;
}

export interface PromptTemplate {
    id: string;
    category: string;
    icon: string;
    name: string;
    description: string;
    tags?: string[];
    prompt: string;
}

export interface PromptHistoryItem {
    id: string;
    prompt: string;
    response: string;
    timestamp: number;
}

export interface PromptOptions {
    privacyShield?: boolean;
    template?: string; // Additional string prompt
    maxRows?: number;
    mode?: string;
    userContext?: string;
    action?: any;
}

// Re-export TMDL types for convenience
export type { TmdlModel, TmdlTable, TmdlColumn, TmdlMeasure, TmdlRelationship, TmdlPartition } from './tmdlParser';
