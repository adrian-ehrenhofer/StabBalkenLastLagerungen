/**
 * canvas.js — SVG Canvas Management
 * 
 * Handles the SVG canvas setup, grid rendering, coordinate transforms,
 * zoom, and pan functionality.
 */

import { state } from './state.js';

let svgEl = null;
let gridMinor = null;
let gridMajor = null;
let gridRect = null;

/**
 * Initialize the canvas module.
 * @param {SVGSVGElement} svgElement - The main SVG element
 */
export function initCanvas(svgElement) {
    svgEl = svgElement;
    gridMinor = svgEl.querySelector('#grid-minor');
    gridMajor = svgEl.querySelector('#grid-major');
    gridRect = svgEl.querySelector('#grid-rect');

    updateViewBox();
    updateGridPattern();
}

/**
 * Update the SVG viewBox based on current zoom and pan.
 */
export function updateViewBox() {
    if (!svgEl) return;
    const w = state.canvasWidth / state.zoom;
    const h = state.canvasHeight / state.zoom;
    const x = state.panX;
    const y = state.panY;
    svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
}

/**
 * Update the grid pattern to match current grid size.
 */
export function updateGridPattern() {
    if (!gridMinor || !gridMajor) return;
    const gs = state.gridSize;
    const majorSize = gs * 5;

    // Minor grid
    gridMinor.setAttribute('width', gs);
    gridMinor.setAttribute('height', gs);
    const minorPath = gridMinor.querySelector('path');
    if (minorPath) {
        minorPath.setAttribute('d', `M ${gs} 0 L 0 0 0 ${gs}`);
    }

    // Major grid
    gridMajor.setAttribute('width', majorSize);
    gridMajor.setAttribute('height', majorSize);
    const majorRect = gridMajor.querySelector('rect');
    if (majorRect) {
        majorRect.setAttribute('width', majorSize);
        majorRect.setAttribute('height', majorSize);
    }
    const majorPath = gridMajor.querySelector('path');
    if (majorPath) {
        majorPath.setAttribute('d', `M ${majorSize} 0 L 0 0 0 ${majorSize}`);
    }
}

/**
 * Toggle grid visibility.
 * @param {boolean} visible
 */
export function setGridVisible(visible) {
    if (gridRect) {
        gridRect.style.display = visible ? 'block' : 'none';
    }
}

/**
 * Convert screen (client) coordinates to SVG coordinates.
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{x: number, y: number}}
 */
export function screenToSVG(clientX, clientY) {
    if (!svgEl) return { x: 0, y: 0 };
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
}

/**
 * Apply zoom (around center of viewport).
 * @param {number} delta - Positive to zoom in, negative to zoom out
 * @param {number} [centerX] - Screen X for zoom center
 * @param {number} [centerY] - Screen Y for zoom center
 */
export function applyZoom(delta, centerX, centerY) {
    const oldZoom = state.zoom;
    const factor = delta > 0 ? 1.1 : 1 / 1.1;
    state.zoom = Math.min(5, Math.max(0.1, state.zoom * factor));

    // Adjust pan to zoom around the mouse position
    if (centerX !== undefined && centerY !== undefined) {
        const svgPt = screenToSVG(centerX, centerY);
        const scale = oldZoom / state.zoom;
        state.panX = svgPt.x - (svgPt.x - state.panX) * scale;
        state.panY = svgPt.y - (svgPt.y - state.panY) * scale;
    }

    updateViewBox();
}

/**
 * Apply pan offset.
 * @param {number} dx - Delta X in SVG units
 * @param {number} dy - Delta Y in SVG units
 */
export function applyPan(dx, dy) {
    state.panX += dx;
    state.panY += dy;
    updateViewBox();
}

/**
 * Reset zoom and pan to show default view.
 */
export function resetView() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    updateViewBox();
}

/**
 * Fit view to show all elements with padding.
 * @param {Map<string, Object>} elements
 */
export function fitToContent(elements) {
    if (!elements || elements.size === 0) {
        resetView();
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, elem] of elements) {
        // Use the SVG group's bounding box if available
        if (elem.svgGroup) {
            try {
                const bbox = elem.svgGroup.getBBox();
                const m = elem.svgGroup.getCTM();
                if (m) {
                    // Transform bbox corners
                    const corners = [
                        { x: bbox.x, y: bbox.y },
                        { x: bbox.x + bbox.width, y: bbox.y },
                        { x: bbox.x, y: bbox.y + bbox.height },
                        { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
                    ];
                    for (const c of corners) {
                        minX = Math.min(minX, c.x);
                        minY = Math.min(minY, c.y);
                        maxX = Math.max(maxX, c.x);
                        maxY = Math.max(maxY, c.y);
                    }
                }
            } catch {
                // getBBox can fail if element not in DOM
            }
        }
    }

    if (!isFinite(minX)) {
        resetView();
        return;
    }

    const padding = 80;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const zoomX = state.canvasWidth / contentW;
    const zoomY = state.canvasHeight / contentH;
    state.zoom = Math.min(zoomX, zoomY, 3);
    state.panX = minX;
    state.panY = minY;
    updateViewBox();
}

/**
 * Get the SVG element reference.
 * @returns {SVGSVGElement}
 */
export function getSVGElement() {
    return svgEl;
}
