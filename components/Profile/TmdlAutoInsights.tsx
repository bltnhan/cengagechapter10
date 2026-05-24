'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../hooks/store';
import { TmdlModel } from '../../lib/tmdlParser';
import { buildTmdlContextString } from '../../lib/tmdlParser';
import { renderMarkdown } from '../../lib/markdown';
import { renderChartPlaceholders } from '../../lib/chartRenderer';
import { downloadFile } from '../../lib/export';
import { Sparkles, Loader2, Brain, Zap, BarChart3, RefreshCw, Download } from 'lucide-react';

interface TmdlAutoInsightsProps {
    model: TmdlModel;
}

type AnalysisMode = 'overview' | 'dax' | 'analysis';

const getAnalysisModes = (lang: string) => [
    {
        key: 'overview',
        icon: <Brain size={16} />,
        label: lang === 'en' ? 'Model Overview' : 'Đánh giá Model',
        description: lang === 'en' ? 'Check data model health, star schema, best practices' : 'Kiểm tra sức khỏe data model, star schema, best practices',
    },
    {
        key: 'dax',
        icon: <Zap size={16} />,
        label: lang === 'en' ? 'DAX Optimization' : 'Tối ưu DAX',
        description: lang === 'en' ? 'Analyze measures and suggest performance improvements' : 'Phân tích measures và gợi ý tối ưu hiệu năng',
    },
    {
        key: 'analysis',
        icon: <BarChart3 size={16} />,
        label: lang === 'en' ? 'Analysis Strategy' : 'Hướng phân tích',
        description: lang === 'en' ? 'Suggest KPIs, dashboards, and data exploration paths' : 'Gợi ý KPIs, dashboards và hướng khai thác dữ liệu',
    },
];

function buildPrompt(mode: AnalysisMode, modelContext: string, lang: string): string {
    const isEn = lang === 'en';
    const base = `${isEn ? 'Below is the Power BI Semantic Model (TMDL) structure:' : 'Dưới đây là cấu trúc Semantic Model (TMDL) của Power BI:'}\n\n${modelContext}\n\n`;

    if (mode === 'overview') {
        return base + (isEn ? `Evaluate this Data Model based on:
1. Schema Architecture (Star/Snowflake).
2. Naming Conventions.
3. Relationships (missing, redundant, risks).
4. Data Types & Keys.
5. Scorecard: Top 3 strengths and Top 3 fixes.
MUST include a radar chart using \`\`\`quickchart.
Provide a score out of 100.` : `Hãy đánh giá tổng thể Data Model này theo các tiêu chí sau, trình bày bằng Markdown tiếng Việt chuyên nghiệp:
1. Kiến trúc Model (Star/Snowflake Schema).
2. Chất lượng Naming Convention.
3. Relationships (missing, redundant, bi-directional risks).
4. Data Types & Keys.
5. Scorecard: TOP 3 điểm tốt và TOP 3 vấn đề cần fix.
BẮT BUỘC tạo biểu đồ radar đánh giá tổng thể bằng quickchart.
Cho điểm tổng thể model trên thang 100 điểm.`);
    }

    if (mode === 'dax') {
        return base + (isEn ? `Analyze all DAX Measures:
1. Categorization (Revenue, Cost, KPIs, etc.) with a pie chart (\`\`\`quickchart).
2. Performance Optimization (anti-patterns, specific rewrites).
3. Missing Measures (suggest 5-10 business KPIs with code).
4. Time Intelligence (Calendar table, YTD/QTD/MTD/PY).
Use \`\`\`dax for code blocks.` : `Hãy phân tích tất cả DAX Measures trong model này và đưa ra đánh giá chi tiết bằng Markdown tiếng Việt:
1. Tổng quan Measures: Phân loại theo nhóm chức năng, BẮT BUỘC tạo biểu đồ pie phân bổ measures.
2. Tối ưu hiệu năng: Phát hiện anti-patterns, gợi ý viết lại DAX.
3. Measures còn thiếu: Gợi ý 5-10 measures business quan trọng kèm code DAX.
4. Time Intelligence: Kiểm tra Calendar table và các measures YTD/QTD/MTD/PY.
Sử dụng format code block \`\`\`dax cho mỗi đoạn code DAX.`);
    }

    return base + (isEn ? `Suggest a data analysis strategy:
1. Key KPIs (Top 10 with business meaning, bar chart \`\`\`quickchart).
2. Dashboard Layout (2-3 pages with visual suggestions and mock charts).
3. Advanced Analysis (Pareto, Cohort, ABC, What-If).
4. Data Storytelling (3-5 business questions).
5. Drill-down Paths.` : `Dựa trên cấu trúc data model Power BI này, hãy gợi ý chiến lược phân tích dữ liệu chi tiết bằng Markdown tiếng Việt:
1. KPIs chính cần theo dõi: TOP 10 KPIs quan trọng nhất, BẮT BUỘC tạo biểu đồ bar xếp hạng.
2. Đề xuất Dashboard Layout: Gợi ý 2-3 trang dashboard, mỗi trang PHẢI có ít nhất 1 biểu đồ mẫu (quickchart).
3. Phân tích nâng cao: Pareto, Cohort, ABC Analysis, What-If...
4. Data Storytelling: 3-5 câu hỏi business quan trọng.
5. Drill-down Path: Đề xuất hierarchy drill-down.`);
}

export function TmdlAutoInsights({ model }: TmdlAutoInsightsProps) {
    const { apiKey, insightModel, language, systemRole } = useAppStore();
    const lang = language || 'vi';
    const ANALYSIS_MODES = getAnalysisModes(lang);

    const [selectedMode, setSelectedMode] = useState<AnalysisMode>('overview');
    const [results, setResults] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    const currentResult = results[selectedMode];

    useEffect(() => {
        if (resultRef.current && currentResult && !isGenerating) {
            renderChartPlaceholders(resultRef.current);
        }
    }, [currentResult, isGenerating]);

    const generateAnalysis = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const modelContext = buildTmdlContextString(model);
            const prompt = buildPrompt(selectedMode, modelContext, lang);

            const payload = {
                prompt,
                apiKey: apiKey || undefined,
                systemInstruction: systemRole || (lang === 'en' ? 'You are a Power BI Architect.' : 'Bạn là chuyên gia Power BI Architect.'),
                model: insightModel || 'gemini-2.5-flash',
                temperature: 0.3,
                language: lang
            };

            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error! status: ${res.status}`);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    accumulated += decoder.decode(value, { stream: true });
                    setResults(prev => ({ ...prev, [selectedMode]: accumulated }));
                }
            }

        } catch (err: any) {
            console.error('Lỗi phân tích TMDL:', err);
            setError(err.message || 'Có lỗi xảy ra khi phân tích bằng AI.');
        } finally {
            setIsGenerating(false);
        }
    };

    const exportHtml = () => {
        if (!currentResult) return;
        const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Power BI Data Model Insights</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        h1, h2, h3 { color: #111; margin-top: 1.5em; }
        h1 { border-bottom: 2px solid #eaecef; padding-bottom: .3em; color: #8b5cf6; }
        pre, code { background: #f6f8fa; border-radius: 6px; }
        pre { padding: 16px; overflow: auto; }
        code { padding: 0.2em 0.4em; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        table, th, td { border: 1px solid #dfe2e5; }
        th, td { padding: 8px 13px; text-align: left; }
        th { background-color: #f6f8fa; font-weight: 600; }
        blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; margin: 0; padding: 0 15px; }
        .dl-chart-img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    </style>
</head>
<body>
    <h1>TMDL AI Analysis – ${ANALYSIS_MODES.find(m => m.key === selectedMode)?.label}</h1>
    <div class="content">
        ${renderMarkdown(currentResult)}
    </div>
</body>
</html>`;
        downloadFile(htmlContent, `TMDL_Insights_${selectedMode}_${new Date().getTime()}.html`, 'text/html');
    };

    return (
        <div className="panel" style={{
            marginTop: '24px',
            borderColor: '#8b5cf6',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(59, 130, 246, 0.04))',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#8b5cf6',
                }}>
                    <Sparkles size={20} /> AI Model Analysis
                </h3>
            </div>

            {/* Mode Selector Tabs */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginBottom: '16px',
            }}>
                {ANALYSIS_MODES.map(mode => {
                    const isActive = selectedMode === mode.key;
                    const hasResult = !!results[mode.key];
                    return (
                        <button
                            key={mode.key}
                            onClick={() => setSelectedMode(mode.key as AnalysisMode)}
                            style={{
                                padding: '12px 10px',
                                borderRadius: '8px',
                                border: isActive ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                                background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                color: 'inherit',
                                position: 'relative',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ color: isActive ? '#8b5cf6' : 'var(--text-muted)' }}>{mode.icon}</span>
                                <strong style={{ fontSize: '12px' }}>{mode.label}</strong>
                                {hasResult && (
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: '#10b981', display: 'inline-block', marginLeft: 'auto',
                                    }} title={lang === 'en' ? 'Analyzed' : 'Đã phân tích'} />
                                )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                {mode.description}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Generate / Regenerate Button */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button
                    className="btn btn-primary"
                    onClick={generateAnalysis}
                    disabled={isGenerating}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        flex: 1,
                        justifyContent: 'center',
                    }}
                >
                    {isGenerating ? (
                        <><Loader2 size={16} className="spin" /> {lang === 'en' ? `Analyzing... (${insightModel})` : `Đang phân tích... (${insightModel})`}</>
                    ) : currentResult ? (
                        <><RefreshCw size={16} /> {lang === 'en' ? 'Re-analyze' : 'Phân tích lại'}</>
                    ) : (
                        <><Sparkles size={16} /> {lang === 'en' ? 'Start Analysis' : 'Bắt đầu phân tích'}</>
                    )}
                </button>
                {currentResult && (
                    <button
                        className="btn"
                        onClick={exportHtml}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        <Download size={16} /> {lang === 'en' ? 'Export HTML' : 'Xuất HTML'}
                    </button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '12px',
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Results Display */}
            {currentResult && (
                <div style={{
                    background: 'var(--panel-bg, rgba(0,0,0,0.2))',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <div
                        ref={resultRef}
                        className="markdown-content"
                        style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(currentResult) }}
                        onClick={(e) => {
                            const target = e.target as HTMLElement;
                            const btn = target.closest('.code-block-btn') as HTMLButtonElement | null;
                            if (btn) {
                                const codeId = btn.getAttribute('data-code-id');
                                if (codeId) {
                                    const codeBlock = document.getElementById(codeId);
                                    if (codeBlock) {
                                        navigator.clipboard.writeText(codeBlock.textContent || '');
                                        const span = btn.querySelector('.code-block-btn-text');
                                        if (span) {
                                            const originalText = span.textContent;
                                            span.textContent = 'Copied!';
                                            setTimeout(() => {
                                                span.textContent = originalText;
                                            }, 2000);
                                        }
                                    }
                                }
                            }
                        }}
                    />
                </div>
            )}

            {/* Placeholder when no result */}
            {!currentResult && !isGenerating && (
                <div style={{
                    textAlign: 'center',
                    padding: '30px 20px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                }}>
                    <Sparkles size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <p style={{ margin: 0 }}>
                        {lang === 'en' ? 'Select an analysis mode and click ' : 'Chọn loại phân tích và nhấn '}
                        <strong>{lang === 'en' ? '"Start Analysis"' : '"Bắt đầu phân tích"'}</strong>
                        {lang === 'en' ? ' for AI to evaluate your model' : ' để AI đánh giá model của bạn'}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', opacity: 0.7 }}>
                        {lang === 'en'
                            ? `AI will use the structure of ${model.tables.length} tables, ${model.tables.reduce((s, t) => s + t.measures.length, 0)} measures for analysis`
                            : `AI sẽ sử dụng cấu trúc ${model.tables.length} bảng, ${model.tables.reduce((s, t) => s + t.measures.length, 0)} measures để phân tích`}
                    </p>
                </div>
            )}
        </div>
    );
}
