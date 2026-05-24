import { ParsedData, Metadata, ColumnMeta, InsightItem } from './types';
import {
    computeStats,
    detectPII,
    formatPercent,
    detectDateFormat,
    isCurrencyValue,
    isDateValue,
    formatNumber
} from './utils';
import { useAppStore } from '../hooks/store';

export interface AnalyzerProgress {
    type: 'start' | 'column' | 'complete';
    name?: string;
    index?: number;
    progress?: number;
    totalRows?: number;
    totalCols?: number;
    result?: Metadata;
}

export type ProgressCallback = (data: AnalyzerProgress) => void;

function createEmptyResult(): Metadata {
    return {
        fileName: '',
        fileSize: 0,
        totalRows: 0,
        totalCols: 0,
        columns: [],
        readiness: {
            isReady: false,
            score: 0,
            reasons: [],
            radar: []
        },
        qualityScore: 0
    };
}

export function analyzeData(parsedData: ParsedData, onProgress?: ProgressCallback): any {
    const { headers, rows, totalRows, totalCols, fileName, fileSize, activeSheet } = parsedData as any;
    if (!headers || headers.length === 0 || totalRows === 0) {
        return createEmptyResult();
    }

    if (onProgress) {
        onProgress({ type: 'start', totalRows, totalCols });
    }

    const lang = useAppStore.getState().language || 'vi';

    const columns: ColumnMeta[] = [];
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const name = headers[colIdx];
        const values = rows.map((row: any) => row[colIdx]);
        const colResult = analyzeColumn(name, values, colIdx, lang);
        columns.push(colResult as ColumnMeta);

        const progress = totalCols > 0 ? Math.round(((colIdx + 1) / totalCols) * 100) : 100;
        if (onProgress) {
            onProgress({ type: 'column', name, index: colIdx, progress });
        }
    }

    const qualityScore = computeQualityScore(columns, totalRows);
    const insights = generateInsights(columns, totalRows, totalCols, lang);
    const analysisReadiness = assessReadiness(columns, totalRows, lang);
    const relationships = detectRelationships(columns);
    const correlationMatrix = computeCorrelationMatrix(parsedData, columns);

    const result = {
        fileName: fileName || 'Unknown',
        fileSize: fileSize || 0,
        sheetName: activeSheet,
        totalRows,
        totalCols,
        columns,
        qualityScore,
        insights,
        analysisReadiness,
        relationships,
        correlationMatrix
    };

    if (onProgress) {
        onProgress({ type: 'complete', result: result as any });
    }

    return result;
}

function analyzeColumn(name: string, values: any[], index: number, lang: string = 'vi'): any {
    const isEn = lang === 'en';
    const total = values.length;

    const nullCount = values.filter(v => v == null || String(v).trim() === '').length;
    const nullPercent = total > 0 ? (nullCount / total) * 100 : 0;
    const nonNullValues = values.filter(v => v != null && String(v).trim() !== '');

    const typeInfo = detectColumnType(nonNullValues);

    const uniqueSet = new Set(nonNullValues.map(v => String(v).trim().toLowerCase()));
    const uniqueCount = uniqueSet.size;
    const duplicatePercent = nonNullValues.length > 0
        ? ((nonNullValues.length - uniqueCount) / nonNullValues.length) * 100
        : 0;

    let stats: any = null;
    let skewness: number | null = null;
    let drift: number | null = null;

    if (typeInfo.type === 'number' || typeInfo.type === 'currency') {
        stats = computeStats(nonNullValues);
        const numericVals = nonNullValues.map(v => Number(v)).filter(v => !isNaN(v));
        if (numericVals.length > 2) {
            const n = numericVals.length;
            const mean = numericVals.reduce((a, b) => a + b, 0) / n;
            const s2 = numericVals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
            const s = Math.sqrt(s2 || 0);
            if (s > 0) {
                const m3 = numericVals.reduce((acc, v) => acc + Math.pow((v - mean) / s, 3), 0) / n;
                skewness = m3;
            }
        }
        if (nonNullValues.length >= 4) {
            const nums = nonNullValues.map(v => Number(v)).filter(v => !isNaN(v));
            const mid = Math.floor(nums.length / 2);
            const first = nums.slice(0, mid);
            const second = nums.slice(mid);
            const mean1 = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0;
            const mean2 = second.length ? second.reduce((a, b) => a + b, 0) / second.length : 0;
            const denom = Math.abs(mean1) + Math.abs(mean2) + 1e-9;
            drift = denom > 0 ? Math.abs(mean2 - mean1) / denom : 0;
        }
    }

    let dateFormats: string[] = [];
    if (typeInfo.type === 'date') {
        const formatSet = new Set<string>();
        nonNullValues.slice(0, 100).forEach(v => {
            const fmt = detectDateFormat(v);
            if (fmt) formatSet.add(fmt);
        });
        dateFormats = [...formatSet];
    }

    let textStats: any = null;
    if (typeInfo.type === 'text') {
        const lengths = nonNullValues.map(v => String(v).length);
        if (lengths.length > 0) {
            textStats = {
                avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
                minLength: Math.min(...lengths),
                maxLength: Math.max(...lengths)
            };
        }
    }

    const sampleValues = [...new Set(nonNullValues.slice(0, 50).map(v => String(v)))].slice(0, 5);
    const isPII = detectPII(name, nonNullValues.slice(0, 30));

    const issues: any[] = [];
    if (nullPercent > 0) {
        issues.push({
            type: 'has_nulls',
            severity: nullPercent > 20 ? 'high' : nullPercent > 5 ? 'medium' : 'low',
            detail: isEn ? `${nullCount} null/empty values (${formatPercent(nullPercent)})` : `${nullCount} giá trị null/trống (${formatPercent(nullPercent)})`,
            examples: []
        });
    }
    if (typeInfo.type === 'mixed') {
        const mixedExamples = [...new Set(nonNullValues.map(v => String(v)).filter(v => isNaN(Number(v))))].slice(0, 3);
        issues.push({
            type: 'mixed_types',
            severity: 'high',
            detail: isEn ? `Column contains multiple data types: ${(typeInfo.subTypes || []).join(', ')}` : `Cột chứa nhiều kiểu dữ liệu khác nhau: ${(typeInfo.subTypes || []).join(', ')}`,
            examples: mixedExamples
        });
    }
    if (dateFormats.length > 1) {
        const dateExamples: string[] = [];
        const foundFormats = new Set();
        nonNullValues.forEach(v => {
            const fmt = detectDateFormat(v);
            if (fmt && !foundFormats.has(fmt) && dateExamples.length < 5) {
                foundFormats.add(fmt);
                dateExamples.push(String(v));
            }
        });
        issues.push({
            type: 'mixed_date_formats',
            severity: 'medium',
            detail: isEn ? `Multiple date formats: ${dateFormats.join(', ')}` : `Nhiều format ngày: ${dateFormats.join(', ')}`,
            examples: dateExamples
        });
    }
    if (typeInfo.type === 'text' && uniqueCount < total * 0.05 && uniqueCount < 50) {
        issues.push({
            type: 'likely_categorical',
            severity: 'info',
            detail: isEn ? `Likely a categorical column (only ${uniqueCount} unique values)` : `Có thể là cột phân loại (chỉ ${uniqueCount} giá trị unique)`,
            examples: []
        });
    }
    if (duplicatePercent > 50 && typeInfo.type === 'text') {
        issues.push({
            type: 'high_duplicates',
            severity: 'low',
            detail: isEn ? `${formatPercent(duplicatePercent)} duplicate values` : `${formatPercent(duplicatePercent)} giá trị trùng lặp`,
            examples: []
        });
    }

    if (typeInfo.type === 'text' && nonNullValues.length > 5) {
        const casingSets: Record<string, Set<string>> = {};
        nonNullValues.slice(0, 200).forEach(v => {
            const lower = String(v).toLowerCase().trim();
            if (!casingSets[lower]) casingSets[lower] = new Set();
            casingSets[lower].add(String(v).trim());
        });
        const inconsistentGroups = Object.values(casingSets).filter(s => s.size > 1);
        const inconsistentCount = inconsistentGroups.length;
        if (inconsistentCount > 0) {
            const casingExamples = [...inconsistentGroups[0]].slice(0, 4);
            issues.push({
                type: 'inconsistent_casing',
                severity: 'medium',
                detail: isEn ? `${inconsistentCount} groups of values with inconsistent casing` : `${inconsistentCount} nhóm giá trị viết hoa/thường không nhất quán`,
                examples: casingExamples
            });
        }
    }

    return {
        name,
        index,
        type: typeInfo.type, // simplified type for ColumnMeta
        dataType: typeInfo.type,
        subTypes: typeInfo.subTypes || [],
        typeConfidence: typeInfo.confidence,
        nullCount,
        nullPercent,
        uniqueCount,
        duplicatePercent,
        stats,
        dateFormats,
        textStats,
        sampleValues,
        isPII,
        issues,
        skewness,
        drift
    };
}

function detectColumnType(values: any[]) {
    if (values.length === 0) return { type: 'empty', confidence: 100 };

    const sample = values.slice(0, 200);
    const typeCounts = { number: 0, date: 0, boolean: 0, currency: 0, text: 0 };

    for (const val of sample) {
        if (typeof val === 'boolean' || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'false') {
            typeCounts.boolean++;
        } else if (val instanceof Date) {
            typeCounts.date++;
        } else if (isCurrencyValue(val)) {
            typeCounts.currency++;
        } else if (isDateValue(val)) {
            typeCounts.date++;
        } else if (!isNaN(Number(val)) && String(val).trim() !== '') {
            typeCounts.number++;
        } else {
            typeCounts.text++;
        }
    }

    const total = sample.length;
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const [primaryType, primaryCount] = sorted[0];
    const confidence = (primaryCount / total) * 100;

    if (confidence > 80) {
        return { type: primaryType, confidence: Math.round(confidence) };
    }

    const subTypes = sorted.filter(([, count]) => count > 0).map(([type]) => type);
    return { type: 'mixed', subTypes, confidence: Math.round(confidence) };
}

function computeQualityScore(columns: any[], totalRows: number) {
    if (columns.length === 0) return 0;

    let score = 100;
    const weights = {
        nulls: 25,
        types: 25,
        formats: 20,
        completeness: 15,
        consistency: 15
    };

    const avgNull = columns.reduce((sum, c) => sum + c.nullPercent, 0) / columns.length;
    score -= (avgNull / 100) * weights.nulls;

    const mixedCols = columns.filter(c => c.dataType === 'mixed').length;
    score -= (mixedCols / columns.length) * weights.types;

    const formatIssues = columns.filter(c =>
        c.issues.some((i: any) => i.type === 'mixed_date_formats' || i.type === 'inconsistent_casing')
    ).length;
    score -= (formatIssues / columns.length) * weights.formats;

    if (totalRows < 10) score -= weights.completeness * 0.5;
    else if (totalRows < 50) score -= weights.completeness * 0.2;

    const casingIssues = columns.filter(c =>
        c.issues.some((i: any) => i.type === 'inconsistent_casing')
    ).length;
    score -= (casingIssues / columns.length) * weights.consistency;

    return Math.max(0, Math.min(100, Math.round(score)));
}

function generateInsights(columns: any[], totalRows: number, totalCols: number, lang: string = 'vi'): InsightItem[] {
    const insights: any[] = [];
    const isEn = lang === 'en';

    const highNullCols = columns.filter(c => c.nullPercent > 20);
    if (highNullCols.length > 0) {
        insights.push({
            id: 'null_high',
            type: 'critical',
            severity: 'high',
            title: isEn ? 'Severe Data Missing' : 'Dữ liệu thiếu nghiêm trọng',
            description: isEn ? `${highNullCols.length} columns have >20% missing values: ${highNullCols.map(c => c.name).join(', ')}. Need handling before analysis.` : `${highNullCols.length} cột có >20% giá trị trống: ${highNullCols.map(c => c.name).join(', ')}. Cần xử lý trước khi phân tích.`,
            action: isEn ? 'Consider removing rows, filling with mean/median, or marking separately.' : 'Xem xét xoá dòng, điền giá trị trung bình (mean/median), hoặc đánh dấu riêng.'
        });
    }

    const someNullCols = columns.filter(c => c.nullPercent > 0 && c.nullPercent <= 20);
    if (someNullCols.length > 0) {
        insights.push({
            id: 'null_some',
            type: 'warning',
            severity: 'low',
            title: isEn ? 'Some columns have missing values' : 'Một số cột có giá trị trống',
            description: isEn ? `${someNullCols.length} columns have <20% nulls: ${someNullCols.map(c => `${c.name} (${formatPercent(c.nullPercent)})`).join(', ')}.` : `${someNullCols.length} cột có <20% null: ${someNullCols.map(c => `${c.name} (${formatPercent(c.nullPercent)})`).join(', ')}.`,
            action: isEn ? 'Check if nulls have meaning or are data entry errors.' : 'Kiểm tra xem null có ý nghĩa (dữ liệu không có) hay do lỗi nhập liệu.'
        });
    }

    const mixedCols = columns.filter(c => c.dataType === 'mixed');
    if (mixedCols.length > 0) {
        insights.push({
            id: 'mixed_types',
            type: 'critical',
            severity: 'high',
            title: isEn ? 'Inconsistent Data Types' : 'Kiểu dữ liệu không nhất quán',
            description: isEn ? `${mixedCols.length} columns contain mixed data types: ${mixedCols.map(c => c.name).join(', ')}.` : `${mixedCols.length} cột chứa nhiều kiểu dữ liệu lẫn lộn: ${mixedCols.map(c => c.name).join(', ')}.`,
            action: isEn ? 'Standardize data types. Split text from numbers if needed.' : 'Chuẩn hoá kiểu dữ liệu cho từng cột. Tách cột nếu chứa cả text và number.'
        });
    }

    const dateCols = columns.filter(c => c.dateFormats && c.dateFormats.length > 1);
    if (dateCols.length > 0) {
        insights.push({
            id: 'date_formats',
            type: 'warning',
            severity: 'medium',
            title: isEn ? 'Inconsistent Date Formats' : 'Format ngày không đồng nhất',
            description: dateCols.map(c => isEn ? `Column "${c.name}": ${c.dateFormats.join(' vs ')}` : `Cột "${c.name}": ${c.dateFormats.join(' vs ')}`).join('. '),
            action: isEn ? 'Standardize dates to YYYY-MM-DD or DD/MM/YYYY.' : 'Chuẩn hoá tất cả ngày về dạng YYYY-MM-DD hoặc DD/MM/YYYY thống nhất.'
        });
    }

    const casingCols = columns.filter(c =>
        c.issues.some((i: any) => i.type === 'inconsistent_casing')
    );
    if (casingCols.length > 0) {
        insights.push({
            id: 'casing',
            type: 'info',
            severity: 'medium',
            title: isEn ? 'Inconsistent Casing' : 'Viết hoa/thường không nhất quán',
            description: isEn ? `${casingCols.length} text columns have similar values with different casing: ${casingCols.map(c => c.name).join(', ')}.` : `${casingCols.length} cột text có giá trị giống nhau nhưng viết hoa/thường khác: ${casingCols.map(c => c.name).join(', ')}.`,
            action: isEn ? 'Use UPPER/LOWER/PROPER to standardize, or TRIM to remove whitespaces.' : 'Dùng UPPER/LOWER/PROPER để chuẩn hoá, hoặc TRIM để xoá khoảng trắng.'
        });
    }

    const categoricalCols = columns.filter(c =>
        c.issues.some((i: any) => i.type === 'likely_categorical')
    );
    if (categoricalCols.length > 0) {
        insights.push({
            id: 'categorical',
            type: 'success',
            severity: 'info',
            title: isEn ? 'Categorical Columns Detected' : 'Phát hiện cột phân loại',
            description: isEn ? `${categoricalCols.length} columns can be used for grouping: ${categoricalCols.map(c => `${c.name} (${c.uniqueCount} types)`).join(', ')}.` : `${categoricalCols.length} cột có thể dùng để phân loại/groupby: ${categoricalCols.map(c => `${c.name} (${c.uniqueCount} loại)`).join(', ')}.`,
            action: isEn ? 'These columns are useful for Pivot Tables, GROUP BY, or generating grouped reports.' : 'Các cột này hữu ích cho Pivot Table, GROUP BY, hoặc tạo báo cáo theo nhóm.'
        });
    }

    const piiCols = columns.filter(c => c.isPII);
    if (piiCols.length > 0) {
        insights.push({
            id: 'pii_detected',
            type: 'critical',
            severity: 'high',
            title: isEn ? 'Sensitive Data (PII) Detected' : 'Phát hiện dữ liệu nhạy cảm (PII)',
            description: isEn ? `${piiCols.length} columns may contain PII: ${piiCols.map(c => c.name).join(', ')}.` : `${piiCols.length} cột có thể chứa thông tin cá nhân: ${piiCols.map(c => c.name).join(', ')}.`,
            action: isEn ? 'Data will be auto-obfuscated when sending to APIs or exporting reports.' : 'Dữ liệu sẽ được tự động làm mờ khi gửi API hoặc xuất báo cáo.'
        });
    }

    const numericCols = columns.filter(c => c.stats);
    numericCols.forEach(col => {
        if (col.stats && col.stats.stddev > 0) {
            const cv = (col.stats.stddev / Math.abs(col.stats.mean)) * 100;
            if (cv > 100) {
                insights.push({
                    id: `outlier_${col.name}`,
                    type: 'warning',
                    severity: 'medium',
                    title: isEn ? `High Variance in "${col.name}"` : `Biến động lớn ở cột "${col.name}"`,
                    description: isEn ? `CV = ${formatPercent(cv)}. Range: ${formatNumber(col.stats.min)} → ${formatNumber(col.stats.max)}.` : `Hệ số biến thiên CV = ${formatPercent(cv)}. Range: ${formatNumber(col.stats.min)} → ${formatNumber(col.stats.max)}.`,
                    action: isEn ? 'Check for outliers. Consider using median instead of mean.' : 'Kiểm tra outliers. Cân nhắc dùng median thay mean để phân tích.'
                });
            }
        }
    });

    const skewCols = columns.filter(c => typeof c.skewness === 'number' && !isNaN(c.skewness));
    skewCols.forEach(col => {
        const s = col.skewness;
        if (Math.abs(s) > 0.8) {
            insights.push({
                id: `skewness_${col.name}`,
                type: Math.abs(s) > 1.5 ? 'warning' : 'info',
                severity: Math.abs(s) > 1.5 ? 'high' : 'medium',
                title: isEn ? `Skewed Distribution in "${col.name}"` : `Phân phối lệch ở cột "${col.name}"`,
                description: isEn ? `Skewness = ${s.toFixed(2)} indicating asymmetry.` : `Độ lệch Skewness = ${s.toFixed(2)} cho thấy phân phối không đối xứng.`,
                action: isEn ? 'Consider transforming data (log/sqrt) to reduce skewness.' : 'Consider transforming data (log/sqrt/Box-Cox) to reduce skewness for modeling or visualization.'
            });
        }
    });

    const driftCols = columns.filter(c => typeof c.drift === 'number' && c.drift > 0);
    driftCols.forEach(col => {
        const d = col.drift;
        if (d > 0.3) {
            insights.push({
                id: `drift_${col.name}`,
                type: 'warning',
                severity: 'medium',
                title: isEn ? `Distribution Drift in "${col.name}"` : `Bất thường phân phối (Drift) ở cột "${col.name}"`,
                description: isEn ? `Distribution differs by ~${Math.round(d * 100)}% between halves of the dataset.` : `Phân phối nửa đầu và nửa sau dataset ở cột này chênh lệch ~${Math.round(d * 100)}%.`,
                action: isEn ? 'May be due to changes in collection methods or over time.' : 'Có thể do thay đổi trong quá trình thu thập hoặc theo thời gian.'
            });
        }
    });

    if (totalRows < 30) {
        insights.push({
            id: 'small_dataset',
            type: 'warning',
            severity: 'medium',
            title: isEn ? 'Dataset Too Small' : 'Dữ liệu quá ít',
            description: isEn ? `Only ${totalRows} rows. Statistical analysis may not be reliable.` : `Chỉ có ${totalRows} dòng. Các phân tích thống kê có thể không đáng tin cậy.`,
            action: isEn ? 'Descriptive analysis suitable. Minimize predictive/regression usage.' : 'Phù hợp phân tích mô tả. Hạn chế dùng predictive/regression.'
        });
    } else if (totalRows > 5000) {
        insights.push({
            id: 'large_dataset',
            type: 'info',
            severity: 'info',
            title: isEn ? 'Large Dataset' : 'Dữ liệu lớn',
            description: isEn ? `${formatNumber(totalRows)} rows — suitable for most types of analysis.` : `${formatNumber(totalRows)} dòng — đủ không gian cho hầu hết các loại phân tích.`,
            action: isEn ? 'Can be used for predictive analytics and regression.' : 'Có thể dùng cho predictive analytics, regression cơ bản.'
        });
    }

    const severityOrder: any = { high: 0, medium: 1, low: 2, info: 3 };
    insights.sort((a, b) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9));

    return insights.map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        severity: item.severity,
        description: item.description,
        action: item.action
    }));
}

function assessReadiness(columns: any[], totalRows: number, lang: string = 'vi') {
    const isEn = lang === 'en';
    const hasNull = columns.some(c => c.nullPercent > 20);
    const hasMixed = columns.some(c => c.dataType === 'mixed');
    const hasNumeric = columns.some(c => c.dataType === 'number' || c.dataType === 'currency');
    const hasDate = columns.some(c => c.dataType === 'date');
    const hasCategorical = columns.some(c =>
        c.issues.some((i: any) => i.type === 'likely_categorical')
    );

    return {
        descriptive: {
            ready: true,
            label: isEn ? 'Descriptive Analysis' : 'Phân tích Mô tả',
            status: hasNull || hasMixed ? 'warning' : 'ready',
            note: hasNull ? (isEn ? 'Handle nulls first' : 'Cần xử lý null trước') : (isEn ? 'Ready' : 'Sẵn sàng')
        },
        diagnostic: {
            ready: hasNumeric || hasCategorical,
            label: isEn ? 'Diagnostic Analysis' : 'Phân tích Chẩn đoán',
            status: hasMixed ? 'warning' : (hasNumeric ? 'ready' : 'not_ready'),
            note: !hasNumeric ? (isEn ? 'Numeric columns required' : 'Cần cột số để so sánh') : (isEn ? 'Ready' : 'Sẵn sàng')
        },
        predictive: {
            ready: hasDate && hasNumeric && totalRows >= 50,
            label: isEn ? 'Predictive Analysis' : 'Phân tích Dự báo',
            status: (!hasDate || !hasNumeric || totalRows < 50) ? 'not_ready' : 'ready',
            note: !hasDate ? (isEn ? 'Time column required' : 'Cần cột thời gian') : totalRows < 50 ? (isEn ? '>50 rows required' : 'Cần >50 dòng dữ liệu') : (isEn ? 'Ready' : 'Sẵn sàng')
        },
        prescriptive: {
            ready: totalRows >= 100 && hasNumeric && hasCategorical,
            label: isEn ? 'Prescriptive Analysis' : 'Phân tích Xử phương',
            status: totalRows < 100 ? 'not_ready' : 'ready',
            note: totalRows < 100 ? (isEn ? '>100 rows required' : 'Cần >100 dòng') : (isEn ? 'Ready' : 'Sẵn sàng')
        }
    };
}

function detectRelationships(columns: any[]) {
    const relationships: any[] = [];
    const idCols = columns.filter(c =>
        c.dataType === 'text' &&
        (c.name.toLowerCase().includes('ma') ||
            c.name.toLowerCase().includes('id') ||
            c.name.toLowerCase().includes('code')) &&
        c.uniqueCount > 1
    );

    for (let i = 0; i < idCols.length; i++) {
        for (let j = i + 1; j < idCols.length; j++) {
            if (idCols[i].uniqueCount !== idCols[j].uniqueCount) {
                relationships.push({
                    from: idCols[i].name,
                    to: idCols[j].name,
                    type: idCols[i].uniqueCount > idCols[j].uniqueCount ? 'many-to-one' : 'one-to-many'
                });
            }
        }
    }
    return relationships;
}

function computeCorrelationMatrix(parsedData: ParsedData, columns: ColumnMeta[]) {
    // Only numeric columns
    const numCols = columns.filter(c => c.type === 'numeric' && c.nullPercent < 50);
    if (numCols.length < 2) return null;

    const { headers, rows } = parsedData;

    // Get indices of the numeric columns
    const colIndices = numCols.map(c => headers.indexOf(c.name));

    const n = rows.length;
    if (n < 2) return null;

    const matrix = [];

    for (let i = 0; i < numCols.length; i++) {
        const rowData = [];
        for (let j = 0; j < numCols.length; j++) {
            if (i === j) {
                rowData.push(1);
                continue;
            }

            const c1 = colIndices[i];
            const c2 = colIndices[j];

            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
            let count = 0;

            for (let k = 0; k < n; k++) {
                const vx = Number(rows[k][c1]);
                const vy = Number(rows[k][c2]);

                if (!isNaN(vx) && !isNaN(vy)) {
                    sumX += vx;
                    sumY += vy;
                    sumXY += vx * vy;
                    sumX2 += vx * vx;
                    sumY2 += vy * vy;
                    count++;
                }
            }

            if (count > 0) {
                const num = (count * sumXY) - (sumX * sumY);
                const den = Math.sqrt((count * sumX2 - sumX * sumX) * (count * sumY2 - sumY * sumY));
                rowData.push(den === 0 ? 0 : num / den);
            } else {
                rowData.push(0);
            }
        }
        matrix.push({
            name: numCols[i].name,
            correlations: rowData
        });
    }

    return {
        columns: numCols.map(c => c.name),
        matrix
    };
}
