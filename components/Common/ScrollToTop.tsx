'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { t } from '../../lib/i18n';
import { useAppStore } from '../../hooks/store';

export function ScrollToTop() {
    const { language } = useAppStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            className={`fab-scroll-top ${isVisible ? 'visible' : ''}`}
            onClick={scrollToTop}
            aria-label={t('common.scrollToTop')}
        >
            <ArrowUp size={24} />
        </button>
    );
}
