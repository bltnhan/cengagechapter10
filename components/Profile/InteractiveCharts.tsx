'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../hooks/store';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Scatter, Line } from 'react-chartjs-2';
import { formatNumber } from '../../lib/utils';
import { ColumnMeta } from '../../lib/types';
import { t } from '../../lib/i18n';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export function InteractiveCharts() {
    const { parsedData, metadata } = useAppStore();

    const [scatterX, setScatterX] = useState<string>('');
    const [scatterY, setScatterY] = useState<string>('');
    const [timeCol, setTimeCol] = useState<string>('');
    const [timeValCol, setTimeValCol] = useState<string>('');

    const numericCols = useMemo(() => {
        if (!metadata) return [];
        return metadata.columns.filter((c: ColumnMeta) => c.type === 'numeric');
    }, [metadata]);

    const dateCols = useMemo(() => {
        if (!metadata) return [];
        return metadata.columns.filter((c: ColumnMeta) => c.type === 'date' || c.dataType === 'date' || c.dataType === 'datetime');
    }, [metadata]);

    // Initialize default selections
    React.useEffect(() => {
        if (numericCols.length >= 2 && !scatterX && !scatterY) {
            setScatterX(numericCols[0].name);
            setScatterY(numericCols[1].name);
        }
    }, [numericCols, scatterX, scatterY]);

    React.useEffect(() => {
        if (dateCols.length >= 1 && numericCols.length >= 1 && !timeCol && !timeValCol) {
            setTimeCol(dateCols[0].name);
            setTimeValCol(numericCols[0].name);
        }
    }, [dateCols, numericCols, timeCol, timeValCol]);

    if (!parsedData || !metadata) return null;

    // Scatter Data
    const scatterChartData = useMemo(() => {
        if (!scatterX || !scatterY) return null;
        const xIndex = parsedData.headers.indexOf(scatterX);
        const yIndex = parsedData.headers.indexOf(scatterY);

        if (xIndex === -1 || yIndex === -1) return null;

        // Take up to 1000 points to avoid browser crash
        const points = [];
        const limit = Math.min(parsedData.rows.length, 1000);

        for (let i = 0; i < limit; i++) {
            const xVal = Number(parsedData.rows[i][xIndex]);
            const yVal = Number(parsedData.rows[i][yIndex]);
            if (!isNaN(xVal) && !isNaN(yVal)) {
                points.push({ x: xVal, y: yVal });
            }
        }

        return {
            datasets: [
                {
                    label: `${scatterY} vs ${scatterX}`,
                    data: points,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)', // Green
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        };
    }, [parsedData, scatterX, scatterY]);

    // Time Series Data
    const timeChartData = useMemo(() => {
        if (!timeCol || !timeValCol) return null;

        const tIndex = parsedData.headers.indexOf(timeCol);
        const vIndex = parsedData.headers.indexOf(timeValCol);
        if (tIndex === -1 || vIndex === -1) return null;

        // Group by time (taking first 500 unique/sorted points for simplicity, or aggregate)
        // Here we just sort by time and plot
        const dataMap = new Map<string, number>();

        parsedData.rows.forEach(row => {
            const tValOrig = row[tIndex];
            const tValStr = tValOrig ? String(tValOrig).trim() : '';
            if (!tValStr) return;

            const vVal = Number(row[vIndex]);
            if (!isNaN(vVal)) {
                dataMap.set(tValStr, (dataMap.get(tValStr) || 0) + vVal);
            }
        });

        // Try to parse dates for sorting
        const entries = Array.from(dataMap.entries()).map(([k, v]) => {
            const date = new Date(k);
            return {
                label: k,
                val: v,
                timestamp: isNaN(date.getTime()) ? 0 : date.getTime()
            };
        });

        // Only sort if timestamps are valid for most of them
        const validDates = entries.filter(e => e.timestamp > 0);
        if (validDates.length > entries.length * 0.5) {
            entries.sort((a, b) => a.timestamp - b.timestamp);
        }

        // Limit to 100 points to avoid clutter
        const displayEntries = entries.slice(0, 100);

        return {
            labels: displayEntries.map(e => e.label),
            datasets: [
                {
                    label: t('charts.totalBy').replace('{val}', timeValCol).replace('{time}', timeCol),
                    data: displayEntries.map(e => e.val),
                    borderColor: 'rgba(59, 130, 246, 1)', // Blue
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    }, [parsedData, timeCol, timeValCol]);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: 'var(--text-primary)' }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'var(--text-muted)' }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'var(--text-muted)' }
            }
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', marginTop: '20px' }}>
            {/* Scatter Plot */}
            {numericCols.length >= 2 && (
                <div className="panel chart-container">
                    <h3 className="panel-title">{t('charts.scatterTitle')}</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <select className="input input-sm" style={{ flex: 1 }} value={scatterX} onChange={(e) => setScatterX(e.target.value)}>
                            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name} (X)</option>)}
                        </select>
                        <select className="input input-sm" style={{ flex: 1 }} value={scatterY} onChange={(e) => setScatterY(e.target.value)}>
                            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name} (Y)</option>)}
                        </select>
                    </div>
                    <div style={{ position: 'relative', height: '300px' }}>
                        {scatterChartData ? (
                            <Scatter data={scatterChartData} options={{
                                ...commonOptions,
                                plugins: {
                                    ...commonOptions.plugins,
                                    tooltip: {
                                        callbacks: {
                                            label: (ctx: any) => `(${formatNumber(ctx.raw.x)}, ${formatNumber(ctx.raw.y)})`
                                        }
                                    }
                                },
                                scales: {
                                    x: { ...commonOptions.scales.x, type: 'linear', position: 'bottom' },
                                    y: { ...commonOptions.scales.y }
                                }
                            } as any} />
                        ) : (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '100px' }}>{t('charts.select2Numeric')}</div>
                        )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                        {t('charts.scatterLimit')}
                    </p>
                </div>
            )}

            {/* Time Series Plot */}
            {dateCols.length >= 1 && numericCols.length >= 1 && (
                <div className="panel chart-container">
                    <h3 className="panel-title">{t('charts.timeTitle')}</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <select className="input input-sm" style={{ flex: 1 }} value={timeCol} onChange={(e) => setTimeCol(e.target.value)}>
                            {dateCols.map(c => <option key={c.name} value={c.name}>{c.name} ({t('charts.timeAxis')})</option>)}
                        </select>
                        <select className="input input-sm" style={{ flex: 1 }} value={timeValCol} onChange={(e) => setTimeValCol(e.target.value)}>
                            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name} ({t('charts.valueAxis')})</option>)}
                        </select>
                    </div>
                    <div style={{ position: 'relative', height: '300px' }}>
                        {timeChartData ? (
                            <Line data={timeChartData} options={{
                                ...commonOptions,
                                plugins: {
                                    ...commonOptions.plugins,
                                    tooltip: {
                                        callbacks: {
                                            label: (ctx: any) => `${ctx.dataset.label}: ${formatNumber(ctx.raw)}`
                                        }
                                    }
                                }
                            } as any} />
                        ) : (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '100px' }}>{t('charts.selectDateNum')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
