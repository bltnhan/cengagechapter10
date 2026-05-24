import { useCallback } from 'react';
import { useAppStore } from './store';
import { useAuth } from './useAuth';

export function useGeminiApi() {
    const store = useAppStore() as any;
    const {
        apiKey, systemRole, insightModel,
        isInsightGenerating, setIsInsightGenerating,
        insightResponse, setInsightResponse,
        insightError, setInsightError
    } = store;



    const generateInsight = useCallback(async (promptText: string) => {
        if (!promptText) return;

        setIsInsightGenerating(true);
        setInsightResponse(null);
        setInsightError(null);

        try {


            // Build options based on user settings
            const payload = {
                prompt: promptText,
                apiKey: apiKey || undefined,
                systemInstruction: systemRole,
                model: insightModel || 'gemini-2.5-flash',
                temperature: 0.2,
                language: useAppStore.getState().language
            };

            let res = await fetch('/api/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error || `HTTP error! status: ${res.status}`;
                throw new Error(errMsg);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    accumulated += decoder.decode(value, { stream: true });
                    setInsightResponse(accumulated);
                }
            }

            if (!accumulated.trim()) {
                throw new Error("AI không trả về kết quả (có thể do bị chặn bởi bộ lọc an toàn hoặc kết nối ngắt đột ngột). Vui lòng điều chỉnh lại prompt hoặc dữ liệu.");
            }

        } catch (err: any) {
            console.error('Lỗi khi gọi API Gemini:', err);
            setInsightError(err.message || 'Có lỗi xảy ra khi phân tích dữ liệu.');
        } finally {
            setIsInsightGenerating(false);
        }
    }, [apiKey, systemRole, insightModel, setIsInsightGenerating, setInsightResponse, setInsightError]);

    return {
        isGenerating: isInsightGenerating,
        response: insightResponse,
        error: insightError,
        generateInsight,
        setResponse: setInsightResponse,
    };
}
