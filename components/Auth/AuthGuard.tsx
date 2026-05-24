'use client';

import { useAuth } from '../../hooks/useAuth';
import { LoginScreen } from './LoginScreen';
import { ReactNode, useEffect, useState } from 'react';
import { useAppStore } from '../../hooks/store';

export function AuthGuard({ children }: { children: ReactNode }) {
    const { user, licenseKey } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!sessionStorage.getItem('datalens_session_active')) {
            useAppStore.getState().setApiKey('');
            sessionStorage.setItem('datalens_session_active', '1');
        }
    }, []);

    // Prevent hydration mismatch by returning null on first render
    if (!mounted) {
        return null;
    }

    if (!user) {
        return <LoginScreen />;
    }

    return <>{children}</>;
}
