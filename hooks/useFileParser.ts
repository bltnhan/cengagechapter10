import { useAppStore } from './store';
import { parseFile, ParseOptions, switchSheet } from '../lib/parser';
import { analyzeData, AnalyzerProgress } from '../lib/analyzer';
import { parseTmdlInput } from '../lib/tmdlParser';
import { buildFormulaGraph } from '../lib/formulaGraph';
import { useCallback } from 'react';

// Helper: check if files are TMDL-related
function isTmdlUpload(files: File[]): boolean {
    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
        return true; // Will attempt to extract .tmdl from zip
    }
    return files.some(f => f.name.toLowerCase().endsWith('.tmdl'));
}

export function useFileParser() {
    const {
        setIsProcessing,
        setProgress,
        setParsedData,
        setMetadata,
        setActiveTab,
        setFormulaGraph,
    } = useAppStore();

    // Access tmdlModel setter via the store
    const setTmdlModel = useAppStore((s) => (s as any).setTmdlModel);

    const handleFileUpload = useCallback(async (fileOrFiles: File | File[], options?: ParseOptions) => {
        const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];

        setIsProcessing(true);
        setProgress('Đang đọc file...', 0);
        setParsedData(null);
        setMetadata(null);
        setFormulaGraph(null);
        if (setTmdlModel) setTmdlModel(null);

        try {
            // ── Branch: TMDL / ZIP upload ──
            if (isTmdlUpload(files)) {
                setProgress('Đang phân tích cấu trúc TMDL...', 20);

                const tmdlModel = await parseTmdlInput(files);

                const totalCols = tmdlModel.tables.reduce((s, t) => s + t.columns.length, 0);
                const totalMeasures = tmdlModel.tables.reduce((s, t) => s + t.measures.length, 0);

                setProgress(`Phân tích hoàn tất: ${tmdlModel.tables.length} bảng, ${totalCols} cột, ${totalMeasures} measures`, 100);

                if (setTmdlModel) setTmdlModel(tmdlModel);

                // Also set a minimal parsedData so the UI knows a file was loaded
                const fileName = files.length === 1 ? files[0].name : `${files.length} TMDL files`;
                const fileSize = files.reduce((s, f) => s + f.size, 0);
                setParsedData({
                    fileName,
                    fileSize,
                    headers: ['(TMDL Model)'],
                    rows: [],
                    totalRows: tmdlModel.tables.length,
                    totalCols: totalCols,
                    activeSheet: 'Model',
                    sheetNames: ['Model'],
                });

                setTimeout(() => {
                    setIsProcessing(false);
                }, 500);
                return;
            }

            // ── Branch: Standard Excel/CSV upload (existing logic) ──
            const file = files[0];
            const lang = useAppStore.getState().language || 'vi';
            const parsed = await parseFile(file, { ...options, lang });
            setProgress(`Phân tích file hoàn tất (${parsed.totalRows || 0} dòng).`, 40);

            setParsedData(parsed);

            // 2. Analyze Data
            setProgress('Đang phân tích dữ liệu column...', 50);

            const metadata = analyzeData(parsed, (progressObj: AnalyzerProgress) => {
                if (progressObj.type === 'start') {
                    setProgress(`Phân tích ${progressObj.totalCols} cột...`, 60);
                } else if (progressObj.type === 'column') {
                    setProgress(`Đang phân tích cột "${progressObj.name}"...`, 60 + ((progressObj.progress || 0) * 0.3));
                } else if (progressObj.type === 'complete') {
                    setProgress(`Phân tích hoàn tất!`, 100);
                }
            });

            setMetadata(metadata);

            // Give React a chance to paint the progress
            setProgress('Đang xây dựng đồ thị liên kết...', 85);
            await new Promise(resolve => setTimeout(resolve, 50));

            // Handle cross-sheet formula graph
            const graphData = buildFormulaGraph(parsed);
            setFormulaGraph(graphData || null);

            setProgress('Hoàn tất!', 100);

            // Finish processing without auto-switching tabs
            setTimeout(() => {
                setIsProcessing(false);
            }, 500);

        } catch (error: any) {
            console.error('Lỗi khi đọc file:', error);
            alert(`LỖI TẢI FILE:\n${error.message || 'Hệ thống không thể xử lý file này.'}`);
            setProgress('', 0);
            setIsProcessing(false);
        }
    }, [setIsProcessing, setProgress, setParsedData, setMetadata, setActiveTab, setTmdlModel]);

    const handleSheetChange = useCallback((sheetName: string) => {
        const currentData = useAppStore.getState().parsedData;
        if (!currentData || !currentData.sheetNames?.includes(sheetName)) return;

        setIsProcessing(true);
        setProgress(`Đang chuyển sang sheet "${sheetName}"...`, 10);

        setTimeout(() => {
            try {
                const newData = { ...currentData };

                if (switchSheet(newData, sheetName)) {
                    setParsedData(newData);

                    setProgress('Đang phân tích dữ liệu column...', 50);
                    const metadata = analyzeData(newData, (progressObj: AnalyzerProgress) => {
                        if (progressObj.type === 'start') {
                            setProgress(`Phân tích ${progressObj.totalCols} cột...`, 60);
                        } else if (progressObj.type === 'column') {
                            setProgress(`Đang phân tích cột "${progressObj.name}"...`, 60 + ((progressObj.progress || 0) * 0.3));
                        } else if (progressObj.type === 'complete') {
                            setProgress(`Phân tích hoàn tất!`, 100);
                        }
                    });

                    setMetadata(metadata);
                }
                setTimeout(() => setIsProcessing(false), 300);
            } catch (err: any) {
                console.error(err);
                alert(`Lỗi khi chuyển sheet: ${err.message}`);
                setIsProcessing(false);
            }
        }, 50);
    }, [setIsProcessing, setProgress, setParsedData, setMetadata]);

    return { handleFileUpload, handleSheetChange };
}
