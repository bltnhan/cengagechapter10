'use client';
/**
 * Chart Rendering Utility — Client-Side Chart.js
 * 
 * Finds all .dl-chart-placeholder elements in a container,
 * parses the embedded chart config, and renders them using Chart.js
 * directly on a <canvas> element — no external service needed.
 */
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components once
Chart.register(...registerables);

// Track chart instances for cleanup
const chartInstances = new Map<string, Chart>();

export async function renderChartPlaceholders(container: HTMLElement): Promise<void> {
    const placeholders = container.querySelectorAll<HTMLElement>('.dl-chart-placeholder:not([data-chart-rendered])');
    if (!placeholders.length) return;

    for (const el of Array.from(placeholders)) {
        const rawConfig = el.getAttribute('data-chart-config');
        if (!rawConfig) continue;

        // Mark as rendered to avoid double-processing
        el.setAttribute('data-chart-rendered', 'true');

        try {
            // Decode base64 config → JSON string
            let jsonStr = '';
            try {
                jsonStr = decodeURIComponent(escape(atob(rawConfig))).trim();
            } catch (e) {
                showChartError(el, 'Lỗi giải mã cấu hình biểu đồ (Base64)');
                continue;
            }

            // Parse JSON
            const config = JSON.parse(jsonStr);

            // Validate minimum required structure
            if (!config.type || !config.data) {
                showChartError(el, 'Cấu hình biểu đồ thiếu thông tin bắt buộc ("type" hoặc "data")');
                continue;
            }

            // Create a wrapper div + canvas
            const wrapper = document.createElement('div');
            wrapper.className = 'dl-chart-wrapper';
            wrapper.style.cssText = `
                position: relative;
                max-width: 100%;
                margin: 15px 0;
                padding: 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid var(--border-default, rgba(48,54,61,0.7));
                border-radius: 12px;
            `;

            const canvas = document.createElement('canvas');
            const chartId = `dl-chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            canvas.id = chartId;
            canvas.style.cssText = 'max-height: 350px; width: 100%;';
            wrapper.appendChild(canvas);

            // Replace placeholder with wrapper before creating chart
            el.replaceWith(wrapper);

            // Destroy old chart if ID somehow collides
            if (chartInstances.has(chartId)) {
                chartInstances.get(chartId)!.destroy();
            }

            // Ensure proper defaults for good-looking charts
            const chartConfig = applyChartDefaults(config);

            // Create chart
            const chart = new Chart(canvas, chartConfig);
            chartInstances.set(chartId, chart);

        } catch (err: any) {
            showChartError(el, err.message || 'Không thể render biểu đồ');
        }
    }
}

/**
 * Apply sensible defaults so AI-generated configs look good
 * even if the AI forgets styling details
 */
function applyChartDefaults(config: any): any {
    const type = config.type?.toLowerCase();

    // Default color palette (vibrant, modern)
    const palette = [
        'rgba(99, 102, 241, 0.8)',   // indigo
        'rgba(16, 185, 129, 0.8)',   // emerald
        'rgba(245, 158, 11, 0.8)',   // amber
        'rgba(239, 68, 68, 0.8)',    // red
        'rgba(139, 92, 246, 0.8)',   // violet
        'rgba(59, 130, 246, 0.8)',   // blue
        'rgba(236, 72, 153, 0.8)',   // pink
        'rgba(14, 165, 233, 0.8)',   // sky
    ];

    const borderPalette = palette.map(c => c.replace('0.8)', '1)'));

    // Apply colors to datasets that don't have them
    if (config.data?.datasets) {
        config.data.datasets.forEach((ds: any, i: number) => {
            if (type === 'pie' || type === 'doughnut') {
                if (!ds.backgroundColor) {
                    ds.backgroundColor = palette.slice(0, config.data.labels?.length || palette.length);
                }
                if (!ds.borderColor) {
                    ds.borderColor = 'rgba(13, 17, 23, 0.8)';
                }
                if (ds.borderWidth === undefined) {
                    ds.borderWidth = 2;
                }
            } else {
                if (!ds.backgroundColor) {
                    ds.backgroundColor = palette[i % palette.length];
                }
                if (!ds.borderColor) {
                    ds.borderColor = borderPalette[i % borderPalette.length];
                }
                if (type === 'line' && ds.borderWidth === undefined) {
                    ds.borderWidth = 2;
                }
                if (type === 'line' && ds.tension === undefined) {
                    ds.tension = 0.3;
                }
                if (type === 'line' && ds.fill === undefined) {
                    ds.fill = false;
                }
            }
        });
    }

    // Ensure options exist
    if (!config.options) config.options = {};
    if (!config.options.plugins) config.options.plugins = {};

    // Responsive defaults
    config.options.responsive = true;
    config.options.maintainAspectRatio = true;

    // Legend styling
    if (!config.options.plugins.legend) {
        config.options.plugins.legend = {};
    }
    config.options.plugins.legend.labels = {
        ...config.options.plugins.legend.labels,
        color: 'rgba(240, 246, 252, 0.8)',
        font: { size: 12 },
    };

    // Title styling (if present)
    if (config.options.plugins.title) {
        config.options.plugins.title.color = 'rgba(240, 246, 252, 0.9)';
        config.options.plugins.title.font = { size: 14, weight: 'bold', ...config.options.plugins.title.font };
    }

    // Scale styling for axis-based charts
    if (type !== 'pie' && type !== 'doughnut' && type !== 'radar') {
        if (!config.options.scales) config.options.scales = {};
        for (const axis of ['x', 'y']) {
            if (!config.options.scales[axis]) config.options.scales[axis] = {};
            config.options.scales[axis].ticks = {
                color: 'rgba(240, 246, 252, 0.6)',
                ...config.options.scales[axis].ticks,
            };
            config.options.scales[axis].grid = {
                color: 'rgba(48, 54, 61, 0.4)',
                ...config.options.scales[axis].grid,
            };
        }
    }

    // Radar chart scale styling
    if (type === 'radar') {
        if (!config.options.scales) config.options.scales = {};
        if (!config.options.scales.r) config.options.scales.r = {};
        config.options.scales.r.ticks = {
            color: 'rgba(240, 246, 252, 0.6)',
            backdropColor: 'transparent',
            ...config.options.scales.r.ticks,
        };
        config.options.scales.r.grid = {
            color: 'rgba(48, 54, 61, 0.4)',
            ...config.options.scales.r.grid,
        };
        config.options.scales.r.pointLabels = {
            color: 'rgba(240, 246, 252, 0.8)',
            ...config.options.scales.r.pointLabels,
        };
    }

    return config;
}

function showChartError(el: HTMLElement, message: string) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = `
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.3);
        border-radius: 8px;
        padding: 12px 16px;
        margin: 15px 0;
        font-size: 13px;
        color: #f87171;
        font-family: var(--font-mono, monospace);
    `;
    const shortMsg = message ? message.substring(0, 300) : 'Lỗi không xác định';
    errDiv.innerHTML = `<strong>⚠️ Lỗi biểu đồ:</strong> ${escapeHtml(shortMsg)}`;
    el.replaceWith(errDiv);
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
