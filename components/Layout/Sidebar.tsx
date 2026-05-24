'use client';

import { useAppStore } from '../../hooks/store';
import {
    Upload,
    SlidersHorizontal,
    BarChart3,
    Sparkles,
    FileOutput,
    Network,
    Settings,
    Globe,
    ChevronRight,
} from 'lucide-react';
import { t } from '../../lib/i18n';
import { QuotaBadge } from '../Auth/QuotaBadge';

// ── Workflow steps definition ──────────────────────────────────────────────
const WORKFLOW_STEPS = [
    {
        id: 'upload' as const,
        step: 1,
        labelKey: 'sidebar.step.upload',
        labelFallback: 'Upload Data',
        descKey: 'sidebar.step.upload.desc',
        descFallback: 'Import file to get started',
        icon: Upload,
        requiresData: false,
    },
    {
        id: 'profile' as const,
        step: 2,
        labelKey: 'sidebar.step.profile',
        labelFallback: 'Data Profile',
        descKey: 'sidebar.step.profile.desc',
        descFallback: 'Explore & clean your data',
        icon: BarChart3,
        requiresData: true,
    },
    {
        id: 'prompt' as const,
        step: 3,
        labelKey: 'sidebar.step.prompt',
        labelFallback: 'Advise & Predict',
        descKey: 'sidebar.step.prompt.desc',
        descFallback: 'Build AI prompt strategy',
        icon: Sparkles,
        requiresData: true,
    },
    {
        id: 'chat' as const,
        step: 4,
        labelKey: 'sidebar.step.chat',
        labelFallback: 'AI Result',
        descKey: 'sidebar.step.chat.desc',
        descFallback: 'View AI-generated insights',
        icon: FileOutput,
        requiresData: true,
    },
];

// ── Extra tools (shown below divider) ──────────────────────────────────────
const EXTRA_TOOLS = [
    {
        id: 'graph' as const,
        labelKey: 'sidebar.tool.graph',
        labelFallback: 'Formula Graph',
        icon: Network,
        requiresGraph: true,
    },
];

interface SidebarProps {
    onOpenSettings: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
    const { activeTab, setActiveTab, parsedData, language, setLanguage } = useAppStore();
    const formulaGraph = useAppStore((s) => s.formulaGraph);
    const tmdlModel = useAppStore((s) => (s as any).tmdlModel);

    const hasData = !!parsedData && !tmdlModel;
    const hasGraph = !!formulaGraph;

    // Determine which step is "completed" for progress indicator
    const getStepState = (stepId: string): 'completed' | 'active' | 'locked' => {
        const stepIds = WORKFLOW_STEPS.map((s) => s.id);
        const activeIndex = stepIds.indexOf(activeTab as any);
        const stepIndex = stepIds.indexOf(stepId as any);

        if (stepId === activeTab) return 'active';
        if (stepIndex < activeIndex && hasData) return 'completed';
        return 'locked';
    };

    const isStepClickable = (step: (typeof WORKFLOW_STEPS)[0]) => {
        if (!step.requiresData) return true;
        return hasData;
    };

    const safet = (key: string, fallback: string) => {
        try {
            const val = t(key as any);
            return val === key ? fallback : val;
        } catch {
            return fallback;
        }
    };

    return (
        <aside className="app-sidebar">
            {/* ── Brand ── */}
            <div className="sidebar-brand">
                <div className="sidebar-logo">
                    <img src="/logo.png" alt="DataLens" />
                </div>
                <div className="sidebar-brand-text">
                    <span className="sidebar-brand-name">DataLens</span>
                    <span className="sidebar-brand-sub">Analytics Platform</span>
                </div>
            </div>

            {/* ── Workflow Progress ── */}
            <div className="sidebar-section">
                <p className="sidebar-section-label">WORKFLOW</p>
                <nav className="sidebar-steps">
                    {WORKFLOW_STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const state = getStepState(step.id);
                        const clickable = isStepClickable(step);

                        return (
                            <div key={step.id} className="sidebar-step-wrapper">
                                <button
                                    className={`sidebar-step ${state}`}
                                    onClick={() => clickable && setActiveTab(step.id)}
                                    disabled={!clickable}
                                    title={!clickable ? 'Upload data first' : undefined}
                                >
                                    <div className="sidebar-step-indicator">
                                        <div className="sidebar-step-circle">
                                            {state === 'completed' ? (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            ) : (
                                                <Icon size={13} />
                                            )}
                                        </div>
                                        {idx < WORKFLOW_STEPS.length - 1 && (
                                            <div className={`sidebar-step-line ${state === 'completed' ? 'filled' : ''}`} />
                                        )}
                                    </div>
                                    <div className="sidebar-step-content">
                                        <span className="sidebar-step-label">
                                            {safet(step.labelKey, step.labelFallback)}
                                        </span>
                                        <span className="sidebar-step-desc">
                                            {safet(step.descKey, step.descFallback)}
                                        </span>
                                    </div>
                                    {state === 'active' && (
                                        <ChevronRight size={14} className="sidebar-step-arrow" />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* ── Extra Tools ── */}
            {hasGraph && (
                <div className="sidebar-section">
                    <p className="sidebar-section-label">TOOLS</p>
                    <nav className="sidebar-tools">
                        {EXTRA_TOOLS.filter((tool) => !tool.requiresGraph || hasGraph).map((tool) => {
                            const Icon = tool.icon;
                            const isActive = activeTab === tool.id;
                            return (
                                <button
                                    key={tool.id}
                                    className={`sidebar-tool-btn ${isActive ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tool.id)}
                                >
                                    <Icon size={15} />
                                    <span>{safet(tool.labelKey, tool.labelFallback)}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            )}

            {/* ── Spacer ── */}
            <div className="sidebar-spacer" />

            {/* ── Quota badge ── */}
            <div className="sidebar-quota">
                <QuotaBadge />
            </div>

            {/* ── Footer actions ── */}
            <div className="sidebar-footer">
                <button
                    className="sidebar-footer-btn"
                    onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                    title="Toggle language"
                >
                    <Globe size={15} />
                    <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </button>
                <button
                    className="sidebar-footer-btn"
                    onClick={onOpenSettings}
                    title="Settings"
                >
                    <Settings size={15} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
}
