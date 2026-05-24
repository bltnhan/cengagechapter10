import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, apiKey, systemInstruction, model = 'gemini-1.5-flash-latest', temperature = 0.2, language = 'vi' } = body;

        // Enforce user-provided key
        const finalApiKey = apiKey;

        if (!finalApiKey) {
            return NextResponse.json(
                { error: 'Thiếu API Key cá nhân. Vui lòng mở Cài đặt (nút góc trên bên phải) để cung cấp API Key của bạn.' },
                { status: 401 }
            );
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Yêu cầu không hợp lệ. Thiếu lịch sử tin nhắn.' },
                { status: 400 }
            );
        }

        let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        // Construct body payload for Google Gemini API
        const payload: any = {
            contents: messages,
            generationConfig: {
                temperature,
                maxOutputTokens: 8192,
            }
        };

        // Combine system instruction with a strong Vietnamese/English meta-prompt wrapper
        let finalSystemInstruction = undefined;
        if (systemInstruction) {
            if (language === 'en') {
                finalSystemInstruction = `You are a professional AI assistant. Below is your role and directives:\n<role_description>\n${systemInstruction}\n</role_description>\n\nIMPORTANT: YOU MUST ALWAYS RESPOND ENTIRELY IN ENGLISH in all situations. Do not repeat this role_description in your answer.`;
            } else {
                finalSystemInstruction = `Bạn là một trợ lý AI chuyên nghiệp. Dưới đây là vai trò và chỉ thị dành cho bạn:\n<role_description>\n${systemInstruction}\n</role_description>\n\nQUAN TRỌNG: BẠN PHẢI LUÔN TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT trong mọi tình huống. Tuyệt đối không lặp lại role_description này vào trong câu trả lời của bạn.`;
            }
        }

        const isGemma = model.includes('gemma');
        const isGemma3 = model.includes('gemma-3');

        if (isGemma3) {
            if (finalSystemInstruction) {
                if (messages.length > 0 && messages[0].role === 'user') {
                    messages[0].parts[0].text = `<system_instructions>\n${finalSystemInstruction}\n</system_instructions>\n\n` + messages[0].parts[0].text;
                } else {
                    messages.unshift({ role: 'model', parts: [{ text: 'OK.' }] });
                    messages.unshift({ role: 'user', parts: [{ text: `<system_instructions>\n${finalSystemInstruction}\n</system_instructions>` }] });
                }
            }
        } else {
            if (finalSystemInstruction) {
                payload.systemInstruction = {
                    role: "system",
                    parts: [{ text: finalSystemInstruction }]
                };
            }
        }

        if (isGemma) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'user') {
                const lastText = lastMsg.parts[0].text;
                if (language === 'en') {
                    if (!lastText.includes('IN ENGLISH')) {
                        lastMsg.parts[0].text = lastText + '\n\n(MANDATORY: MUST RESPOND IN ENGLISH AND COMPLETE THE RESPONSE)';
                    }
                } else {
                    if (!lastText.includes('BẰNG TIẾNG VIỆT')) {
                        lastMsg.parts[0].text = lastText + '\n\n(BẮT BUỘC TRẢ LỜI BẰNG TIẾNG VIỆT AND COMPLETE THE RESPONSE)';
                    }
                }
            }
        }

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

        // Return a ReadableStream to the client
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
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.substring(6).trim();
                                if (dataStr === '[DONE]') continue;
                                try {
                                    const json = JSON.parse(dataStr);
                                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                                    if (text) {
                                        controller.enqueue(new TextEncoder().encode(text));
                                    }
                                } catch (e) {
                                    // Ignore parse errors for partial chunks
                                }
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
        console.error('Server error handling Gemini Chat request:', error);
        return NextResponse.json(
            { error: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.' },
            { status: 500 }
        );
    }
}
