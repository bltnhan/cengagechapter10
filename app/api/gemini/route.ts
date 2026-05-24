import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, apiKey, systemInstruction, model = 'gemini-1.5-flash-latest', temperature = 0.2, language = 'vi' } = body;

        // Enforce user-provided key
        const finalApiKey = apiKey;

        if (!finalApiKey) {
            return NextResponse.json(
                { error: 'Thiếu API Key cá nhân. Vui lòng mở Cài đặt (nút góc trên bên phải) để cung cấp API Key của bạn.' },
                { status: 401 }
            );
        }

        if (!prompt) {
            return NextResponse.json(
                { error: 'Thiếu nội dung prompt.' },
                { status: 400 }
            );
        }

        let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        let finalPrompt = prompt;
        const isGemma = model.includes('gemma');

        // Combine system instruction with a strong Vietnamese/English meta-prompt wrapper
        let finalSystemInstruction = undefined;
        if (language === 'en') {
            finalSystemInstruction = `You are a professional AI assistant.` + (systemInstruction ? ` Below is your role and directives:\n<role_description>\n${systemInstruction}\n</role_description>\n\n` : `\n\n`) + `IMPORTANT: YOU MUST ALWAYS RESPOND ENTIRELY IN ENGLISH in all situations. Do not repeat this role_description in your answer. AND YOU MUST COMPLETE THE RESPONSE.`;
        } else {
            finalSystemInstruction = `Bạn là một trợ lý AI chuyên nghiệp.` + (systemInstruction ? ` Dưới đây là vai trò và chỉ thị dành cho bạn:\n<role_description>\n${systemInstruction}\n</role_description>\n\n` : `\n\n`) + `QUAN TRỌNG: BẠN PHẢI LUÔN TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT trong mọi tình huống. Tuyệt đối không lặp lại role_description này vào trong câu trả lời của bạn. VÀ PHẢI HOÀN TẤT CÂU TRẢ LỜI.`;
        }

        // Construct base payload
        const payload: any = {
            contents: [],
            generationConfig: {
                temperature,
                maxOutputTokens: 8192,
            }
        };

        const isGemma3 = model.includes('gemma-3');

        // Always enforce language in prompt as fallback
        if (language === 'en') {
            if (!finalPrompt.includes('IN ENGLISH')) {
                finalPrompt = `${finalPrompt}\n\n(MANDATORY: YOU MUST RESPOND IN ENGLISH AND COMPLETE THE RESPONSE)`;
            }
        } else {
            if (!finalPrompt.includes('BẰNG TIẾNG VIỆT')) {
                finalPrompt = `${finalPrompt}\n\n(BẮT BUỘC TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT VÀ TRẢ LỜI TRỌN VẸN)`;
            }
        }

        if (isGemma) {
            if (isGemma3 && finalSystemInstruction) {
                finalPrompt = `<system_instructions>\n${finalSystemInstruction}\n</system_instructions>\n\n` + finalPrompt;
            }
        }

        payload.contents = [
            { role: 'user', parts: [{ text: finalPrompt }] }
        ];

        if (!isGemma3 && finalSystemInstruction) {
            payload.systemInstruction = {
                role: "system",
                parts: [{ text: finalSystemInstruction }]
            };
        }

        // Use steaming endpoint
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': finalApiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error?.message || `Gemini API trả về mã lỗi ${response.status}` },
                { status: response.status }
            );
        }

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Parse SSE events which are separated by double newline
                        let doubleNewlineIndex = buffer.indexOf('\n\n');
                        // Some environments might use \r\n\r\n 
                        if (doubleNewlineIndex === -1 && buffer.indexOf('\r\n\r\n') !== -1) {
                            doubleNewlineIndex = buffer.indexOf('\r\n\r\n');
                        }

                        while (doubleNewlineIndex !== -1) {
                            const eventChunk = buffer.substring(0, doubleNewlineIndex).trim();
                            // advance buffer past the two newlines
                            buffer = buffer.substring(doubleNewlineIndex + 2);

                            // process chunk
                            if (eventChunk) {
                                const lines = eventChunk.split(/\r?\n/);
                                let dataPayload = '';
                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        dataPayload += line.substring(6);
                                    } else {
                                        // occasionally Gemini breaks spec and outputs lines without data: prefix
                                        dataPayload += line;
                                    }
                                }

                                if (dataPayload.trim() === '[DONE]') continue;

                                if (dataPayload) {
                                    try {
                                        const json = JSON.parse(dataPayload);
                                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                                        if (text) {
                                            controller.enqueue(new TextEncoder().encode(text));
                                        }
                                    } catch (e) {
                                        // Ignore parse errors quietly
                                        console.error("Failed to parse Gemini output chunk:", e);
                                    }
                                }
                            }

                            doubleNewlineIndex = buffer.indexOf('\n\n');
                            if (doubleNewlineIndex === -1 && buffer.indexOf('\r\n\r\n') !== -1) {
                                doubleNewlineIndex = buffer.indexOf('\r\n\r\n');
                            }
                        }
                    }

                    // Process any remaining buffer after stream ends
                    if (buffer.trim()) {
                        const lines = buffer.trim().split(/\r?\n/);
                        let dataPayload = '';
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                dataPayload += line.substring(6);
                            } else {
                                dataPayload += line;
                            }
                        }
                        if (dataPayload.trim() !== '[DONE]' && dataPayload) {
                            try {
                                const json = JSON.parse(dataPayload);
                                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    controller.enqueue(new TextEncoder().encode(text));
                                }
                            } catch (e) {
                                console.error("Failed to parse final Gemini output chunk:", e);
                            }
                        }
                    }

                } catch (e) {
                    controller.error(e);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });


    } catch (error: any) {
        console.error('Server error handling Gemini request:', error);
        return NextResponse.json(
            { error: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.' },
            { status: 500 }
        );
    }
}
