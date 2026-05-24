import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ParsedData, Metadata, PromptTemplate, PromptHistoryItem } from '../lib/types';
import { TmdlModel } from '../lib/tmdlParser';
import { FormulaGraphData, SheetDetail } from '../lib/formulaGraph';

export interface User {
    email: string;
    plan: string;
    name?: string;
    avatar?: string;
}

export interface Quota {
    max_queries: number;
    queries_today: number;
}

export interface AppState {
    // Auth & License
    user: User | null;
    setUser: (user: User | null) => void;
    expiresAt: string | null;
    setExpiresAt: (dateStr: string | null) => void;
    licenseKey: string | null;
    setLicenseKey: (key: string | null) => void;
    logout: () => void;

    // Theme and UI
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    activeTab: 'upload' | 'profile' | 'prompt' | 'chat' | 'graph';
    setActiveTab: (tab: 'upload' | 'profile' | 'prompt' | 'chat' | 'graph') => void;

    // Data Pipeline State
    parsedData: ParsedData | null;
    setParsedData: (data: ParsedData | null) => void;
    metadata: Metadata | null;
    setMetadata: (meta: Metadata | null) => void;
    updateColumnType: (colIndex: number, newType: string) => void;
    isProcessing: boolean;
    setIsProcessing: (processing: boolean) => void;
    progress: { status: string; percent: number };
    setProgress: (status: string, percent: number) => void;

    // TMDL Model State (Power BI Semantic Model)
    tmdlModel: TmdlModel | null;
    setTmdlModel: (model: TmdlModel | null) => void;

    // Prompt Generator State
    templates: PromptTemplate[];
    setTemplates: (templates: PromptTemplate[]) => void;
    promptHistory: PromptHistoryItem[];
    addPromptHistory: (item: PromptHistoryItem) => void;
    clearPromptHistory: () => void;
    activePrompt: string;
    setActivePrompt: (prompt: string) => void;
    lastSubmittedPrompt: string;
    setLastSubmittedPrompt: (prompt: string) => void;

    // Excel Formula Graph State
    formulaGraph: FormulaGraphData | null;
    setFormulaGraph: (data: FormulaGraphData | null) => void;
    sheetDetails: Record<string, SheetDetail>;
    setSheetDetail: (sheetName: string, detail: SheetDetail) => void;
    clearSheetDetails: () => void;
    isFormulaGraphFullscreen: boolean;
    setIsFormulaGraphFullscreen: (is: boolean) => void;

    // AI Insight State
    isInsightGenerating: boolean;
    setIsInsightGenerating: (isGenerating: boolean) => void;
    insightResponse: string | null;
    setInsightResponse: (response: string | null) => void;
    insightError: string | null;
    setInsightError: (error: string | null) => void;

    // Auto-Insights State (for Profile tab)
    aiInsights: string | null;
    setAiInsights: (insights: string | null) => void;
    isAutoInsightGenerating: boolean;
    setIsAutoInsightGenerating: (isGenerating: boolean) => void;

    // MCode Chat Widget State
    isMCodeOpen: boolean;
    setIsMCodeOpen: (isOpen: boolean) => void;
    mcodeMessages: { role: 'user' | 'model'; content: string; image?: string; fileLabel?: string; modelUsed?: string }[];
    addMCodeMessage: (msg: { role: 'user' | 'model'; content: string; image?: string; fileLabel?: string; modelUsed?: string }) => void;
    updateLastMCodeMessage: (content: string) => void;
    clearMCodeMessages: () => void;
    isMCodeGenerating: boolean;
    setIsMCodeGenerating: (isGenerating: boolean) => void;

    // Settings
    apiKey: string;
    setApiKey: (key: string) => void;
    privacyShield: boolean;
    setPrivacyShield: (enabled: boolean) => void;
    systemRole: string;
    setSystemRole: (role: string) => void;
    chatModel: string;
    setChatModel: (model: string) => void;
    insightModel: string;
    setInsightModel: (model: string) => void;
    showChatInFullscreen: boolean;
    setShowChatInFullscreen: (show: boolean) => void;
    language: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Auth & License
            user: null,
            setUser: (user) => set({ user }),
            expiresAt: null,
            setExpiresAt: (dateStr) => set({ expiresAt: dateStr }),
            licenseKey: null,
            setLicenseKey: (licenseKey) => set({ licenseKey }),
            logout: () => set({ user: null, expiresAt: null, licenseKey: null, apiKey: '' }),

            // Theme and UI
            theme: 'dark',
            setTheme: (theme) => set({ theme }),
            activeTab: 'upload',
            setActiveTab: (tab) => set({ activeTab: tab }),

            // Data Pipeline State
            parsedData: null,
            setParsedData: (data) => set({ parsedData: data, aiInsights: null }),
            metadata: null,
            setMetadata: (meta) => set({ metadata: meta }),
            updateColumnType: (colIndex, newType) => set((state) => {
                if (!state.metadata) return state;
                const newColumns = [...state.metadata.columns];
                newColumns[colIndex] = { ...newColumns[colIndex], dataType: newType };
                return { metadata: { ...state.metadata, columns: newColumns } };
            }),
            isProcessing: false,
            setIsProcessing: (processing) => set({ isProcessing: processing }),
            progress: { status: '', percent: 0 },
            setProgress: (status, percent) => set({ progress: { status, percent } }),

            // TMDL Model State
            tmdlModel: null,
            setTmdlModel: (tmdlModel) => set({ tmdlModel }),

            // Prompt Generator State
            templates: [],
            setTemplates: (templates) => set({ templates }),
            promptHistory: [],
            addPromptHistory: (item) => set((state) => {
                const history = [item, ...state.promptHistory].slice(0, 50); // Keep last 50
                return { promptHistory: history };
            }),
            clearPromptHistory: () => set({ promptHistory: [] }),
            activePrompt: '',
            setActivePrompt: (prompt) => set({ activePrompt: prompt }),
            lastSubmittedPrompt: '',
            setLastSubmittedPrompt: (prompt) => set({ lastSubmittedPrompt: prompt }),

            // AI Insight State
            isInsightGenerating: false,
            setIsInsightGenerating: (isGenerating) => set({ isInsightGenerating: isGenerating }),
            insightResponse: null,
            setInsightResponse: (response) => set({ insightResponse: response }),
            insightError: null,
            setInsightError: (error) => set({ insightError: error }),

            aiInsights: null,
            setAiInsights: (insights) => set({ aiInsights: insights }),
            isAutoInsightGenerating: false,
            setIsAutoInsightGenerating: (isGenerating) => set({ isAutoInsightGenerating: isGenerating }),

            formulaGraph: null,
            setFormulaGraph: (data) => set({ formulaGraph: data, sheetDetails: {} }),
            sheetDetails: {},
            setSheetDetail: (sheetName, detail) => set((state) => ({
                sheetDetails: { ...state.sheetDetails, [sheetName]: detail }
            })),
            clearSheetDetails: () => set({ sheetDetails: {} }),
            isFormulaGraphFullscreen: false,
            setIsFormulaGraphFullscreen: (is) => set({ isFormulaGraphFullscreen: is }),

            // MCode Chat Widget State
            isMCodeOpen: false,
            setIsMCodeOpen: (isOpen) => set({ isMCodeOpen: isOpen }),
            mcodeMessages: [],
            addMCodeMessage: (msg) => set((state) => ({ mcodeMessages: [...state.mcodeMessages, msg] })),
            updateLastMCodeMessage: (content) => set((state) => {
                const newMessages = [...state.mcodeMessages];
                if (newMessages.length > 0) {
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg.role === 'model') {
                        newMessages[newMessages.length - 1] = { ...lastMsg, content };
                    }
                }
                return { mcodeMessages: newMessages };
            }),
            clearMCodeMessages: () => set({ mcodeMessages: [] }),
            isMCodeGenerating: false,
            setIsMCodeGenerating: (isGenerating) => set({ isMCodeGenerating: isGenerating }),

            // Settings
            apiKey: '',
            setApiKey: (key) => set({ apiKey: key }),
            privacyShield: true,
            setPrivacyShield: (enabled) => set({ privacyShield: enabled }),
            systemRole: 'Bạn là chuyên gia khoa học dữ liệu, phân tích rành mạch.',
            setSystemRole: (role) => set({ systemRole: role }),
            chatModel: 'gemma-3-27b-it',
            setChatModel: (model) => set({ chatModel: model }),
            insightModel: 'gemini-2.5-flash',
            setInsightModel: (model) => set({ insightModel: model }),
            showChatInFullscreen: false,
            setShowChatInFullscreen: (show) => set({ showChatInFullscreen: show }),
            language: 'vi',
            setLanguage: (lang) => set({ language: lang }),
        }),
        {
            name: 'datalens-storage',
            partialize: (state) => ({
                theme: state.theme,
                apiKey: state.apiKey,
                privacyShield: state.privacyShield,
                systemRole: state.systemRole,
                chatModel: state.chatModel,
                insightModel: state.insightModel,
                showChatInFullscreen: state.showChatInFullscreen,
                templates: state.templates,
                promptHistory: state.promptHistory,
                user: state.user,
                expiresAt: state.expiresAt,
                licenseKey: state.licenseKey,
                mcodeMessages: state.mcodeMessages,
                language: state.language
            }),
        }
    )
);
