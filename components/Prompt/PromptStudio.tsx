'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '../../hooks/store';
import { generatePrompt, detectDomain, getSuggestedActions } from '../../lib/promptgen';
import { useGeminiApi } from '../../hooks/useGeminiApi';
import { Shield, FileText, Unlock, Copy, ExternalLink, Send, RefreshCw, PenTool } from 'lucide-react';
import { t } from '../../lib/i18n';

export function PromptStudio() {
    const { metadata, parsedData, privacyShield, activePrompt, setActivePrompt, setActiveTab, activeTab, apiKey, setLastSubmittedPrompt } = useAppStore() as any;
    const { isGenerating, generateInsight } = useGeminiApi();

    const [promptMode, setPromptMode] = useState<'privacy' | 'sample' | 'full'>(privacyShield ? 'privacy' : 'sample');
    const [userContext, setUserContext] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [selectedAction, setSelectedAction] = useState<any>(null);

    // Auto-generate prompt when dependencies change
    useEffect(() => {
        if (metadata && parsedData && activeTab === 'prompt') {
            const p = generatePrompt(metadata, parsedData, {
                mode: promptMode,
                userContext: userContext || activePrompt,
                action: selectedAction
            });
            setGeneratedPrompt(p);
        }
    }, [metadata, parsedData, promptMode, userContext, activePrompt, activeTab, selectedAction]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPrompt);
        // Note: should trigger toast here ideally, relying on standard alert for now
    };

    const handleSendToGemini = async () => {
        if (!generatedPrompt) return;
        setActiveTab('chat');
        setLastSubmittedPrompt(generatedPrompt);
        // We don't await because we want the user to jump to chat tab immediately
        generateInsight(generatedPrompt);
    };

    const hasApiKey = !!apiKey;
    const domainInfo = detectDomain(metadata);
    const suggestedActions = getSuggestedActions(domainInfo);

    const handleChipClick = (action: any) => {
        setSelectedAction(action);

        // Immediately generate and send to Gemini if has API key
        setTimeout(() => {
            if (hasApiKey) {
                // Must read states from current run, but setLastSubmittedPrompt will take the latest state
                // Since this might race with useEffect, let's just use generatePrompt directly here to be safe
                const instantPrompt = generatePrompt(metadata, parsedData, {
                    mode: promptMode,
                    userContext: userContext || activePrompt,
                    action: action
                });
                setActiveTab('chat');
                setLastSubmittedPrompt(instantPrompt);
                generateInsight(instantPrompt);
            }
        }, 50);
    };

    return (
        <div className="prompt-studio-container" style={{ animation: 'fadeIn 0.4s ease' }}>
            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PenTool size={20} style={{ color: 'var(--accent-primary)' }} /> {t('prompt.title')}
                        </h2>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                            {t('prompt.autoDetectDomain')}
                            <strong style={{ color: 'var(--accent-primary)', background: 'rgba(139,92,246,0.15)', padding: '3px 10px', borderRadius: '12px', marginLeft: '5px' }}>
                                {domainInfo.icon} {domainInfo.domain}
                            </strong>
                        </p>
                    </div>
                </div>

                <div className="prompt-controls" style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', marginBottom: '20px' }}>
                    <div className="prompt-mode-group" style={{ display: 'flex', gap: '5px' }}>
                        <button
                            className={`btn btn-sm ${promptMode === 'privacy' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setPromptMode('privacy')}
                            title={t('prompt.privacyMode')}
                        >
                            <Shield size={14} /> Privacy
                        </button>
                        <button
                            className={`btn btn-sm ${promptMode === 'sample' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setPromptMode('sample')}
                            title={t('prompt.sampleMode')}
                        >
                            <FileText size={14} /> Sample
                        </button>
                        {!privacyShield && (
                            <button
                                className={`btn btn-sm ${promptMode === 'full' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setPromptMode('full')}
                                title={t('prompt.fullMode')}
                            >
                                <Unlock size={14} /> Full
                            </button>
                        )}
                    </div>

                    <button className="btn btn-outline btn-sm" onClick={() => {
                        setUserContext('');
                        setSelectedAction(null);
                    }}>
                        <RefreshCw size={14} /> {t('prompt.clearContext')}
                    </button>
                </div>

                <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 500, color: '#fff' }}>{t('prompt.quickSuggestions')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', maxHeight: '120px', overflowY: 'auto' }}>
                    {suggestedActions.map((action, idx) => (
                        <button
                            key={idx}
                            className="btn btn-outline btn-sm"
                            title={action.instruction}
                            style={{
                                borderRadius: '20px',
                                padding: '6px 14px',
                                background: selectedAction?.id === action.id ? 'var(--accent-primary)' : '',
                                color: selectedAction?.id === action.id ? '#fff' : '',
                                borderColor: selectedAction?.id === action.id ? 'var(--accent-primary)' : ''
                            }}
                            onClick={() => handleChipClick(action)}
                        >
                            {action.icon} {action.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="user-context" style={{ marginBottom: '20px' }}>
                <label htmlFor="user-context-input" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    {t('prompt.customRequest')}
                </label>
                <textarea
                    id="user-context-input"
                    className="form-control"
                    placeholder={t('prompt.customPlaceholder')}
                    value={userContext || activePrompt}
                    onChange={(e) => {
                        setUserContext(e.target.value);
                        setActivePrompt(e.target.value);
                        setSelectedAction(null); // clear action when user types
                    }}
                    rows={3}
                    style={{ width: '100%', resize: 'vertical' }}
                />
            </div>

            <div className="prompt-editor-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                <div className="prompt-editor-toolbar" style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface-color)', padding: '10px 15px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', border: '1px solid var(--border-color)', borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        {t('prompt.output')}
                    </div>
                    <span className="text-muted text-sm">{generatedPrompt.length} {t('prompt.chars')}</span>
                </div>
                <textarea
                    className="prompt-editor form-control"
                    readOnly
                    value={generatedPrompt}
                    style={{
                        flex: 1,
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        resize: 'none',
                        background: 'rgba(0,0,0,0.2)'
                    }}
                />
            </div>

            <div className="prompt-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={handleCopy}>
                    <Copy size={16} /> {t('prompt.copyPrompt')}
                </button>
                <button className="btn btn-outline" onClick={() => window.open('https://gemini.google.com/', '_blank')}>
                    <ExternalLink size={16} /> {t('prompt.openGemini')}
                </button>

                <div style={{ flex: 1 }}></div>

                <button
                    className="btn btn-api"
                    style={{ background: 'var(--success-color)', color: 'white', border: 'none' }}
                    disabled={!hasApiKey || isGenerating}
                    title={!hasApiKey ? t('prompt.needApiKey') : t('prompt.sendDirect')}
                    onClick={handleSendToGemini}
                >
                    <Send size={16} /> {isGenerating ? t('prompt.sending') : t('prompt.sendGemini')}
                </button>
            </div>
        </div>
    );
}
