import { ParsedData } from './types';

export interface ParseOptions {
    startRow?: number;
    startCol?: number;
    lang?: string;
}

export async function parseFile(file: File, options: ParseOptions = {}): Promise<ParsedData> {
    const MAX_SIZE_MB = 30;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Dung lượng file quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng upload file dưới ${MAX_SIZE_MB}MB để tránh crash trình duyệt!`);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (ext === 'csv' || ext === 'tsv') {
        return parseCSV(file, options);
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
        return parseExcel(file, options);
    } else {
        throw new Error(`Định dạng file .${ext} không được hỗ trợ. Vui lòng dùng .xlsx, .xlsm, .xls hoặc .csv`);
    }
}

function findHeaderRowIndex(rows: any[][]): number {
    if (!rows || rows.length === 0) return 0;

    const searchDepth = Math.min(rows.length, 15);
    let maxScore = -1;
    let bestIndex = 0;

    for (let i = 0; i < searchDepth; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        let filledCount = 0;
        let textCount = 0;
        let uniqueValues = new Set();

        row.forEach(cell => {
            if (cell != null && String(cell).trim() !== '') {
                filledCount++;
                if (typeof cell === 'string' || isNaN(Number(cell))) {
                    textCount++;
                }
                uniqueValues.add(String(cell).trim().toLowerCase());
            }
        });

        const uniqueCount = uniqueValues.size;
        let score = filledCount + (textCount * 0.5) + (uniqueCount * 0.5);
        const numberCount = filledCount - textCount;
        score -= numberCount * 0.5;

        if (score > maxScore && filledCount > 0) {
            maxScore = score;
            bestIndex = i;
        }
    }
    return bestIndex;
}

async function parseExcel(file: File, options: ParseOptions = {}): Promise<ParsedData> {
    const XLSX = await import('xlsx');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: true,
                    cellNF: true,
                    cellText: true,
                    cellFormula: true, // IMPORTANT: Enable formula parsing
                    raw: false
                });

                const sheetNames = workbook.SheetNames;
                if (sheetNames.length === 0) {
                    throw new Error('File Excel không có sheet nào.');
                }

                // Dynamic Row Limit based on sheet count
                const numSheets = sheetNames.length;
                let maxRowsPerSheet = 3000;
                if (numSheets > 10) maxRowsPerSheet = 500;
                else if (numSheets >= 7) maxRowsPerSheet = 1000;
                else if (numSheets >= 4) maxRowsPerSheet = 2000;

                const sheets: any = {};
                for (const name of sheetNames) {
                    const worksheet = workbook.Sheets[name];

                    if (worksheet['!ref']) {
                        const range = XLSX.utils.decode_range(worksheet['!ref']);
                        range.s.c = 0;
                        range.s.r = 0;
                        worksheet['!ref'] = XLSX.utils.encode_range(range);
                    }

                    // Thêm header: 1 để parse thành array 2D
                    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1,
                        defval: null,
                        blankrows: true,
                        raw: true // keep raw values to avoid losing objects if cellFormula is used in the future
                    });

                    // Để parse được công thức, ta cũng cần truy cập worksheet dictionary (worksheet['A1'].f)
                    // Ta sẽ lưu trực tiếp raw worksheet vào object để dùng sau.

                    if (jsonData.length === 0) {
                        sheets[name] = { headers: [], rows: [], totalRows: 0, totalCols: 0, skipRows: 0, skipCols: 0 };
                        continue;
                    }

                    const headerIndex = options.startRow && options.startRow > 0
                        ? options.startRow - 1
                        : findHeaderRowIndex(jsonData);

                    const colOffset = options.startCol && options.startCol > 0 ? options.startCol - 1 : 0;

                    const headers = jsonData[headerIndex].slice(colOffset).map((h: any, i: number) => {
                        if (h == null || String(h).trim() === '') {
                            return options.lang === 'en' ? `Column_${i + 1}` : `Cột_${i + 1}`;
                        }
                        return String(h).trim();
                    });

                    const rows = jsonData.slice(headerIndex + 1).filter(row => {
                        return row.slice(colOffset).some((cell: any) => cell != null && String(cell).trim() !== '');
                    }).map(row => row.slice(colOffset));

                    const truncatedRows = rows.slice(0, maxRowsPerSheet);

                    sheets[name] = {
                        headers,
                        rows: truncatedRows,
                        totalRows: rows.length, // Keep real size reported
                        totalCols: headers.length,
                        skipRows: headerIndex,
                        skipCols: colOffset,
                        rawWorksheet: worksheet // Dùng để build graph
                    };
                }

                // Smart sheet selection: skip description/metadata sheets, prefer data sheets
                const SKIP_SHEET_NAMES = new Set([
                    'description', 'instructions', 'notes', 'readme', 'info',
                    'about', 'legend', 'glossary', 'guide', 'help', 'overview'
                ]);
                const PREFERRED_SHEET_NAMES = new Set([
                    'data', 'sheet1', 'serving data', 'dataset', 'raw data',
                    'rawdata', 'input', 'main', 'records'
                ]);

                function pickBestSheet(names: string[], sheetMap: any): string {
                    // 1. Prefer a sheet in PREFERRED list (first match wins)
                    for (const name of names) {
                        if (PREFERRED_SHEET_NAMES.has(name.toLowerCase())) return name;
                    }
                    // 2. Skip sheets in SKIP list, pick first non-skipped sheet that has data
                    for (const name of names) {
                        if (!SKIP_SHEET_NAMES.has(name.toLowerCase())) {
                            const s = sheetMap[name];
                            if (s && s.totalCols > 1) return name;
                        }
                    }
                    // 3. Fallback: pick sheet with most columns among non-skipped
                    let best = names[0];
                    let bestCols = 0;
                    for (const name of names) {
                        const s = sheetMap[name];
                        if (s && s.totalCols > bestCols) {
                            bestCols = s.totalCols;
                            best = name;
                        }
                    }
                    return best;
                }

                const activeSheet = pickBestSheet(sheetNames, sheets);

                const parsedData: ParsedData = {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.name.split('.').pop()?.toLowerCase(),
                    sheetNames,
                    activeSheet,
                    sheets,
                    headers: sheets[activeSheet]?.headers || [],
                    rows: sheets[activeSheet]?.rows || [],
                    totalRows: sheets[activeSheet]?.totalRows || 0,
                    totalCols: sheets[activeSheet]?.totalCols || 0,
                    skipRows: sheets[activeSheet]?.skipRows || 0,
                    skipCols: sheets[activeSheet]?.skipCols || 0,
                    rawWorkbook: workbook // Expose raw workbook for advanced graph logic
                } as any;

                resolve(parsedData);
            } catch (err: any) {
                reject(new Error('Lỗi khi đọc file Excel: ' + err.message));
            }
        };

        reader.onerror = () => reject(new Error('Lỗi đọc file. Vui lòng thử lại.'));
        reader.readAsArrayBuffer(file);
    });
}

async function parseCSV(file: File, options: ParseOptions = {}): Promise<ParsedData> {
    const Papa = await import('papaparse');

    return new Promise((resolve, reject) => {
        Papa.default.parse(file, {
            header: false,
            skipEmptyLines: false,
            dynamicTyping: true,
            encoding: 'UTF-8',
            complete: (results: any) => {
                try {
                    if (!results.data || results.data.length === 0) {
                        throw new Error('File CSV không có dữ liệu.');
                    }

                    const rawData = results.data as any[][];

                    const headerIndex = options.startRow && options.startRow > 0
                        ? options.startRow - 1
                        : findHeaderRowIndex(rawData);

                    const colOffset = options.startCol && options.startCol > 0 ? options.startCol - 1 : 0;

                    const headers = rawData[headerIndex].slice(colOffset).map((h: any, i: number) => {
                        if (h == null || String(h).trim() === '') {
                            return options.lang === 'en' ? `Column_${i + 1}` : `Cột_${i + 1}`;
                        }
                        return String(h).trim();
                    });

                    const rows = rawData.slice(headerIndex + 1).filter(row =>
                        row.slice(colOffset).some((cell: any) => cell != null && String(cell).trim() !== '')
                    ).map(row => row.slice(colOffset));

                    const maxCols = headers.length;
                    const normalizedRows = rows.map(row => {
                        const padded = [...row];
                        while (padded.length < maxCols) padded.push(null);
                        return padded.slice(0, maxCols);
                    });

                    const sheetName = 'Data';
                    const sheets = {
                        [sheetName]: {
                            headers,
                            rows: normalizedRows,
                            totalRows: normalizedRows.length,
                            totalCols: headers.length,
                            skipRows: headerIndex,
                            skipCols: colOffset
                        }
                    };

                    const parsedData: ParsedData = {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: 'csv',
                        sheetNames: [sheetName],
                        activeSheet: sheetName,
                        sheets,
                        headers,
                        rows: normalizedRows,
                        totalRows: normalizedRows.length,
                        totalCols: headers.length,
                        skipRows: headerIndex,
                        skipCols: colOffset
                    } as any;

                    resolve(parsedData);
                } catch (err: any) {
                    reject(new Error('Lỗi khi xử lý file CSV: ' + err.message));
                }
            },
            error: (err: any) => reject(new Error('Lỗi đọc file CSV: ' + err.message))
        });
    });
}

export function switchSheet(parsedData: any, sheetName: string): boolean {
    if (parsedData.sheets && parsedData.sheets[sheetName]) {
        parsedData.activeSheet = sheetName;
        parsedData.headers = parsedData.sheets[sheetName].headers;
        parsedData.rows = parsedData.sheets[sheetName].rows;
        parsedData.totalRows = parsedData.sheets[sheetName].totalRows;
        parsedData.totalCols = parsedData.sheets[sheetName].totalCols;
        parsedData.skipRows = parsedData.sheets[sheetName].skipRows;
        parsedData.skipCols = parsedData.sheets[sheetName].skipCols;
        return true;
    }
    return false;
}

export function getPreviewRows(parsedData: any, n = 10): any[][] {
    return parsedData.rows.slice(0, n);
}