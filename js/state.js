/**
 * state.js — Application State Management
 * 
 * Central state store for the Stabbalkenlastlagerungen editor.
 * All modules import from here to read/write shared state.
 */

export const state = {
    /** @type {Map<string, Object>} All placed elements, keyed by id */
    elements: new Map(),

    /** @type {string|null} Currently selected element id */
    selectedId: null,

    /** @type {string|null} Currently active tool (null = pointer mode) */
    activeTool: null,

    /** @type {number} Grid spacing in SVG units */
    gridSize: 25,

    /** @type {boolean} Whether the grid is visible */
    showGrid: true,

    /** @type {boolean} Whether snap-to-grid is enabled */
    snapEnabled: true,

    /** @type {number} Current zoom level (1 = 100%) */
    zoom: 1,

    /** @type {number} Pan offset X */
    panX: 0,

    /** @type {number} Pan offset Y */
    panY: 0,

    /** @type {number} Canvas width in SVG units at zoom=1 */
    canvasWidth: 1600,

    /** @type {number} Canvas height in SVG units at zoom=1 */
    canvasHeight: 1000,

    /** @type {number} Next element ID counter */
    nextId: 1,

    /** @type {Array} Undo stack (snapshots of element states) */
    undoStack: [],

    /** @type {Array} Redo stack */
    redoStack: [],

    /** @type {number} Maximum undo steps */
    maxUndoSteps: 50,
};

/**
 * Generate a unique element ID.
 * @returns {string}
 */
export function generateId() {
    return 'elem_' + (state.nextId++);
}

/**
 * Snap a value to the nearest grid point.
 * @param {number} value 
 * @param {number} [gridSize] - Override grid size
 * @returns {number}
 */
export function snapToGrid(value, gridSize) {
    if (!state.snapEnabled) return value;
    const gs = gridSize || state.gridSize;
    return Math.round(value / gs) * gs;
}

/**
 * Take a snapshot of the current element state for undo.
 */
export function saveSnapshot() {
    const snapshot = [];
    for (const [id, elem] of state.elements) {
        snapshot.push({
            id: elem.id,
            type: elem.type,
            x: elem.x,
            y: elem.y,
            rotation: elem.rotation,
            props: JSON.parse(JSON.stringify(elem.props)),
        });
    }
    state.undoStack.push(snapshot);
    if (state.undoStack.length > state.maxUndoSteps) {
        state.undoStack.shift();
    }
    // Clear redo stack on new action
    state.redoStack = [];
}

/**
 * Get a snapshot of the current state.
 * @returns {Array}
 */
export function getCurrentSnapshot() {
    const snapshot = [];
    for (const [, elem] of state.elements) {
        snapshot.push({
            id: elem.id,
            type: elem.type,
            x: elem.x,
            y: elem.y,
            rotation: elem.rotation,
            props: JSON.parse(JSON.stringify(elem.props)),
        });
    }
    return snapshot;
}
