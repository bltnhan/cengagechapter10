'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../hooks/store';
import { formatNumber, formatPercent, truncate, formatFileSize, renderCellValue } from '../../lib/utils';
import { t } from '../../lib/i18n';
import { InteractiveCharts } from './InteractiveCharts';
import { AutoInsights } from './AutoInsights';
import { FileSpreadsheet, Layers, ShieldAlert, Activity, AlertTriangle, X, Download } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement
);

export function DataProfile() {
    const { metadata, parsedData, updateColumnType, theme } = useAppStore();
    const [selectedIssueCol, setSelectedIssueCol] = useState<any>(null);

    if (!metadata || !parsedData) return null;

    const piiCount = metadata.columns.filter(c => c.isPII).length;
    const qualityColor = metadata.qualityScore >= 80 ? 'success' : metadata.qualityScore >= 50 ? 'warning' : 'danger';
    const piiColor = piiCount > 0 ? 'danger' : 'success';

    // --- Charts Data Prep ---

    // 1. Type Distribution
    const typeMap = new Map<string, number>();
    metadata.columns.forEach(c => {
        typeMap.set(c.dataType, (typeMap.get(c.dataType) || 0) + 1);
    });
    const typeLabels = Array.from(typeMap.keys());
    const typeData = Array.from(typeMap.values());
    const typeChartData = {
        labels: typeLabels,
        datasets: [{
            data: typeData,
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    // 2. Null Distribution (Top 10 columns with most nulls)
    const nullCols = [...metadata.columns]
        .filter(c => c.nullPercent > 0)
        .sort((a, b) => b.nullPercent - a.nullPercent)
        .slice(0, 10);

    const nullChartData = {
        labels: nullCols.length > 0 ? nullCols.map(c => c.name) : ['Không có cột nào chứa Null'],
        datasets: [{
            label: 'Tỷ lệ Null (%)',
            data: nullCols.length > 0 ? nullCols.map(c => c.nullPercent) : [0],
            backgroundColor: '#f59e0b'
        }]
    };

    const isLight = theme === 'light';
    const chartTextColor = isLight ? '#475569' : '#8b949e';
    const chartGridColor = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(48, 54, 61, 0.5)';

    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        color: chartTextColor,
        plugins: {
            legend: {
                labels: { color: isLight ? '#0F172A' : '#c9d1d9' }
            }
        },
        scales: {
            x: {
                grid: { color: chartGridColor },
                ticks: { color: chartTextColor }
            },
            y: {
                grid: { color: chartGridColor },
                ticks: { color: chartTextColor }
            }
        }
    };

    return (
        <div className="profile-container" style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>{t('profile.title')}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="badge badge-outline">
                        {parsedData.fileName} • {formatFileSize(parsedData.fileSize || 0)}
                    </span>
                    <button
                        className="btn btn-secondary no-print"
                        onClick={() => window.print()}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Download size={16} /> {t('profile.exportPdf')}
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-card-icon primary"><FileSpreadsheet size={20} /></div>
                    <div className="stat-card-value">{formatNumber(metadata.totalRows)}</div>
                    <div className="stat-card-label">{t('profile.totalRows')}</div>
                </div>
                <div className="stat-card primary">
                    <div className="stat-card-icon primary"><Layers size={20} /></div>
                    <div className="stat-card-value">{metadata.totalCols}</div>
                    <div className="stat-card-label">{t('profile.totalCols')}</div>
                </div>
                <div className={`stat-card ${qualityColor}`}>
                    <div className={`stat-card-icon ${qualityColor}`}><Activity size={20} /></div>
                    <div className="stat-card-value">
                        {metadata.qualityScore}<span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/100</span>
                    </div>
                    <div className="stat-card-label">{t('profile.quality')}</div>
                </div>
                <div className={`stat-card ${piiColor}`}>
                    <div className={`stat-card-icon ${piiColor}`}><ShieldAlert size={20} /></div>
                    <div className="stat-card-value">{piiCount}</div>
                    <div className="stat-card-label">{t('profile.piiCols')}</div>
                </div>
            </div>

            <div className="panel" style={{ marginTop: '20px' }}>
                <h3 className="panel-title">{t('profile.colDetails')}</h3>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="col-index">#</th>
                                <th>{t('profile.colName')}</th>
                                <th>{t('profile.colType')}</th>
                                <th>{t('profile.nullRate')}</th>
                                <th>{t('profile.status')}</th>
                                <th>{t('profile.unique')}</th>
                                <th>{t('profile.dataSample')}</th>
                                <th>{t('profile.issues')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metadata.columns.map((col: any, i: number) => {
                                const fillPct = 100 - col.nullPercent;
                                const fillClass = fillPct >= 95 ? 'good' : fillPct >= 80 ? 'ok' : 'bad';
                                const piiIcon = col.isPII ? ' 🔒' : '';

                                return (
                                    <tr key={i}>
                                        <td className="col-index">{i + 1}</td>
                                        <td><strong>{col.name}</strong>{piiIcon}</td>
                                        <td>
                                            <select
                                                className={`type-badge ${col.dataType}`}
                                                value={col.dataType}
                                                onChange={(e) => updateColumnType(i, e.target.value)}
                                                style={{
                                                    outline: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    appearance: 'none',
                                                    textAlign: 'center'
                                                }}
                                                title={t('profile.clickToChangeType')}
                                            >
                                                <option value="text">text</option>
                                                <option value="number">number</option>
                                                <option value="date">date</option>
                                                <option value="boolean">boolean</option>
                                            </select>
                                        </td>
                                        <td>{formatPercent(col.nullPercent)}</td>
                                        <td>
                                            <div className="quality-bar">
                                                <div className={`quality-bar-fill ${fillClass}`} style={{ width: `${fillPct}%` }}></div>
                                            </div>
                                        </td>
                                        <td>{formatNumber(col.uniqueCount)}</td>
                                        <td className="text-muted text-mono text-sm">
                                            {col.sampleValues && col.sampleValues.slice(0, 2).map((v: any) => truncate(renderCellValue(v), 12)).join(', ')}
                                        </td>
                                        <td>
                                            {col.issues && col.issues.length > 0
                                                ? (
                                                    <span
                                                        className="type-badge mixed hover-effect"
                                                        style={{ cursor: 'pointer' }}
                                                        title={t('profile.clickToViewDetails')}
                                                        onClick={() => setSelectedIssueCol(col)}
                                                    >
                                                        {col.issues.length} {t('profile.issuesCount')}
                                                    </span>
                                                )
                                                : <span className="text-muted">—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '20px', marginTop: '20px' }}>
                <div className="panel chart-container">
                    <h3 className="panel-title">{t('profile.typeDistribution')}</h3>
                    <div style={{ position: 'relative', height: '250px' }}>
                        <Doughnut data={typeChartData} options={{ maintainAspectRatio: false, color: '#c9d1d9' }} />
                    </div>
                </div>
                <div className="panel chart-container">
                    <h3 className="panel-title">{t('profile.missingDataCols')}</h3>
                    <div style={{ position: 'relative', height: '250px' }}>
                        <Bar
                            data={nullChartData}
                            options={{
                                ...commonChartOptions,
                                indexAxis: 'y',
                                plugins: { legend: { display: false } }
                            } as any}
                        />
                    </div>
                </div>
            </div>

            {/* Correlation Heatmap Section */}
            {metadata.correlationMatrix && metadata.correlationMatrix.matrix.length > 1 && (
                <div className="panel chart-container" style={{ marginTop: '20px' }}>
                    <h3 className="panel-title">{t('profile.correlationMatrix')}</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}></th>
                                    {metadata.correlationMatrix.columns.map((c: string) => (
                                        <th key={c} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }} title={c}>
                                            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', height: '100px', display: 'flex', alignItems: 'center' }}>
                                                {truncate(c, 15)}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {metadata.correlationMatrix.matrix.map((row: any, i: number) => (
                                    <tr key={row.name}>
                                        <td style={{ padding: '8px', borderRight: '1px solid var(--border-color)', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                            <strong>{truncate(row.name, 15)}</strong>
                                        </td>
                                        {row.correlations.map((val: number, j: number) => {
                                            const absVal = Math.abs(val);
                                            let bg = 'inherit';
                                            let color = 'var(--text-primary)';

                                            // Handle color scaling based on theme manually
                                            if (i === j) {
                                                bg = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255,255,255,0.05)';
                                            } else {
                                                const alpha = absVal * 0.8;
                                                if (val > 0) {
                                                    bg = `rgba(16, 185, 129, ${alpha})`; // Green
                                                } else if (val < 0) {
                                                    bg = `rgba(239, 68, 68, ${alpha})`; // Red
                                                }
                                                if (alpha > 0.5) color = '#fff'; // White text for darker backgrounds always
                                            }
                                            return (
                                                <td key={j} style={{ padding: '8px', textAlign: 'center', backgroundColor: bg, color }}>
                                                    {val.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Interactive Charts Section (Scatter & Time Series) */}
            <InteractiveCharts />

            {/* AI Auto-Insights Section */}
            <AutoInsights />

            {/* Rule-based Insights Section */}
            {metadata.insights && metadata.insights.length > 0 && (
                <div className="panel" style={{ marginTop: '20px', borderColor: 'var(--warning-color)' }}>
                    <h3 className="panel-title" style={{ color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={18} /> {t('profile.insightsTitle')}
                    </h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {metadata.insights.map((insight: any, idx: number) => {
                            const bgMap: Record<string, string> = {
                                high: 'rgba(239, 68, 68, 0.1)',
                                medium: 'rgba(245, 158, 11, 0.1)',
                                low: 'rgba(16, 185, 129, 0.1)'
                            };
                            const borderMap: Record<string, string> = {
                                high: 'var(--danger-color)',
                                medium: 'var(--warning-color)',
                                low: 'var(--success-color)'
                            };

                            return (
                                <div key={idx} style={{
                                    background: bgMap[insight.severity] || 'rgba(255,255,255,0.05)',
                                    borderLeft: `3px solid ${borderMap[insight.severity] || 'var(--text-muted)'}`,
                                    padding: '12px 15px',
                                    borderRadius: '4px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong style={{ fontSize: '15px' }}>{insight.title}</strong>
                                        <span className={`type-badge ${insight.severity === 'high' ? 'string' : 'number'}`}>
                                            {insight.severity.toUpperCase()}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {insight.description}
                                    </p>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '13px' }}>
                                        <strong>{t('profile.recommendation')}</strong>
                                        <span style={{ color: 'var(--primary-color)' }}>{insight.action || insight.recommendation}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal hiển thị chi tiết vấn đề cột */}
            {selectedIssueCol && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)',
                        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => setSelectedIssueCol(null)}
                >
                    <div
                        style={{
                            background: 'var(--bg-color, #111827)', padding: '25px', borderRadius: '12px',
                            width: '90%', maxWidth: '500px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.8)',
                            maxHeight: '85vh', overflowY: 'auto',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            style={{
                                position: 'absolute', top: '15px', right: '15px', background: 'transparent',
                                border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '5px'
                            }}
                            onClick={() => setSelectedIssueCol(null)}
                        >
                            <X size={20} />
                        </button>

                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertTriangle size={20} style={{ color: 'var(--warning-color)' }} />
                            {t('profile.issueAtCol')} <span style={{ color: 'var(--primary-color)' }}>{selectedIssueCol.name}</span>
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {selectedIssueCol.issues.map((iss: any, idx: number) => {
                                const borderMap: any = { high: 'var(--danger-color)', medium: 'var(--warning-color)', low: 'var(--info-color)' };
                                const bgMap: any = { high: 'rgba(239, 68, 68, 0.1)', medium: 'rgba(245, 158, 11, 0.1)', low: 'rgba(59, 130, 246, 0.1)' };

                                return (
                                    <div key={idx} style={{
                                        background: bgMap[iss.severity] || 'rgba(255,255,255,0.02)',
                                        padding: '12px 15px', borderRadius: '6px',
                                        borderLeft: `4px solid ${borderMap[iss.severity] || 'var(--text-muted)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <strong style={{ fontSize: '14px', textTransform: 'capitalize' }}>
                                                {iss.type.replace(/_/g, ' ')}
                                            </strong>
                                            <span className={`type-badge ${iss.severity === 'high' ? 'string' : 'number'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                {iss.severity.toUpperCase()}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {iss.detail}
                                        </p>

                                        {iss.examples && iss.examples.length > 0 && (
                                            <div style={{
                                                marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)',
                                                fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)',
                                                padding: '6px 8px', borderRadius: '4px'
                                            }}>
                                                {t('profile.exampleSample')} <span style={{ color: 'var(--text-primary)' }}>{iss.examples.join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: '25px', textAlign: 'right' }}>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '8px 20px', borderRadius: '6px' }}
                                onClick={() => setSelectedIssueCol(null)}
                            >
                                {t('profile.understood')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
