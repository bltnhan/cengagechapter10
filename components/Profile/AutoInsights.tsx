'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../hooks/store';
import { Sparkles, Loader2, ChevronRight, MessageSquare } from 'lucide-react';
import { renderMarkdown } from '../../lib/markdown';
import { t } from '../../lib/i18n';

export function AutoInsights() {
    const {
        metadata,
        aiInsights,
        setAiInsights,
        isAutoInsightGenerating,
        setIsAutoInsightGenerating,
        apiKey,
        systemRole,
        insightModel,
        language,
        setActiveTab,
        setLastSubmittedPrompt
    } = useAppStore();
    const [error, setError] = useState<string | null>(null);

    const generateInsights = async () => {
        if (!metadata) return;

        setIsAutoInsightGenerating(true);
        setError(null);

        try {
            // Build a concise prompt based on metadata
            const systemPromptContent = language === 'en' ?
                'Analyze the following dataset and provide the top 3-5 most important insights (outliers, trends, anomalies). Present concisely in English using Markdown format.' :
                'Phân tích bộ dữ liệu sau và đưa ra 3-5 insights quan trọng nhất (outliers, xu hướng, bất thường). Trình bày ngắn gọn, dễ hiểu bằng tiếng Việt theo định dạng Markdown.';

            const prompt = `${systemPromptContent}
            
Tên file/File name: ${metadata.fileName}
Số dòng/Total rows: ${metadata.totalRows}
Số cột/Total cols: ${metadata.totalCols}

Các cột/Columns:
${metadata.columns.map(c => `- ${c.name} (${c.type}): ${c.nullPercent}% null, ${c.uniqueCount} unique.`).join('\n')}

Vấn đề chất lượng/Quality Score: ${metadata.qualityScore}/100.
`;

            const payload = {
                prompt,
                apiKey: apiKey || undefined,
                systemInstruction: systemRole || (language === 'en' ? 'You are a data science expert.' : 'Bạn là chuyên gia khoa học dữ liệu.'),
                model: insightModel || 'gemini-2.5-flash',
                temperature: 0.3,
                language: language
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
            if (!reader) throw new Error(language === 'en' ? 'Cannot read response from server.' : 'Không thể đọc dữ liệu trả về từ server.');
            const decoder = new TextDecoder();
            let fullText = '';

            // Initialize with empty text so the UI knows it's loading
            setAiInsights('');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                fullText += decoder.decode(value, { stream: true });
                setAiInsights(fullText);
            }

        } catch (err: any) {
            console.error('Lỗi sinh Auto Insights:', err);
            setError(err.message || t('profile.errorAI', language));
        } finally {
            setIsAutoInsightGenerating(false);
        }
    };

    if (!metadata) return null;

    return (
        <div className="panel" style={{ marginTop: '20px', borderColor: 'var(--primary-color)', background: 'linear-gradient(to right, rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.05))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Sparkles size={20} /> AI Auto-Insights
                </h3>

                {!aiInsights && (
                    <button
                        className="btn btn-primary"
                        onClick={generateInsights}
                        disabled={isAutoInsightGenerating}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {isAutoInsightGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                        {isAutoInsightGenerating ? `${t('profile.generatingInsights', language as any)} (${insightModel})` : t('profile.generateInsights', language as any)}
                    </button>
                )}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: aiInsights ? '15px' : '0' }}>
                {!aiInsights && !isAutoInsightGenerating && t('profile.autoInsightsDescription', language as any)}
            </p>

            {error && (
                <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '6px', fontSize: '14px', marginTop: '10px' }}>
                    {error}
                </div>
            )}

            {aiInsights && (
                <div style={{
                    background: 'var(--panel-bg)',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div
                        className="markdown-content"
                        style={{ fontSize: '14px', color: 'var(--text-primary)' }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(aiInsights) }}
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
        </div>
    );
}
