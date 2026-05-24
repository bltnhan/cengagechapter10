import { t } from './i18n';

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function decodeHtmlEntities(text: string): string {
    if (!text) return '';
    if (typeof document === 'undefined') return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

export function sanitizeHTML(str: string): string {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

export function renderMarkdown(text: string): string {
    if (!text) return '';

    const codeBlocks: string[] = [];
    const imgBlocks: string[] = [];
    const placeholderPrefix = '@@@DLCODEBLOCK';

    /**
     * Attempt to sanitize a JS object literal (from AI) into valid JSON.
     * Uses multiple progressive passes instead of a fragile character scanner.
     */
    const sanitizeChartJson = (raw: string): { json: string | null; cleaned: string; error: string | null } => {
        // Strip JS comments first (Pass 1)
        let s = raw.trim().replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

        // Pass 0: If it already parses, return immediately
        try { JSON.parse(s); return { json: s, cleaned: s, error: null }; } catch (_) { /* continue */ }

        // Pass 2: Extract the FIRST balanced block (to avoid trailing text)
        let firstOpen = -1;
        for (let i = 0; i < s.length; i++) {
            if (s[i] === '{' || s[i] === '[') {
                firstOpen = i;
                break;
            }
        }

        if (firstOpen !== -1) {
            let balance = 0;
            let inStr = false;
            let strCh = '';
            let esc = false;
            let endPos = -1;

            for (let i = firstOpen; i < s.length; i++) {
                const ch = s[i];
                if (esc) { esc = false; continue; }
                if (ch === '\\') { esc = true; continue; }
                if (!inStr) {
                    if (ch === "'" || ch === '"') { inStr = true; strCh = ch; }
                    else if (ch === '{' || ch === '[') balance++;
                    else if (ch === '}' || ch === ']') {
                        balance--;
                        if (balance === 0) { endPos = i; break; }
                    }
                } else {
                    if (ch === strCh) inStr = false;
                }
            }

            if (endPos !== -1) {
                s = s.substring(firstOpen, endPos + 1);
            }
        }

        // Pass 3: Convert single-quoted strings to double-quoted strings
        {
            let out = '';
            let inStr = false;
            let strCh = '';
            let esc = false;
            for (let i = 0; i < s.length; i++) {
                const ch = s[i];
                if (esc) { esc = false; out += ch; continue; }
                if (ch === '\\') { esc = true; out += ch; continue; }
                if (!inStr) {
                    if (ch === "'" || ch === '"') {
                        inStr = true;
                        strCh = ch;
                        out += '"';
                    } else {
                        out += ch;
                    }
                } else {
                    if (ch === strCh) {
                        inStr = false;
                        out += '"';
                    } else if (ch === '"' && strCh === "'") {
                        out += '\\"';
                    } else {
                        out += ch;
                    }
                }
            }
            s = out;
        }

        // Pass 4: Quote unquoted keys  {foo: ...} → {"foo": ...}
        s = s.replace(/(?<=[\{\[,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)/g, '"$1"');

        // Pass 5: Remove trailing commas before } or ]
        s = s.replace(/,\s*([}\]])/g, '$1');

        // Final validation
        try {
            JSON.parse(s);
            return { json: s, cleaned: s, error: null };
        } catch (e: any) {
            return { json: null, cleaned: s, error: e.message || 'Invalid JSON' };
        }
    };

    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)(?:```|$)/g;
    let html = text.replace(codeBlockRegex, (match, lang, code) => {
        const language = (lang || 'code').toLowerCase();

        if (language === 'quickchart') {
            const { json, cleaned } = sanitizeChartJson(code.trim());
            // Prefer strict JSON, fallback to cleaned JS literal
            const chartConfig = json || cleaned;
            // Base64-encode the config to avoid any HTML attribute escaping issues
            let b64Config = '';
            try {
                b64Config = typeof btoa === 'function'
                    ? btoa(unescape(encodeURIComponent(chartConfig)))
                    : Buffer.from(chartConfig, 'utf-8').toString('base64');
            } catch {
                b64Config = Buffer.from(chartConfig, 'utf-8').toString('base64');
            }
            // Placeholder div — client-side chartRenderer.ts will create Chart.js canvas here
            const placeholderHtml = `<div class="dl-chart-placeholder" data-chart-config="${b64Config}" style="min-height:200px; border-radius:12px; border:1px solid var(--border-default); margin:15px 0; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center;">
  <span style="color:var(--text-muted,#888);font-size:13px;">${t('markdown.loadingChart')}</span>
</div>`;
            const idx = imgBlocks.length;
            imgBlocks.push(placeholderHtml);
            return `@@@IMG${idx}@@@`;
        }

        if (language === 'mermaid') {
            const cleanCode = code.trim();
            // Use mermaid.ink for server-side rendering
            // Properly encode utf-8 to base-64 without URI encoding the final string
            let encodedDiagram = '';
            try {
                if (typeof window !== 'undefined' && window.TextEncoder) {
                    const bytes = new TextEncoder().encode(cleanCode);
                    encodedDiagram = btoa(String.fromCharCode(...bytes));
                } else {
                    // Fallback using deprecated unescape for older environments if needed
                    encodedDiagram = btoa(unescape(encodeURIComponent(cleanCode)));
                }
            } catch (e) {
                // Last resort fallback stripping non-ascii
                encodedDiagram = btoa(cleanCode.replace(/[^\x00-\x7F]/g, ""));
            }
            const mermaidUrl = `https://mermaid.ink/img/${encodedDiagram}?bgColor=1e1e2e`;
            const imgHtml = `<img src="${mermaidUrl}" class="dl-chart-img" style="max-width: 100%; border-radius: 8px; margin: 15px 0; border: 1px solid var(--border-default); display: block; background: #1e1e2e; padding: 12px;" alt="Mermaid Diagram" />`;
            const idx = imgBlocks.length;
            imgBlocks.push(imgHtml);
            return `@@@IMG${idx}@@@`;
        }

        const langLabel = language === 'code' ? 'Code' : language.toUpperCase();
        const idx = codeBlocks.length;
        const escapedCode = escapeHtml(code.trim());

        // NOTE: Copy button functionality is handled by React component now.
        // We render standard HTML layout similar to the old vanilla CSS.
        const block = `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-block-lang">${langLabel}</span>
        <div class="code-block-actions">
          <button class="code-block-btn" data-code-id="dl_code_${idx}" aria-label="Copy code block">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="code-block-btn-text">Copy</span>
          </button>
        </div>
      </div>
      <div class="code-block-content">
        <pre id="dl_code_${idx}"><code>${escapedCode}</code></pre>
      </div>
    </div>`;

        codeBlocks.push(block);
        return placeholderPrefix + idx + '@@@';
    });

    // Protect <img> tags from escapeHtml
    html = html.replace(/<img([^>]*)>/gi, (match, attrs) => {
        imgBlocks.push(`<img${attrs} class="dl-chart-img" style="max-width: 100%; border-radius: 8px; margin: 15px 0; border: 1px solid var(--border-default); display: block;">`);
        return `@@@IMG${imgBlocks.length - 1}@@@`;
    });

    html = escapeHtml(html);

    // Images (Markdown syntax fallback)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="dl-chart-img" style="max-width: 100%; border-radius: 8px; margin: 15px 0; border: 1px solid var(--border-default); display: block;" />');

    // Links (Standard Markdown)
    html = html.replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    html = html.replace(/`([^`]+)`/g, (match, content) => `<code>${content}</code>`);
    html = html.replace(/^\s*(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
        const level = Math.min(hashes.length + 1, 6);
        return `<h${level}>${content}</h${level}>`;
    });

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*_]+)\*/g, '<em>$1</em>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/_([^*_]+)_/g, '<em>$1</em>');

    html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

    html = html.replace(/\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/g, (match, header, body) => {
        const ths = header.split('|').filter((s: string) => s.trim()).map((s: string) => `<th>${s.trim()}</th>`).join('');
        const rows = body.trim().split('\n').map((row: string) => {
            const tds = row.split('|').filter((s: string) => s.trim()).map((s: string) => `<td>${s.trim()}</td>`).join('');
            return `<tr>${tds}</tr>`;
        }).join('');
        return `<div class="table-wrapper"><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
    });

    // Ensure block elements have blank lines around them to isolate them effectively
    html = html.replace(/(<h[1-6]>[\s\S]*?<\/h[1-6]>)/g, '\n\n$1\n\n');
    html = html.replace(/(<div class="table-wrapper">[\s\S]*?<\/div>)/g, '\n\n$1\n\n');
    html = html.replace(new RegExp(`(${placeholderPrefix}\\d+@@@)`, 'g'), '\n\n$1\n\n');
    html = html.replace(/(@@@IMG\d+@@@)/g, '\n\n$1\n\n');

    // Group adjacent lists
    html = html.replace(/(?:<li>.*?<\/li>\s*)+/g, (match) => {
        const cleanItems = match.trim().replace(/\s*(<li>.*?<\/li>)\s*/g, '$1');
        return `\n\n<ul>${cleanItems}</ul>\n\n`;
    });

    // Split HTML into blocks separated by 2 or more newlines
    const blocks = html.split(/\n{2,}/);
    html = blocks.map(block => {
        block = block.trim();
        if (!block) return '';
        // If it starts with block-level HTML tags, do not wrap in <p>
        if (/^(<h[1-6]>|<ul|<ol|<div|<table|@@@DLCODEBLOCK|@@@IMG)/i.test(block)) {
            return block;
        }
        // Otherwise treat as a paragraph, converting remaining internal newlines to <br>
        return `<p style="margin-bottom: 0.75rem;">${block.replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('\n');

    for (let i = codeBlocks.length - 1; i >= 0; i--) {
        html = html.split(placeholderPrefix + i + '@@@').join(codeBlocks[i]);
    }

    // Finally restore images
    html = html.replace(/@@@IMG(\d+)@@@/g, (match, idx) => imgBlocks[parseInt(idx)]);

    return `<div class="markdown-content">${html}</div>`;
}

export function renderAIResponse(text: string): string {
    if (!text) return '';

    if (!/<\/?(strong|b|em|i|u|br|p|ul|ol|li|h[1-6]|code|pre|table|thead|tbody|tr|th|td|blockquote)([^>]*)>/i.test(text)) {
        return renderMarkdown(text);
    }

    if (typeof document === 'undefined') {
        return `<div class="ai-html-content">${escapeHtml(text)}</div>`; // basic fallback for SSR
    }

    const temp = document.createElement('div');
    temp.innerHTML = text;

    function sanitizeNode(node: ChildNode): string {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeHtml(node.textContent || '');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        const allowedTags = ['strong', 'b', 'em', 'i', 'u', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'a', 'span', 'img'];

        if (!allowedTags.includes(tagName)) {
            return Array.from(element.childNodes).map(sanitizeNode).join('');
        }

        let html = '<' + tagName;
        const allowedAttrs = ['class', 'style', 'src', 'alt', 'href', 'target', 'rel'];
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            if (allowedAttrs.includes(attr.name.toLowerCase())) {
                if (attr.name.toLowerCase() === 'style') {
                    const sanitizedStyle = attr.value.replace(/javascript:/gi, '').replace(/on\w+=/gi, '');
                    html += ` ${attr.name}="${sanitizedStyle}"`;
                } else {
                    html += ` ${attr.name}="${attr.value}"`;
                }
            }
        }
        html += '>';
        html += Array.from(element.childNodes).map(sanitizeNode).join('');
        html += '</' + tagName + '>';
        return html;
    }

    const sanitized = Array.from(temp.childNodes).map(sanitizeNode).join('');
    return `<div class="ai-html-content">${sanitized}</div>`;
}

export function createSafeElement(tag: string, text: string): HTMLElement {
    const el = document.createElement(tag);
    el.textContent = text || '';
    return el;
}
