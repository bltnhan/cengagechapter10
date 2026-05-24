'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../hooks/store';
import { PromptTemplate } from '../../lib/types';
import { BookTemplate, ChevronRight, Search } from 'lucide-react';
import { t } from '../../lib/i18n';

export function TemplateGallery() {
    const { templates, setTemplates, setActivePrompt, language } = useAppStore();
    const [selectedCategory, setSelectedCategory] = useState<string>(t('prompt.allCategories'));
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/prompts.json')
            .then(r => r.json())
            .then(data => {
                // Handle both array and object {templates: []} formats
                const loadedTemplates = Array.isArray(data) ? data : (data.templates || []);
                if (loadedTemplates.length > 0) {
                    setTemplates(loadedTemplates);
                }
            })
            .catch(err => console.error('Failed to load templates:', err));
    }, [setTemplates]);

    if (!templates || templates.length === 0) {
        return null;
    }

    const categories = [t('prompt.allCategories'), ...Array.from(new Set(templates.map(temp => temp.category))).filter(Boolean)];

    const filteredTemplates = templates.filter(temp => {
        const matchCategory = selectedCategory === t('prompt.allCategories') || temp.category === selectedCategory;
        const searchLower = searchQuery.toLowerCase();
        const matchSearch = !searchQuery ||
            temp.name.toLowerCase().includes(searchLower) ||
            temp.description.toLowerCase().includes(searchLower) ||
            (temp.tags && temp.tags.some(tag => tag.toLowerCase().includes(searchLower)));
        return matchCategory && matchSearch;
    });

    const handleSelectTemplate = (template: PromptTemplate) => {
        setActivePrompt(template.prompt);
    };

    return (
        <div className="template-gallery" style={{ marginTop: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <BookTemplate size={20} style={{ color: 'var(--primary-color)' }} /> {t('prompt.templateLibrary')}
            </h3>

            {/* Search and Filter Controls */}
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder={t('prompt.searchTemplates')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--surface-color)',
                            color: 'var(--text-color)',
                            fontSize: '14px'
                        }}
                    />
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {categories.map(cat => {
                        const count = cat === t('prompt.allCategories') ? templates.length : templates.filter(temp => temp.category === cat).length;
                        const isSelected = selectedCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                    backgroundColor: isSelected ? 'var(--primary-color)' : 'transparent',
                                    color: isSelected ? 'white' : 'var(--text-color)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {cat} <span style={{ opacity: 0.7, fontSize: '11px' }}>({count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Template Grid */}
            {filteredTemplates.length > 0 ? (
                <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                    {filteredTemplates.map(temp => (
                        <div
                            key={temp.id}
                            className="template-card glass-card panel"
                            style={{ padding: '15px', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
                            onClick={() => handleSelectTemplate(temp)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {temp.icon && <span style={{ fontSize: '16px' }}>{temp.icon}</span>}
                                    <strong style={{ fontSize: '15px', color: 'var(--primary-color)' }}>{temp.name}</strong>
                                </div>
                                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', flex: 1, lineHeight: '1.5' }}>{temp.description}</p>

                            {temp.tags && temp.tags.length > 0 && (
                                <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {temp.tags.map(tag => (
                                        <span key={tag} className="badge badge-outline" style={{ fontSize: '10px', padding: '2px 6px', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    {t('prompt.noTemplates')}
                </div>
            )}
        </div>
    );
}
