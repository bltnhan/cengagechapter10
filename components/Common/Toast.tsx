'use client';

import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

// Simple pub/sub pattern for global toasts outside React state directly
let nextId = 0;
type Listener = (toast: ToastMessage) => void;
const listeners: Listener[] = [];

export const showToast = (message: string, type: ToastType = 'info') => {
    const toast = { id: nextId++, message, type };
    listeners.forEach(l => l(toast));
};

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const handleAdd = (toast: ToastMessage) => {
            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 3000);
        };
        listeners.push(handleAdd);
        return () => {
            const idx = listeners.indexOf(handleAdd);
            if (idx > -1) listeners.splice(idx, 1);
        };
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div id="toast-container" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`} style={{ padding: '12px 20px', borderRadius: '6px', background: 'var(--surface-color)', color: 'var(--text-color)', borderLeft: `4px solid var(--${t.type}-color, #3b82f6)`, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'slideInRight 0.3s ease forwards' }}>
                    {t.type === 'success' && '✅ '}
                    {t.type === 'error' && '❌ '}
                    {t.type === 'info' && 'ℹ️ '}
                    {t.message}
                </div>
            ))}
        </div>
    );
}
