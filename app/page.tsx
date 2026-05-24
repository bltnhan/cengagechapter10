'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/store';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import { SettingsModal } from '../components/Common/SettingsModal';
import { ToastContainer } from '../components/Common/Toast';
import { UploadZone } from '../components/Upload/UploadZone';
import { DataProfile } from '../components/Profile/DataProfile';
import { FormulaGraphView } from '../components/Profile/FormulaGraphView';
import { PromptStudio } from '../components/Prompt/PromptStudio';
import { AIResponse } from '../components/Chat/AIResponse';
import { AuthGuard } from '../components/Auth/AuthGuard';
import { ScrollToTop } from '../components/Common/ScrollToTop';
import { MCodeChat } from '../components/MCode/MCodeChat';
import { t } from '../lib/i18n';

export default function Home() {
  const { activeTab, apiKey, isFormulaGraphFullscreen } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Auto-open settings if no API key on first load
  useEffect(() => {
    setMounted(true);
    if (!useAppStore.getState().apiKey) {
      setIsSettingsOpen(true);
    }
  }, []);

  // Fullscreen graph mode — bypass sidebar layout
  if (isFormulaGraphFullscreen) {
    return (
      <AuthGuard>
        <div style={{ width: '100vw', height: '100vh' }}>
          <FormulaGraphView />
        </div>
        <ToastContainer />
        <MCodeChat />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="app-layout">

        {/* ── LEFT SIDEBAR ── */}
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* ── MAIN CONTENT COLUMN ── */}
        <div className="app-content-col">

          {/* No-API-key warning banner */}
          {mounted && !apiKey && (
            <div className="topbar-api-warning">
              <span>
                🔑 <strong>{t('home.noApiKeyTitle')}</strong> {t('home.noApiKeyDesc')}
              </span>
              <button
                className="btn btn-sm"
                style={{ marginLeft: '12px', backgroundColor: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.2)' }}
                onClick={() => setIsSettingsOpen(true)}
              >
                {t('home.openSettings')}
              </button>
            </div>
          )}

          {/* Compact top bar */}
          <Header onOpenSettings={() => setIsSettingsOpen(true)} />

          {/* Tab panels */}
          <main className="app-main">

            {/* Upload */}
            <section
              className={`tab-panel ${activeTab === 'upload' ? 'active' : ''}`}
              style={{ display: activeTab === 'upload' ? 'block' : 'none' }}
            >
              <UploadZone />
            </section>

            {/* Profile */}
            <section
              className={`tab-panel ${activeTab === 'profile' ? 'active' : ''}`}
              style={{ display: activeTab === 'profile' ? 'block' : 'none' }}
            >
              <DataProfile />
            </section>

            {/* Formula Graph */}
            <section
              className={`tab-panel ${activeTab === 'graph' ? 'active' : ''}`}
              style={{ display: activeTab === 'graph' ? 'block' : 'none', height: '80vh', padding: 0 }}
            >
              <FormulaGraphView />
            </section>

            {/* Prompt Studio */}
            <section
              className={`tab-panel ${activeTab === 'prompt' ? 'active' : ''}`}
              style={{ display: activeTab === 'prompt' ? 'block' : 'none' }}
            >
              <PromptStudio />
            </section>

            {/* AI Chat / Result */}
            <section
              className={`tab-panel ${activeTab === 'chat' ? 'active' : ''}`}
              style={{ display: activeTab === 'chat' ? 'block' : 'none' }}
            >
              <AIResponse />
            </section>

          </main>

          <footer className="app-footer">
            <p>{t('home.footer')}</p>
          </footer>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ToastContainer />
      <ScrollToTop />
      <MCodeChat />
    </AuthGuard>
  );
}
