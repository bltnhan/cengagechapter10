'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useAppStore } from '../../hooks/store';
import { useFileParser } from '../../hooks/useFileParser';
import { UploadCloud, FileSpreadsheet, Database, Settings } from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import { t } from '../../lib/i18n';
import { DataPreview } from '../Profile/DataPreview';
import { TmdlModelView } from '../Profile/TmdlModelView';

export function UploadZone() {
    const [isDragging, setIsDragging] = useState(false);
    const [startRow, setStartRow] = useState<number | ''>('');
    const [startCol, setStartCol] = useState<number | ''>('');
    const [showOptions, setShowOptions] = useState(false);
    const [currentFile, setCurrentFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const { isProcessing, progress, parsedData } = useAppStore();
    const tmdlModel = useAppStore((s) => (s as any).tmdlModel);
    const { handleFileUpload, handleSheetChange } = useFileParser();

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            const hasTmdl = files.some(f => f.name.toLowerCase().endsWith('.tmdl') || f.name.toLowerCase().endsWith('.zip'));

            if (hasTmdl) {
                // TMDL upload: send all files
                await handleFileUpload(files);
            } else {
                // Standard single file upload
                const file = files[0];
                setCurrentFile(file);
                await handleFileUpload(file, {
                    startRow: startRow || undefined,
                    startCol: startCol || undefined
                });
            }
        }
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const hasTmdl = files.some(f => f.name.toLowerCase().endsWith('.tmdl') || f.name.toLowerCase().endsWith('.zip'));

            if (hasTmdl) {
                await handleFileUpload(files);
            } else {
                const file = files[0];
                setCurrentFile(file);
                await handleFileUpload(file, {
                    startRow: startRow || undefined,
                    startCol: startCol || undefined
                });
            }
        }
    };

    const handleFolderChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            await handleFileUpload(files);
        }
    };

    // Check if we're displaying TMDL model data
    const isTmdlMode = !!tmdlModel;

    return (
        <div className="upload-section">
            <div style={{ position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', opacity: isProcessing ? 0.5 : 1, pointerEvents: isProcessing ? 'none' : 'auto' }}>

                    {/* Card 1: Data Analytics */}
                    <div
                        className={`dropzone ${isDragging ? 'dragover' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ cursor: 'pointer', padding: '30px 20px', minHeight: '220px' }}
                    >
                        <div className="dropzone-icon" style={{ marginBottom: '15px' }}>
                            <div style={{ position: 'relative', width: '48px', height: '48px', margin: '0 auto' }}>
                                <div style={{ position: 'absolute', inset: -15, background: 'var(--primary-color)', filter: 'blur(15px)', opacity: 0.2, borderRadius: '50%', animation: 'glowPulse 3s infinite' }}></div>
                                <FileSpreadsheet size={48} color="var(--primary-color)" style={{ position: 'relative', zIndex: 2, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} strokeWidth={1.5} />
                                <div style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--bg-surface)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '50%', padding: '3px', zIndex: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Database size={16} color="var(--accent-primary)" />
                                </div>
                            </div>
                        </div>
                        <div className="dropzone-text">
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{t('upload.dataAnalysis')}</h3>
                            <p className="text-muted text-sm">{t('upload.dataAnalysisDesc')}</p>
                            <p className="text-muted text-sm" style={{ marginTop: '8px' }}><strong>{t('upload.dataSupport')}</strong></p>
                        </div>
                    </div>

                    {/* Card 2: Power BI TMDL */}
                    <div
                        className={`dropzone ${isDragging ? 'dragover' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => folderInputRef.current?.click()}
                        style={{ cursor: 'pointer', padding: '30px 20px', minHeight: '220px' }}
                    >
                        <div className="dropzone-icon" style={{ marginBottom: '15px' }}>
                            <Database size={48} color="var(--accent-color, #f59e0b)" />
                        </div>
                        <div className="dropzone-text">
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{t('upload.powerBiModel')}</h3>
                            <p className="text-muted text-sm">{t('upload.powerBiDesc')}</p>
                            <p className="text-muted text-sm" style={{ marginTop: '8px' }}><strong>{t('upload.powerBiSupport')}</strong></p>
                        </div>
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xlsm,.xls,.csv"
                    multiple
                    hidden
                    onChange={handleFileChange}
                />
                {/* Hidden folder input for TMDL project directory upload */}
                <input
                    type="file"
                    ref={folderInputRef}
                    /* @ts-ignore - webkitdirectory is valid but not in TS types */
                    webkitdirectory=""
                    directory=""
                    multiple
                    hidden
                    onChange={handleFolderChange}
                />

                {isProcessing && (
                    <div className="progress-container" style={{ display: 'block', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '400px', background: 'var(--bg-secondary)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10 }}>
                        <div className="progress-bar" style={{ marginBottom: '15px' }}>
                            <div className="progress-fill" style={{ width: `${progress.percent}%` }}></div>
                        </div>
                        <p className="progress-text" style={{ textAlign: 'center', margin: 0, fontWeight: 500 }}>{progress.status}</p>
                    </div>
                )}
            </div>

            <div className="advanced-parse-options" style={{
                marginTop: '15px',
                textAlign: 'left',
                padding: '15px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{
                    fontWeight: 500,
                    marginBottom: showOptions ? '10px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                }} onClick={() => setShowOptions(!showOptions)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={16} /> {t('upload.parseOptions')}
                    </span>
                    <span>{showOptions ? '▼' : '▶'}</span>
                </div>

                {showOptions && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '5px' }} title={t('upload.headerRowTooltip') as string}>{t('upload.startRow')}</label>
                                <input
                                    type="number"
                                    placeholder={t('upload.auto')}
                                    min="1"
                                    className="input input-sm"
                                    style={{ width: '100%' }}
                                    value={startRow}
                                    onChange={e => setStartRow(e.target.value ? parseInt(e.target.value) : '')}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '5px' }} title={t('upload.firstColTooltip') as string}>{t('upload.startCol')}</label>
                                <input
                                    type="number"
                                    placeholder={t('upload.auto')}
                                    min="1"
                                    className="input input-sm"
                                    style={{ width: '100%' }}
                                    value={startCol}
                                    onChange={e => setStartCol(e.target.value ? parseInt(e.target.value) : '')}
                                />
                            </div>
                        </div>
                        {currentFile && (
                            <div style={{ marginTop: '10px', textAlign: 'right' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                    onClick={() => handleFileUpload(currentFile, {
                                        startRow: startRow || undefined,
                                        startCol: startCol || undefined
                                    })}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? t('upload.reading') : t('upload.applyRead')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* File info display */}
            {parsedData && (
                <div className="file-info" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex' }}>
                        {isTmdlMode ? (
                            <Database size={24} style={{ color: 'var(--accent-color, #f59e0b)', marginRight: '10px' }} />
                        ) : (
                            <FileSpreadsheet size={24} style={{ color: 'var(--primary-color)', marginRight: '10px' }} />
                        )}
                        <div>
                            <strong>{parsedData.fileName}</strong>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                                {isTmdlMode
                                    ? `Power BI Model • ${tmdlModel.tables.length} ${t('upload.tables')} • ${parsedData.totalCols} ${t('upload.columns')} • ${tmdlModel.relationships.length} relationships`
                                    : `${parsedData.activeSheet} • ${formatNumber(parsedData.totalRows)} ${t('upload.rows')} • ${parsedData.totalCols} ${t('upload.columns')}`
                                }
                            </p>
                        </div>
                    </div>
                    {!isTmdlMode && parsedData.sheetNames && parsedData.sheetNames.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('upload.sheet')}</label>
                            <select
                                className="input input-sm"
                                style={{ width: '150px' }}
                                value={parsedData.activeSheet}
                                onChange={(e) => handleSheetChange && handleSheetChange(e.target.value)}
                                disabled={isProcessing}
                            >
                                {parsedData.sheetNames.map(sheet => (
                                    <option key={sheet} value={sheet}>{sheet}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Conditional: show TMDL model view or standard data preview */}
            {isTmdlMode && tmdlModel ? (
                <TmdlModelView model={tmdlModel} />
            ) : parsedData ? (
                <DataPreview parsedData={parsedData} />
            ) : null}
        </div>
    );
}
