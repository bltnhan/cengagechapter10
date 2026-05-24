import { useState, useCallback } from 'react';
import { useAppStore } from './store';

export function useAuth() {
    const store = useAppStore() as any;
    const { user, expiresAt, licenseKey, setUser, setExpiresAt, setLicenseKey, logout } = store;

    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const loginWithGoogle = useCallback(async (idToken: string) => {
        setIsAuthenticating(true);
        setAuthError(null);

        try {
            const res = await fetch('/api/auth/google-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Xác thực bản quyền Google thất bại.');
            }

            setUser(data.user);
            setExpiresAt(data.expiresAt);
            setLicenseKey('Google Auth');

            return true;
        } catch (err: any) {
            console.error('Login error:', err);
            setAuthError(err.message || 'Lỗi kết nối tới server.');
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    }, [setUser, setExpiresAt, setLicenseKey]);



    return {
        user,
        expiresAt,
        licenseKey,
        isAuthenticating,
        authError,
        loginWithGoogle,
        logout,
    };
}
