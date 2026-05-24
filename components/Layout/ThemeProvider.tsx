'use client';

import { useEffect } from 'react';
import { useAppStore } from '../../hooks/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme } = useAppStore();

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.add('dark');
        // Prevent light mode from ever activating
        root.classList.remove('light');
    }, [theme]);

    // Use a script to avoid flash of unstyled content if possible, but for simple MVP this is enough
    return <>{children}</>;
}
