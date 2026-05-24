/* ============================================
   DataLens — TMDL Parser Module
   Parses Power BI Semantic Model (.tmdl) files
   Supports single files, multiple files, and ZIP archives
   ============================================ */

import JSZip from 'jszip';

// ── Types ──
export interface TmdlColumn {
    name: string;
    dataType: string;       // int64, string, double, dateTime, boolean, decimal
    sourceColumn?: string;
    expression?: string;    // calculated column DAX expression
    isHidden?: boolean;
    formatString?: string;
    summarizeBy?: string;
    isKey?: boolean;
    description?: string;
}

export interface TmdlMeasure {
    name: string;
    expression: string;     // DAX expression (can be multi-line)
    formatString?: string;
    displayFolder?: string;
    description?: string;
}

export interface TmdlPartition {
    name: string;
    sourceType?: string;
    expression?: string;    // M expression / SQL query
}

export interface TmdlTable {
    name: string;
    columns: TmdlColumn[];
    measures: TmdlMeasure[];
    partitions: TmdlPartition[];
    isHidden?: boolean;
    description?: string;
}

export interface TmdlRelationship {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    isActive: boolean;
    crossFilteringBehavior?: string;  // oneDirection, bothDirections
    fromCardinality?: string;
    toCardinality?: string;
}

export interface TmdlModel {
    tables: TmdlTable[];
    relationships: TmdlRelationship[];
    culture?: string;
    compatibilityLevel?: number;
    defaultPowerBIDataSourceVersion?: string;
}


// ── Main Entry Point ──
// Accepts an array of files (folder upload / multi-select) or a single ZIP file
export async function parseTmdlInput(files: File[]): Promise<TmdlModel> {
    let rawTexts: { name: string; content: string }[] = [];

    // 1. Aggregation — collect all .tmdl text content
    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
        rawTexts = await extractTmdlFromZip(files[0]);
    } else {
        for (const f of files) {
            if (f.name.toLowerCase().endsWith('.tmdl')) {
                const content = await f.text();
                // Use webkitRelativePath if available (folder upload), otherwise just the name
                const filePath = (f as any).webkitRelativePath || f.name;
                rawTexts.push({ name: filePath, content });
            }
        }
    }

    if (rawTexts.length === 0) {
        throw new Error('Không tìm thấy file .tmdl nào. Vui lòng upload file TMDL hoặc file ZIP chứa project Power BI.');
    }

    // 2. Orchestration — parse each file based on its role
    const model: TmdlModel = { tables: [], relationships: [] };

    for (const item of rawTexts) {
        const nameLower = item.name.toLowerCase();
        const content = item.content.trim();

        if (!content) continue;

        if (nameLower.endsWith('model.tmdl') && !nameLower.includes('tables')) {
            // Parse model-level metadata
            parseModelMetadata(content, model);
        } else if (nameLower.includes('relationships') && nameLower.endsWith('.tmdl')) {
            // Parse relationships file
            const rels = parseRelationships(content);
            model.relationships.push(...rels);
        } else if (nameLower.endsWith('.tmdl')) {
            // Parse as table definition (may contain tables, columns, measures)
            const tables = parseTables(content);
            model.tables.push(...tables);
        }
    }

    // 3. Also extract relationships that might be embedded inside table files
    // (Some TMDL exports put everything in one file)

    return model;
}


// ── ZIP Extraction ──
async function extractTmdlFromZip(zipFile: File): Promise<{ name: string; content: string }[]> {
    const arrayBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const results: { name: string; content: string }[] = [];

    const entries = Object.entries(zip.files);
    for (const [path, entry] of entries) {
        if (!entry.dir && path.toLowerCase().endsWith('.tmdl')) {
            const content = await entry.async('string');
            results.push({ name: path, content });
        }
    }

    return results;
}


// ── Model Metadata Parser ──
function parseModelMetadata(text: string, model: TmdlModel): void {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('culture:')) {
            model.culture = trimmed.replace('culture:', '').trim().replace(/['"]/g, '');
        } else if (trimmed.startsWith('defaultPowerBIDataSourceVersion:')) {
            model.defaultPowerBIDataSourceVersion = trimmed.split(':').slice(1).join(':').trim();
        } else if (trimmed.startsWith('compatibilityLevel:')) {
            model.compatibilityLevel = parseInt(trimmed.split(':')[1].trim(), 10);
        }
    }
}


// ── Table Parser ──
// Handles full content that may contain multiple tables
function parseTables(text: string): TmdlTable[] {
    const tables: TmdlTable[] = [];
    const lines = text.split(/\r?\n/);

    let currentTable: TmdlTable | null = null;
    let currentColumn: TmdlColumn | null = null;
    let currentMeasure: TmdlMeasure | null = null;
    let currentPartition: TmdlPartition | null = null;
    let measureExprLines: string[] = [];
    let partitionExprLines: string[] = [];
    let inMeasureExpr = false;
    let inPartitionExpr = false;
    let lastContext: 'table' | 'column' | 'measure' | 'partition' | null = null;

    function flushMeasure() {
        if (currentMeasure && currentTable) {
            if (measureExprLines.length > 0) {
                currentMeasure.expression = measureExprLines.join('\n').trim();
            }
            currentTable.measures.push(currentMeasure);
        }
        currentMeasure = null;
        measureExprLines = [];
        inMeasureExpr = false;
    }

    function flushPartition() {
        if (currentPartition && currentTable) {
            if (partitionExprLines.length > 0) {
                currentPartition.expression = partitionExprLines.join('\n').trim();
            }
            currentTable.partitions.push(currentPartition);
        }
        currentPartition = null;
        partitionExprLines = [];
        inPartitionExpr = false;
    }

    function flushColumn() {
        if (currentColumn && currentTable) {
            currentTable.columns.push(currentColumn);
        }
        currentColumn = null;
    }

    function flushAll() {
        flushMeasure();
        flushPartition();
        flushColumn();
    }

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();
        const indent = rawLine.length - rawLine.trimStart().length;

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('///') || trimmed.startsWith('//')) continue;

        // ── Table declaration ──
        const tableMatch = trimmed.match(/^table\s+'?([^']+)'?\s*$/i) || trimmed.match(/^table\s+(\S+)\s*$/i);
        if (tableMatch && indent === 0) {
            flushAll();
            if (currentTable) tables.push(currentTable);

            currentTable = {
                name: tableMatch[1].replace(/^'|'$/g, ''),
                columns: [],
                measures: [],
                partitions: [],
            };
            lastContext = 'table';
            continue;
        }

        // If no table context yet, skip
        if (!currentTable) continue;

        // ── Column declaration ──
        const columnMatch = trimmed.match(/^column\s+'?([^'=]+?)'?\s*$/i) || trimmed.match(/^column\s+(\S+)\s*$/i);
        if (columnMatch && indent > 0) {
            flushAll();
            currentColumn = {
                name: columnMatch[1].replace(/^'|'$/g, '').trim(),
                dataType: 'string',
            };
            lastContext = 'column';
            continue;
        }

        // ── Calculated column (has = expression) ──
        const calcColMatch = trimmed.match(/^column\s+'?([^'=]+?)'?\s*=\s*(.+)$/i);
        if (calcColMatch && indent > 0) {
            flushAll();
            currentColumn = {
                name: calcColMatch[1].replace(/^'|'$/g, '').trim(),
                dataType: 'string',
                expression: calcColMatch[2].trim(),
            };
            lastContext = 'column';
            continue;
        }

        // ── Measure declaration ──
        const measureMatch = trimmed.match(/^measure\s+'?([^'=]+?)'?\s*=\s*(.*)$/i);
        if (measureMatch && indent > 0) {
            flushAll();
            const name = measureMatch[1].replace(/^'|'$/g, '').trim();
            const exprStart = measureMatch[2].trim();
            currentMeasure = {
                name,
                expression: '',
            };
            if (exprStart) {
                measureExprLines.push(exprStart);
            }
            inMeasureExpr = true;
            lastContext = 'measure';
            continue;
        }

        // Measure without = on first line
        const measureMatchNoExpr = trimmed.match(/^measure\s+'?([^'=]+?)'?\s*$/i);
        if (measureMatchNoExpr && indent > 0) {
            flushAll();
            currentMeasure = {
                name: measureMatchNoExpr[1].replace(/^'|'$/g, '').trim(),
                expression: '',
            };
            inMeasureExpr = false;
            lastContext = 'measure';
            continue;
        }

        // ── Partition declaration ──
        const partMatch = trimmed.match(/^partition\s+'?([^'=]+?)'?\s*=\s*(\w+)\s*$/i);
        if (partMatch && indent > 0) {
            flushAll();
            currentPartition = {
                name: partMatch[1].replace(/^'|'$/g, '').trim(),
                sourceType: partMatch[2].trim(),
            };
            lastContext = 'partition';
            continue;
        }

        // ── Property lines (key: value) ──
        const propMatch = trimmed.match(/^(\w+)\s*[:=]\s*(.+)$/);
        if (propMatch) {
            const key = propMatch[1].toLowerCase();
            const val = propMatch[2].trim().replace(/^'|'$/g, '');

            // Check if we're collecting multi-line expression for measure
            if (inMeasureExpr && lastContext === 'measure') {
                // If this line looks like a known property, it ends the expression
                if (['formatstring', 'displayfolder', 'description', 'ishidden', 'datatype', 'sourcecolumn', 'summarizeby'].includes(key)) {
                    inMeasureExpr = false;
                    // Fall through to assign as property
                } else {
                    measureExprLines.push(rawLine.trim());
                    continue;
                }
            }

            // Assign properties based on current context
            if (lastContext === 'column' && currentColumn) {
                switch (key) {
                    case 'datatype': currentColumn.dataType = val; break;
                    case 'sourcecolumn': currentColumn.sourceColumn = val; break;
                    case 'ishidden': currentColumn.isHidden = val === 'true'; break;
                    case 'formatstring': currentColumn.formatString = val; break;
                    case 'summarizeby': currentColumn.summarizeBy = val; break;
                    case 'iskey': currentColumn.isKey = val === 'true'; break;
                    case 'description': currentColumn.description = val; break;
                }
            } else if (lastContext === 'measure' && currentMeasure) {
                switch (key) {
                    case 'formatstring': currentMeasure.formatString = val; break;
                    case 'displayfolder': currentMeasure.displayFolder = val; break;
                    case 'description': currentMeasure.description = val; break;
                }
            } else if (lastContext === 'partition' && currentPartition) {
                if (key === 'source') {
                    inPartitionExpr = true;
                    if (val && val !== '=') {
                        partitionExprLines.push(val);
                    }
                }
            } else if (lastContext === 'table' && currentTable) {
                if (key === 'ishidden') currentTable.isHidden = val === 'true';
                if (key === 'description') currentTable.description = val;
            }
            continue;
        }

        // ── Multi-line expression continuation ──
        if (inMeasureExpr && lastContext === 'measure') {
            measureExprLines.push(trimmed);
            continue;
        }

        if (inPartitionExpr && lastContext === 'partition') {
            partitionExprLines.push(trimmed);
            continue;
        }
    }

    // Flush remaining
    flushAll();
    if (currentTable) tables.push(currentTable);

    return tables;
}


// ── Relationship Parser ──
function parseRelationships(text: string): TmdlRelationship[] {
    const relationships: TmdlRelationship[] = [];
    const lines = text.split(/\r?\n/);

    let current: Partial<TmdlRelationship> | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;

        // New relationship block
        if (/^relationship\b/i.test(trimmed)) {
            if (current && current.fromTable && current.toTable) {
                relationships.push(current as TmdlRelationship);
            }
            current = { isActive: true };
            continue;
        }

        if (!current) continue;

        // Parse relationship properties
        // fromColumn: Sales.'Product Key'
        const fromColMatch = trimmed.match(/^fromColumn:\s*(.+?)\.('?.+?'?)\s*$/i) || trimmed.match(/^fromColumn:\s*'?([^'.]+)'?\[(.+?)\]\s*$/i);
        if (fromColMatch) {
            current.fromTable = fromColMatch[1].replace(/^'|'$/g, '').trim();
            current.fromColumn = fromColMatch[2].replace(/^'|'$/g, '').replace(/^\[|\]$/g, '').trim();
            continue;
        }

        const toColMatch = trimmed.match(/^toColumn:\s*(.+?)\.('?.+?'?)\s*$/i) || trimmed.match(/^toColumn:\s*'?([^'.]+)'?\[(.+?)\]\s*$/i);
        if (toColMatch) {
            current.toTable = toColMatch[1].replace(/^'|'$/g, '').trim();
            current.toColumn = toColMatch[2].replace(/^'|'$/g, '').replace(/^\[|\]$/g, '').trim();
            continue;
        }

        // isActive
        if (/^isActive:\s*(true|false)/i.test(trimmed)) {
            current.isActive = trimmed.toLowerCase().includes('true');
            continue;
        }

        // crossFilteringBehavior
        if (/^crossFilteringBehavior:/i.test(trimmed)) {
            current.crossFilteringBehavior = trimmed.split(':')[1].trim();
            continue;
        }

        // fromCardinality / toCardinality
        if (/^fromCardinality:/i.test(trimmed)) {
            current.fromCardinality = trimmed.split(':')[1].trim();
        }
        if (/^toCardinality:/i.test(trimmed)) {
            current.toCardinality = trimmed.split(':')[1].trim();
        }
    }

    // Flush last relationship
    if (current && current.fromTable && current.toTable) {
        relationships.push(current as TmdlRelationship);
    }

    return relationships;
}


// ── Utility: Build context string for AI ──
export function buildTmdlContextString(model: TmdlModel): string {
    const parts: string[] = [];

    const totalColumns = model.tables.reduce((sum, t) => sum + t.columns.length, 0);
    const totalMeasures = model.tables.reduce((sum, t) => sum + t.measures.length, 0);

    parts.push(`=== POWER BI SEMANTIC MODEL (TMDL) ===`);
    parts.push(`Tổng quan: ${model.tables.length} bảng, ${totalColumns} cột, ${totalMeasures} measures, ${model.relationships.length} relationships`);
    if (model.culture) parts.push(`Culture: ${model.culture}`);
    parts.push('');

    // Tables & Columns
    for (const table of model.tables) {
        const hidden = table.isHidden ? ' [HIDDEN]' : '';
        parts.push(`── Bảng: "${table.name}"${hidden} ──`);

        if (table.columns.length > 0) {
            parts.push('  Cột:');
            for (const col of table.columns) {
                const extras: string[] = [];
                if (col.isKey) extras.push('PK');
                if (col.isHidden) extras.push('hidden');
                if (col.expression) extras.push('calculated');
                if (col.summarizeBy) extras.push(`summarize: ${col.summarizeBy}`);
                const extraStr = extras.length > 0 ? ` (${extras.join(', ')})` : '';
                parts.push(`    - ${col.name}: ${col.dataType}${extraStr}`);
            }
        }

        if (table.measures.length > 0) {
            parts.push('  Measures:');
            for (const m of table.measures) {
                parts.push(`    - ${m.name} = ${m.expression}`);
                if (m.formatString) parts.push(`      formatString: ${m.formatString}`);
            }
        }
        parts.push('');
    }

    // Relationships
    if (model.relationships.length > 0) {
        parts.push('── Relationships ──');
        for (const r of model.relationships) {
            const active = r.isActive ? '' : ' [INACTIVE]';
            const filter = r.crossFilteringBehavior ? ` (${r.crossFilteringBehavior})` : '';
            parts.push(`  ${r.fromTable}[${r.fromColumn}] → ${r.toTable}[${r.toColumn}]${active}${filter}`);
        }
    }

    return parts.join('\n');
}
