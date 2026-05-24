'use client';

import { useState } from 'react';
import { TmdlModel, TmdlTable } from '../../lib/tmdlParser';
import { Database, Table2, Columns3, BarChart3, Link2, ChevronDown, ChevronRight, Code2, Eye, EyeOff } from 'lucide-react';
import { TmdlAutoInsights } from './TmdlAutoInsights';
import { t } from '../../lib/i18n';

interface TmdlModelViewProps {
    model: TmdlModel;
}

export function TmdlModelView({ model }: TmdlModelViewProps) {
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    const [showMeasures, setShowMeasures] = useState(true);

    const totalColumns = model.tables.reduce((s, t) => s + t.columns.length, 0);
    const totalMeasures = model.tables.reduce((s, t) => s + t.measures.length, 0);

    const toggleTable = (name: string) => {
        setExpandedTables(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedTables(new Set(model.tables.map(t => t.name)));
    };

    const collapseAll = () => {
        setExpandedTables(new Set());
    };

    return (
        <div className="tmdl-model-view" style={{ marginTop: '20px' }}>
            {/* ── Summary Cards ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <SummaryCard icon={<Table2 size={20} />} label={t('upload.tables')} value={model.tables.length} color="#3b82f6" />
                <SummaryCard icon={<Columns3 size={20} />} label={t('upload.columns')} value={totalColumns} color="#10b981" />
                <SummaryCard icon={<BarChart3 size={20} />} label="Measures" value={totalMeasures} color="#f59e0b" />
                <SummaryCard icon={<Link2 size={20} />} label="Relationships" value={model.relationships.length} color="#8b5cf6" />
            </div>

            {model.culture && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    🌐 Culture: <strong>{model.culture}</strong>
                    {model.compatibilityLevel && ` • Compatibility: ${model.compatibilityLevel}`}
                </p>
            )}

            {/* ── Controls ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button className="btn btn-outline btn-sm" onClick={expandAll} style={{ fontSize: '11px', padding: '4px 10px' }}>
                    Mở tất cả
                </button>
                <button className="btn btn-outline btn-sm" onClick={collapseAll} style={{ fontSize: '11px', padding: '4px 10px' }}>
                    Thu gọn
                </button>
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowMeasures(!showMeasures)}
                    style={{ fontSize: '11px', padding: '4px 10px', marginLeft: 'auto' }}
                >
                    {showMeasures ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span style={{ marginLeft: '4px' }}>{showMeasures ? 'Ẩn DAX' : 'Hiện DAX'}</span>
                </button>
            </div>

            {/* ── Tables List ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {model.tables.map(table => (
                    <TableCard
                        key={table.name}
                        table={table}
                        isExpanded={expandedTables.has(table.name)}
                        onToggle={() => toggleTable(table.name)}
                        showMeasures={showMeasures}
                    />
                ))}
            </div>

            {/* ── Relationships ── */}
            {model.relationships.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px' }}>
                        <Link2 size={16} style={{ color: '#8b5cf6' }} />
                        Relationships ({model.relationships.length})
                    </h4>
                    <div style={{
                        background: 'rgba(139, 92, 246, 0.08)',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}>
                        {model.relationships.map((rel, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 0',
                                fontSize: '12px',
                                borderBottom: i < model.relationships.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                flexWrap: 'wrap',
                            }}>
                                <code style={{ color: '#3b82f6' }}>{rel.fromTable}</code>
                                <span style={{ opacity: 0.5 }}>[</span>
                                <code style={{ color: '#10b981' }}>{rel.fromColumn}</code>
                                <span style={{ opacity: 0.5 }}>]</span>
                                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>→</span>
                                <code style={{ color: '#3b82f6' }}>{rel.toTable}</code>
                                <span style={{ opacity: 0.5 }}>[</span>
                                <code style={{ color: '#10b981' }}>{rel.toColumn}</code>
                                <span style={{ opacity: 0.5 }}>]</span>
                                {!rel.isActive && (
                                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                        INACTIVE
                                    </span>
                                )}
                                {rel.crossFilteringBehavior && (
                                    <span style={{ fontSize: '10px', opacity: 0.6 }}>({rel.crossFilteringBehavior})</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── AI Analysis ── */}
            <TmdlAutoInsights model={model} />
        </div>
    );
}

// ── Summary Card ──
function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div style={{
            background: `linear-gradient(135deg, ${color}15, ${color}08)`,
            border: `1px solid ${color}30`,
            borderRadius: '10px',
            padding: '14px',
            textAlign: 'center',
        }}>
            <div style={{ color, marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
        </div>
    );
}

// ── Table Card ──
function TableCard({ table, isExpanded, onToggle, showMeasures }: {
    table: TmdlTable;
    isExpanded: boolean;
    onToggle: () => void;
    showMeasures: boolean;
}) {
    const dataTypeColors: Record<string, string> = {
        'int64': '#3b82f6',
        'double': '#f59e0b',
        'decimal': '#f59e0b',
        'string': '#10b981',
        'boolean': '#ef4444',
        'datetime': '#8b5cf6',
        'dateTime': '#8b5cf6',
    };

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div
                onClick={onToggle}
                style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isExpanded ? 'rgba(59,130,246,0.08)' : 'transparent',
                    transition: 'background 0.2s',
                }}
            >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Database size={14} style={{ color: '#3b82f6' }} />
                <strong style={{ fontSize: '13px', flex: 1 }}>
                    {table.name}
                    {table.isHidden && <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '6px' }}>(hidden)</span>}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {table.columns.length} {t('upload.columns')}
                    {table.measures.length > 0 && ` • ${table.measures.length} measures`}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div style={{ padding: '0 14px 14px' }}>
                    {/* Columns */}
                    {table.columns.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                {t('upload.columns')} ({table.columns.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {table.columns.map((col, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        borderRadius: '4px',
                                        background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    }}>
                                        <span style={{ flex: 1 }}>
                                            {col.isKey && '🔑 '}
                                            {col.name}
                                            {col.expression && <Code2 size={10} style={{ marginLeft: '4px', opacity: 0.5 }} />}
                                        </span>
                                        <code style={{
                                            fontSize: '10px',
                                            padding: '1px 6px',
                                            borderRadius: '3px',
                                            background: `${dataTypeColors[col.dataType] || '#6b7280'}15`,
                                            color: dataTypeColors[col.dataType] || '#6b7280',
                                        }}>
                                            {col.dataType}
                                        </code>
                                        {col.isHidden && <EyeOff size={10} style={{ opacity: 0.4 }} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Measures */}
                    {showMeasures && table.measures.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', marginBottom: '6px', textTransform: 'uppercase' }}>
                                DAX Measures ({table.measures.length})
                            </div>
                            {table.measures.map((m, i) => (
                                <div key={i} style={{
                                    marginBottom: '8px',
                                    background: 'rgba(245,158,11,0.06)',
                                    border: '1px solid rgba(245,158,11,0.15)',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#f59e0b' }}>
                                        {m.name}
                                    </div>
                                    <pre style={{
                                        fontSize: '11px',
                                        margin: 0,
                                        padding: '6px 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(0,0,0,0.3)',
                                        overflowX: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        color: '#e2e8f0',
                                    }}>
                                        {m.expression}
                                    </pre>
                                    {m.formatString && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Format: {m.formatString}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
