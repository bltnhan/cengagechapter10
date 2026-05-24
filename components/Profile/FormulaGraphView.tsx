'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '../../hooks/store';
import { Layers, FileSpreadsheet, GitBranch, AlertTriangle, Activity, Database, Network, X, Maximize, Minimize, Focus, RotateCcw, Eye, EyeOff, Search, Download } from 'lucide-react';
import { FormulaGraphData, SheetDetail, CellChain, buildSheetDetail, buildCellChain, CellNode } from '../../lib/formulaGraph';
import { t } from '../../lib/i18n';

const ROLE_COLORS: Record<string, { gradient: [string, string]; stroke: string; label: string }> = {
    source: { gradient: ['#3b82f6', '#2563eb'], stroke: '#60a5fa', label: '📥 Data Source' },
    sink: { gradient: ['#f59e0b', '#d97706'], stroke: '#fbbf24', label: '📤 Consumer' },
    hub: { gradient: ['#14b8a6', '#0f766e'], stroke: '#2dd4bf', label: '🔄 Hub' },
    isolated: { gradient: ['#6b7280', '#4b5563'], stroke: '#9ca3af', label: '⬜ Isolated' }
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: `linear-gradient(135deg, ${color}15, ${color}08)`, border: `1px solid ${color}30`, borderRadius: '10px', flex: 1, minWidth: '140px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `linear-gradient(135deg, ${color}, ${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>{icon}</div>
            <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-color)', lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            </div>
        </div>
    );
}

// ─── Unified Layout Structures ───
interface UIDrawNode {
    id: string;          // SheetName or "SheetName!CellAddr"
    type: 'sheet' | 'cell';
    parentSheet?: string; // For cells
    label: string;
    x: number;
    y: number;
    r: number;
    roleColor: string;
    subData?: any;
    isExpandedSheet?: boolean;
}

interface UIDrawEdge {
    fromId: string;
    toId: string;
    x1: number; y1: number; x2: number; y2: number;
    weight: number;
    type: 'sheet-sheet' | 'cell-cell' | 'cell-sheet' | 'sheet-cell';
    formulas?: { from: string, to: string, formula: string }[];
}

export function FormulaGraphView() {
    const { formulaGraph, parsedData, sheetDetails, setSheetDetail, isFormulaGraphFullscreen, setIsFormulaGraphFullscreen } = useAppStore();
    const language = useAppStore(state => state.language);

    // In-place drill-down state
    const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
    const [selectedCells, setSelectedCells] = useState<{ sheet: string, cell: string }[]>([]);
    const [cellChains, setCellChains] = useState<CellChain[]>([]);
    const [showIntraEdges, setShowIntraEdges] = useState(true);
    const [showStats, setShowStats] = useState(true);
    const [maxDepth, setMaxDepth] = useState<number>(1);

    // Reset state completely when new parsedData is loaded
    useEffect(() => {
        setExpandedSheets(new Set());
        setSelectedCells([]);
        setCellChains([]);
        setSearchQuery('');
        setSearchResults([]);
        updateTransform(0, 0, 1);
    }, [parsedData]);

    // Auto-retrace if depth changes while a cell is selected
    // Auto-retrace if depth changes while cells are selected
    useEffect(() => {
        if (selectedCells.length > 0) {
            const nextChains = [...cellChains];
            let changed = false;
            for (let i = 0; i < selectedCells.length; i++) {
                const sc = selectedCells[i];
                if (!sc.cell.startsWith('NR_')) {
                    const chain = buildCellChain(parsedData, sc.sheet, sc.cell, formulaGraph!, maxDepth);
                    if (chain) {
                        nextChains[i] = chain;
                        changed = true;
                    }
                }
            }
            if (changed) setCellChains(nextChains);
        }
    }, [maxDepth, parsedData, formulaGraph]); // omit selectedCells from deps to avoid loop on selection change

    // Search and Export state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string, label: string, type: string, match: string }[]>([]);

    // SVG Pan/Zoom state
    const containerRef = useRef<HTMLDivElement>(null);
    const [scaleState, setScaleState] = useState(1);
    // PERF: hover state as refs instead of useState to avoid full React re-renders
    const hoveredNodeIdRef = useRef<string | null>(null);
    const hoveredEdgeIdxRef = useRef<number | null>(null);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const nodeTooltipRef = useRef<HTMLDivElement>(null);
    const edgeTooltipRef = useRef<HTMLDivElement>(null);
    // Force re-render only for tooltip content (not positions)
    const [tooltipContent, setTooltipContent] = useState<{ type: 'node' | 'edge', data: any } | null>(null);

    // Transform state (High Performance DOM mutation to avoid React lag on huge graphs)
    const transformRef = useRef({ x: 0, y: 0, s: 1 });
    const svgGroupRef = useRef<SVGGElement>(null);

    const applyTransform = () => {
        if (svgGroupRef.current) {
            svgGroupRef.current.setAttribute(
                'transform',
                `translate(${transformRef.current.x}, ${transformRef.current.y}) scale(${transformRef.current.s})`
            );
        }
    };

    const updateTransform = (x: number, y: number, s: number) => {
        transformRef.current = { x, y, s };
        applyTransform();
    };

    const isDraggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const zoomTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

    const WIDTH = 1200;
    const HEIGHT = 800;

    // --- Actions ---
    const handleNodeDeselect = (node: UIDrawNode) => {
        if (node.type === 'sheet') {
            setExpandedSheets(prev => {
                const next = new Set(prev);
                next.delete(node.id);
                return next;
            });
        }
        else if (node.type === 'cell') {
            const nodeCellId = (node.subData && node.subData.isNamedRange) ? `NR_${node.subData.name}` : node.label;
            const existingIdx = selectedCells.findIndex(c => c.sheet === node.parentSheet && c.cell === nodeCellId);
            if (existingIdx >= 0) {
                // Deselect if already selected
                setSelectedCells(prev => prev.filter((_, i) => i !== existingIdx));
                setCellChains(prev => prev.filter((_, i) => i !== existingIdx));
            }
        }
    };

    const handleNodeClick = (node: UIDrawNode) => {
        if (node.type === 'sheet') {
            const isExpanding = !expandedSheets.has(node.id);
            if (isExpanding) {
                // Expand sheet
                if (!sheetDetails[node.id]) {
                    const detail = buildSheetDetail(parsedData, node.id, formulaGraph!);
                    if (detail) setSheetDetail(node.id, detail);
                }
                setExpandedSheets(prev => {
                    const next = new Set(prev);
                    next.add(node.id);
                    return next;
                });
            }
        } else if (node.type === 'cell') {
            // Check if cell is isolated - if so, do nothing
            const sd = node.subData;
            if (sd && !('isNamedRange' in sd)) {
                const cst = sd as CellNode;
                const deps = cst.dependents?.length || 0;
                const precs = cst.precedents?.length || 0;
                if (deps === 0 && precs === 0) return;
            }

            // Clicked a cell node - only select/add, do not toggle
            const nodeCellId = (node.subData && node.subData.isNamedRange) ? `NR_${node.subData.name}` : node.label;

            const existingIdx = selectedCells.findIndex(c => c.sheet === node.parentSheet && c.cell === nodeCellId);

            if (existingIdx === -1) {
                if (node.subData && node.subData.isNamedRange) {
                    const nr = node.subData;
                    const precedents = nr.precedents || [];
                    const dependents = nr.dependents || [];

                    const pNodes = precedents.map((p: string) => ({ address: p, sheet: node.parentSheet!, formula: null, value: null, depth: 1 }));
                    const dNodes = dependents.map((d: string) => ({ address: d, sheet: node.parentSheet!, formula: null, value: null, depth: 1 }));

                    const chain: CellChain = {
                        target: { address: `NR_${nr.name}`, sheet: node.parentSheet!, formula: `Refers to: ${nr.range}`, value: null, depth: 0 },
                        precedents: [...pNodes],
                        dependents: [...dNodes],
                        formulaParts: [{ text: `Named Range (${nr.range})`, isRef: false }]
                    };
                    setCellChains(prev => [...prev, chain]);
                    setSelectedCells(prev => [...prev, { sheet: node.parentSheet!, cell: `NR_${nr.name}` }]);
                } else {
                    // Select and trace
                    const chain = buildCellChain(parsedData, node.parentSheet!, node.label, formulaGraph!, maxDepth);
                    if (chain) {
                        setCellChains(prev => [...prev, chain]);
                        setSelectedCells(prev => [...prev, { sheet: node.parentSheet!, cell: node.label }]);
                    }
                }
            }
        }
    };

    const handleClearCellSelection = () => {
        setSelectedCells([]);
        setCellChains([]);
    };

    // --- Search & Export Actions ---
    useEffect(() => {
        if (!searchQuery.trim() || !formulaGraph) {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const results: { id: string, label: string, type: string, match: string }[] = [];

        // Search Sheets
        formulaGraph.nodes.forEach(n => {
            if (n.name.toLowerCase().includes(query)) {
                results.push({ id: n.name, label: n.name, type: 'Sheet', match: n.name });
            }
        });

        // Search Named Ranges
        if (formulaGraph.definedNames) {
            formulaGraph.definedNames.forEach(nr => {
                if (nr.name.toLowerCase().includes(query)) {
                    results.push({ id: `${nr.sheet}!NR_${nr.name}`, label: nr.name, type: 'Named Range', match: `${nr.sheet}!${nr.range}` });
                }
            });
        }

        // Search Cells
        if (/^[a-zA-Z]+[0-9]+$/.test(searchQuery)) {
            Object.entries(sheetDetails).forEach(([sheetName, detail]) => {
                if (detail && detail.formulaCells) {
                    const match = detail.formulaCells.find(c => c.address.toLowerCase() === query);
                    if (match) {
                        results.push({ id: `${sheetName}!${match.address}`, label: match.address, type: 'Cell', match: `Formula in ${sheetName}` });
                    }
                }
            });
        } else if (searchQuery.includes('!')) {
            const [s, c] = searchQuery.split('!');
            const sheet = formulaGraph.nodes.find(n => n.name.toLowerCase() === s.toLowerCase());
            if (sheet && c && /^[a-zA-Z]+[0-9]+$/.test(c)) {
                results.push({ id: `${sheet.name}!${c.toUpperCase()}`, label: c.toUpperCase(), type: 'Cell', match: `In ${sheet.name}` });
            }
        }

        setSearchResults(results.slice(0, 5));
    }, [searchQuery, formulaGraph, sheetDetails]);

    const handleSearchResultClick = (res: any) => {
        const parts = res.id.split('!');
        const sheetName = parts[0];
        const objId = parts.length > 1 ? parts[1] : null;

        if (!expandedSheets.has(sheetName)) {
            const isExpanding = !expandedSheets.has(sheetName);
            if (!sheetDetails[sheetName]) {
                const detail = buildSheetDetail(parsedData, sheetName, formulaGraph!);
                if (detail) setSheetDetail(sheetName, detail);
            }
            setExpandedSheets(prev => {
                const next = new Set(prev);
                next.add(sheetName);
                return next;
            });
        }

        if (objId) {
            if (objId.startsWith('NR_')) {
                onNodeEnter(res.id);
                setTimeout(() => onNodeLeave(), 3000);
            } else {
                handleNodeClick({ id: res.id, type: 'cell', label: objId, parentSheet: sheetName, x: 0, y: 0, r: 0, roleColor: '' });
            }
        }
        setSearchQuery('');
    };

    const handleExportFormulas = useCallback(() => {
        if (!parsedData || !parsedData.sheets) return;
        let content = "Sheet | Cell | Formula\n";
        content += "----------------------------------------\n";

        Object.entries(parsedData.sheets).forEach(([sheetName, sheetData]: [string, any]) => {
            if (sheetData.rawWorksheet) {
                let hasFormula = false;
                for (const cell in sheetData.rawWorksheet) {
                    if (cell.startsWith('!')) continue;
                    if (sheetData.rawWorksheet[cell] && sheetData.rawWorksheet[cell].f) {
                        if (!hasFormula) {
                            content += `\n[ ${sheetName} ]\n`;
                            hasFormula = true;
                        }
                        content += `${sheetName} | ${cell} | =${sheetData.rawWorksheet[cell].f}\n`;
                    }
                }
            }
        });

        // Export Named Ranges too
        if (parsedData.rawWorkbook?.Workbook?.Names) {
            content += `\n[ Named Ranges ]\n`;
            parsedData.rawWorkbook.Workbook.Names.forEach((dn: any) => {
                if (dn.Name && dn.Ref) {
                    content += `Defined Name | ${dn.Name} | =${dn.Ref}\n`;
                }
            });
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `formulas_${parsedData.fileName || 'export'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [parsedData]);


    // --- 2-Pass Layout Algorithm ---
    const [layout, setLayout] = useState<{ nodes: UIDrawNode[], edges: UIDrawEdge[], nodesMap: Record<string, UIDrawNode> }>({ nodes: [], edges: [], nodesMap: {} });

    // PERF: Pre-built adjacency map for O(1) connected-node lookup (replaces O(edges) per node)
    const adjacencyMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        layout.edges.forEach(e => {
            if (!map.has(e.fromId)) map.set(e.fromId, new Set());
            if (!map.has(e.toId)) map.set(e.toId, new Set());
            map.get(e.fromId)!.add(e.toId);
            map.get(e.toId)!.add(e.fromId);
        });
        return map;
    }, [layout.edges]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        if (!formulaGraph) {
            setLayout({ nodes: [], edges: [], nodesMap: {} });
            return;
        }

        setIsCalculating(true);

        // requestAnimationFrame guarantees we don't block the paint of the loading spinner
        const raf = requestAnimationFrame(() => {
            setTimeout(() => {
                const uiNodes: UIDrawNode[] = [];
                const uiEdges: UIDrawEdge[] = [];
                const nodesMap: Record<string, UIDrawNode> = {};

                // 1. MACRO LAYOUT (Sheets)
                const validNodes = formulaGraph.nodes.filter(n => Math.max(n.totalCells || 0, n.formulaCount || 0) > 0 || Object.keys(n.functionUsage).length > 0 || (n.inDegree > 0 && !n.name.includes(':')));
                const totalSheets = validNodes.length;
                let currentAngle = -Math.PI / 2;

                const sheetNodes: UIDrawNode[] = [];

                validNodes.forEach((sNode, idx) => {
                    const isExpanded = expandedSheets.has(sNode.name);
                    const baseRadius = Math.min(45 + (sNode.inDegree + sNode.outDegree) * 3, 90);
                    const sheetR = isExpanded ? 220 : baseRadius;
                    const layoutRadius = Math.max(Math.min(WIDTH, HEIGHT) * 0.4, (totalSheets * 150) / (2 * Math.PI));

                    const cx = WIDTH / 2 + layoutRadius * Math.cos(currentAngle);
                    const cy = HEIGHT / 2 + layoutRadius * Math.sin(currentAngle);

                    sheetNodes.push({
                        id: sNode.name,
                        type: 'sheet',
                        label: sNode.name,
                        x: cx, y: cy, r: sheetR,
                        roleColor: ROLE_COLORS[sNode.role].stroke,
                        subData: sNode,
                        isExpandedSheet: isExpanded
                    });

                    const angleStep = Math.max((2 * Math.PI) / totalSheets, sheetR / layoutRadius * 1.5);
                    currentAngle += angleStep;
                });

                // 1.5 FORCE REPULSION (Sheets Only)
                // Push overlapping sheets apart to prevent visual clutter, especially when expanded
                const ITERATIONS = 40;
                for (let i = 0; i < ITERATIONS; i++) {
                    for (let j = 0; j < sheetNodes.length; j++) {
                        for (let k = j + 1; k < sheetNodes.length; k++) {
                            const n1 = sheetNodes[j];
                            const n2 = sheetNodes[k];
                            const dx = n2.x - n1.x;
                            const dy = n2.y - n1.y;
                            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                            const minDist = n1.r + n2.r + 60; // 60px padding between sheets

                            if (dist < minDist) {
                                const overlap = minDist - dist;
                                const nx = dx / dist;
                                const ny = dy / dist;
                                const force = overlap * 0.4;
                                n1.x -= nx * force;
                                n1.y -= ny * force;
                                n2.x += nx * force;
                                n2.y += ny * force;
                            }
                        }
                    }
                }

                // 2. MICRO LAYOUT (Cells within expanded sheets)
                sheetNodes.forEach(sNode => {
                    uiNodes.push(sNode);
                    nodesMap[sNode.id] = sNode;

                    if (sNode.isExpandedSheet) {
                        const detail = sheetDetails[sNode.id];
                        if (detail) {
                            const nrCells = new Set<string>();

                            // 2a. Named Range Nodes
                            if (detail.namedRanges && detail.namedRanges.length > 0) {
                                detail.namedRanges.forEach((nr, nrIdx) => {
                                    const nrAngle = nrIdx * ((2 * Math.PI) / detail.namedRanges!.length);
                                    const spiralR = 60 + (nrIdx % 2) * 20; // Stagger radius slightly

                                    nr.cells.forEach(c => nrCells.add(c));

                                    const nrUiNode: UIDrawNode = {
                                        id: `${sNode.id}!NR_${nr.name}`,
                                        type: 'cell',
                                        parentSheet: sNode.id,
                                        label: `[${nr.name}]`,
                                        x: sNode.x + spiralR * Math.cos(nrAngle),
                                        y: sNode.y + spiralR * Math.sin(nrAngle),
                                        r: Math.min(15 + Math.sqrt(nr.cells.length) * 3, 30),
                                        roleColor: '#d97706',
                                        subData: { ...nr, isNamedRange: true }
                                    };
                                    uiNodes.push(nrUiNode);
                                    nodesMap[nrUiNode.id] = nrUiNode;

                                    // Render a few satellite cells around the Named Range to represent constituents visually
                                    const componentsToRender = nr.cells.slice(0, 8);
                                    componentsToRender.forEach((cAddr, cIdx) => {
                                        const cNode = detail.cells[cAddr];
                                        if (cNode) {
                                            const cAngle = cIdx * ((2 * Math.PI) / componentsToRender.length);
                                            const satR = nrUiNode.r + 15;
                                            const satUiNode: UIDrawNode = {
                                                id: `${sNode.id}!${cNode.address}`,
                                                type: 'cell',
                                                parentSheet: sNode.id,
                                                label: cNode.address,
                                                x: nrUiNode.x + satR * Math.cos(cAngle),
                                                y: nrUiNode.y + satR * Math.sin(cAngle),
                                                r: 6,
                                                roleColor: '#6b7280', // muted gray for component cells
                                                subData: cNode
                                            };
                                            uiNodes.push(satUiNode);
                                            nodesMap[satUiNode.id] = satUiNode;
                                        }
                                    });
                                });
                            }

                            // 2b. Standalone Formula Cells & Used Data Cells
                            if (detail.formulaCells) {
                                const formulaCellsToRender = detail.formulaCells
                                    .filter(c => !nrCells.has(c.address))
                                    .slice(0, 100);

                                const additionalPrecedentsSet = new Set<string>();
                                formulaCellsToRender.forEach(c => {
                                    c.precedents.forEach(p => {
                                        const pNode = detail.cells[p];
                                        if (pNode && !formulaCellsToRender.includes(pNode)) {
                                            additionalPrecedentsSet.add(p);
                                        }
                                    });
                                });

                                const additionalPrecedentsArray = Array.from(additionalPrecedentsSet)
                                    .slice(0, 50)
                                    .map(addr => detail.cells[addr]);

                                const cellsToRender = [...formulaCellsToRender, ...additionalPrecedentsArray];

                                cellsToRender.forEach((cNode, cIdx) => {
                                    const cOffsetR = detail.namedRanges && detail.namedRanges.length ? 60 : 30;
                                    const spiralR = cOffsetR + (sNode.r - 80) * Math.sqrt(cIdx / Math.max(1, cellsToRender.length));
                                    const cAngle = cIdx * 137.5 * (Math.PI / 180);

                                    const cellX = sNode.x + spiralR * Math.cos(cAngle);
                                    const cellY = sNode.y + spiralR * Math.sin(cAngle);

                                    const activity = cNode.dependents.length + cNode.precedents.length;
                                    const cellRadius = Math.min(4 + activity * 1.5, 22);

                                    const cellUiNode: UIDrawNode = {
                                        id: `${sNode.id}!${cNode.address}`,
                                        type: 'cell',
                                        parentSheet: sNode.id,
                                        label: cNode.address,
                                        x: cellX, y: cellY, r: cellRadius,
                                        roleColor: '#fff',
                                        subData: cNode
                                    };
                                    uiNodes.push(cellUiNode);
                                    nodesMap[cellUiNode.id] = cellUiNode;
                                });
                            }
                        }
                    }
                });

                // 3. RESOLVE EDGES
                // Intra-sheet edges for expanded sheets
                if (showIntraEdges) {
                    expandedSheets.forEach(sheetName => {
                        const detail = sheetDetails[sheetName];
                        if (!detail) return;
                        detail.intraEdges.forEach(ie => {
                            const fId = `${sheetName}!${ie.from}`;
                            const tId = `${sheetName}!${ie.to}`;
                            const src = nodesMap[fId];
                            const tgt = nodesMap[tId];
                            if (src && tgt) {
                                uiEdges.push({
                                    fromId: fId, toId: tId, x1: src.x, y1: src.y, x2: tgt.x, y2: tgt.y,
                                    weight: 1, type: 'cell-cell',
                                    formulas: [{ from: ie.from, to: ie.to, formula: ie.formula }]
                                });
                            }
                        });
                    });
                }

                // Cross-sheet edges
                formulaGraph.edges.forEach(edge => {
                    const srcSheetExpanded = expandedSheets.has(edge.from);
                    const tgtSheetExpanded = expandedSheets.has(edge.to);

                    if (!srcSheetExpanded && !tgtSheetExpanded) {
                        // Sheet-to-Sheet (thick macro edge)
                        const s = nodesMap[edge.from];
                        const t = nodesMap[edge.to];
                        if (s && t) {
                            uiEdges.push({
                                fromId: s.id, toId: t.id, x1: s.x, y1: s.y, x2: t.x, y2: t.y,
                                weight: edge.weight, type: 'sheet-sheet',
                                formulas: edge.references.slice(0, 5).map(r => ({ from: `${r.fromSheet}!${r.fromCell}`, to: `${r.toSheet}!${r.toCell}`, formula: r.formula }))
                            });
                        }
                    } else {
                        // Refined edges to/from specific cells if expanded
                        // To avoid drawing 1000s of lines across the screen, aggregate them if they originate/target the same cell
                        const lineMap = new Map<string, { x1: number, y1: number, x2: number, y2: number, w: number, type: any, f: string, t: string, formulas: { from: string, to: string, formula: string }[] }>();

                        edge.references.forEach(ref => {
                            const fId = srcSheetExpanded ? `${ref.fromSheet}!${ref.fromCell.replace(/\$/g, '').toUpperCase()}` : ref.fromSheet;
                            const tId = tgtSheetExpanded ? `${ref.toSheet}!${ref.toCell.replace(/\$/g, '').split(':')[0].toUpperCase()}` : ref.toSheet;

                            const srcNode = nodesMap[fId];
                            const tgtNode = nodesMap[tId];

                            if (srcNode && tgtNode) {
                                const edgeKey = `${fId}->${tId}`;
                                if (lineMap.has(edgeKey)) {
                                    const entry = lineMap.get(edgeKey)!;
                                    entry.w += 1;
                                    if (entry.formulas.length < 5) entry.formulas.push({ from: `${ref.fromSheet}!${ref.fromCell}`, to: `${ref.toSheet}!${ref.toCell}`, formula: ref.formula });
                                } else {
                                    lineMap.set(edgeKey, {
                                        f: fId, t: tId,
                                        x1: srcNode.x, y1: srcNode.y, x2: tgtNode.x, y2: tgtNode.y,
                                        w: 1,
                                        type: srcSheetExpanded && tgtSheetExpanded ? 'cell-cell' : (srcSheetExpanded ? 'cell-sheet' : 'sheet-cell'),
                                        formulas: [{ from: `${ref.fromSheet}!${ref.fromCell}`, to: `${ref.toSheet}!${ref.toCell}`, formula: ref.formula }]
                                    });
                                }
                            }
                        });

                        lineMap.forEach(v => {
                            uiEdges.push({
                                fromId: v.f, toId: v.t, x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2,
                                weight: v.w, type: v.type, formulas: v.formulas
                            });
                        });
                    }
                });



                // Sort uiNodes to render Named Ranges LAST (on top)
                uiNodes.sort((a, b) => {
                    const aIsNr = a.subData?.isNamedRange ? 1 : 0;
                    const bIsNr = b.subData?.isNamedRange ? 1 : 0;
                    return aIsNr - bIsNr;
                });

                setLayout({ nodes: uiNodes, edges: uiEdges, nodesMap });
                setIsCalculating(false);
            }, 50); // delay to guarantee React renders loading state properly before freezing
        });

        return () => cancelAnimationFrame(raf);
    }, [formulaGraph, expandedSheets, sheetDetails, showIntraEdges]);

    const handleFitToView = () => {
        if (!formulaGraph || !layout || layout.nodes.length === 0 || !containerRef.current) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        layout.nodes.forEach(n => {
            const r = n.type === 'sheet' && n.isExpandedSheet ? 220 : n.r;
            minX = Math.min(minX, n.x - r);
            minY = Math.min(minY, n.y - r);
            maxX = Math.max(maxX, n.x + r);
            maxY = Math.max(maxY, n.y + r);
        });

        const padding = 80;
        const graphW = maxX - minX + padding * 2;
        const graphH = maxY - minY + padding * 2;

        const containerW = containerRef.current.clientWidth || 800;
        const containerH = containerRef.current.clientHeight || 600;

        const scaleX = containerW / graphW;
        const scaleY = containerH / graphH;
        let idealScale = Math.min(Math.min(scaleX, scaleY), 2); // max scale 2
        idealScale = Math.max(idealScale, 0.1); // min scale 0.1 to prevent zoom division by zero

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const targetX = (containerW / 2) - cx * idealScale;
        const targetY = (containerH / 2) - cy * idealScale;

        updateTransform(targetX, targetY, idealScale);
        setScaleState(idealScale);
    };

    const handleReset = () => {
        setExpandedSheets(new Set());
        handleClearCellSelection();
        setTimeout(handleFitToView, 50);
    };

    // Auto-fit on first robust load
    React.useEffect(() => {
        applyTransform(); // Ensure initial DOM paint aligns with transformRef
        if (layout.nodes.length > 0 && transformRef.current.s === 1 && transformRef.current.x === 0 && transformRef.current.y === 0) {
            handleFitToView();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout.nodes.length]);

    // --- DYNAMIC EDGES ---
    // Inject active chain edges explicitly to ensure visual completeness 
    // for dependencies retrieved via range expansion that might have bypassed intraEdges limit
    const activeGraphData = useMemo(() => {
        const extra: UIDrawEdge[] = [];
        const extraNodes: UIDrawNode[] = [];

        if (cellChains.length > 0) {
            const edgeSet = new Set<string>();
            layout.edges.forEach(e => edgeSet.add(`${e.fromId}->${e.toId}`));

            const ensureNode = (id: string, sheet: string, isDep: boolean, addr: string, depth: number) => {
                if (!layout.nodesMap[id]) {
                    // Try to find the target cell to anchor around
                    const selectedId = selectedCells[0] ? `${selectedCells[0].sheet}!${selectedCells[0].cell}` : null;
                    const anchor = selectedId ? layout.nodesMap[selectedId] : null;

                    const angle = isDep ? Math.random() * Math.PI : Math.PI + Math.random() * Math.PI;
                    const dist = 70 + Math.random() * 40 + depth * 30; // Further away for higher depth

                    const fakeNode: UIDrawNode = {
                        id,
                        type: 'cell',
                        label: addr.length > 15 ? addr.slice(0, 10) + '...' : addr,
                        x: (anchor?.x || 0) + Math.cos(angle) * dist,
                        y: (anchor?.y || 0) + Math.sin(angle) * dist,
                        r: 22,
                        parentSheet: sheet,
                        subData: { type: 'data', formula: null, value: null },
                        roleColor: '#9ca3af'
                    };
                    extraNodes.push(fakeNode);
                    return fakeNode;
                }
                return layout.nodesMap[id];
            };

            cellChains.forEach(chain => {
                const targetId = `${chain.target.sheet}!${chain.target.address}`;
                const tgt = layout.nodesMap[targetId] || ensureNode(targetId, chain.target.sheet, false, chain.target.address, 0);

                chain.precedents.forEach(p => {
                    const pId = `${p.sheet}!${p.address}`;
                    const src = ensureNode(pId, p.sheet, false, p.address, p.depth);

                    const edgeKey = `${pId}->${targetId}`;
                    if (!edgeSet.has(edgeKey)) {
                        if (src && tgt) {
                            extra.push({
                                fromId: pId, toId: targetId, x1: src.x, y1: src.y, x2: tgt.x, y2: tgt.y,
                                weight: 2, type: 'cell-cell', formulas: [{ from: pId, to: targetId, formula: chain.target.formula || String(p.value || '') }]
                            });
                            edgeSet.add(edgeKey);
                        }
                    }
                });

                chain.dependents.forEach(d => {
                    const dId = `${d.sheet}!${d.address}`;
                    const dst = ensureNode(dId, d.sheet, true, d.address, d.depth);

                    const edgeKey = `${targetId}->${dId}`;
                    if (!edgeSet.has(edgeKey)) {
                        if (tgt && dst) {
                            extra.push({
                                fromId: targetId, toId: dId, x1: tgt.x, y1: tgt.y, x2: dst.x, y2: dst.y,
                                weight: 2, type: 'cell-cell', formulas: [{ from: targetId, to: dId, formula: d.formula || String(d.value || '') }]
                            });
                            edgeSet.add(edgeKey);
                        }
                    }
                });
            });
        }
        return { edges: [...layout.edges, ...extra], extraNodes };
    }, [layout, cellChains, selectedCells]);

    // --- PERF: Imperative selection and hover handlers (no React state, no re-renders) ---
    const applyStyling = useCallback((hoveredNodeId: string | null = null) => {
        const svgG = svgGroupRef.current;
        if (!svgG) return;

        // Reset all nodes and edges to default opacity
        const allNodeGs = svgG.querySelectorAll<SVGGElement>('[data-node-id]');
        const allEdgeGs = svgG.querySelectorAll<SVGGElement>('[data-edge-idx]');

        const hasSelection = selectedCells.length > 0;
        const selectedIds = selectedCells.map(sc => `${sc.sheet}!${sc.cell}`);
        const focusId = hoveredNodeId;

        const precNodes = new Set<string>();
        const depNodes = new Set<string>();
        const chainMap = new Map<string, number>();

        if (hasSelection) {
            selectedCells.forEach((sc, idx) => {
                const sId = `${sc.sheet}!${sc.cell}`;
                chainMap.set(sId, 0);
                chainMap.set(sc.sheet, 0);
                precNodes.add(sId);
                depNodes.add(sId);

                const chain = cellChains[idx];
                if (chain) {
                    chain.precedents.forEach(p => {
                        const id = `${p.sheet}!${p.address}`;
                        chainMap.set(id, Math.min(p.depth, chainMap.get(id) ?? Infinity));
                        chainMap.set(p.sheet, 0);
                        precNodes.add(id);
                        precNodes.add(p.sheet);
                    });
                    chain.dependents.forEach(d => {
                        const id = `${d.sheet}!${d.address}`;
                        chainMap.set(id, Math.min(d.depth, chainMap.get(id) ?? Infinity));
                        chainMap.set(d.sheet, 0);
                        depNodes.add(id);
                        depNodes.add(d.sheet);
                    });
                }
            });
        }

        if (!focusId && !hasSelection) {
            // Nothing hovered or selected — restore all
            allNodeGs.forEach(g => { g.style.opacity = '1'; });
            allEdgeGs.forEach(g => {
                g.style.opacity = g.dataset.baseOpacity || '0.3';
                const paths = g.querySelectorAll('path');
                if (paths.length > 1) {
                    const strokePath = paths[1];
                    strokePath.style.stroke = strokePath.dataset.baseColor || '#4b5563';
                    strokePath.style.strokeWidth = '1';
                    if (strokePath.dataset.baseMarker && strokePath.dataset.baseMarker !== 'none') {
                        strokePath.style.markerEnd = strokePath.dataset.baseMarker;
                    }
                }
            });
            return;
        }

        const connectedSet = focusId ? adjacencyMap.get(focusId) : undefined;

        allNodeGs.forEach(g => {
            const nid = g.dataset.nodeId!;
            let isConn = false;
            let op = '1';

            if (hasSelection) {
                const depth = chainMap.get(nid);
                isConn = depth !== undefined;
                if (isConn) {
                    op = depth === 0 ? '1' : depth === 1 ? '1' : depth === 2 ? '0.7' : '0.4';
                } else op = '0.05';

                // Highlight hovered nodes and its neighborhood EVEN IF there's a selection
                if (focusId && (nid === focusId || (connectedSet?.has(nid) ?? false))) {
                    isConn = true;
                    op = '1';
                }
            } else if (focusId) {
                isConn = nid === focusId || (connectedSet?.has(nid) ?? false);
                op = isConn ? '1' : '0.05';
            } else {
                isConn = true; // Fallback
                op = '1';
            }

            g.style.opacity = op;
        });

        allEdgeGs.forEach(g => {
            const fromId = g.dataset.fromId!;
            const toId = g.dataset.toId!;

            const isHighlightedHover = !!focusId && (fromId === focusId || toId === focusId || fromId.startsWith(focusId + '!') || toId.startsWith(focusId + '!'));
            let isConn = false;

            if (hasSelection) {
                // Remove maxDepth bypass to ensure we only highlight edges explicitly found in chainMap
                isConn = chainMap.has(fromId) && chainMap.has(toId);

                // If it's hovered specifically, highlight the edge regardless of chain depth visibility
                if (isHighlightedHover) {
                    isConn = true;
                }
            } else if (focusId) {
                isConn = isHighlightedHover;
            }

            g.style.opacity = isConn ? '1' : '0.05';
            const paths = g.querySelectorAll('path');
            if (paths.length > 1) {
                const interactPath = paths[0]; // transparent fat line
                const strokePath = paths[1]; // actual colored line
                let strokeColor = strokePath.dataset.baseColor || '#4b5563';
                let markerId = strokePath.dataset.baseMarker || 'none';
                let dashArray = strokePath.dataset.baseDash || 'none';

                if (isConn) {
                    const isPrecedentFlow = precNodes.has(fromId) && precNodes.has(toId);
                    const isDependentFlow = depNodes.has(fromId) && depNodes.has(toId);

                    // Prevent highlighting random structural edges as blue during hover if they are just range-expansion noise
                    // Only show blue if it was explicitly base string, or highlight explicitly selected paths
                    if (isPrecedentFlow) {
                        strokeColor = '#3b82f6'; // Blue
                        if (markerId !== 'none') markerId = 'url(#arrowhead-prec)';
                        dashArray = 'none'; // Solid for inputs
                    } else if (isDependentFlow) {
                        strokeColor = '#f59e0b'; // Orange
                        if (markerId !== 'none') markerId = 'url(#arrowhead-dep)';
                        dashArray = '6 6'; // Dashed for outputs to distinguish them visually
                    } else if (hasSelection) {
                        // If it's selected but NOT part of the explicit precedence/dependence flow
                        // then it is one of the GraphBuilder individual edges that we DO NOT want to show as primary flow!
                        // In fact, if it's not in precNodes or depNodes, we should probably hide it entirely to avoid blue spam.
                        isConn = false; // Hide it because it's duplicate noise!
                        g.style.opacity = '0.05';
                    } else {
                        // Regular hover fallback (when no selection)
                        strokeColor = '#60a5fa'; // Blue fallback
                        if (markerId !== 'none') markerId = 'url(#arrowhead-highlight)';
                    }
                }
                const baseColor = strokePath.dataset.baseColor || '#4b5563';
                strokePath.style.stroke = isConn ? strokeColor : baseColor;
                strokePath.style.strokeWidth = isConn ? '3' : '1';
                strokePath.style.strokeDasharray = isConn ? dashArray : (strokePath.dataset.baseDash || 'none');

                if (strokePath.dataset.baseMarker !== 'none') {
                    strokePath.style.markerEnd = isConn ? markerId : (strokePath.dataset.baseMarker || 'none');
                }
            }
        });
    }, [selectedCells, cellChains, maxDepth, formulaGraph]);

    // Ensure styling updates whenever selection state changes
    useEffect(() => {
        applyStyling(hoveredNodeIdRef.current);
    }, [applyStyling]);

    // --- Interactions ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        isDraggingRef.current = true;
        // Clear hover on drag start
        if (hoveredNodeIdRef.current) {
            hoveredNodeIdRef.current = null;
            applyStyling(null);
            setTooltipContent(null);
        }
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current) {
            mousePosRef.current = { x: e.clientX, y: e.clientY };
            // PERF: Update edge tooltip position via DOM ref, no state
            if (edgeTooltipRef.current && hoveredEdgeIdxRef.current !== null) {
                edgeTooltipRef.current.style.left = `${e.clientX + 20}px`;
                edgeTooltipRef.current.style.top = `${e.clientY + 20}px`;
            }
            return;
        }
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };

        updateTransform(transformRef.current.x + dx, transformRef.current.y + dy, transformRef.current.s);
    };
    const handleMouseUp = () => {
        isDraggingRef.current = false;
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
    };
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();

        // Always zoom on wheel, similar to Maps
        const zoomFactor = Math.exp(-e.deltaY * 0.002);
        const newS = Math.max(0.1, Math.min(transformRef.current.s * zoomFactor, 5));

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newS / transformRef.current.s);
            transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newS / transformRef.current.s);
        }
        updateTransform(transformRef.current.x, transformRef.current.y, newS);

        clearTimeout(zoomTimeout.current);
        zoomTimeout.current = setTimeout(() => {
            setScaleState(transformRef.current.s);
        }, 150);
    };

    const buildCurvedPath = (x1: number, y1: number, x2: number, y2: number, r1: number, r2: number) => {
        const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return '';
        const nx = dx / dist, ny = dy / dist;
        const sx = x1 + nx * r1, sy = y1 + ny * r1, ex = x2 - nx * (r2 + 4), ey = y2 - ny * (r2 + 4);
        const curvature = dist * 0.15;
        return `M ${sx} ${sy} Q ${(sx + ex) / 2 - ny * curvature} ${(sy + ey) / 2 + nx * curvature} ${ex} ${ey}`;
    };

    const activeChainMap = useMemo(() => {
        if (selectedCells.length === 0 || cellChains.length === 0) return null;
        const map = new Map<string, number>();
        selectedCells.forEach((sc, idx) => {
            map.set(`${sc.sheet}!${sc.cell}`, 0);
            map.set(sc.sheet, 0); // keep parent sheet visible
            const chain = cellChains[idx];
            if (chain) {
                chain.precedents.forEach(p => {
                    const pid = `${p.sheet}!${p.address}`;
                    map.set(pid, Math.min(p.depth, map.get(pid) ?? Infinity));
                    map.set(p.sheet, 0);
                });
                chain.dependents.forEach(d => {
                    const did = `${d.sheet}!${d.address}`;
                    map.set(did, Math.min(d.depth, map.get(did) ?? Infinity));
                    map.set(d.sheet, 0);
                });
            }
        });
        return map;
    }, [selectedCells, cellChains]);

    if (!formulaGraph) return null;



    // Helper to determine edge styling (static, no hover-dependent logic — hover done via DOM)
    const getEdgeStyle = (edge: UIDrawEdge) => {
        let opacity = 0.3;
        let strokeWidth = 1;
        let dash = "none";
        let color = "var(--text-muted)";

        if (edge.type === 'sheet-sheet') {
            strokeWidth = Math.min(8, Math.max(2, edge.weight * 0.5));
            opacity = 0.5;
        } else if (edge.type === 'cell-cell') {
            strokeWidth = Math.min(4, Math.max(1, edge.weight));
            opacity = 0.4;
            color = "#a78bfa";
        } else {
            strokeWidth = 2;
            opacity = 0.3;
            dash = "4 4";
        }

        if (activeChainMap) {
            const selectedIds = selectedCells.map(sc => `${sc.sheet}!${sc.cell}`);
            const depthFrom = activeChainMap.get(edge.fromId) ?? Infinity;
            const depthTo = activeChainMap.get(edge.toId) ?? Infinity;
            const maxD = Math.max(depthFrom, depthTo);

            let isInChain = false;
            if (maxDepth === 1) {
                isInChain = selectedIds.includes(edge.fromId) || selectedIds.includes(edge.toId);
            } else {
                isInChain = depthFrom !== Infinity && depthTo !== Infinity;
            }

            if (!isInChain) {
                opacity = 0.02;
                color = 'var(--text-muted)';
            } else {
                opacity = maxD <= 1 ? 0.6 : 0.2;
                strokeWidth = Math.max(strokeWidth, maxD <= 1 ? 2 : 1.5);
                dash = maxD <= 1 ? "none" : "4 4";

                let baseCol = edge.type.includes('sheet') && edge.fromId.indexOf('!') < 0
                    ? ROLE_COLORS[layout.nodesMap[edge.fromId]?.subData?.role || 'hub']?.stroke || '#3b82f6'
                    : '#3b82f6';

                if (edge.type === 'cell-cell') {
                    if (selectedIds.includes(edge.toId)) baseCol = '#3b82f6'; // Precedent
                    else if (selectedIds.includes(edge.fromId)) baseCol = '#f59e0b'; // Dependent
                }

                color = baseCol;
            }
        }

        return { color, strokeWidth, opacity, dash };
    };

    // PERF: Imperative node hover (enter/leave) – no setState, direct DOM
    const onNodeEnter = (nodeId: string) => {
        if (activeChainMap) return; // Chain selection overrides hover
        hoveredNodeIdRef.current = nodeId;
        applyStyling(nodeId);
        const obj = layout.nodesMap[nodeId];
        if (obj) setTooltipContent({ type: 'node', data: obj });
    };
    const onNodeLeave = () => {
        if (activeChainMap) return;
        hoveredNodeIdRef.current = null;
        applyStyling(null);
        setTooltipContent(null);
    };
    const onEdgeEnter = (idx: number) => {
        hoveredEdgeIdxRef.current = idx;
        const edge = activeGraphData.edges[idx];
        if (edge) setTooltipContent({ type: 'edge', data: edge });
    };
    const onEdgeLeave = () => {
        hoveredEdgeIdxRef.current = null;
        setTooltipContent(null);
    };

    const renderSearchBar = () => (
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px', pointerEvents: 'auto' }}>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={16} />
            </div>
            <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('graph.searchPlaceholder', language)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-color)' }}
            />
            {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100 }}>
                    {searchResults.map((res, i) => (
                        <div
                            key={i}
                            onClick={() => handleSearchResultClick(res)}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between' }}
                        >
                            <span style={{ fontWeight: 500 }}>{res.label}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--panel-bg)', padding: '2px 6px', borderRadius: '4px' }}>{res.type}: {res.match}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div style={{
            width: isFormulaGraphFullscreen ? '100vw' : '100%',
            height: isFormulaGraphFullscreen ? '100vh' : '100%',
            position: isFormulaGraphFullscreen ? 'fixed' : 'relative',
            top: isFormulaGraphFullscreen ? 0 : 'auto',
            left: isFormulaGraphFullscreen ? 0 : 'auto',
            zIndex: isFormulaGraphFullscreen ? 9999 : 1,
            overflow: 'hidden',
            background: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Fullscreen Search Bar */}
            {isFormulaGraphFullscreen && (
                <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20, width: '400px', display: 'flex', justifyContent: 'center' }}>
                    {renderSearchBar()}
                </div>
            )}

            {/* Stats Bar and Toolbar */}
            {showStats && !isFormulaGraphFullscreen && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <StatCard icon={<Layers size={18} />} label={t('graph.statsSheets', language)} value={formulaGraph.nodes.length} color="#8b5cf6" />
                        <StatCard icon={<FileSpreadsheet size={18} />} label={t('graph.statsTotalFormulas', language)} value={formulaGraph.totalFormulas} color="#3b82f6" />
                        <StatCard icon={<GitBranch size={18} />} label={t('graph.statsCrossSheet', language)} value={formulaGraph.crossSheetRefs} color="#10b981" />
                        <StatCard icon={<AlertTriangle size={18} />} label={t('graph.statsIsolated', language)} value={formulaGraph.isolatedSheets.length} color="#f59e0b" />
                    </div>
                    {/* Search & Export Toolbar */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {renderSearchBar()}
                        <button
                            onClick={handleExportFormulas}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                        >
                            <Download size={16} /> {t('graph.exportFormulas', language)}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* Toggle Stats visibility */}
                {!isFormulaGraphFullscreen && (
                    <button
                        onClick={() => setShowStats(!showStats)}
                        style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'var(--text-color)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                        {showStats ? <><EyeOff size={14} /> {t('graph.hideStats', language)}</> : <><Activity size={14} /> {t('graph.showStats', language)}</>}
                    </button>
                )}

                {/* SVG Graph Canvas */}
                <div style={{ flex: 1, cursor: 'grab', position: 'relative' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} ref={containerRef}>
                    {isCalculating && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 5, 10, 0.6)', zIndex: 50, backdropFilter: 'blur(2px)', color: '#fff', fontSize: '15px', fontWeight: 'bold', fill: '#8b5cf6', gap: '12px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25" /><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite" /></path></svg>
                            {t('graph.processingLayout', language)}
                        </div>
                    )}
                    <svg width="100%" height="100%">
                        <defs>
                            {formulaGraph.nodes.map(n => {
                                const c = ROLE_COLORS[n.role];
                                return (
                                    <linearGradient key={`grad-${n.name}`} id={`grad-${n.name.replace(/\s+/g, '_')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={c.gradient[0]} stopOpacity="0.85" />
                                        <stop offset="100%" stopColor={c.gradient[1]} stopOpacity="0.95" />
                                    </linearGradient>
                                )
                            })}

                            {/* Cell gradients */}
                            {/* Generic Role Gradients for Cells */}
                            {Object.entries(ROLE_COLORS).map(([key, role]) => (
                                <linearGradient key={key} id={`grad-role-${key}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={role.gradient[0]} stopOpacity="0.9" />
                                    <stop offset="100%" stopColor={role.gradient[1]} stopOpacity="0.9" />
                                </linearGradient>
                            ))}

                            {/* Arrow Marker */}
                            <marker id="arrowhead" markerWidth="3" markerHeight="3" refX="2.5" refY="1.5" orient="auto">
                                <polygon points="0 0, 3 1.5, 0 3, 0.6 1.5" fill="var(--text-muted)" opacity={0.6} />
                            </marker>
                            <marker id="arrowhead-highlight" markerWidth="3" markerHeight="3" refX="2.5" refY="1.5" orient="auto">
                                <polygon points="0 0, 3 1.5, 0 3, 0.6 1.5" fill="#60a5fa" opacity={1} />
                            </marker>
                            <marker id="arrowhead-prec" markerWidth="3" markerHeight="3" refX="2.5" refY="1.5" orient="auto">
                                <polygon points="0 0, 3 1.5, 0 3, 0.6 1.5" fill="#3b82f6" opacity={1} />
                            </marker>
                            <marker id="arrowhead-dep" markerWidth="3" markerHeight="3" refX="2.5" refY="1.5" orient="auto">
                                <polygon points="0 0, 3 1.5, 0 3, 0.6 1.5" fill="#f59e0b" opacity={1} />
                            </marker>

                            {/* Grid Pattern */}
                            <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
                                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--text-muted)" strokeWidth="0.5" opacity="0.15" />
                            </pattern>
                        </defs>

                        <g ref={svgGroupRef} style={{ transformOrigin: 'top left' }}>
                            {/* BACKDROP FOR EXPANDED SHEETS */}
                            {layout.nodes.filter(n => n.type === 'sheet' && n.isExpandedSheet).map(node => (
                                <g key={`bg-${node.id}`} transform={`translate(${node.x}, ${node.y})`} onDoubleClick={(e) => { e.stopPropagation(); handleNodeClick(node); }} style={{ cursor: 'pointer', transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
                                    {/* Semi-solid background */}
                                    <circle r={node.r} fill="var(--bg-color)" stroke={node.roleColor} strokeWidth={2} strokeDasharray="8 4" opacity={0.65} />
                                    {/* Grid texture inside circle */}
                                    <circle r={node.r} fill="url(#grid-pattern)" />
                                    {/* Subtle gradient glow */}
                                    <circle r={node.r} fill={`url(#grad-${node.id.replace(/\s+/g, '_')})`} opacity={0.08} />

                                    {/* Sheet Title inside container at top */}
                                    <rect x={-(node.label.length * 9 + 40) / 2} y={-(node.r - 12)} width={node.label.length * 9 + 40} height="32" rx="16" fill="#0f172a" opacity={0.85} stroke="rgba(255,255,255,0.15)" strokeWidth={1} pointerEvents="none" />
                                    <text textAnchor="middle" dy={-(node.r - 34)} fill="#ffffff" fontSize="16" fontWeight="bold" opacity={1} pointerEvents="none">{node.label}</text>
                                </g>
                            ))}

                            {/* EDGES */}
                            {activeGraphData.edges.map((edge, idx) => {
                                const fromNode = layout.nodesMap[edge.fromId] || activeGraphData.extraNodes.find(n => n.id === edge.fromId);
                                const toNode = layout.nodesMap[edge.toId] || activeGraphData.extraNodes.find(n => n.id === edge.toId);

                                const srcRadius = fromNode?.r || 0;
                                const tgtRadius = toNode?.r || 0;
                                // Correct positions based on mapped nodes
                                const ex1 = fromNode?.x || edge.x1;
                                const ey1 = fromNode?.y || edge.y1;
                                const ex2 = toNode?.x || edge.x2;
                                const ey2 = toNode?.y || edge.y2;

                                const d = buildCurvedPath(ex1, ey1, ex2, ey2, srcRadius, tgtRadius);
                                if (!d) return null;

                                const style = getEdgeStyle(edge);
                                const markerId = edge.type === 'sheet-sheet' ? '' : "url(#arrowhead)";

                                return (
                                    <g key={idx} data-edge-idx={idx} data-from-id={edge.fromId} data-to-id={edge.toId} data-base-opacity={style.opacity}
                                        onMouseEnter={() => onEdgeEnter(idx)} onMouseLeave={onEdgeLeave}
                                        style={{ opacity: style.opacity }}>
                                        {/* Invisible Hitbox for easy hovering */}
                                        <path d={d} fill="none" stroke="transparent" strokeWidth={25} style={{ pointerEvents: style.opacity < 0.1 ? 'none' : 'stroke' }} cursor="pointer" />
                                        <path d={d} fill="none" stroke={style.color} data-base-color={style.color} data-base-marker={markerId} data-base-dash={style.dash} strokeWidth={style.strokeWidth} strokeDasharray={style.dash} markerEnd={markerId} style={{ pointerEvents: 'none' }} />
                                    </g>
                                );
                            })}

                            {/* NODES (Compact Sheets + Cells) */}
                            {[...layout.nodes.filter(n => (n.type === 'sheet' && !n.isExpandedSheet) || n.type === 'cell'), ...activeGraphData.extraNodes].map(node => {
                                const isSelected = selectedCells.some(sc => sc.cell === node.label && sc.sheet === node.parentSheet);

                                // PERF: Static opacity based only on chain selection (hover done imperatively)
                                let op = 1;
                                if (activeChainMap) {
                                    const depth = activeChainMap.get(node.id);
                                    op = depth !== undefined ? (depth <= 1 ? 1 : depth === 2 ? 0.7 : 0.4) : 0.05;
                                }

                                if (node.type === 'sheet') {
                                    return (
                                        <g key={node.id} data-node-id={node.id} transform={`translate(${node.x}, ${node.y})`}
                                            onMouseEnter={() => onNodeEnter(node.id)} onMouseLeave={onNodeLeave}
                                            onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                                            onDoubleClick={(e) => { e.stopPropagation(); handleNodeDeselect(node); }}
                                            style={{ cursor: 'pointer', opacity: op }}>
                                            <circle r={node.r} fill={`url(#grad-${node.id.replace(/\s+/g, '_')})`} stroke={node.roleColor} strokeWidth={2} />
                                            <text textAnchor="middle" dy={node.r > 55 ? "-14" : "-8"} fill="#fff" fontSize={Math.max(11, node.r / 4)} fontWeight="700" pointerEvents="none">{node.label}</text>
                                            <text textAnchor="middle" dy={node.r > 55 ? "4" : "6"} fill="rgba(255,255,255,0.85)" fontSize={Math.max(9, node.r / 5)} pointerEvents="none">{node.subData.formulaCount} formula</text>
                                        </g>
                                    );
                                } else {
                                    // Cell Node inside expanded sheet — PERF: NO transitions
                                    const cst = node.subData as CellNode;

                                    // Calculate precise data role for the cell
                                    let cellRole = 'isolated';
                                    const deps = cst.dependents?.length || 0;
                                    const precs = cst.precedents?.length || 0;

                                    if (deps > 0 && precs > 0) cellRole = 'hub';
                                    else if (deps > 0) cellRole = 'source';
                                    else if (precs > 0) cellRole = 'sink';

                                    const fillGrad = `url(#grad-role-${cellRole})`;

                                    return (
                                        <g key={node.id} data-node-id={node.id} transform={`translate(${node.x}, ${node.y})`}
                                            onMouseEnter={() => onNodeEnter(node.id)} onMouseLeave={onNodeLeave}
                                            onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                                            onDoubleClick={(e) => { e.stopPropagation(); handleNodeDeselect(node); }}
                                            style={{ cursor: 'pointer', opacity: op }}>
                                            {isSelected && <circle r={node.r + 4} fill="none" stroke="#fff" strokeWidth="2" />}
                                            <circle
                                                r={node.r}
                                                fill={fillGrad}
                                                stroke="#ffffff40"
                                                strokeWidth={1}
                                            />
                                            {scaleState > 0.6 && <text textAnchor="middle" dy="3" fill="#fff" fontSize={Math.max(8, node.r * 0.6)} fontWeight="bold" pointerEvents="none">{node.label}</text>}
                                        </g>
                                    );
                                }
                            })}
                        </g>
                    </svg>

                    {/* PERF: Tooltip rendered from tooltipContent state (only updates on hover enter/leave, not on mousemove) */}
                    {tooltipContent && tooltipContent.type === 'node' && !isDraggingRef.current && (() => {
                        const hoveredNodeObj = tooltipContent.data as UIDrawNode;
                        return (
                            <div ref={nodeTooltipRef} style={{ position: 'absolute', top: 16, right: 16, width: 280, background: 'var(--panel-bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', pointerEvents: 'none' }}>
                                {hoveredNodeObj.type === 'sheet' ? (
                                    <>
                                        <h3 style={{ margin: '0 0 4px 0' }}>{hoveredNodeObj.label}</h3>
                                        <span style={{ fontSize: '11px', color: hoveredNodeObj.roleColor }}>{ROLE_COLORS[hoveredNodeObj.subData.role].label}</span>
                                        <div style={{ marginTop: '12px', fontSize: '13px' }}>
                                            <div><b>Complexity:</b> {hoveredNodeObj.subData.complexityScore}</div>
                                            <div><b>Formulas:</b> {hoveredNodeObj.subData.formulaCount}</div>
                                        </div>
                                        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>Click to expand</div>
                                    </>
                                ) : hoveredNodeObj.subData.isNamedRange ? (
                                    <>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hoveredNodeObj.parentSheet}</div>
                                        <h3 style={{ margin: '0 0 8px 0', color: '#d97706' }}>Name: {hoveredNodeObj.subData.name}</h3>
                                        <div style={{ padding: '8px', background: 'var(--bg-color)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', marginBottom: '8px' }}>
                                            Refers to: {hoveredNodeObj.subData.range}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px' }}>Cells: {hoveredNodeObj.subData.cells?.length || 0}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hoveredNodeObj.parentSheet}</div>
                                        <h3 style={{ margin: '0 0 8px 0', color: '#8b5cf6' }}>{hoveredNodeObj.label}</h3>

                                        <div style={{ padding: '8px', background: 'var(--bg-color)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', marginBottom: '8px', wordBreak: 'break-all' }}>
                                            {hoveredNodeObj.subData.type === 'formula' ? `= ${hoveredNodeObj.subData.formula}` : String(hoveredNodeObj.subData.value).substring(0, 50)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            <b>Value:</b> {String(hoveredNodeObj.subData.value).substring(0, 20)}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px' }}>In: {hoveredNodeObj.subData.precedents?.length || 0}</span>
                                            <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>Out: {hoveredNodeObj.subData.dependents?.length || 0}</span>
                                        </div>
                                        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>Click to trace dependency tree</div>
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    {/* Edge Tooltip overlay */}
                    {tooltipContent && tooltipContent.type === 'edge' && !isDraggingRef.current && (() => {
                        const edge = tooltipContent.data as UIDrawEdge;
                        return (
                            <div ref={edgeTooltipRef} style={{ position: 'absolute', left: mousePosRef.current.x + 20, top: mousePosRef.current.y + 20, width: 380, maxHeight: '400px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 1000, color: 'var(--text-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
                                        {edge.type.includes('sheet') ? t('graph.sheetLink', language) : t('graph.cellLink', language)}
                                    </h3>
                                    <span style={{ marginLeft: 'auto', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                                        {edge.weight} {t('graph.flows', language)}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(edge.formulas || []).slice(0, 5).map((item: any, i: number) => {
                                        const f = typeof item === 'string'
                                            ? { from: item.split('→')[0]?.trim() || '', to: item.split('→')[1]?.split(':')[0]?.trim() || '', formula: item.split(':')[1]?.trim() || item }
                                            : item;
                                        return (
                                            <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', borderLeft: '3px solid #6366f1', overflow: 'hidden' }}>
                                                <div title={`${f.from} → ${f.to}`} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <span style={{ color: '#a78bfa', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '40%' }}>{f.from}</span>
                                                    <span>→</span>
                                                    <span style={{ color: '#34d399', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '40%' }}>{f.to}</span>
                                                </div>
                                                <div style={{ padding: '8px 10px', fontSize: '11px', fontFamily: 'SFMono-Regular, Consolas, monospace', color: '#f8fafc', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', wordBreak: 'break-all', lineHeight: 1.4 }}>
                                                    {f.formula || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Range Mapping / Derived</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(edge.formulas || []).length > 5 && (
                                        <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '6px', marginTop: '4px' }}>
                                            {t('graph.otherFlows', language).replace('{count}', String((edge.formulas || []).length - 5))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Level 3: Overlay Cell Chain Details Modal-style Right Panel */}
                {selectedCells.length > 0 && (
                    <div style={{ width: 400, background: 'var(--panel-bg)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', zIndex: 10, boxShadow: '-5px 0 25px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>{t('graph.depTrace', language)} ({selectedCells.length})</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('graph.depth', language)}</span>
                                <select value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', cursor: 'pointer' }}>
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                    <option value={4}>4</option>
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={999}>Max</option>
                                </select>
                                <button onClick={handleClearCellSelection} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '8px' }}><X size={20} /></button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            {cellChains.map((chain, cIdx) => (
                                <div key={cIdx} style={{ marginBottom: cIdx < cellChains.length - 1 ? '32px' : '0' }}>
                                    {/* Target Cell Hero */}
                                    <div style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)', borderRadius: '12px', padding: '20px', color: '#fff', marginBottom: '24px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '8px', opacity: 0.9 }}>{chain.target.sheet}!{chain.target.address}</div>
                                        <div style={{ fontSize: '16px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '12px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                            <span style={{ color: '#a78bfa' }}>= </span>
                                            {chain.formulaParts.map((part, i) =>
                                                part.isRef ? (
                                                    <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '0 4px', borderRadius: '4px', fontWeight: 'bold' }}>{part.text}</span>
                                                ) : (<span key={i}>{part.text}</span>)
                                            )}
                                        </div>
                                        <div style={{ fontSize: '13px', opacity: 0.8 }}>{t('graph.value', language)} <b>{String(chain.target.value)}</b></div>
                                    </div>

                                    {/* Precedents Tree */}
                                    <h4 style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>📥 {t('graph.precedents', language)} ({chain.precedents.length})</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                        {chain.precedents.length === 0 ? (
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('graph.noUpstream', language)}</span>
                                        ) : (
                                            Object.entries(
                                                chain.precedents.reduce((acc: any, p: any) => {
                                                    (acc[p.depth] = acc[p.depth] || []).push(p);
                                                    return acc;
                                                }, {})
                                            ).sort(([a], [b]) => Number(a) - Number(b)).map(([depth, items]: [string, any]) => (
                                                <div key={depth} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', opacity: 0.8, textTransform: 'uppercase', paddingBottom: '4px', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                        {Number(depth) === 1 ? t('graph.depthDirect', language).replace('{depth}', depth) : t('graph.depthIndirect', language).replace('{depth}', depth)}
                                                    </div>
                                                    {items.map((p: any, i: number) => (
                                                        <div key={i} style={{ padding: '10px', background: 'var(--bg-color)', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                                <span>{p.sheet}!{p.address}</span>
                                                                <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>val: {String(p.value).substring(0, 10)}</span>
                                                            </div>
                                                            {p.formula && <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>= {p.formula}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Dependents Tree */}
                                    <h4 style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>📤 {t('graph.dependents', language)} ({chain.dependents.length})</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {chain.dependents.length === 0 ? (
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('graph.noDownstream', language)}</span>
                                        ) : (
                                            Object.entries(
                                                chain.dependents.reduce((acc: any, d: any) => {
                                                    (acc[d.depth] = acc[d.depth] || []).push(d);
                                                    return acc;
                                                }, {})
                                            ).sort(([a], [b]) => Number(a) - Number(b)).map(([depth, items]: [string, any]) => (
                                                <div key={depth} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', opacity: 0.8, textTransform: 'uppercase', paddingBottom: '4px', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                        {Number(depth) === 1 ? t('graph.depthDirect', language).replace('{depth}', depth) : t('graph.depthIndirect', language).replace('{depth}', depth)}
                                                    </div>
                                                    {items.map((d: any, i: number) => (
                                                        <div key={i} style={{ padding: '10px', background: 'var(--bg-color)', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                                <span>{d.sheet}!{d.address}</span>
                                                                <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>val: {String(d.value).substring(0, 10)}</span>
                                                            </div>
                                                            {d.formula && <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>= {d.formula}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {cIdx < cellChains.length - 1 && <hr style={{ borderColor: 'var(--border-color)', margin: '32px 0 16px', opacity: 0.5 }} />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Toolbar */}
            <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: '8px', zIndex: 10 }}>
                <button onClick={() => setShowIntraEdges(!showIntraEdges)} style={{ background: 'var(--panel-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} title="Toggle Internal Edges">
                    {showIntraEdges ? <Eye size={18} /> : <EyeOff size={18} color="var(--text-muted)" />}
                </button>
                <button onClick={handleFitToView} style={{ background: 'var(--panel-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} title="Fit to View">
                    <Focus size={18} />
                </button>
                <button onClick={() => setIsFormulaGraphFullscreen(!isFormulaGraphFullscreen)} style={{ background: 'var(--panel-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} title={isFormulaGraphFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFormulaGraphFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                <button onClick={handleReset} style={{ background: 'var(--panel-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} title="Reset View">
                    <RotateCcw size={18} />
                </button>
            </div>

            {/* Color Legend */}
            <div style={{ position: 'absolute', bottom: 64, left: 16, background: 'var(--panel-bg)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)', marginBottom: '4px' }}>{t('graph.roles', language)}</div>
                {Object.entries(ROLE_COLORS).map(([key, role]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: `linear-gradient(135deg, ${role.gradient[0]}, ${role.gradient[1]})`, border: `1px solid ${role.stroke}` }}></div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{role.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            {key === 'source' && t('graph.roleSource', language)}
                            {key === 'hub' && t('graph.roleHub', language)}
                            {key === 'sink' && t('graph.roleSink', language)}
                            {key === 'isolated' && t('graph.roleIsolated', language)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Help text */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'var(--panel-bg)', padding: '8px 16px', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                <span dangerouslySetInnerHTML={{ __html: t('graph.helpClick', language) }} />
                <span dangerouslySetInnerHTML={{ __html: t('graph.helpCtrlClick', language) }} />
                <span dangerouslySetInnerHTML={{ __html: t('graph.helpDblClick', language) }} />
                <span dangerouslySetInnerHTML={{ __html: t('graph.helpScroll', language) }} />
                <span dangerouslySetInnerHTML={{ __html: t('graph.helpDrag', language) }} />
            </div>
        </div >
    );
}
