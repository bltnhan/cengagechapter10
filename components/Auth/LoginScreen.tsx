'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../hooks/store';
import { t } from '../../lib/i18n';
import { BarChart2, Loader2 } from 'lucide-react';

declare global {
    interface Window {
        google?: any;
    }
}

export function LoginScreen() {
    const { loginWithGoogle, isAuthenticating, authError } = useAuth();
    const googleButtonRef = useRef<HTMLDivElement>(null);

    const handleCredentialResponse = async (response: any) => {
        if (response.credential) {
            await loginWithGoogle(response.credential);
        }
    };

    useEffect(() => {
        const scriptId = 'google-gsi-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        const handleScriptLoad = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
                    callback: handleCredentialResponse,
                });
                if (googleButtonRef.current) {
                    window.google.accounts.id.renderButton(
                        googleButtonRef.current,
                        { theme: 'outline', size: 'large', width: '330' }
                    );
                }
            }
        };

        if (!script) {
            script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.id = scriptId;
            script.async = true;
            script.defer = true;
            script.onload = handleScriptLoad;
            document.body.appendChild(script);
        } else {
            handleScriptLoad();
        }
    }, [loginWithGoogle]);

    return (
        <div className="app-main" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
            <div style={{ maxWidth: '400px', width: '100%', padding: '2rem', backgroundColor: 'var(--bg-panel)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
                    <BarChart2 size={48} />
                </div>
                <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                    {t('auth.loginTitle')}
                </h2>
                <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    {t('auth.loginDesc')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    {isAuthenticating ? (
                        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                            <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
                            <span style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('auth.authenticating')}</span>
                        </div>
                    ) : (
                        <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '44px' }}></div>
                    )}

                    {authError && (
                        <div style={{ width: '100%', color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '6px' }}>
                            {authError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
