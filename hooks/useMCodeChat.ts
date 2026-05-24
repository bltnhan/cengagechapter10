import { useCallback } from 'react';
import { useAppStore } from './store';
import { useAuth } from './useAuth';
import { MCODE_SYSTEM_PROMPT, buildTmdlSystemPrompt } from '../lib/mcodeSystemPrompt';
import { applyPrivacyShield, isVisionSupportedModel, getVisionModelRecommendation } from '../lib/privacyShield';
import { buildTmdlContextString } from '../lib/tmdlParser';

export function useMCodeChat() {
    const store = useAppStore() as any;
    const {
        apiKey, chatModel,
        mcodeMessages, addMCodeMessage,
        isMCodeGenerating, setIsMCodeGenerating,
        privacyShield, metadata,
    } = store;



    const sendMessage = useCallback(async (text: string, inlineData?: { mimeType: string; data: string }, fileLabel?: string) => {
        if (!text && !inlineData) return;

        // Xử lý tự động định tuyến (auto-routing) khi có hình ảnh
        let finalModel = chatModel || 'gemma-3-27b-it';
        if (inlineData) {
            // Nếu có ảnh mà model người dùng chọn không hỗ trợ tốt (ví dụ gemma-3 có OCR kém), 
            // tự động switch sang gemini-2.5-flash để hỗ trợ đọc ảnh tốt hơn.
            if (finalModel.includes('gemma') || !isVisionSupportedModel(finalModel)) {
                finalModel = 'gemini-2.5-flash';
                // Thông báo nhẹ nhàng cho user biết hệ thống đã tự động switch
                addMCodeMessage({
                    role: 'model',
                    content: `[Hệ thống] Do hình ảnh yêu cầu độ chính xác cao khi trích xuất text (OCR), yêu cầu này sẽ được tự động xử lý bởi **Gemini 2.5 Flash** thay cho ${chatModel}.`
                });
            }
        }

        // Apply Privacy Shield if enabled
        let processedText = text;
        let redactionInfo = '';
        if (privacyShield && text) {
            const result = applyPrivacyShield(text);
            processedText = result.masked;
            if (result.redactions.length > 0) {
                redactionInfo = result.redactions.map(r => `${r.type}: ${r.count}`).join(', ') + ' đã được ẩn.';
            }
        }

        // Thêm tin nhắn user vào UI trước
        const userMsg = {
            role: 'user',
            content: processedText,
            image: inlineData ? `data:${inlineData.mimeType};base64,${inlineData.data}` : undefined,
            fileLabel,
            redactionInfo: redactionInfo || undefined
        };
        addMCodeMessage(userMsg);
        setIsMCodeGenerating(true);

        try {


            // Xây dựng history request từ state hiện tại (tối đa 20 tin nhắn gần nhất)
            const requestMessages = [];

            // Lấy max 20 tin nhắn cũ
            const recentHistory = mcodeMessages.slice(-20);

            for (const msg of recentHistory) {
                // Ignore errors
                if (msg.role === 'model' && msg.content.includes('[Lỗi]')) continue;

                requestMessages.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            }

            // Thêm tin nhắn hiện tại với text đã được mask
            const currentParts: any[] = [{ text: processedText || 'Phân tích hình ảnh này giúp tôi' }];
            if (inlineData) {
                currentParts.push({ inlineData });
            }
            requestMessages.push({ role: 'user', parts: currentParts });

            // Combine both CSV and TMDL Context
            let finalSystemInstruction = MCODE_SYSTEM_PROMPT;

            // 1. CSV Data Context
            if (metadata) {
                let contextStr = `\n\nHãy hỗ trợ phân tích bộ dữ liệu đang upload của người dùng.\n\n`;
                contextStr += `Thông tin Metadata:\n- Tên file: ${metadata.fileName || 'Chưa rõ'}\n`;
                contextStr += `- Số dòng: ${metadata.totalRows || '?'}, Số cột: ${metadata.totalCols || '?'}\n`;
                if (metadata.qualityScore !== undefined) {
                    contextStr += `- Điểm chất lượng: ${metadata.qualityScore}/100\n`;
                }
                contextStr += `\nCấu trúc các cột:\n`;

                metadata.columns.forEach((c: any) => {
                    contextStr += `- ${c.name} (Kiểu: ${c.dataType}, Lỗi: ${c.nullPercent}% rỗng`;
                    if (!privacyShield && c.sampleValues && c.sampleValues.length > 0) {
                        let sampleTxt = c.sampleValues.slice(0, 3).join(", ");
                        if (sampleTxt.length > 50) sampleTxt = sampleTxt.substring(0, 50) + '...';
                        contextStr += `, Mẫu: ${sampleTxt}`;
                    }
                    contextStr += `)\n`;
                });
                finalSystemInstruction += contextStr;
            }

            // 2. Power BI TMDL Context
            const tmdlModel = (store as any).tmdlModel;
            if (tmdlModel) {
                const tmdlContext = buildTmdlContextString(tmdlModel);
                finalSystemInstruction = buildTmdlSystemPrompt(finalSystemInstruction, tmdlContext);
            }

            const payload = {
                apiKey: apiKey,
                systemInstruction: finalSystemInstruction,
                model: finalModel,
                temperature: 0.3,
                language: useAppStore.getState().language,
                messages: requestMessages
            };

            const response = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }

            // Add an initial empty AI message
            addMCodeMessage({ role: 'model', content: '', modelUsed: finalModel });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        accumulatedContent += chunk;

                        // Apply Privacy Shield notice if needed only on the final or periodically
                        let displayContent = accumulatedContent;
                        if (privacyShield && redactionInfo) {
                            displayContent = `🔒 *Privacy Shield đang bật*: ${redactionInfo}\n\n${accumulatedContent}`;
                        }

                        store.updateLastMCodeMessage(displayContent);
                    }
                } catch (streamError) {
                    console.error('Error reading stream:', streamError);
                    store.updateLastMCodeMessage(accumulatedContent + '\n\n[Lỗi kết nối stream]');
                }
            }

        } catch (err: any) {
            console.error('Lỗi khi gọi API MCode Chat:', err);
            let userFriendlyError = err.message || 'Có lỗi xảy ra khi gọi AI.';

            if (userFriendlyError.toLowerCase().includes('quota') || userFriendlyError.includes('429')) {
                userFriendlyError = 'Hệ thống AI đang nhận quá nhiều yêu cầu cùng lúc (Rate Limit). Bạn vui lòng nhâm nhi tách trà khoảng 1 phút rồi thử lại nhé!';
            } else if (userFriendlyError.toLowerCase().includes('fetch') || userFriendlyError.toLowerCase().includes('network')) {
                userFriendlyError = 'Mất kết nối mạng. Bạn kiểm tra lại đường truyền nhé.';
            } else if (userFriendlyError.includes('503') || userFriendlyError.toLowerCase().includes('overloaded')) {
                userFriendlyError = 'Máy chủ AI của Google đang bảo trì hoặc quá tải tạm thời. Vui lòng thử lại sau ít phút.';
            }

            addMCodeMessage({ role: 'model', content: `[Lỗi] ${userFriendlyError}` });
        } finally {
            setIsMCodeGenerating(false);
        }
    }, [apiKey, chatModel, mcodeMessages, addMCodeMessage, setIsMCodeGenerating, privacyShield, metadata]);

    return {
        isGenerating: isMCodeGenerating,
        sendMessage,
    };
}