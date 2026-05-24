'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '../../hooks/store';
import { t } from '../../lib/i18n';
import { X, Save, AlertCircle, MessageSquare, Sparkles, Globe } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const store = useAppStore();

    // Map deprecated model IDs to the correct valid ones
    const normalizeModel = (modelId: string, defaultModel: string) => {
        if (!modelId) return defaultModel;
        return modelId;
    };

    // Local state for the form so we only apply on save
    const [localKey, setLocalKey] = useState(store.apiKey);
    const [localSysRole, setLocalSysRole] = useState(store.systemRole);
    const [localPrivacy, setLocalPrivacy] = useState(store.privacyShield);
    const [localShowChatInFullscreen, setLocalShowChatInFullscreen] = useState(store.showChatInFullscreen);
    const [localChatModel, setLocalChatModel] = useState(() => normalizeModel((store as any).chatModel, 'gemma-3-27b-it'));
    const [localInsightModel, setLocalInsightModel] = useState(() => normalizeModel((store as any).insightModel, 'gemini-2.5-flash'));
    const [localLanguage, setLocalLanguage] = useState<'vi' | 'en'>((store.language as 'vi' | 'en') || 'vi');

    // Keep local state synced when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalKey(store.apiKey);
            setLocalSysRole(store.systemRole);
            setLocalPrivacy(store.privacyShield);
            setLocalShowChatInFullscreen(store.showChatInFullscreen);
            setLocalChatModel(normalizeModel((store as any).chatModel, 'gemma-3-27b-it'));
            setLocalInsightModel(normalizeModel((store as any).insightModel, 'gemini-2.5-flash'));
            setLocalLanguage((store.language as 'vi' | 'en') || 'vi');
        }
    }, [isOpen, store.apiKey, store.systemRole, store.privacyShield, store.showChatInFullscreen, (store as any).chatModel, (store as any).insightModel, store.language]);

    if (!isOpen) return null;

    const handleSave = () => {
        store.setApiKey(localKey);
        store.setSystemRole(localSysRole);
        store.setPrivacyShield(localPrivacy);
        store.setShowChatInFullscreen(localShowChatInFullscreen);
        if ((store as any).setChatModel) {
            (store as any).setChatModel(localChatModel);
        }
        if ((store as any).setInsightModel) {
            (store as any).setInsightModel(localInsightModel);
        }
        if (store.setLanguage) {
            store.setLanguage(localLanguage as 'vi' | 'en');
        }
        onClose();
    };

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className="modal-header">
                    <h3>{t('settings.title', localLanguage)}</h3>
                    <button className="btn btn-icon" onClick={onClose} aria-label={t('common.close', localLanguage)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="alert custom-alert" style={{ marginBottom: '20px' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>
                            {t('settings.apiKeyNote', localLanguage)}
                        </span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="settings-apikey">Gemini API Key</label>
                        <input
                            type="password"
                            id="settings-apikey"
                            className="form-control"
                            placeholder="AIzaSy..."
                            value={localKey}
                            onChange={(e) => setLocalKey(e.target.value)}
                        />
                        <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '8px' }}>
                            {t('settings.noApiKey', localLanguage)} <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline' }}>{t('settings.getApiKey', localLanguage)}</a>
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="settings-language" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={14} /> {t('settings.language', localLanguage)}
                        </label>
                        <select
                            id="settings-language"
                            className="form-control"
                            value={localLanguage}
                            onChange={(e) => setLocalLanguage(e.target.value as 'vi' | 'en')}
                            style={{ appearance: 'auto' }}
                        >
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                        </select>
                    </div>

                    {/* Dual Model Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label htmlFor="settings-chat-model" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MessageSquare size={14} /> Model Chat (MCode)
                            </label>
                            <select
                                id="settings-chat-model"
                                className="form-control"
                                value={localChatModel}
                                onChange={(e) => setLocalChatModel(e.target.value)}
                                style={{ appearance: 'auto' }}
                            >
                                <optgroup label="Gemma 3">
                                    <option value="gemma-3-27b-it">Gemma 3 27B IT</option>
                                    <option value="gemma-3-12b-it">Gemma 3 12B IT</option>
                                </optgroup>
                                <optgroup label="Gemini">
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    <option value="gemini-3.0-flash">Gemini 3 Flash</option>
                                </optgroup>
                            </select>
                            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Dùng cho chatbot MCode
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="settings-insight-model" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sparkles size={14} /> Model Phân tích
                            </label>
                            <select
                                id="settings-insight-model"
                                className="form-control"
                                value={localInsightModel}
                                onChange={(e) => setLocalInsightModel(e.target.value)}
                                style={{ appearance: 'auto' }}
                            >
                                <optgroup label="Gemma 3">
                                    <option value="gemma-3-27b-it">Gemma 3 27B IT</option>
                                    <option value="gemma-3-12b-it">Gemma 3 12B IT</option>
                                </optgroup>
                                <optgroup label="Gemini">
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    <option value="gemini-3.0-flash">Gemini 3 Flash</option>
                                </optgroup>
                            </select>
                            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Dùng cho Insights & TMDL Analysis
                            </small>
                        </div>
                    </div>

                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="settings-privacy"
                            checked={localPrivacy}
                            onChange={(e) => setLocalPrivacy(e.target.checked)}
                        />
                        <label htmlFor="settings-privacy">
                            <strong>{t('settings.privacyShield', localLanguage)}</strong>
                            <small style={{ display: 'block', color: 'var(--text-muted)' }}>{t('settings.privacyShieldNote', localLanguage)}</small>
                        </label>
                    </div>

                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="settings-chat-fullscreen"
                            checked={localShowChatInFullscreen}
                            onChange={(e) => setLocalShowChatInFullscreen(e.target.checked)}
                        />
                        <label htmlFor="settings-chat-fullscreen">
                            <strong>{t('settings.chatFullscreen', localLanguage)}</strong>
                            <small style={{ display: 'block', color: 'var(--text-muted)' }}>{t('settings.chatFullscreenNote', localLanguage)}</small>
                        </label>
                    </div>

                    <div className="form-group">
                        <label htmlFor="settings-sysrole">{t('settings.systemRole', localLanguage)}</label>
                        <textarea
                            id="settings-sysrole"
                            className="form-control"
                            rows={4}
                            value={localSysRole}
                            onChange={(e) => setLocalSysRole(e.target.value)}
                        ></textarea>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>{t('common.cancel', localLanguage)}</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <Save size={16} /> {t('common.save', localLanguage)}
                    </button>
                </div>
            </div>
        </div>
    );
}
