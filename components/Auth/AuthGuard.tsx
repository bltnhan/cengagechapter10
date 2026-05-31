'use client';

import { useAuth } from '../../hooks/useAuth';
import { LoginScreen } from './LoginScreen';
import { ReactNode, useEffect, useState } from 'react';
import { useAppStore } from '../../hooks/store';

// LOCAL MODE: khi không có NEXT_PUBLIC_GOOGLE_CLIENT_ID, tự động login local
// Không cần Google Auth hay license server
const IS_LOCAL_MODE = !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const LOCAL_USER = {
    email: 'local@datalens.local',
    plan: 'LOCAL',
    name: 'Local User',
};

export function AuthGuard({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Cloud mode: chỉ reset API key nếu là session mới VÀ chưa có key được lưu
        // Không xóa key đã lưu từ localStorage (persist) để user không phải nhập lại mỗi lần
        if (!IS_LOCAL_MODE && !sessionStorage.getItem('datalens_session_active')) {
            sessionStorage.setItem('datalens_session_active', '1');
            // KHÔNG gọi setApiKey('') — giữ lại key đã persist
        }

        // Local mode: tự động set user nếu chưa có
        if (IS_LOCAL_MODE && !useAppStore.getState().user) {
            useAppStore.getState().setUser(LOCAL_USER);
            useAppStore.getState().setLicenseKey('LOCAL');
        }
    }, []);

    if (!mounted) return null;

    // Local mode không cần kiểm tra user
    if (!IS_LOCAL_MODE && !user) {
        return <LoginScreen />;
    }

    return <>{children}</>;
}
