/**
 * interactions.js — Mouse & Keyboard Interaction Handler
 * 
 * Manages all canvas interactions: tool selection, element placement,
 * element selection, drag-to-move, rotation, ghost preview, pan, and zoom.
 */

import { state, snapToGrid } from './state.js';
import { screenToSVG, applyZoom, applyPan } from './canvas.js';
import { createElementData, renderElement, getElementBounds, ELEMENT_TYPES, updateElementSVG } from './elements.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let svgEl = null;
let elementsLayer = null;
let ghostLayer = null;
let uiLayer = null;
let callbacks = null;

// Interaction state
let isDragging = false;
let isRotating = false;
let isPanning = false;
let dragStartSVG = null;
let dragStartElemPos = null;
let rotateStartAngle = null;
let rotateStartElemAngle = null;
let panStartScreen = null;
let panStartSVGCoords = null;
let ghostElement = null;

/**
 * Initialize interactions.
 * @param {SVGSVGElement} svg - The main SVG element
 * @param {Object} cbs - Callbacks object:
 *   - onPlaceElement(type, x, y, rotation): string (returns new element id)
 *   - onSelectElement(id|null): void
 *   - onMoveElement(id, x, y): void
 *   - onRotateElement(id, angle): void
 *   - onDeleteSelected(): void
 *   - onMoveEnd(): void (called after drag ends, for undo snapshot)
 */
export function initInteractions(svg, cbs) {
    svgEl = svg;
    elementsLayer = svg.querySelector('#elements-layer');
    ghostLayer = svg.querySelector('#ghost-layer');
    uiLayer = svg.querySelector('#ui-layer');
    callbacks = cbs;

    // Canvas mouse events
    svg.addEventListener('mousedown', onMouseDown);
    svg.addEventListener('mousemove', onMouseMove);
    svg.addEventListener('mouseup', onMouseUp);
    svg.addEventListener('mouseleave', onMouseLeave);
    svg.addEventListener('wheel', onWheel, { passive: false });

    // Prevent context menu on canvas
    svg.addEventListener('contextmenu', e => e.preventDefault());
}

/**
 * Update the ghost preview element based on active tool and mouse position.
 */
function updateGhost(svgX, svgY) {
    clearGhost();

    if (!state.activeTool || state.activeTool === 'pointer') return;

    const x = state.snapEnabled ? snapToGrid(svgX) : svgX;
    const y = state.snapEnabled ? snapToGrid(svgY) : svgY;

    const elemData = createElementData(state.activeTool, x, y, 0);
    elemData.id = '__ghost__';
    const g = renderElement(elemData);
    g.classList.add('ghost-element');
    g.style.pointerEvents = 'none';
    ghostLayer.appendChild(g);
    ghostElement = g;
}

function clearGhost() {
    if (ghostElement) {
        ghostElement.remove();
        ghostElement = null;
    }
    // Also clear any remaining ghost children
    while (ghostLayer && ghostLayer.firstChild) {
        ghostLayer.removeChild(ghostLayer.firstChild);
    }
}

/**
 * Update selection UI (selection box + rotation handle).
 */
export function updateSelectionUI() {
    // Clear existing UI
    while (uiLayer && uiLayer.firstChild) {
        uiLayer.removeChild(uiLayer.firstChild);
    }

    if (!state.selectedId) return;

    const elem = state.elements.get(state.selectedId);
    if (!elem || !elem.svgGroup) return;

    // Get bounding box from the SVG group
    let bbox;
    try {
        bbox = elem.svgGroup.getBBox();
    } catch {
        return;
    }

    const pad = 6;
    const bx = bbox.x - pad;
    const by = bbox.y - pad;
    const bw = bbox.width + pad * 2;
    const bh = bbox.height + pad * 2;

    // Create a group with same transform as element
    const uiGroup = document.createElementNS(SVG_NS, 'g');
    uiGroup.setAttribute('transform', `translate(${elem.x}, ${elem.y}) rotate(${elem.rotation || 0})`);
    uiGroup.style.pointerEvents = 'none';

    // Selection rectangle
    const selRect = document.createElementNS(SVG_NS, 'rect');
    selRect.setAttribute('x', bx);
    selRect.setAttribute('y', by);
    selRect.setAttribute('width', bw);
    selRect.setAttribute('height', bh);
    selRect.setAttribute('class', 'selection-box');
    uiGroup.appendChild(selRect);

    // Rotation handle
    const handleDist = 25;
    const handleX = bx + bw / 2;
    const handleY = by - handleDist;

    // Line from top-center of bbox to handle
    const handleLine = document.createElementNS(SVG_NS, 'line');
    handleLine.setAttribute('x1', handleX);
    handleLine.setAttribute('y1', by);
    handleLine.setAttribute('x2', handleX);
    handleLine.setAttribute('y2', handleY);
    handleLine.setAttribute('class', 'rotation-handle-line');
    uiGroup.appendChild(handleLine);

    // Handle circle
    const handleCircle = document.createElementNS(SVG_NS, 'circle');
    handleCircle.setAttribute('cx', handleX);
    handleCircle.setAttribute('cy', handleY);
    handleCircle.setAttribute('r', 6);
    handleCircle.setAttribute('class', 'rotation-handle-circle');
    handleCircle.style.pointerEvents = 'all';
    handleCircle.style.cursor = 'grab';

    // Rotation handle interaction
    handleCircle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isRotating = true;
        const svgPt = screenToSVG(e.clientX, e.clientY);
        rotateStartAngle = Math.atan2(svgPt.y - elem.y, svgPt.x - elem.x);
        rotateStartElemAngle = elem.rotation || 0;
        svgEl.style.cursor = 'grabbing';
    });

    uiGroup.appendChild(handleCircle);
    uiLayer.appendChild(uiGroup);
}

/* ═══════════ Event Handlers ═══════════ */

function onMouseDown(e) {
    if (e.button === 1) {
        // Middle mouse button → pan
        e.preventDefault();
        isPanning = true;
        panStartScreen = { x: e.clientX, y: e.clientY };
        panStartSVGCoords = screenToSVG(e.clientX, e.clientY);
        svgEl.parentElement.classList.add('panning');
        return;
    }

    if (e.button !== 0) return; // Only handle left click

    const svgPt = screenToSVG(e.clientX, e.clientY);

    // If a tool is active (not pointer), place an element
    if (state.activeTool && state.activeTool !== 'pointer') {
        const x = state.snapEnabled ? snapToGrid(svgPt.x) : svgPt.x;
        const y = state.snapEnabled ? snapToGrid(svgPt.y) : svgPt.y;

        clearGhost();
        if (callbacks.onPlaceElement) {
            callbacks.onPlaceElement(state.activeTool, x, y, 0);
        }
        return;
    }

    // Pointer mode: check if we clicked on an element
    const clickedGroup = findElementGroupAt(e.target);
    if (clickedGroup) {
        const id = clickedGroup.getAttribute('data-id');
        if (callbacks.onSelectElement) {
            callbacks.onSelectElement(id);
        }

        // Start dragging
        isDragging = true;
        const elem = state.elements.get(id);
        if (elem) {
            dragStartSVG = svgPt;
            dragStartElemPos = { x: elem.x, y: elem.y };
        }
        svgEl.parentElement.classList.add('dragging');
    } else {
        // Click on empty canvas: deselect
        if (callbacks.onSelectElement) {
            callbacks.onSelectElement(null);
        }
    }
}

function onMouseMove(e) {
    const svgPt = screenToSVG(e.clientX, e.clientY);

    // Update status bar coordinates
    updateCoordsDisplay(svgPt.x, svgPt.y);

    if (isPanning) {
        const currentSVG = screenToSVG(e.clientX, e.clientY);
        // Convert delta in screen space to SVG units
        const rect = svgEl.getBoundingClientRect();
        const vb = svgEl.viewBox.baseVal;
        const scaleX = vb.width / rect.width;
        const scaleY = vb.height / rect.height;
        const dx = (e.clientX - panStartScreen.x) * scaleX;
        const dy = (e.clientY - panStartScreen.y) * scaleY;
        applyPan(-dx, -dy);
        panStartScreen = { x: e.clientX, y: e.clientY };
        return;
    }

    if (isRotating && state.selectedId) {
        const elem = state.elements.get(state.selectedId);
        if (elem) {
            const currentAngle = Math.atan2(svgPt.y - elem.y, svgPt.x - elem.x);
            let deltaAngle = (currentAngle - rotateStartAngle) * 180 / Math.PI;

            let newAngle = rotateStartElemAngle + deltaAngle;

            // Shift for 15° snap
            if (e.shiftKey) {
                newAngle = Math.round(newAngle / 15) * 15;
            }

            if (callbacks.onRotateElement) {
                callbacks.onRotateElement(state.selectedId, newAngle);
            }
        }
        return;
    }

    if (isDragging && state.selectedId && dragStartSVG) {
        const dx = svgPt.x - dragStartSVG.x;
        const dy = svgPt.y - dragStartSVG.y;
        let newX = dragStartElemPos.x + dx;
        let newY = dragStartElemPos.y + dy;

        if (state.snapEnabled) {
            newX = snapToGrid(newX);
            newY = snapToGrid(newY);
        }

        if (callbacks.onMoveElement) {
            callbacks.onMoveElement(state.selectedId, newX, newY);
        }
        return;
    }

    // Ghost preview
    if (state.activeTool && state.activeTool !== 'pointer') {
        updateGhost(svgPt.x, svgPt.y);
    }
}

function onMouseUp(e) {
    if (isPanning) {
        isPanning = false;
        svgEl.parentElement.classList.remove('panning');
        return;
    }

    if (isRotating) {
        isRotating = false;
        svgEl.style.cursor = '';
        if (callbacks.onMoveEnd) callbacks.onMoveEnd();
        return;
    }

    if (isDragging) {
        isDragging = false;
        svgEl.parentElement.classList.remove('dragging');
        if (callbacks.onMoveEnd) callbacks.onMoveEnd();
        return;
    }
}

function onMouseLeave(e) {
    clearGhost();
    if (isPanning) {
        isPanning = false;
        svgEl.parentElement.classList.remove('panning');
    }
}

function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    applyZoom(delta, e.clientX, e.clientY);

    // Update zoom display
    const zoomDisplay = document.getElementById('status-zoom');
    if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(state.zoom * 100) + '%';
    }
}

/* ═══════════ Helpers ═══════════ */

/**
 * Walk up the DOM from a target to find the nearest .element-group.
 * @param {Element} target
 * @returns {Element|null}
 */
function findElementGroupAt(target) {
    let current = target;
    while (current && current !== svgEl) {
        if (current.classList && current.classList.contains('element-group')) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

function updateCoordsDisplay(x, y) {
    const el = document.getElementById('status-coords');
    if (el) {
        const sx = state.snapEnabled ? snapToGrid(x) : Math.round(x);
        const sy = state.snapEnabled ? snapToGrid(y) : Math.round(y);
        el.textContent = `X: ${sx}  Y: ${sy}`;
    }
}

/**
 * Clean up interactions (called on tool change, etc.)
 */
export function clearInteractionState() {
    isDragging = false;
    isRotating = false;
    clearGhost();
}
