// ─── Core Types ──────────────────────────────────────────────────────
export interface FormulaRef {
    fromSheet: string;
    fromCell: string;
    formula: string;
    toSheet: string;
    toCell: string;
}

export interface SheetNode {
    name: string;
    formulaCount: number;
    inDegree: number;
    outDegree: number;
    totalCells: number;
    dataOnlyCount: number;
    role: 'source' | 'sink' | 'hub' | 'isolated';
    functionUsage: Record<string, number>;
    complexityScore: number;
}

export interface SheetEdge {
    from: string;
    to: string;
    references: FormulaRef[];
    weight: number;
}

export interface FormulaGraphData {
    nodes: SheetNode[];
    edges: SheetEdge[];
    totalFormulas: number;
    crossSheetRefs: number;
    isolatedSheets: string[];
    summary: string;
    definedNames?: { name: string; sheet: string; range: string }[];
}

// ─── Level 2: Sheet Detail Types ─────────────────────────────────────
export interface CellNode {
    address: string;
    formula: string | null;
    value: any;
    type: 'formula' | 'data' | 'empty';
    /** Intra-sheet cells this cell depends ON */
    precedents: string[];
    /** Intra-sheet cells that depend on THIS cell */
    dependents: string[];
    /** Cross-sheet references FROM this cell's formula */
    crossSheetRefs: { sheet: string; cell: string }[];
    /** Functions used in this cell's formula */
    functions: string[];
}

export interface IntraSheetEdge {
    from: string;  // e.g. "A1"
    to: string;    // e.g. "B2"
    formula: string;
}

export interface SheetDetail {
    sheetName: string;
    cells: Record<string, CellNode>;
    intraEdges: IntraSheetEdge[];
    functionDistribution: Record<string, number>;
    formulaCells: CellNode[];
    /** Cross-sheet connections grouped by target sheet */
    crossSheetIn: { sheet: string; cells: { from: string; to: string; formula: string }[] }[];
    crossSheetOut: { sheet: string; cells: { from: string; to: string; formula: string }[] }[];
    complexityScore: number;
    totalFormulas: number;
    totalCells: number;
    namedRanges?: { name: string; range: string; cells: string[] }[];
}

// ─── Level 3: Cell Chain Types ───────────────────────────────────────
export interface ChainNode {
    address: string;
    sheet: string;
    formula: string | null;
    value: any;
    depth: number;
    isRange?: boolean;
}

export interface CellChain {
    /** The cell being analyzed */
    target: ChainNode;
    /** All cells that feed into this cell (recursive) */
    precedents: ChainNode[];
    /** All cells that depend on this cell (recursive) */
    dependents: ChainNode[];
    /** The formula with each reference annotated */
    formulaParts: { text: string; isRef: boolean; refSheet?: string; refCell?: string }[];
}

// ─── Regex patterns ──────────────────────────────────────────────────
const CROSS_SHEET_REF = /('([^']+)'|([^'"\s:!*^\\\/&+=<>(),\-]+))!(\$?[A-Z]+\$?[0-9]+(:\$?[A-Z]+\$?[0-9]+)?)/g;
const INTRA_CELL_REF = /(?<![A-Za-z0-9_!'])(\$?[A-Z]{1,3}\$?\d{1,7})(?::(\$?[A-Z]{1,3}\$?\d{1,7}))?(?![A-Za-z0-9_(])/g;
const FUNCTION_NAME = /([A-Z][A-Z0-9_.]+)\s*\(/g;

/** Normalize a cell reference like $A$1 → A1 */
function normalizeRef(ref: string): string {
    return ref.replace(/\$/g, '');
}

/** Extract function names from a formula */
function extractFunctions(formula: string): string[] {
    const fns: string[] = [];
    let m;
    const re = new RegExp(FUNCTION_NAME.source, 'g');
    while ((m = re.exec(formula)) !== null) {
        fns.push(m[1]);
    }
    return fns;
}

/** Expand a range like A1:A5 into individual cell addresses */
function expandRange(start: string, end: string): string[] {
    const sCol = start.replace(/[0-9]/g, '');
    const sRow = parseInt(start.replace(/[^0-9]/g, ''), 10);
    const eCol = end.replace(/[0-9]/g, '');
    const eRow = parseInt(end.replace(/[^0-9]/g, ''), 10);

    const colToNum = (c: string) => {
        let n = 0;
        for (let i = 0; i < c.length; i++) {
            n = n * 26 + (c.charCodeAt(i) - 64);
        }
        return n;
    };
    const numToCol = (n: number) => {
        let s = '';
        while (n > 0) {
            const r = (n - 1) % 26;
            s = String.fromCharCode(65 + r) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    };

    const cells: string[] = [];
    const sc = colToNum(sCol);
    const ec = colToNum(eCol);
    for (let c = sc; c <= ec; c++) {
        for (let r = sRow; r <= eRow; r++) {
            cells.push(`${numToCol(c)}${r}`);
        }
    }
    return cells;
}

// ═══════════════════════════════════════════════════════════════════════
// Level 1: buildFormulaGraph (sheet-level overview) — enhanced
// ═══════════════════════════════════════════════════════════════════════
export function buildFormulaGraph(parsedData: any): FormulaGraphData | null {
    if (!parsedData || !parsedData.sheets || Object.keys(parsedData.sheets).length === 0) {
        return null;
    }

    const { sheets } = parsedData;
    const sheetNames = Object.keys(sheets);

    const nodesMap: Record<string, SheetNode> = {};
    const edgesMap: Record<string, SheetEdge> = {};

    let totalFormulas = 0;
    let crossSheetRefs = 0;

    // Extract defined names (Named Ranges)
    const definedNames: { name: string; sheet: string; range: string }[] = [];
    if (parsedData.rawWorkbook?.Workbook?.Names) {
        for (const dn of parsedData.rawWorkbook.Workbook.Names) {
            if (dn.Name && dn.Ref) {
                // Parse standard Named Range "Sheet1!$A$1:$B$10" or "'Sheet 1'!$A$1"
                const parts = dn.Ref.split('!');
                if (parts.length === 2 && !parts[1].startsWith('#')) {
                    const sheet = parts[0].replace(/['"]/g, '');
                    definedNames.push({ name: dn.Name, sheet, range: parts[1] });
                }
            }
        }
    }

    for (const name of sheetNames) {
        nodesMap[name] = {
            name,
            formulaCount: 0,
            inDegree: 0,
            outDegree: 0,
            totalCells: 0,
            dataOnlyCount: 0,
            role: 'isolated',
            functionUsage: {},
            complexityScore: 0
        };
    }

    const sheetRefRegex = new RegExp(CROSS_SHEET_REF.source, 'g');

    for (const fromSheet of sheetNames) {
        const rawWorksheet = sheets[fromSheet].rawWorksheet;
        if (!rawWorksheet) continue;

        const funcUsage: Record<string, number> = {};
        let sheetComplexity = 0;

        for (const cellAddress in rawWorksheet) {
            if (cellAddress.startsWith('!')) continue;
            const cell = rawWorksheet[cellAddress];
            if (!cell) continue;

            nodesMap[fromSheet].totalCells++;

            if (cell.f) {
                const formulaStr = String(cell.f);
                nodesMap[fromSheet].formulaCount++;
                totalFormulas++;

                // Complexity: longer formulas = more complex
                sheetComplexity += Math.min(10, Math.ceil(formulaStr.length / 30));

                // Function extraction
                const fns = extractFunctions(formulaStr);
                for (const fn of fns) {
                    funcUsage[fn] = (funcUsage[fn] || 0) + 1;
                    sheetComplexity += 1; // Each function call adds complexity
                }

                // Cross-sheet reference detection
                let match;
                const foundTargets = new Set<string>();
                sheetRefRegex.lastIndex = 0;

                while ((match = sheetRefRegex.exec(formulaStr)) !== null) {
                    const toSheet = match[2] || match[3];
                    const toCell = match[4];

                    if (toSheet && toSheet !== fromSheet && nodesMap[toSheet]) {
                        crossSheetRefs++;
                        foundTargets.add(toSheet);
                        sheetComplexity += 3; // Cross-sheet refs are high complexity

                        const edgeKey = `${fromSheet}->${toSheet}`;
                        if (!edgesMap[edgeKey]) {
                            edgesMap[edgeKey] = {
                                from: fromSheet,
                                to: toSheet,
                                references: [],
                                weight: 0
                            };
                        }

                        edgesMap[edgeKey].references.push({
                            fromSheet,
                            fromCell: cellAddress,
                            formula: formulaStr,
                            toSheet,
                            toCell
                        });
                        edgesMap[edgeKey].weight++;
                    }
                }

                // Detect usage of Named Ranges in formula
                for (const nr of definedNames) {
                    // Match whole word (regex case-insensitive)
                    const nrRegex = new RegExp(`(?<![a-zA-Z0-9_])${nr.name}(?![a-zA-Z0-9_])`, 'gi');
                    if (nrRegex.test(formulaStr)) {
                        const toSheet = nr.sheet;
                        // If Named Range is on a different sheet, register cross-sheet edge
                        if (toSheet && toSheet !== fromSheet && nodesMap[toSheet]) {
                            crossSheetRefs++;
                            foundTargets.add(toSheet);
                            sheetComplexity += 2;

                            const edgeKey = `${fromSheet}->${toSheet}`;
                            if (!edgesMap[edgeKey]) {
                                edgesMap[edgeKey] = {
                                    from: fromSheet,
                                    to: toSheet,
                                    references: [],
                                    weight: 0
                                };
                            }

                            edgesMap[edgeKey].references.push({
                                fromSheet,
                                fromCell: cellAddress,
                                formula: formulaStr,
                                toSheet,
                                toCell: `NR_${nr.name}`
                            });
                            edgesMap[edgeKey].weight++;
                        }
                    }
                }

                for (const target of foundTargets) {
                    nodesMap[fromSheet].outDegree++;
                    nodesMap[target].inDegree++;
                }
            } else {
                nodesMap[fromSheet].dataOnlyCount++;
            }
        }

        nodesMap[fromSheet].functionUsage = funcUsage;
        nodesMap[fromSheet].complexityScore = Math.min(100, sheetComplexity);
    }

    const isolatedSheets: string[] = [];
    const nodes = Object.values(nodesMap);
    for (const node of nodes) {
        if (node.inDegree === 0 && node.outDegree === 0) {
            node.role = 'isolated';
            isolatedSheets.push(node.name);
        } else if (node.inDegree > 0 && node.outDegree > 0) {
            node.role = 'hub';
        } else if (node.inDegree > 0 && node.outDegree === 0) {
            node.role = 'source';
        } else {
            node.role = 'sink';
        }
    }

    const edges = Object.values(edgesMap);

    return {
        nodes,
        edges,
        totalFormulas,
        crossSheetRefs,
        isolatedSheets,
        definedNames,
        summary: `Graph detected ${sheetNames.length} sheets with ${totalFormulas} formulas resulting in ${crossSheetRefs} cross-sheet references.`
    };
}

// ═══════════════════════════════════════════════════════════════════════
// Level 2: buildSheetDetail — per-sheet cell-level analysis
// ═══════════════════════════════════════════════════════════════════════
export function buildSheetDetail(parsedData: any, sheetName: string, graphData: FormulaGraphData): SheetDetail | null {
    if (!parsedData?.sheets?.[sheetName]) return null;

    const rawWorksheet = parsedData.sheets[sheetName].rawWorksheet;
    if (!rawWorksheet) return null;

    const allSheetNames = Object.keys(parsedData.sheets);
    const cells: Record<string, CellNode> = {};
    const intraEdges: IntraSheetEdge[] = [];
    const funcDist: Record<string, number> = {};
    const formulaCells: CellNode[] = [];
    const namedRanges: { name: string; range: string; cells: string[] }[] = [];

    if (graphData.definedNames) {
        const sheetNamesForThisSheet = graphData.definedNames.filter(n => n.sheet === sheetName);
        for (const nr of sheetNamesForThisSheet) {
            const ends = nr.range.split(':');
            const cellsInName = ends.length === 2
                ? expandRange(normalizeRef(ends[0]), normalizeRef(ends[1]))
                : [normalizeRef(ends[0])];
            namedRanges.push({ name: nr.name, range: nr.range, cells: cellsInName });
        }
    }

    // Phase 1: Build all CellNodes
    for (const addr in rawWorksheet) {
        if (addr.startsWith('!')) continue;
        const cell = rawWorksheet[addr];
        if (!cell) continue;

        const hasFormula = !!cell.f;
        const formulaStr = hasFormula ? String(cell.f) : null;
        const functions = formulaStr ? extractFunctions(formulaStr) : [];

        for (const fn of functions) {
            funcDist[fn] = (funcDist[fn] || 0) + 1;
        }

        const node: CellNode = {
            address: addr,
            formula: formulaStr,
            value: cell.v ?? cell.w ?? null,
            type: hasFormula ? 'formula' : (cell.v != null ? 'data' : 'empty'),
            precedents: [],
            dependents: [],
            crossSheetRefs: [],
            functions
        };

        // Extract intra-sheet references from formula
        if (formulaStr) {
            const crossSheetRefRegex = new RegExp(CROSS_SHEET_REF.source, 'g');
            const intraCellRegex = new RegExp(INTRA_CELL_REF.source, 'g');

            // First find cross-sheet refs
            let m;
            crossSheetRefRegex.lastIndex = 0;
            while ((m = crossSheetRefRegex.exec(formulaStr)) !== null) {
                const toSheet = m[2] || m[3];
                const toCell = normalizeRef(m[4]);
                if (toSheet && allSheetNames.includes(toSheet)) {
                    node.crossSheetRefs.push({ sheet: toSheet, cell: toCell });
                }
            }

            // Remove cross-sheet parts to isolate intra-sheet refs
            const cleanFormula = formulaStr.replace(crossSheetRefRegex, '___XREF___');
            intraCellRegex.lastIndex = 0;
            while ((m = intraCellRegex.exec(cleanFormula)) !== null) {
                if (m[0].includes('___XREF___')) continue;
                const startRef = normalizeRef(m[1]);
                const endRef = m[2] ? normalizeRef(m[2]) : null;

                if (endRef) {
                    // Range reference — expand (capped at 200 cells for performance)
                    const expanded = expandRange(startRef, endRef);
                    for (const ref of expanded.slice(0, 200)) {
                        if (!node.precedents.includes(ref) && ref !== addr) {
                            node.precedents.push(ref);
                        }
                    }
                } else {
                    if (!node.precedents.includes(startRef) && startRef !== addr) {
                        node.precedents.push(startRef);
                    }
                }
            }

            // Detect Named Range usage
            if (graphData.definedNames) {
                for (const nr of graphData.definedNames) {
                    const nrRegex = new RegExp(`(?<![a-zA-Z0-9_])${nr.name}(?![a-zA-Z0-9_])`, 'gi');
                    if (nrRegex.test(formulaStr)) {
                        if (nr.sheet === sheetName) {
                            // Intra-sheet Named Range reference: it's a precedent!
                            const pseudoAddr = `NR_${nr.name}`;
                            if (!node.precedents.includes(pseudoAddr)) {
                                node.precedents.push(pseudoAddr);
                            }
                        } else if (allSheetNames.includes(nr.sheet)) {
                            // Cross-sheet Named Range reference
                            node.crossSheetRefs.push({ sheet: nr.sheet, cell: `NR_${nr.name}` });
                        }
                    }
                }
            }
        }

        cells[addr] = node;
        if (hasFormula) formulaCells.push(node);
    }

    // Phase 2: Build reverse (dependent) links and IntraSheetEdges
    for (const addr in cells) {
        const node = cells[addr];
        for (const precAddr of node.precedents) {
            // Create the intra edge
            intraEdges.push({
                from: precAddr,
                to: addr,
                formula: node.formula || ''
            });
            // Register this cell as a dependent of its precedent
            if (cells[precAddr]) {
                if (!cells[precAddr].dependents.includes(addr)) {
                    cells[precAddr].dependents.push(addr);
                }
            }
        }
    }

    // Phase 2.5: Aggregate precedents and dependents for Named Ranges
    for (const nr of namedRanges) {
        const precSet = new Set<string>();
        const depSet = new Set<string>();
        const nrPseudoId = `NR_${nr.name}`;

        for (const cAddr of nr.cells) {
            const cNode = cells[cAddr];
            if (cNode) {

                // Add a structural edge from the actual cell to the Named Range!
                intraEdges.push({
                    from: cAddr,
                    to: nrPseudoId,
                    formula: 'Trực thuộc Named Range'
                });
            }
        }
        // Clean up self references if any were explicitly added
        nr.cells.forEach(c => {
            precSet.delete(c);
            depSet.delete(c);
        });
        (nr as any).precedents = Array.from(precSet);
        (nr as any).dependents = Array.from(depSet);
    }

    // Phase 3: Cross-sheet connections (using graph edges)
    const crossSheetOut: { sheet: string; cells: { from: string; to: string; formula: string }[] }[] = [];
    const crossSheetIn: { sheet: string; cells: { from: string; to: string; formula: string }[] }[] = [];

    const outEdges = graphData.edges.filter(e => e.from === sheetName);
    const inEdges = graphData.edges.filter(e => e.to === sheetName);

    for (const edge of outEdges) {
        crossSheetOut.push({
            sheet: edge.to,
            cells: edge.references.map(r => ({ from: r.fromCell, to: r.toCell, formula: r.formula }))
        });
    }
    for (const edge of inEdges) {
        crossSheetIn.push({
            sheet: edge.from,
            cells: edge.references.map(r => ({ from: r.fromCell, to: r.toCell, formula: r.formula }))
        });
    }

    // Complexity score
    const complexityScore = Math.min(100,
        formulaCells.length * 2 +
        intraEdges.length +
        Object.keys(funcDist).length * 5 +
        crossSheetOut.reduce((s, g) => s + g.cells.length, 0) * 3
    );

    // Sort formula cells by address
    formulaCells.sort((a, b) => {
        const colA = a.address.replace(/[0-9]/g, '');
        const rowA = parseInt(a.address.replace(/[^0-9]/g, ''), 10);
        const colB = b.address.replace(/[0-9]/g, '');
        const rowB = parseInt(b.address.replace(/[^0-9]/g, ''), 10);
        return colA === colB ? rowA - rowB : colA.localeCompare(colB);
    });

    return {
        sheetName,
        cells,
        intraEdges,
        functionDistribution: funcDist,
        formulaCells,
        crossSheetIn,
        crossSheetOut,
        complexityScore,
        totalFormulas: formulaCells.length,
        totalCells: Object.keys(cells).length,
        namedRanges
    };
}

// ═══════════════════════════════════════════════════════════════════════
// Level 3: buildCellChain — full dependency chain for a single cell
// ═══════════════════════════════════════════════════════════════════════
export function buildCellChain(
    parsedData: any,
    sheetName: string,
    cellAddress: string,
    graphData: FormulaGraphData,
    maxDepth: number = 5
): CellChain | null {
    if (!parsedData?.sheets?.[sheetName]) return null;
    const rawWs = parsedData.sheets[sheetName].rawWorksheet;
    if (!rawWs) return null;

    const cell = rawWs[cellAddress];
    const formulaStr = cell?.f ? String(cell.f) : null;

    const target: ChainNode = {
        address: cellAddress,
        sheet: sheetName,
        formula: formulaStr,
        value: cell?.v ?? cell?.w ?? null,
        depth: 0
    };

    // ── Trace precedents (what this cell depends on) ──
    const precedents: ChainNode[] = [];
    const visited = new Set<string>();

    function tracePrecedents(sheet: string, addr: string, depth: number) {
        const key = `${sheet}!${addr}`;
        if (visited.has(key) || depth > maxDepth) return;
        visited.add(key);

        const ws = parsedData.sheets[sheet]?.rawWorksheet;
        if (!ws) return;
        const c = ws[addr];
        if (!c?.f) return;

        const formula = String(c.f);
        const crossRefRe = new RegExp(CROSS_SHEET_REF.source, 'g');
        const intraRefRe = new RegExp(INTRA_CELL_REF.source, 'g');

        // Cross-sheet precedents
        let m;
        crossRefRe.lastIndex = 0;
        while ((m = crossRefRe.exec(formula)) !== null) {
            const toSheet = m[2] || m[3];
            const toCellRaw = m[4];
            const parts = toCellRaw.split(':');
            const toCell = normalizeRef(parts[0]);
            const endCell = parts[1] ? normalizeRef(parts[1]) : null;

            if (toSheet && parsedData.sheets[toSheet]) {
                if (endCell) {
                    const expanded = expandRange(toCell, endCell);
                    const toAdd = expanded.slice(0, 50);
                    toAdd.forEach(refAddr => {
                        const refCell = parsedData.sheets[toSheet]?.rawWorksheet?.[refAddr];
                        const node: ChainNode = {
                            address: refAddr,
                            sheet: toSheet,
                            formula: refCell?.f ? String(refCell.f) : null,
                            value: refCell?.v ?? refCell?.w ?? null,
                            depth
                        };
                        precedents.push(node);
                        if (refCell?.f) {
                            tracePrecedents(toSheet, refAddr, depth + 1);
                        }
                    });
                    if (expanded.length > 50) {
                        precedents.push({
                            address: `... +${expanded.length - 50} cells`,
                            sheet: toSheet,
                            formula: null,
                            value: `... truncated`,
                            depth,
                        });
                    }
                } else {
                    const node: ChainNode = {
                        address: toCell,
                        sheet: toSheet,
                        formula: parsedData.sheets[toSheet]?.rawWorksheet?.[toCell]?.f || null,
                        value: parsedData.sheets[toSheet]?.rawWorksheet?.[toCell]?.v ?? null,
                        depth
                    };
                    precedents.push(node);
                    tracePrecedents(toSheet, toCell, depth + 1);
                }
            }
        }

        // Intra-sheet precedents
        const cleanFormula = formula.replace(crossRefRe, '___XREF___');
        intraRefRe.lastIndex = 0;
        while ((m = intraRefRe.exec(cleanFormula)) !== null) {
            if (m[0].includes('___XREF___')) continue;

            const startRef = normalizeRef(m[1]);
            const endRef = m[2] ? normalizeRef(m[2]) : null;

            if (endRef) {
                const expanded = expandRange(startRef, endRef);
                const toAdd = expanded.slice(0, 50);
                toAdd.forEach(refAddr => {
                    if (refAddr === addr) return;
                    const refKey = `${sheet}!${refAddr}`;
                    if (visited.has(refKey)) return;

                    const refCell = ws[refAddr];
                    const node: ChainNode = {
                        address: refAddr,
                        sheet: sheet,
                        formula: refCell?.f ? String(refCell.f) : null,
                        value: refCell?.v ?? refCell?.w ?? null,
                        depth
                    };
                    precedents.push(node);
                    if (refCell?.f) {
                        tracePrecedents(sheet, refAddr, depth + 1);
                    }
                });
                if (expanded.length > 50) {
                    precedents.push({
                        address: `... +${expanded.length - 50} cells`,
                        sheet: sheet,
                        formula: null,
                        value: `... truncated`,
                        depth,
                    });
                }
            } else {
                // Direct single-cell ref
                const refAddr = startRef;
                if (refAddr === addr) continue;
                const refKey = `${sheet}!${refAddr}`;
                if (visited.has(refKey)) continue;

                const refCell = ws[refAddr];
                const node: ChainNode = {
                    address: refAddr,
                    sheet: sheet,
                    formula: refCell?.f ? String(refCell.f) : null,
                    value: refCell?.v ?? refCell?.w ?? null,
                    depth
                };
                precedents.push(node);
                if (refCell?.f) {
                    tracePrecedents(sheet, refAddr, depth + 1);
                }
            }
        }
    }

    if (formulaStr) {
        tracePrecedents(sheetName, cellAddress, 1);
    }

    // ── Trace dependents (what depends on this cell) ──
    const dependents: ChainNode[] = [];
    const visitedDep = new Set<string>();

    function traceDependents(sheet: string, addr: string, depth: number) {
        const key = `${sheet}!${addr}`;
        if (visitedDep.has(key) || depth > maxDepth) return;
        visitedDep.add(key);

        // Search same sheet for formulas referencing this cell
        const ws = parsedData.sheets[sheet]?.rawWorksheet;
        if (!ws) return;

        const crossRefRe = new RegExp(CROSS_SHEET_REF.source, 'g');
        const intraRefRe = new RegExp(INTRA_CELL_REF.source, 'g');

        for (const otherAddr in ws) {
            if (otherAddr.startsWith('!') || otherAddr === addr) continue;
            const otherCell = ws[otherAddr];
            if (!otherCell?.f) continue;

            const formula = String(otherCell.f);

            // Re-parse the formula to properly check if 'addr' is included in its precedents
            let isDependent = false;

            // Check cross sheet refs that point back to this sheet and cell (if applicable)
            // (Usually cross refs inside the same sheet are just intra refs, but sometimes users write Sheet1!A1 inside Sheet1)
            let m;
            crossRefRe.lastIndex = 0;
            while ((m = crossRefRe.exec(formula)) !== null) {
                const toSheet = m[2] || m[3];
                const toCellRaw = normalizeRef(m[4]);
                // Check if it's the same sheet and cell
                if (toSheet === sheet) {
                    const parts = toCellRaw.split(':');
                    const addresses = parts.length === 2 ? expandRange(parts[0], parts[1]) : [parts[0]];
                    if (addresses.includes(addr)) isDependent = true;
                }
            }

            if (!isDependent) {
                const cleanFormula = formula.replace(crossRefRe, '___XREF___');
                intraRefRe.lastIndex = 0;
                while ((m = intraRefRe.exec(cleanFormula)) !== null) {
                    if (m[0].includes('___XREF___')) continue;
                    const startRef = normalizeRef(m[1]);
                    const endRef = m[2] ? normalizeRef(m[2]) : null;
                    const addresses = endRef ? expandRange(startRef, endRef) : [startRef];
                    if (addresses.includes(addr)) {
                        isDependent = true;
                        break;
                    }
                }
            }

            if (isDependent) {
                const depKey = `${sheet}!${otherAddr}`;
                if (!visitedDep.has(depKey)) {
                    dependents.push({
                        address: otherAddr,
                        sheet: sheet,
                        formula: formula,
                        value: otherCell.v ?? otherCell.w ?? null,
                        depth
                    });
                    traceDependents(sheet, otherAddr, depth + 1);
                }
            }
        }

        // Search other sheets for cross-sheet references to this cell
        for (const edge of graphData.edges) {
            if (edge.to === sheet) {
                for (const ref of edge.references) {
                    if (normalizeRef(ref.toCell.split(':')[0]) === addr) {
                        const depKey = `${ref.fromSheet}!${ref.fromCell}`;
                        if (!visitedDep.has(depKey)) {
                            const depWs = parsedData.sheets[ref.fromSheet]?.rawWorksheet;
                            const depCell = depWs?.[ref.fromCell];
                            dependents.push({
                                address: ref.fromCell,
                                sheet: ref.fromSheet,
                                formula: ref.formula,
                                value: depCell?.v ?? depCell?.w ?? null,
                                depth
                            });
                            traceDependents(ref.fromSheet, ref.fromCell, depth + 1);
                        }
                    }
                }
            }
        }
    }

    traceDependents(sheetName, cellAddress, 1);

    // ── Parse formula into annotated parts ──
    const formulaParts: CellChain['formulaParts'] = [];
    if (formulaStr) {
        // Build a combined regex to tokenize the formula
        let lastIndex = 0;
        const tokens: { start: number; end: number; isRef: boolean; refSheet?: string; refCell?: string }[] = [];

        // Find cross-sheet refs
        const cRe = new RegExp(CROSS_SHEET_REF.source, 'g');
        let cm;
        cRe.lastIndex = 0;
        while ((cm = cRe.exec(formulaStr)) !== null) {
            tokens.push({
                start: cm.index,
                end: cm.index + cm[0].length,
                isRef: true,
                refSheet: cm[2] || cm[3],
                refCell: cm[4]
            });
        }

        // Find intra-sheet refs (excluding those that overlap cross-sheet)
        const iRe = new RegExp(INTRA_CELL_REF.source, 'g');
        iRe.lastIndex = 0;
        while ((cm = iRe.exec(formulaStr)) !== null) {
            const overlaps = tokens.some(t => cm!.index >= t.start && cm!.index < t.end);
            if (!overlaps) {
                tokens.push({
                    start: cm.index,
                    end: cm.index + cm[0].length,
                    isRef: true,
                    refSheet: sheetName,
                    refCell: cm[1] + (cm[2] ? `:${cm[2]}` : '')
                });
            }
        }

        // Sort tokens by position
        tokens.sort((a, b) => a.start - b.start);

        // Build parts
        for (const token of tokens) {
            if (token.start > lastIndex) {
                formulaParts.push({ text: formulaStr.slice(lastIndex, token.start), isRef: false });
            }
            formulaParts.push({
                text: formulaStr.slice(token.start, token.end),
                isRef: true,
                refSheet: token.refSheet,
                refCell: token.refCell
            });
            lastIndex = token.end;
        }
        if (lastIndex < formulaStr.length) {
            formulaParts.push({ text: formulaStr.slice(lastIndex), isRef: false });
        }
    }

    return { target, precedents, dependents, formulaParts };
}
