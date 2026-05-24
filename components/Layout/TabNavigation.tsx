'use client';

import { useAppStore } from '../../hooks/store';
import { Upload, Database, Lightbulb, PenTool, LayoutTemplate, MessageSquare } from 'lucide-react';
import { t } from '../../lib/i18n';

export function TabNavigation() {
    const { activeTab, setActiveTab, parsedData } = useAppStore();
    const tmdlModel = useAppStore((s) => (s as any).tmdlModel);

    const hasData = !!parsedData;
    const hasTmdl = !!tmdlModel;

    const hasGraph = !!useAppStore((s) => s.formulaGraph);

    const tabs = [
        { id: 'upload', label: t('tab.upload'), icon: Upload, show: true },
        { id: 'profile', label: hasTmdl ? t('tab.tmdlProfile') : t('tab.dataProfile'), icon: Database, show: hasData && !hasTmdl },
        { id: 'graph', label: t('tab.formulaGraph'), icon: Lightbulb, show: hasGraph }, // Using Lightbulb or Share2
        { id: 'prompt', label: t('tab.promptStudio'), icon: PenTool, show: hasData && !hasTmdl },
        { id: 'chat', label: t('tab.aiChat'), icon: MessageSquare, show: hasData && !hasTmdl },
    ].filter(tab => tab.show);

    return (
        <nav className="tab-nav">
            <div className="tab-nav-inner">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id as 'upload' | 'profile' | 'prompt' | 'chat')}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
