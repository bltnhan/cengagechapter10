'use client';

import { useAppStore } from '../../hooks/store';
import { ChevronRight } from 'lucide-react';

// Map tab ID → human-readable breadcrumb
const STEP_LABELS: Record<string, { step: number; label: string; desc: string }> = {
    upload: { step: 1, label: 'Upload Data', desc: 'Import your dataset' },
    profile: { step: 2, label: 'Data Profile', desc: 'Explore & clean data' },
    prompt: { step: 3, label: 'Advise & Predict', desc: 'Build AI prompt strategy' },
    chat: { step: 4, label: 'AI Result', desc: 'View AI-generated insights' },
    graph: { step: 0, label: 'Formula Graph', desc: 'Visualize formula dependencies' },
};

interface HeaderProps {
    onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
    const { activeTab, parsedData, isProcessing, progress } = useAppStore();

    const current = STEP_LABELS[activeTab] ?? { step: 0, label: activeTab, desc: '' };
    const totalSteps = 4;

    return (
        <header className="app-topbar">
            {/* ── Breadcrumb ── */}
            <div className="topbar-breadcrumb">
                <span className="topbar-crumb-root">DataLens</span>
                <ChevronRight size={14} className="topbar-crumb-sep" />
                {current.step > 0 && (
                    <>
                        <span className="topbar-crumb-step">Step {current.step}/{totalSteps}</span>
                        <ChevronRight size={14} className="topbar-crumb-sep" />
                    </>
                )}
                <span className="topbar-crumb-current">{current.label}</span>
                <span className="topbar-crumb-desc">{current.desc}</span>
            </div>

            {/* ── Processing indicator ── */}
            {isProcessing && (
                <div className="topbar-progress-wrap">
                    <div className="topbar-progress-bar">
                        <div
                            className="topbar-progress-fill"
                            style={{ width: `${progress.percent}%` }}
                        />
                    </div>
                    <span className="topbar-progress-label">{progress.status || 'Processing…'}</span>
                </div>
            )}

            {/* ── Data status pill ── */}
            {!isProcessing && (
                <div className="topbar-status-area">
                    {parsedData ? (
                        <span className="topbar-pill success">
                            <span className="topbar-pill-dot" />
                            {parsedData.totalRows?.toLocaleString() ?? '–'} rows · {parsedData.totalCols ?? '–'} cols
                        </span>
                    ) : (
                        <span className="topbar-pill muted">
                            <span className="topbar-pill-dot" />
                            No data loaded
                        </span>
                    )}
                </div>
            )}
        </header>
    );
}
