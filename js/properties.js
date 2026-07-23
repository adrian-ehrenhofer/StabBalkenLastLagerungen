/**
 * properties.js — Properties Panel Controller
 * 
 * Renders editable property fields for the selected element.
 * Uses a callback pattern to avoid circular imports.
 */

import { ELEMENT_TYPES } from './elements.js';

let containerEl = null;
let noSelectionEl = null;
let onChangeFn = null;
let onDeleteFn = null;

/**
 * Initialize the properties panel.
 * @param {HTMLElement} container - The #properties-content element
 * @param {Function} onChange - Callback: (elementId, propName, value) => void
 * @param {Function} onDelete - Callback: (elementId) => void
 */
export function initProperties(container, onChange, onDelete) {
    containerEl = container;
    noSelectionEl = container.querySelector('#no-selection-msg');
    onChangeFn = onChange;
    onDeleteFn = onDelete;
}

/**
 * Show properties for a given element.
 * @param {Object} elem - Element data
 */
export function showProperties(elem) {
    if (!containerEl) return;

    // Clear
    containerEl.innerHTML = '';

    if (!elem) {
        hideProperties();
        return;
    }

    const typeDef = ELEMENT_TYPES[elem.type];

    // Type badge
    const badge = document.createElement('div');
    badge.className = 'prop-type-badge';
    badge.textContent = typeDef ? typeDef.name : elem.type;
    containerEl.appendChild(badge);

    // Position group
    addGroup(containerEl, 'Position', () => {
        const frag = document.createDocumentFragment();
        frag.appendChild(makeRow('X', numberInput(elem.x, v => onChangeFn(elem.id, '_x', v)), 'px'));
        frag.appendChild(makeRow('Y', numberInput(elem.y, v => onChangeFn(elem.id, '_y', v)), 'px'));
        frag.appendChild(makeRow('Drehung', numberInput(elem.rotation || 0, v => onChangeFn(elem.id, '_rotation', v), { min: -360, max: 360, step: 5 }), '°'));
        return frag;
    });

    // Type-specific properties
    switch (elem.type) {
        case 'beam':
            addGroup(containerEl, 'Balken', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Länge', numberInput(elem.props.length, v => onChangeFn(elem.id, 'length', v), { min: 10, step: 25 }), 'px'));
                frag.appendChild(makeRow('Höhe', numberInput(elem.props.height || 8, v => onChangeFn(elem.id, 'height', v), { min: 2, max: 30, step: 1 }), 'px'));
                return frag;
            });
            break;

        case 'festlager':
        case 'loslager':
            addGroup(containerEl, 'Lager', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Größe', numberInput(elem.props.size, v => onChangeFn(elem.id, 'size', v), { min: 10, max: 60, step: 2 }), 'px'));
                frag.appendChild(makeRow('Beschr.', textInput(elem.props.label || '', v => onChangeFn(elem.id, 'label', v))));
                return frag;
            });
            break;

        case 'einspannung':
            addGroup(containerEl, 'Einspannung', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Länge', numberInput(elem.props.wallLength, v => onChangeFn(elem.id, 'wallLength', v), { min: 20, max: 200, step: 5 }), 'px'));
                frag.appendChild(makeRow('Breite', numberInput(elem.props.wallWidth, v => onChangeFn(elem.id, 'wallWidth', v), { min: 5, max: 30, step: 1 }), 'px'));
                return frag;
            });
            break;

        case 'gelenk':
            addGroup(containerEl, 'Gelenk', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Radius', numberInput(elem.props.radius, v => onChangeFn(elem.id, 'radius', v), { min: 3, max: 20, step: 1 }), 'px'));
                frag.appendChild(makeRow('Beschr.', textInput(elem.props.label || '', v => onChangeFn(elem.id, 'label', v)), null, MATH_LABEL_TOOLTIP));
                return frag;
            });
            break;

        case 'einzelkraft':
            addGroup(containerEl, 'Kraft', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Länge', numberInput(elem.props.magnitude, v => onChangeFn(elem.id, 'magnitude', v), { min: 20, max: 300, step: 5 }), 'px'));
                frag.appendChild(makeRow('Beschr.', textInput(elem.props.label || 'F', v => onChangeFn(elem.id, 'label', v)), null, MATH_LABEL_TOOLTIP));
                return frag;
            });
            break;

        case 'streckenlast':
            addGroup(containerEl, 'Streckenlast', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Länge', numberInput(elem.props.length, v => onChangeFn(elem.id, 'length', v), { min: 25, step: 25 }), 'px'));
                frag.appendChild(makeRow('Start', numberInput(elem.props.startMag, v => onChangeFn(elem.id, 'startMag', v), { min: 0, step: 5 }), 'px'));
                frag.appendChild(makeRow('Ende', numberInput(elem.props.endMag, v => onChangeFn(elem.id, 'endMag', v), { min: 0, step: 5 }), 'px'));
                frag.appendChild(makeRow('Abstand', numberInput(elem.props.arrowSpacing || 25, v => onChangeFn(elem.id, 'arrowSpacing', v), { min: 10, max: 100, step: 5 }), 'px'));
                frag.appendChild(makeRow('Beschr.', textInput(elem.props.label || 'q₀', v => onChangeFn(elem.id, 'label', v)), null, MATH_LABEL_TOOLTIP));
                return frag;
            });
            break;

        case 'moment':
            addGroup(containerEl, 'Moment', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Radius', numberInput(elem.props.radius, v => onChangeFn(elem.id, 'radius', v), { min: 10, max: 80, step: 5 }), 'px'));
                frag.appendChild(makeRow('Öffnungswinkel', numberInput(elem.props.arcAngle !== undefined ? elem.props.arcAngle : 270, v => onChangeFn(elem.id, 'arcAngle', v), { min: 10, max: 360, step: 5 }), '°'));
                frag.appendChild(makeRow('Vorlagen', selectInput(String(elem.props.arcAngle || 270), [
                    { value: '180', label: '180° (Halbkreis)' },
                    { value: '270', label: '270° (3/4 Kreis)' },
                    { value: '90', label: '90° (Viertelkreis)' },
                    { value: '360', label: '360° (Vollkreis)' },
                ], v => onChangeFn(elem.id, 'arcAngle', parseFloat(v)))));
                frag.appendChild(makeRow('Beschr.', textInput(elem.props.label || 'M', v => onChangeFn(elem.id, 'label', v)), null, MATH_LABEL_TOOLTIP));
                frag.appendChild(makeRow('Richtung', selectInput(elem.props.direction || 'cw', [
                    { value: 'cw', label: 'Im Uhrzeigersinn' },
                    { value: 'ccw', label: 'Gegen Uhrzeigersinn' },
                ], v => onChangeFn(elem.id, 'direction', v))));
                return frag;
            });
            break;

        case 'dimension':
            addGroup(containerEl, 'Bemaßung', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Länge', numberInput(elem.props.length, v => onChangeFn(elem.id, 'length', v), { min: 25, step: 25 }), 'px'));
                frag.appendChild(makeRow('Beschr.', textInput(elem.props.label || 'a', v => onChangeFn(elem.id, 'label', v)), null, MATH_LABEL_TOOLTIP));
                frag.appendChild(makeRow('Offset', numberInput(elem.props.offset || 8, v => onChangeFn(elem.id, 'offset', v), { min: 2, max: 30, step: 1 }), 'px'));
                return frag;
            });
            break;

        case 'angle':
            addGroup(containerEl, 'Winkel', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Typ', selectInput(elem.props.style || 'arc', [
                    { value: 'arc', label: 'Bogen (Kreisbogen)' },
                    { value: 'square', label: 'Rechtwinklig (90° Eck)' },
                ], v => onChangeFn(elem.id, 'style', v))));
                frag.appendChild(makeRow('Winkel', numberInput(elem.props.arcAngle !== undefined ? elem.props.arcAngle : 90, v => onChangeFn(elem.id, 'arcAngle', v), { min: 5, max: 360, step: 5 }), '°'));
                frag.appendChild(makeRow('Startwinkel', numberInput(elem.props.startAngle || 0, v => onChangeFn(elem.id, 'startAngle', v), { min: -360, max: 360, step: 5 }), '°'));
                frag.appendChild(makeRow('Radius', numberInput(elem.props.radius || 35, v => onChangeFn(elem.id, 'radius', v), { min: 10, max: 150, step: 5 }), 'px'));
                frag.appendChild(makeRow('Pfeile', selectInput(elem.props.arrows || 'both', [
                    { value: 'both', label: 'Beidseitig (Doppelpfeil)' },
                    { value: 'end', label: 'Am Ende' },
                    { value: 'start', label: 'Am Anfang' },
                    { value: 'dot', label: 'Punkt (Rechter Winkel)' },
                    { value: 'none', label: 'Keine' },
                ], v => onChangeFn(elem.id, 'arrows', v))));
                frag.appendChild(makeRow('Beschr.', textInput(elem.props.label || 'α', v => onChangeFn(elem.id, 'label', v)), null, MATH_LABEL_TOOLTIP));
                return frag;
            });
            break;

        case 'label':
            addGroup(containerEl, 'Text', () => {
                const frag = document.createDocumentFragment();
                frag.appendChild(makeRow('Text', textInput(elem.props.text || 'A', v => onChangeFn(elem.id, 'text', v)), null, MATH_LABEL_TOOLTIP));
                frag.appendChild(makeRow('Größe', numberInput(elem.props.fontSize || 18, v => onChangeFn(elem.id, 'fontSize', v), { min: 8, max: 72, step: 1 }), 'px'));
                return frag;
            });
            break;
    }

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'prop-btn-danger';
    delBtn.textContent = '✕ Element löschen';
    delBtn.addEventListener('click', () => {
        if (onDeleteFn) onDeleteFn(elem.id);
    });
    containerEl.appendChild(delBtn);
}

/**
 * Hide properties (show "no selection" message).
 */
export function hideProperties() {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const msg = document.createElement('div');
    msg.className = 'no-selection';
    msg.id = 'no-selection-msg';
    msg.innerHTML = `
        <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="8" y="8" width="32" height="32" rx="4"/>
            <path d="M16 28 L22 22 L28 26 L36 18"/>
            <circle cx="16" cy="18" r="2.5"/>
        </svg>
        <p class="hint-title">Kein Element ausgewählt</p>
        <p class="hint-text">Wählen Sie ein Werkzeug und klicken Sie auf die Zeichenfläche, oder wählen Sie ein bestehendes Element aus.</p>
    `;
    containerEl.appendChild(msg);
}

/* ═══════════ Helpers ═══════════ */

function addGroup(container, title, contentFn) {
    const group = document.createElement('div');
    group.className = 'prop-group';

    const titleEl = document.createElement('div');
    titleEl.className = 'prop-group-title';
    titleEl.textContent = title;
    group.appendChild(titleEl);

    group.appendChild(contentFn());
    container.appendChild(group);
}

const MATH_LABEL_TOOLTIP = 'Mathematische Symbole & Formatierung:\n• Griechisch: \\alpha (α), \\beta (β), \\gamma (γ), \\delta (δ), \\epsilon (ε), \\theta (θ), \\lambda (λ), \\mu (μ), \\pi (π), \\rho (ρ), \\sigma (σ), \\tau (τ), \\phi (φ), \\omega (ω)\n• Große Symbole: \\Delta (Δ), \\Omega (Ω), \\Phi (Φ)\n• Spezialsymbole: \\ell (ℓ), \\cdot (·), \\infty (∞)\n• Tiefgestellt: _0 oder _{abc} (z.B. q_0)\n• Hochgestellt: ^2 oder ^{xyz} (z.B. x^2)';

function makeRow(label, input, unit, infoTooltip) {
    const row = document.createElement('div');
    row.className = 'prop-row';

    const lbl = document.createElement('span');
    lbl.className = 'prop-label';
    lbl.textContent = label;
    if (infoTooltip) {
        const bubble = document.createElement('span');
        bubble.className = 'info-bubble';
        bubble.textContent = '?';
        bubble.title = infoTooltip;
        lbl.appendChild(bubble);
    }
    row.appendChild(lbl);

    row.appendChild(input);

    if (unit) {
        const u = document.createElement('span');
        u.className = 'prop-unit';
        u.textContent = unit;
        row.appendChild(u);
    }

    return row;
}

function numberInput(value, onChange, opts = {}) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'prop-input prop-input-sm';
    input.value = value;
    if (opts.min !== undefined) input.min = opts.min;
    if (opts.max !== undefined) input.max = opts.max;
    if (opts.step !== undefined) input.step = opts.step;

    input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        if (!isNaN(v)) onChange(v);
    });

    return input;
}

function textInput(value, onChange, tooltip) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'prop-input';
    input.value = value;
    input.title = tooltip || MATH_LABEL_TOOLTIP;
    input.placeholder = 'z.B. F_1, \\alpha, M';

    input.addEventListener('input', () => {
        onChange(input.value);
    });

    return input;
}

function selectInput(value, options, onChange) {
    const select = document.createElement('select');
    select.className = 'prop-select';

    for (const opt of options) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === value) option.selected = true;
        select.appendChild(option);
    }

    select.addEventListener('change', () => {
        onChange(select.value);
    });

    return select;
}
