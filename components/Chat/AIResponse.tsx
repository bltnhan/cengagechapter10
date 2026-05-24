'use client';

import { useRef, useEffect } from 'react';
import { useAppStore } from '../../hooks/store';
import { useGeminiApi } from '../../hooks/useGeminiApi';
import { Bot, Copy, RefreshCw, FileText, Download, MessageSquare } from 'lucide-react';
import { renderMarkdown } from '../../lib/markdown';
import { renderChartPlaceholders } from '../../lib/chartRenderer';
import { t } from '../../lib/i18n';

export function AIResponse() {
    const { response, isGenerating, error, generateInsight } = useGeminiApi();
    const { activePrompt, parsedData, lastSubmittedPrompt, setIsMCodeOpen } = useAppStore() as any;
    const responseBodyRef = useRef<HTMLDivElement>(null);

    // Render chart placeholders after the markdown HTML is injected into the DOM
    useEffect(() => {
        if (responseBodyRef.current && response && !isGenerating) {
            renderChartPlaceholders(responseBodyRef.current);
        }
    }, [response, isGenerating]);

    const handleCopy = () => {
        if (response) {
            navigator.clipboard.writeText(response);
        }
    };

    const handleExportHtml = () => {
        if (!response) return;

        const htmlContent = renderMarkdown(response);
        const fullHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('chat.reportTitle')}</title>
    <style>
        :root {
            --bg-base: #06080f;
            --bg-surface: #0d1117;
            --bg-card: #161b22;
            --border-default: rgba(48, 54, 61, 0.7);
            --text-primary: #f0f6fc;
            --text-secondary: #8b949e;
            --accent-primary: #6366f1;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
        }
        body {
            font-family: var(--font-sans);
            background: var(--bg-base);
            color: var(--text-primary);
            line-height: 1.7;
            margin: 0;
            padding: 40px 20px;
        }
        .report-container {
            max-width: 900px;
            margin: 0 auto;
            background: var(--bg-surface);
            padding: 50px 60px;
            border-radius: 16px;
            border: 1px solid var(--border-default);
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        }
        .report-header {
            border-bottom: 2px solid var(--border-default);
            padding-bottom: 25px;
            margin-bottom: 40px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .report-header h1 {
            margin: 0;
            font-size: 1.8rem;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
            color: #ffffff;
            margin-top: 2em;
            margin-bottom: 0.8em;
            line-height: 1.3;
        }
        .markdown-content h1 { font-size: 1.6rem; border-bottom: 1px solid var(--border-default); padding-bottom: 0.3em; color: #79c0ff; }
        .markdown-content h2 { font-size: 1.3rem; border-bottom: 1px solid rgba(48, 54, 61, 0.4); padding-bottom: 0.3em; }
        .markdown-content h3 { font-size: 1.15rem; color: #a3b3cc; }
        .markdown-content p { margin-top: 0; margin-bottom: 1.2em; color: rgba(240, 246, 252, 0.95); font-size: 0.95rem; }
        .markdown-content ul, .markdown-content ol { padding-left: 24px; margin-bottom: 1.2em; color: rgba(240, 246, 252, 0.95); font-size: 0.95rem; }
        .markdown-content li { margin-bottom: 0.5em; }
        .markdown-content li::marker { color: var(--accent-primary); }
        .markdown-content code { background: rgba(110, 118, 129, 0.2); padding: 0.2em 0.4em; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85em; color: #ff7b72; }
        .code-block-wrapper pre { background: var(--bg-card); padding: 20px; border-radius: 8px; overflow-x: auto; font-family: var(--font-mono); font-size: 0.85rem; border: 1px solid var(--border-default); }
        .code-block-header { display: none; }
        .table-wrapper { overflow-x: auto; margin: 24px 0; border: 1px solid var(--border-default); border-radius: 8px; background: var(--bg-card); }
        table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-default); }
        th { background: #161b22; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
        tr:last-child td { border-bottom: none; }
        .markdown-content img { display: block; max-width: 100%; height: auto; border-radius: 8px; margin: 24px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid var(--border-default); }
        .markdown-content strong { color: #fff; font-weight: 600; }
        blockquote { border-left: 4px solid var(--accent-primary); margin: 0 0 20px 0; padding: 12px 20px; color: var(--text-secondary); background: rgba(99, 102, 241, 0.05); border-radius: 0 8px 8px 0; font-style: italic; }
        @media print {
            body { background: white; color: black; padding: 0; }
            .report-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
            .markdown-content strong { color: #000; }
            .markdown-content code { background: #f6f8fa; color: #24292e; }
            .report-header h1 { -webkit-text-fill-color: black; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <h1>${t('chat.reportTitle')}</h1>
        </div>
        <div class="markdown-content">
            ${htmlContent}
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DataLens_Report_${new Date().toISOString().slice(0, 10)}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleRetry = () => {
        if (lastSubmittedPrompt) {
            generateInsight(lastSubmittedPrompt);
        }
    };

    if (isGenerating) {
        return (
            <div className="ai-chat-container" style={{ animation: 'fadeIn 0.4s ease', padding: '20px' }}>
                <div className="ai-response-container">
                    <div className="ai-response-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="loading-dots"><span></span><span></span><span></span></div>
                        <h3 style={{ margin: 0 }}>{t('chat.analyzing')}</h3>
                    </div>
                    <div className="ai-response-body" style={{ marginTop: '20px' }}>
                        <div className="skeleton" style={{ height: '20px', width: '80%', marginBottom: '15px' }}></div>
                        <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '15px' }}></div>
                        <div className="skeleton" style={{ height: '20px', width: '70%', marginBottom: '15px' }}></div>
                        <div className="skeleton" style={{ height: '100px', width: '100%', marginTop: '30px' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        let displayError = error;
        if (error.toLowerCase().includes('quota') || error.includes('429')) {
            displayError = t('chat.quotaError');
        } else if (error.toLowerCase().includes('fetch') || error.toLowerCase().includes('network')) {
            displayError = t('chat.networkError');
        } else if (error.length > 100) {
            displayError = t('chat.apiError');
        }

        return (
            <div className="ai-chat-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', animation: 'fadeIn 0.4s ease', padding: '20px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px', maxWidth: '500px', textAlign: 'center' }}>
                    <Bot size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
                    <h3 style={{ color: '#fca5a5', marginTop: 0, marginBottom: '12px', fontSize: '1.2rem' }}>{t('chat.oopsError')}</h3>
                    <p style={{ color: 'var(--text-primary)', marginBottom: '24px', lineHeight: 1.5 }}>
                        {displayError}
                    </p>
                    <button className="btn btn-primary" onClick={handleRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} /> {t('chat.retry')}
                    </button>
                </div>
            </div>
        );
    }

    if (!response && !isGenerating) {
        return (
            <div className="ai-chat-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '500px', animation: 'fadeIn 0.4s ease' }}>
                <Bot size={64} style={{ color: 'var(--text-muted)', marginBottom: '20px', opacity: 0.5 }} />
                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>{t('chat.noReport')}</h3>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', marginBottom: '24px', lineHeight: 1.6 }}>
                    {t('chat.emptyStateDesc').replace('{filename}', parsedData?.fileName || 'data')}
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsMCodeOpen && setIsMCodeOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '15px' }}
                >
                    <MessageSquare size={18} /> {t('chat.openAiChat')}
                </button>
            </div>
        );
    }

    return (
        <div className="ai-chat-container" style={{ animation: 'fadeIn 0.4s ease', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="ai-response-container panel">
                <div className="ai-response-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot size={24} style={{ color: 'var(--primary-color)' }} />
                        {t('chat.aiInsightResult')}
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-outline btn-sm" onClick={handleRetry} title={t('chat.resendRequest')}>
                            <RefreshCw size={14} /> {t('chat.runAgain')}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={handleCopy} title={t('chat.copyMdTitle')}>
                            <Copy size={14} /> {t('chat.copyMd')}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => window.print()} title={t('chat.exportPdfTitle')}>
                            <FileText size={14} /> {t('chat.exportPdf')}
                        </button>
                        <button className="btn btn-success btn-sm" onClick={handleExportHtml} title={t('chat.exportHtmlTitle')}>
                            <Download size={14} /> {t('chat.exportHtml')}
                        </button>
                    </div>
                </div>

                <div
                    ref={responseBodyRef}
                    className="ai-response-body markdown-content"
                    style={{ lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(response || '') }}
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
        </div>
    );
}
