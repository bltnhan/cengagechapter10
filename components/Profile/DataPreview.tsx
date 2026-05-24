'use client';

import { ParsedData } from '../../lib/types';
import { truncate, renderCellValue } from '../../lib/utils';
import { useState } from 'react';
import { t } from '../../lib/i18n';

interface DataPreviewProps {
    parsedData: ParsedData;
}

export function DataPreview({ parsedData }: DataPreviewProps) {
    const [previewRows] = useState(5);

    if (!parsedData || !parsedData.headers || parsedData.headers.length === 0) {
        return null;
    }

    const { headers, rows, totalRows } = parsedData;
    const displayRows = rows.slice(0, previewRows);

    return (
        <div className="data-preview" style={{ display: 'block', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>{t('preview.title')} ({previewRows} {t('upload.rows')})</h4>
                <span className="badge badge-outline">{totalRows} {t('preview.totalRows')}</span>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} title={h}>{truncate(h, 20)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((row, rIdx) => (
                            <tr key={rIdx}>
                                {headers.map((_, cIdx) => {
                                    const formattedVal = renderCellValue(row[cIdx]);
                                    return (
                                        <td key={cIdx} title={formattedVal}>
                                            {truncate(formattedVal, 30)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalRows > previewRows && (
                <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {t('preview.showing')} {previewRows} {t('preview.outOf')} {totalRows} {t('upload.rows')}
                </div>
            )}
        </div>
    );
}
