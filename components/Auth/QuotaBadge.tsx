'use client';

import { useAuth } from '../../hooks/useAuth';
import { Zap } from 'lucide-react';
import { t } from '../../lib/i18n';
import { useAppStore } from '../../hooks/store';

export function QuotaBadge() {
    const { expiresAt, user, logout } = useAuth();

    const { language } = useAppStore(); // Re-render when language changes

    if (!user) return null;

    let displayString = '';
    let isLow = false;
    let remainingDays = 0;

    if (expiresAt) {
        remainingDays = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 3600 * 24));
        isLow = remainingDays <= 7;
        const formattedDate = new Date(expiresAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US');
        displayString = t('auth.expiresAt').replace('{date}', formattedDate).replace('{days}', remainingDays.toString());
    } else {
        displayString = t('auth.expiresUnknown');
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                backgroundColor: isLow ? '#fef2f2' : 'var(--bg-main)',
                color: isLow ? '#ef4444' : 'var(--text-main)',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: isLow ? '1px solid #fecaca' : '1px solid var(--border-color)'
            }}>
                <Zap size={14} fill={isLow ? '#ef4444' : 'var(--primary-color)'} color={isLow ? '#ef4444' : 'var(--primary-color)'} />
                <span style={{ fontWeight: 500 }}>
                    {displayString}
                </span>
            </div>

            {user.avatar && (
                <img src={user.avatar} alt="Avatar" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            )}
            {user.name && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    {user.name}
                </span>
            )}

            <button
                onClick={logout}
                style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                }}
            >
                {t('auth.logout')}
            </button>
        </div >
    );
}
