/**
 * elements.js — SVG Element Factory
 * 
 * Creates and renders all structural element types for Technische Mechanik diagrams:
 * Beams, bearings (Festlager, Loslager, Einspannungen), joints (Gelenke),
 * loads (Einzelkraft, Streckenlast, Moment), and annotations (Beschriftungen).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Helper: create an SVG element with attributes */
function svg(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, val] of Object.entries(attrs)) {
        el.setAttribute(key, String(val));
    }
    return el;
}

/* ═══════════ Element Type Definitions ═══════════ */

export const ELEMENT_TYPES = {
    beam: {
        name: 'Balken',
        category: 'stäbe',
        defaults: { length: 200, height: 8 },
    },
    festlager: {
        name: 'Festlager',
        category: 'lager',
        defaults: { size: 22, label: '' },
    },
    loslager: {
        name: 'Loslager',
        category: 'lager',
        defaults: { size: 22, label: '' },
    },
    einspannung: {
        name: 'Einspannung',
        category: 'lager',
        defaults: { wallLength: 70, wallWidth: 12 },
    },
    gelenk: {
        name: 'Gelenk',
        category: 'verbindungen',
        defaults: { radius: 6, label: '' },
    },
    einzelkraft: {
        name: 'Einzelkraft',
        category: 'lasten',
        defaults: { magnitude: 70, label: 'F' },
    },
    streckenlast: {
        name: 'Streckenlast',
        category: 'lasten',
        defaults: { length: 200, startMag: 50, endMag: 50, label: 'q₀', arrowSpacing: 25 },
    },
    moment: {
        name: 'Moment',
        category: 'lasten',
        defaults: { radius: 25, label: 'M', direction: 'cw' },
    },
    dimension: {
        name: 'Bemaßung',
        category: 'beschriftung',
        defaults: { length: 200, label: 'a', offset: 8 },
    },
    label: {
        name: 'Text',
        category: 'beschriftung',
        defaults: { text: 'A', fontSize: 18 },
    },
};

/**
 * Create element data object.
 * @param {string} type - Element type key
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} rotation - Rotation in degrees
 * @param {Object} [propsOverride] - Override default properties
 * @param {string} [id] - Element ID (generated if not provided)
 * @returns {Object} Element data
 */
export function createElementData(type, x, y, rotation = 0, propsOverride = {}, id = null) {
    const typeDef = ELEMENT_TYPES[type];
    if (!typeDef) throw new Error(`Unknown element type: ${type}`);
    return {
        id: id || null,  // set by caller
        type,
        x,
        y,
        rotation,
        props: { ...typeDef.defaults, ...propsOverride },
        svgGroup: null,
    };
}

/**
 * Render an element to an SVG <g> group.
 * @param {Object} elem - Element data
 * @returns {SVGGElement}
 */
export function renderElement(elem) {
    const g = svg('g', {
        class: 'element-group',
        'data-id': elem.id,
        'data-type': elem.type,
        transform: buildTransform(elem),
    });

    // Render the specific element content
    const renderFn = RENDERERS[elem.type];
    if (renderFn) {
        renderFn(g, elem.props);
    }

    elem.svgGroup = g;
    return g;
}

/**
 * Update an existing element's SVG after property/position changes.
 * @param {Object} elem - Element data
 */
export function updateElementSVG(elem) {
    if (!elem.svgGroup) return;

    // Update transform
    elem.svgGroup.setAttribute('transform', buildTransform(elem));

    // Clear and re-render content
    while (elem.svgGroup.firstChild) {
        elem.svgGroup.removeChild(elem.svgGroup.firstChild);
    }

    const renderFn = RENDERERS[elem.type];
    if (renderFn) {
        renderFn(elem.svgGroup, elem.props);
    }
}

/**
 * Get the bounding box of an element in local coordinates.
 * @param {Object} elem
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function getElementBounds(elem) {
    const p = elem.props;
    switch (elem.type) {
        case 'beam':
            return { x: 0, y: -p.height / 2, width: p.length, height: p.height };
        case 'festlager':
            return { x: -p.size * 0.75, y: 0, width: p.size * 1.5, height: p.size * 1.4 };
        case 'loslager':
            return { x: -p.size * 0.75, y: 0, width: p.size * 1.5, height: p.size * 1.8 };
        case 'einspannung':
            return { x: 0, y: -p.wallLength / 2, width: p.wallWidth, height: p.wallLength };
        case 'gelenk':
            return { x: -p.radius, y: -p.radius, width: p.radius * 2, height: p.radius * 2 };
        case 'einzelkraft':
            return { x: 0, y: -10, width: p.magnitude, height: 20 };
        case 'streckenlast': {
            const maxMag = Math.max(p.startMag, p.endMag);
            return { x: 0, y: -maxMag, width: p.length, height: maxMag };
        }
        case 'moment':
            return { x: -p.radius - 5, y: -p.radius - 5, width: (p.radius + 5) * 2, height: (p.radius + 5) * 2 };
        case 'dimension':
            return { x: 0, y: -p.offset - 10, width: p.length, height: p.offset + 20 };
        case 'label':
            return { x: -5, y: -p.fontSize, width: p.fontSize * String(p.text).length * 0.6 + 10, height: p.fontSize + 5 };
        default:
            return { x: -20, y: -20, width: 40, height: 40 };
    }
}

/**
 * Get connection points of an element in world coordinates.
 * @param {Object} elem
 * @returns {Array<{x: number, y: number}>}
 */
export function getConnectionPoints(elem) {
    const local = getLocalConnectionPoints(elem);
    const rad = (elem.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return local.map(p => ({
        x: elem.x + p.x * cos - p.y * sin,
        y: elem.y + p.x * sin + p.y * cos,
    }));
}

function getLocalConnectionPoints(elem) {
    switch (elem.type) {
        case 'beam':
            return [{ x: 0, y: 0 }, { x: elem.props.length, y: 0 }];
        case 'festlager':
        case 'loslager':
        case 'gelenk':
            return [{ x: 0, y: 0 }];
        case 'einspannung':
            return [{ x: 0, y: 0 }];
        default:
            return [];
    }
}

/* ═══════════ Transform Helper ═══════════ */

function buildTransform(elem) {
    let t = `translate(${elem.x}, ${elem.y})`;
    if (elem.rotation) {
        t += ` rotate(${elem.rotation})`;
    }
    return t;
}

/* ═══════════ Renderers ═══════════ */

const RENDERERS = {
    beam: renderBeam,
    festlager: renderFestlager,
    loslager: renderLoslager,
    einspannung: renderEinspannung,
    gelenk: renderGelenk,
    einzelkraft: renderEinzelkraft,
    streckenlast: renderStreckenlast,
    moment: renderMoment,
    dimension: renderDimension,
    label: renderLabel,
};

/* ─── Beam (Balken) ─── */
function renderBeam(g, props) {
    const { length, height } = props;
    const h = height || 8;

    // Main beam body
    g.appendChild(svg('rect', {
        x: 0, y: -h / 2,
        width: length, height: h,
        fill: '#e2e8f0', stroke: '#1e293b', 'stroke-width': 1.8,
        rx: 0.5,
    }));

    // Endpoint markers (small circles for connection points)
    g.appendChild(svg('circle', {
        cx: 0, cy: 0, r: 2.5,
        fill: '#1e293b', class: 'beam-endpoint',
    }));
    g.appendChild(svg('circle', {
        cx: length, cy: 0, r: 2.5,
        fill: '#1e293b', class: 'beam-endpoint',
    }));
}

/* ─── Festlager (Fixed Support) ─── */
function renderFestlager(g, props) {
    const s = props.size || 22;
    const triH = s;
    const triW = s * 0.75;

    // Triangle
    g.appendChild(svg('polygon', {
        points: `0,0 ${-triW},${triH} ${triW},${triH}`,
        fill: 'none', stroke: '#1e293b', 'stroke-width': 2,
        'stroke-linejoin': 'round',
    }));

    // Ground line
    const gw = triW + 6;
    g.appendChild(svg('line', {
        x1: -gw, y1: triH, x2: gw, y2: triH,
        stroke: '#1e293b', 'stroke-width': 2,
    }));

    // Hatching
    const hatchCount = Math.floor(gw * 2 / 6);
    const hatchStart = -gw + 2;
    for (let i = 0; i < hatchCount; i++) {
        const x = hatchStart + i * (gw * 2 / hatchCount);
        g.appendChild(svg('line', {
            x1: x, y1: triH,
            x2: x - 5, y2: triH + 7,
            stroke: '#1e293b', 'stroke-width': 1.2,
        }));
    }

    // Pin circle at top
    g.appendChild(svg('circle', {
        cx: 0, cy: 0, r: 3,
        fill: 'white', stroke: '#1e293b', 'stroke-width': 1.5,
    }));

    // Label
    if (props.label) {
        g.appendChild(svg('text', {
            x: triW + 8, y: 5,
            'font-size': 16, 'font-family': 'Inter, sans-serif',
            'font-weight': '600', fill: '#1e293b',
        })).textContent = props.label;
    }
}

/* ─── Loslager (Roller Support) ─── */
function renderLoslager(g, props) {
    const s = props.size || 22;
    const triH = s;
    const triW = s * 0.75;
    const rollerR = 3.5;

    // Triangle
    g.appendChild(svg('polygon', {
        points: `0,0 ${-triW},${triH} ${triW},${triH}`,
        fill: 'none', stroke: '#1e293b', 'stroke-width': 2,
        'stroke-linejoin': 'round',
    }));

    // Rollers
    const rollerY = triH + rollerR + 1;
    g.appendChild(svg('circle', { cx: -triW * 0.5, cy: rollerY, r: rollerR, fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5 }));
    g.appendChild(svg('circle', { cx: 0, cy: rollerY, r: rollerR, fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5 }));
    g.appendChild(svg('circle', { cx: triW * 0.5, cy: rollerY, r: rollerR, fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5 }));

    // Ground line
    const gw = triW + 6;
    const groundY = rollerY + rollerR + 1;
    g.appendChild(svg('line', {
        x1: -gw, y1: groundY, x2: gw, y2: groundY,
        stroke: '#1e293b', 'stroke-width': 2,
    }));

    // Hatching
    const hatchCount = Math.floor(gw * 2 / 6);
    const hatchStart = -gw + 2;
    for (let i = 0; i < hatchCount; i++) {
        const x = hatchStart + i * (gw * 2 / hatchCount);
        g.appendChild(svg('line', {
            x1: x, y1: groundY,
            x2: x - 5, y2: groundY + 7,
            stroke: '#1e293b', 'stroke-width': 1.2,
        }));
    }

    // Pin circle at top
    g.appendChild(svg('circle', {
        cx: 0, cy: 0, r: 3,
        fill: 'white', stroke: '#1e293b', 'stroke-width': 1.5,
    }));

    // Label
    if (props.label) {
        g.appendChild(svg('text', {
            x: triW + 8, y: 5,
            'font-size': 16, 'font-family': 'Inter, sans-serif',
            'font-weight': '600', fill: '#1e293b',
        })).textContent = props.label;
    }
}

/* ─── Einspannung (Fixed Wall) ─── */
function renderEinspannung(g, props) {
    const wl = props.wallLength || 70;
    const ww = props.wallWidth || 12;

    // Wall face (thick vertical line at x=0)
    g.appendChild(svg('line', {
        x1: 0, y1: -wl / 2, x2: 0, y2: wl / 2,
        stroke: '#1e293b', 'stroke-width': 2.5,
    }));

    // Hatching (diagonal lines extending to the right of the wall face)
    const hatchSpacing = 8;
    const numHatch = Math.floor(wl / hatchSpacing);
    for (let i = 0; i <= numHatch; i++) {
        const y = -wl / 2 + i * hatchSpacing;
        g.appendChild(svg('line', {
            x1: 0, y1: y,
            x2: ww, y2: y + hatchSpacing,
            stroke: '#1e293b', 'stroke-width': 1.2,
        }));
    }
}

/* ─── Gelenk (Pin Joint) ─── */
function renderGelenk(g, props) {
    const r = props.radius || 6;

    g.appendChild(svg('circle', {
        cx: 0, cy: 0, r: r,
        fill: 'white', stroke: '#1e293b', 'stroke-width': 2,
    }));

    // Label
    if (props.label) {
        g.appendChild(svg('text', {
            x: r + 5, y: -r,
            'font-size': 14, 'font-family': 'Inter, sans-serif',
            'font-weight': '600', fill: '#1e293b',
        })).textContent = props.label;
    }
}

/* ─── Einzelkraft (Single Force Arrow) ─── */
function renderEinzelkraft(g, props) {
    const mag = props.magnitude || 70;
    const headLen = 10;
    const headW = 5;

    // Arrow shaft
    g.appendChild(svg('line', {
        x1: 0, y1: 0,
        x2: mag - headLen, y2: 0,
        stroke: '#1e293b', 'stroke-width': 2.2,
    }));

    // Arrowhead
    g.appendChild(svg('polygon', {
        points: `${mag},0 ${mag - headLen},${-headW} ${mag - headLen},${headW}`,
        fill: '#1e293b',
    }));

    // Label
    if (props.label) {
        g.appendChild(svg('text', {
            x: mag - 5, y: -12,
            'text-anchor': 'end',
            'font-size': 18, 'font-family': 'Inter, sans-serif',
            'font-style': 'italic', 'font-weight': '500',
            fill: '#1e293b',
        })).textContent = props.label;
    }
}

/* ─── Streckenlast (Distributed Load) ─── */
function renderStreckenlast(g, props) {
    const { length, startMag, endMag, label, arrowSpacing } = props;
    const spacing = arrowSpacing || 25;
    const numArrows = Math.max(2, Math.floor(length / spacing) + 1);
    const headLen = 6;
    const headW = 3;

    // Profile line (connects arrow tails)
    const profilePoints = [];
    for (let i = 0; i < numArrows; i++) {
        const t = i / (numArrows - 1);
        const x = t * length;
        const mag = startMag + t * (endMag - startMag);
        profilePoints.push(`${x},${-mag}`);
    }
    g.appendChild(svg('polyline', {
        points: profilePoints.join(' '),
        fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5,
    }));

    // Individual arrows
    for (let i = 0; i < numArrows; i++) {
        const t = i / (numArrows - 1);
        const x = t * length;
        const mag = startMag + t * (endMag - startMag);
        if (mag < 2) continue; // skip near-zero arrows

        // Arrow shaft
        g.appendChild(svg('line', {
            x1: x, y1: -mag,
            x2: x, y2: -headLen,
            stroke: '#1e293b', 'stroke-width': 1.5,
        }));

        // Arrowhead pointing down toward y=0
        g.appendChild(svg('polygon', {
            points: `${x},0 ${x - headW},${-headLen} ${x + headW},${-headLen}`,
            fill: '#1e293b',
        }));
    }

    // Label
    if (label) {
        const maxMag = Math.max(startMag, endMag);
        // Place label near the maximum magnitude
        const labelX = endMag >= startMag ? length : 0;
        g.appendChild(svg('text', {
            x: labelX, y: -maxMag - 8,
            'text-anchor': endMag >= startMag ? 'end' : 'start',
            'font-size': 16, 'font-family': 'Inter, sans-serif',
            'font-style': 'italic', 'font-weight': '500',
            fill: '#1e293b',
        })).textContent = label;
    }
}

/* ─── Moment (Torque) ─── */
function renderMoment(g, props) {
    const r = props.radius || 25;
    const dir = props.direction || 'cw';
    const headLen = 8;

    // Arc (about 270 degrees)
    // For CW: arc from top going clockwise
    // For CCW: arc from top going counter-clockwise
    const startAngle = -90;
    const sweep = dir === 'cw' ? 270 : -270;
    const endAngle = startAngle + sweep;

    const startRad = startAngle * Math.PI / 180;
    const endRad = endAngle * Math.PI / 180;

    const x1 = r * Math.cos(startRad);
    const y1 = r * Math.sin(startRad);
    const x2 = r * Math.cos(endRad);
    const y2 = r * Math.sin(endRad);

    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
    const sweepFlag = sweep > 0 ? 1 : 0;

    g.appendChild(svg('path', {
        d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`,
        fill: 'none', stroke: '#1e293b', 'stroke-width': 2,
    }));

    // Arrowhead at the end of the arc
    // Calculate tangent direction at the end point
    const tangentAngle = endRad + (dir === 'cw' ? Math.PI / 2 : -Math.PI / 2);
    const ax = x2 + headLen * Math.cos(tangentAngle + 0.4);
    const ay = y2 + headLen * Math.sin(tangentAngle + 0.4);
    const bx = x2 + headLen * Math.cos(tangentAngle - 0.4);
    const by = y2 + headLen * Math.sin(tangentAngle - 0.4);

    g.appendChild(svg('polygon', {
        points: `${x2},${y2} ${ax},${ay} ${bx},${by}`,
        fill: '#1e293b',
    }));

    // Label
    if (props.label) {
        g.appendChild(svg('text', {
            x: 0, y: -r - 10,
            'text-anchor': 'middle',
            'font-size': 18, 'font-family': 'Inter, sans-serif',
            'font-style': 'italic', 'font-weight': '500',
            fill: '#1e293b',
        })).textContent = props.label;
    }
}

/* ─── Dimension Line (Bemaßung) ─── */
function renderDimension(g, props) {
    const { length, label, offset } = props;
    const tickH = offset || 8;
    const headLen = 6;
    const headW = 3;

    // Left tick
    g.appendChild(svg('line', {
        x1: 0, y1: -tickH, x2: 0, y2: tickH,
        stroke: '#1e293b', 'stroke-width': 1.3,
    }));

    // Right tick
    g.appendChild(svg('line', {
        x1: length, y1: -tickH, x2: length, y2: tickH,
        stroke: '#1e293b', 'stroke-width': 1.3,
    }));

    // Main dimension line
    g.appendChild(svg('line', {
        x1: 0, y1: 0, x2: length, y2: 0,
        stroke: '#1e293b', 'stroke-width': 1.3,
    }));

    // Left arrowhead
    g.appendChild(svg('polygon', {
        points: `0,0 ${headLen},${-headW} ${headLen},${headW}`,
        fill: '#1e293b',
    }));

    // Right arrowhead
    g.appendChild(svg('polygon', {
        points: `${length},0 ${length - headLen},${-headW} ${length - headLen},${headW}`,
        fill: '#1e293b',
    }));

    // Label (centered above the line)
    if (label) {
        g.appendChild(svg('text', {
            x: length / 2, y: -8,
            'text-anchor': 'middle',
            'font-size': 16, 'font-family': 'Inter, sans-serif',
            'font-style': 'italic', 'font-weight': '500',
            fill: '#1e293b',
        })).textContent = label;
    }
}

/* ─── Text Label ─── */
function renderLabel(g, props) {
    const { text, fontSize } = props;

    g.appendChild(svg('text', {
        x: 0, y: 0,
        'font-size': fontSize || 18,
        'font-family': 'Inter, sans-serif',
        'font-weight': '600',
        fill: '#1e293b',
        'dominant-baseline': 'central',
    })).textContent = text || 'A';
}
