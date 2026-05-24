'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../hooks/store';
import { useMCodeChat } from '../../hooks/useMCodeChat';
import { BookOpen, X, Send, Paperclip, Camera, Trash2, User, Bot, FileText, Image as ImageIcon, Maximize2, Minimize2, Plus } from 'lucide-react';
import { renderMarkdown } from '../../lib/markdown';
import { renderChartPlaceholders } from '../../lib/chartRenderer';
import { t } from '../../lib/i18n';
import * as XLSX from 'xlsx';

export function MCodeChat() {
    const { isMCodeOpen, setIsMCodeOpen, mcodeMessages, clearMCodeMessages, apiKey, metadata, isFormulaGraphFullscreen, showChatInFullscreen } = useAppStore() as any;
    const { sendMessage, isGenerating } = useMCodeChat();

    if (isFormulaGraphFullscreen && !showChatInFullscreen) {
        return null;
    }

    const [inputValue, setInputValue] = useState('');
    const [attachment, setAttachment] = useState<{ type: 'file' | 'image'; name: string; content?: string; inlineData?: { mimeType: string; data: string } } | null>(null);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [mcodeMessages, isGenerating, isMCodeOpen]);

    // Render chart placeholders after new AI messages
    useEffect(() => {
        if (messagesContainerRef.current && !isGenerating) {
            renderChartPlaceholders(messagesContainerRef.current);
        }
    }, [mcodeMessages, isGenerating]);

    const suggestions = [
        t('mcode.sug1'),
        t('mcode.sug2'),
        t('mcode.sug3'),
        t('mcode.sug4'),
        t('mcode.sug5'),
        t('mcode.sug6')
    ];

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if ((!inputValue.trim() && !attachment) || isGenerating || !apiKey) return;

        let contentObj = attachment?.inlineData;
        let textToSend = inputValue.trim();
        let fileLabel = attachment?.name;

        // If it's a text/excel file, append the content to the prompt so the user sees textToSend but API gets the full context
        if (attachment?.type === 'file' && attachment.content) {
            textToSend = `${textToSend}\n\n[Nội dung file ${attachment.name}]:\n\`\`\`\n${attachment.content}\n\`\`\``;
        }

        sendMessage(textToSend, contentObj, fileLabel);
        setInputValue('');
        setAttachment(null);
        setSelectedAction(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        try {
            if (isImage) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    // remove data:image/png;base64, prefix
                    const base64Data = result.split(',')[1];
                    setAttachment({
                        type: 'image',
                        name: file.name,
                        inlineData: { mimeType: file.type, data: base64Data }
                    });
                };
                reader.readAsDataURL(file);
            } else if (isExcel) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        // Convert up to 10 rows to JSON to save context space
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        const previewData = jsonData.slice(0, 10);

                        // Convert back to CSV string for smaller prompt payload
                        const csvContent = previewData.map((row: any) => row.join(',')).join('\\n');

                        setAttachment({
                            type: 'file',
                            name: file.name,
                            content: `Format: Excel preview (first 10 rows)\n${csvContent}`
                        });
                    } catch (err) {
                        alert(t('mcode.errorReadExcel'));
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                // Text files (.csv, .txt, .pq, .m)
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    setAttachment({
                        type: 'file',
                        name: file.name,
                        content: result.length > 5000 ? result.substring(0, 5000) + t('mcode.fileTooLarge') : result
                    });
                };
                reader.readAsText(file);
            }
        } catch (error) {
            console.error('File read error:', error);
            alert(t('mcode.errorReadFile'));
        }

        // Reset input so the same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const result = evt.target?.result as string;
                        const base64Data = result.split(',')[1];
                        setAttachment({
                            type: 'image',
                            name: `pasted-image-${Date.now()}.png`,
                            inlineData: { mimeType: blob.type, data: base64Data }
                        });
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    if (!isMCodeOpen) {
        return (
            <button
                className="mcode-fab"
                onClick={() => setIsMCodeOpen(true)}
                title={t('mcode.askExpertTitle')}
            >
                <BookOpen size={24} />
            </button>
        );
    }

    return (
        <div className={`mcode-panel ${isExpanded ? 'expanded' : ''}`}>
            {/* Header */}
            <div className="mcode-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--accent-primary)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                        <BookOpen size={18} color="white" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px' }}>{t('mcode.title')}</h3>
                        <div style={{ fontSize: '11px', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <span style={{ flexShrink: 0, width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
                                {t('mcode.ready')}
                            </span>
                            {metadata && (
                                <span style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                    <FileText size={10} /> {t('mcode.dataLoaded')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {mcodeMessages.length > 0 && (
                        <button className="btn btn-outline btn-sm" onClick={clearMCodeMessages} title={t('mcode.newSessionTitle')} style={{ fontSize: '11px', padding: '2px 8px', borderColor: 'var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={12} /> {t('mcode.newSession')}
                        </button>
                    )}
                    <button className="mcode-icon-btn" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? t('mcode.minimize') : t('mcode.maximize')}>
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button className="mcode-icon-btn" onClick={() => setIsMCodeOpen(false)}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Chat Body */}
            <div ref={messagesContainerRef} className="mcode-messages">
                {!apiKey ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                        <BookOpen size={48} style={{ opacity: 0.2, margin: '0 auto 15px' }} />
                        <p>{t('mcode.requireApiKeyDesc')}</p>
                    </div>
                ) : mcodeMessages.length === 0 ? (
                    <div style={{ padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: '0 0 10px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {t('mcode.assistantTitle')}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                                {t('mcode.assistantDesc')}
                            </p>
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t('mcode.suggestionsTitle')}
                        </div>
                        <div className="mcode-suggestions">
                            {suggestions.map((s, i) => (
                                <button key={i} className="mcode-chip" onClick={() => {
                                    setSelectedAction(s);
                                    sendMessage(s);
                                }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '15px' }}>
                        {mcodeMessages.map((msg: any, idx: number) => (
                            <div key={idx} className={`mcode-msg-wrapper ${msg.role === 'user' ? 'mcode-msg--user' : 'mcode-msg--ai'}`}>
                                {msg.role !== 'user' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <div className="mcode-avatar ai">
                                            <Bot size={16} color="white" />
                                        </div>
                                        {msg.modelUsed && (
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--sidebar-bg)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', maxWidth: '50px', textAlign: 'center', wordBreak: 'break-all' }}>
                                                {msg.modelUsed.replace('gemini-', '').replace('gemma-', '')}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className={`mcode-msg-content ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble markdown-content'}`}>
                                    {msg.image && (
                                        <img src={msg.image} alt="Attached" className="mcode-msg-image" />
                                    )}
                                    {msg.fileLabel && (
                                        <div className="mcode-msg-file">
                                            <FileText size={14} /> {msg.fileLabel}
                                        </div>
                                    )}
                                    {msg.role === 'user' ? (
                                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                            {/* Extract just the user text, not the appended file context for display */}
                                            {msg.content.split('\\n\\n[Nội dung file')[0]}
                                        </div>
                                    ) : (
                                        <div
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                            onClick={(e) => {
                                                // Handle copy code blocks inside chat
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
                                                                setTimeout(() => { span.textContent = originalText; }, 2000);
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    )}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="mcode-avatar user">
                                        <User size={16} color="white" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="mcode-msg-wrapper mcode-msg--ai">
                                <div className="mcode-avatar ai"><Bot size={16} color="white" /></div>
                                <div className="mcode-msg-content ai-bubble">
                                    <div className="typing-indicator"><span></span><span></span><span></span></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="mcode-input-area" onPaste={handlePaste}>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".m,.pq,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                />

                {attachment && (
                    <div className="mcode-attachment-preview">
                        {attachment.type === 'image' && attachment.inlineData ? (
                            <img src={`data:${attachment.inlineData.mimeType};base64,${attachment.inlineData.data}`} alt="preview" />
                        ) : (
                            <div className="file-icon"><FileText size={16} /></div>
                        )}
                        <span className="file-name">{attachment.name}</span>
                        <button className="remove-btn" onClick={() => setAttachment(null)}><X size={14} /></button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mcode-input-form">
                    <div className="input-toolbar">
                        <button type="button" className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title={t('mcode.attachFile')}>
                            <Paperclip size={18} />
                        </button>
                        <button type="button" className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title={t('mcode.attachImage')}>
                            <Camera size={18} />
                        </button>
                    </div>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={apiKey ? t('mcode.inputPlaceholder') : t('mcode.inputDisabled')}
                        disabled={isGenerating || !apiKey}
                        rows={1}
                        className="mcode-textarea"
                    />
                    <button
                        type="submit"
                        className="mcode-send-btn"
                        disabled={isGenerating || (!inputValue.trim() && !attachment) || !apiKey}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
