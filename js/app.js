/**
 * Stabbalkenlastlagerungen: Modules to create beam systems on the canvas.
 */
(function () {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';

    const DIR_VECTORS = {
        N: { x: 0, y: -1 },
        NE: { x: 0.707, y: -0.707 },
        E: { x: 1, y: 0 },
        SE: { x: 0.707, y: 0.707 },
        S: { x: 0, y: 1 },
        SW: { x: -0.707, y: 0.707 },
        W: { x: -1, y: 0 },
        NW: { x: -0.707, y: -0.707 }
    };

    function lineSegmentsIntersect(a1, a2, b1, b2) {
        var det = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y);
        if (det === 0) return false;
        var lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
        var gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;
        return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
    }

    function lineSegmentIntersectsRect(p1, p2, r) {
        if (p1.x >= r.x && p1.x <= r.x + r.w && p1.y >= r.y && p1.y <= r.y + r.h) return true;
        if (p2.x >= r.x && p2.x <= r.x + r.w && p2.y >= r.y && p2.y <= r.y + r.h) return true;

        var left = { p1: { x: r.x, y: r.y }, p2: { x: r.x, y: r.y + r.h } };
        var right = { p1: { x: r.x + r.w, y: r.y }, p2: { x: r.x + r.w, y: r.y + r.h } };
        var top = { p1: { x: r.x, y: r.y }, p2: { x: r.x + r.w, y: r.y } };
        var bottom = { p1: { x: r.x, y: r.y + r.h }, p2: { x: r.x + r.w, y: r.y + r.h } };

        if (lineSegmentsIntersect(p1, p2, left.p1, left.p2)) return true;
        if (lineSegmentsIntersect(p1, p2, right.p1, right.p2)) return true;
        if (lineSegmentsIntersect(p1, p2, top.p1, top.p2)) return true;
        if (lineSegmentsIntersect(p1, p2, bottom.p1, bottom.p2)) return true;

        return false;
    }

    function getLabelCoords(p, rot, refX, refY, baseDist, dirKey, isHorizontal) {
        const dirVec = DIR_VECTORS[dirKey] || DIR_VECTORS.N;
        const rad = (rot || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        let lx = 0, ly = 0;
        if (isHorizontal && rot) {
            const gdx = dirVec.x * baseDist;
            const gdy = dirVec.y * baseDist;
            lx = refX + gdx * cos + gdy * sin;
            ly = refY - gdx * sin + gdy * cos;
        } else {
            lx = refX + dirVec.x * baseDist;
            ly = refY + dirVec.y * baseDist;
        }
        return { lx, ly };
    }

    function getBearingLabelCoords(p, rot, triW, triH, dirKey, isHorizontal) {
        const dirVec = DIR_VECTORS[dirKey] || DIR_VECTORS.E;
        const rad = (rot || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const dx = triW + 8;
        const dy = dirVec.y > 0 ? (triH + 14) : 12;

        let lx = 0, ly = 0;
        if (isHorizontal && rot) {
            const gdx = dirVec.x * dx;
            const gdy = dirVec.y * dy;
            lx = gdx * cos + gdy * sin;
            ly = -gdx * sin + gdy * cos;
        } else {
            lx = dirVec.x * dx;
            ly = dirVec.y * dy;
        }
        return { lx, ly };
    }

    function parseMathText(text) {
        const replacements = {
            '\\\\ell': 'ℓ',
            '\\\\alpha': 'α',
            '\\\\beta': 'β',
            '\\\\gamma': 'γ',
            '\\\\delta': 'δ',
            '\\\\epsilon': 'ε',
            '\\\\theta': 'θ',
            '\\\\lambda': 'λ',
            '\\\\mu': 'μ',
            '\\\\pi': 'π',
            '\\\\rho': 'ρ',
            '\\\\sigma': 'σ',
            '\\\\tau': 'τ',
            '\\\\phi': 'φ',
            '\\\\omega': 'ω',
            '\\\\Delta': 'Δ',
            '\\\\Omega': 'Ω',
            '\\\\Phi': 'Φ',
            '\\\\cdot': '·',
            '\\\\infty': '∞'
        };
        let s = text;
        for (const [pat, rep] of Object.entries(replacements)) {
            s = s.replace(new RegExp(pat, 'g'), rep);
        }

        const tokens = [];
        let i = 0;
        while (i < s.length) {
            const char = s[i];
            if (char === '_') {
                i++;
                if (s[i] === '{') {
                    let end = s.indexOf('}', i);
                    if (end === -1) end = s.length;
                    tokens.push({ type: 'sub', val: s.slice(i + 1, end) });
                    i = end + 1;
                } else {
                    tokens.push({ type: 'sub', val: s[i] || '' });
                    i++;
                }
            } else if (char === '^') {
                i++;
                if (s[i] === '{') {
                    let end = s.indexOf('}', i);
                    if (end === -1) end = s.length;
                    tokens.push({ type: 'super', val: s.slice(i + 1, end) });
                    i = end + 1;
                } else {
                    tokens.push({ type: 'super', val: s[i] || '' });
                    i++;
                }
            } else {
                let start = i;
                while (i < s.length && s[i] !== '_' && s[i] !== '^') {
                    i++;
                }
                tokens.push({ type: 'text', val: s.slice(start, i) });
            }
        }
        return tokens;
    }

    function renderMathText(textEl, text) {
        while (textEl.firstChild) textEl.removeChild(textEl.firstChild);
        const tokens = parseMathText(text);
        for (const t of tokens) {
            if (t.type === 'text') {
                const span = svgEl('tspan');
                span.textContent = t.val;
                textEl.appendChild(span);
            } else if (t.type === 'sub') {
                const span = svgEl('tspan', {
                    'baseline-shift': 'sub',
                    'font-size': '70%'
                });
                span.textContent = t.val;
                textEl.appendChild(span);
            } else if (t.type === 'super') {
                const span = svgEl('tspan', {
                    'baseline-shift': 'super',
                    'font-size': '70%'
                });
                span.textContent = t.val;
                textEl.appendChild(span);
            }
        }
    }

    /* ════════════════════════════════════════════════════
       STATE MODULE
       ════════════════════════════════════════════════════ */

    const state = {
        elements: new Map(),
        selectedId: null,
        activeTool: null,
        gridSize: 25,
        showGrid: true,
        snapEnabled: true,
        zoom: 1,
        panX: 0,
        panY: 0,
        canvasWidth: 1600,
        canvasHeight: 1000,
        nextId: 1,
        undoStack: [],
        redoStack: [],
        maxUndoSteps: 50,
    };

    function generateId() {
        return 'elem_' + (state.nextId++);
    }

    function snapToGrid(value, gridSize) {
        if (!state.snapEnabled) return value;
        const gs = gridSize || state.gridSize;
        return Math.round(value / gs) * gs;
    }

    function saveSnapshot() {
        const snapshot = [];
        for (const [, elem] of state.elements) {
            snapshot.push({
                id: elem.id, type: elem.type, x: elem.x, y: elem.y,
                rotation: elem.rotation,
                props: JSON.parse(JSON.stringify(elem.props)),
            });
        }
        state.undoStack.push(snapshot);
        if (state.undoStack.length > state.maxUndoSteps) state.undoStack.shift();
        state.redoStack = [];
    }

    function getCurrentSnapshot() {
        const snapshot = [];
        for (const [, elem] of state.elements) {
            snapshot.push({
                id: elem.id, type: elem.type, x: elem.x, y: elem.y,
                rotation: elem.rotation,
                props: JSON.parse(JSON.stringify(elem.props)),
            });
        }
        return snapshot;
    }

    /* ════════════════════════════════════════════════════
       ELEMENTS MODULE
       ════════════════════════════════════════════════════ */

    function svgEl(tag, attrs) {
        const el = document.createElementNS(SVG_NS, tag);
        if (attrs) {
            for (const [key, val] of Object.entries(attrs)) {
                el.setAttribute(key, String(val));
            }
        }
        return el;
    }

    const ELEMENT_TYPES = {
        beam: { name: 'Balken', defaults: { length: 200, height: 8 } },
        curved_beam: { name: 'Balken (gebogen)', defaults: { radius: 100, startAngle: 0, endAngle: 90, height: 8 } },
        bar: { name: 'Stab', defaults: { length: 200, height: 4, radius: 4.5 } },
        festlager: { name: 'Festlager', defaults: { size: 22, label: '', labelHorizontal: false, radius: 3, labelPos: 'E' } },
        loslager: { name: 'Loslager', defaults: { size: 22, label: '', variant: 'lines', labelHorizontal: false, radius: 3, labelPos: 'E' } },
        einspannung: { name: 'Einspannung', defaults: { wallLength: 70, wallWidth: 12 } },
        gelenk: { name: 'Gelenk', defaults: { radius: 6, label: '', labelHorizontal: false, labelPos: 'NE' } },
        einzelkraft: { name: 'Einzelkraft', defaults: { magnitude: 70, label: 'F', labelHorizontal: false, labelPos: 'NW' } },
        streckenlast: { name: 'Streckenlast', defaults: { length: 200, startMag: 50, endMag: 50, label: 'q₀', arrowSpacing: 25, distType: 'linear', formula: '50 * sin(PI * x / L)', labelHorizontal: false, labelPos: 'N' } },
        moment: { name: 'Moment', defaults: { radius: 25, label: 'M', direction: 'cw', labelHorizontal: false, labelPos: 'N' } },
        dimension: { name: 'Bemaßung', defaults: { length: 200, label: 'a', offset: 8, labelHorizontal: false, labelPos: 'N' } },
        label: { name: 'Text', defaults: { text: 'A', fontSize: 18, labelHorizontal: false } },
        section_cut: { name: 'Schnittlinie', defaults: { length: 80, label: 'A', dir: 'right' } },
        cross_section: { name: 'Querschnitt', defaults: { label: 'A-A', shapes: [{ id: 1, type: 'rectangle', mode: 'solid', x: 0, y: 0, w: 40, h: 60 }] } },
        line: { name: 'Linie', defaults: { length: 150, strokeWidth: 1.5, style: 'solid' } },
        arrow: { name: 'Pfeil', defaults: { length: 100, strokeWidth: 1.8, style: 'solid', label: '', labelHorizontal: false, labelPos: 'N' } },
        coord_system_xy: { name: 'Koordinatensystem (x-y)', defaults: { sizeX: 80, sizeY: 80, labelX: 'x', labelY: 'y' } },
        coord_system_x: { name: 'Koordinatenachse (x)', defaults: { sizeX: 100, labelX: 'x' } },
    };

    function createElementData(type, x, y, rotation, propsOverride, id) {
        const typeDef = ELEMENT_TYPES[type];
        if (!typeDef) throw new Error('Unknown element type: ' + type);
        return {
            id: id || null,
            type, x, y,
            rotation: rotation || 0,
            props: Object.assign({}, typeDef.defaults, propsOverride || {}),
            svgGroup: null,
        };
    }

    function renderElement(elem) {
        const g = svgEl('g', {
            class: 'element-group',
            'data-id': elem.id,
            'data-type': elem.type,
            transform: buildTransform(elem),
        });
        const fn = RENDERERS[elem.type];
        if (fn) fn(g, elem.props, elem.rotation || 0);
        elem.svgGroup = g;
        return g;
    }

    function updateElementSVG(elem) {
        if (!elem.svgGroup) return;
        elem.svgGroup.setAttribute('transform', buildTransform(elem));
        while (elem.svgGroup.firstChild) elem.svgGroup.removeChild(elem.svgGroup.firstChild);
        const fn = RENDERERS[elem.type];
        if (fn) fn(elem.svgGroup, elem.props, elem.rotation || 0);
    }

    function buildTransform(elem) {
        let t = 'translate(' + elem.x + ', ' + elem.y + ')';
        if (elem.rotation) t += ' rotate(' + elem.rotation + ')';
        return t;
    }

    function getBeamEndpoints(elem) {
        if (elem.type === 'beam') {
            const rad = (elem.rotation || 0) * Math.PI / 180;
            const L = elem.props.length || 200;
            return {
                start: { x: elem.x, y: elem.y },
                end: { x: elem.x + L * Math.cos(rad), y: elem.y + L * Math.sin(rad) }
            };
        } else if (elem.type === 'curved_beam') {
            const r = elem.props.radius || 100;
            const sa = elem.props.startAngle || 0;
            const ea = elem.props.endAngle || 90;
            const rad = (elem.rotation || 0) * Math.PI / 180;

            const sr = sa * Math.PI / 180;
            const er = ea * Math.PI / 180;

            const lx1 = r * Math.cos(sr);
            const ly1 = r * Math.sin(sr);
            const lx2 = r * Math.cos(er);
            const ly2 = r * Math.sin(er);

            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const x1 = elem.x + lx1 * cos - ly1 * sin;
            const y1 = elem.y + lx1 * sin + ly1 * cos;
            const x2 = elem.x + lx2 * cos - ly2 * sin;
            const y2 = elem.y + lx2 * sin + ly2 * cos;

            return {
                start: { x: x1, y: y1 },
                end: { x: x2, y: y2 }
            };
        }
        return null;
    }

    function isEndpointShared(elemId, pt) {
        for (const [, other] of state.elements) {
            if (other.id === elemId) continue;
            if (other.type !== 'beam' && other.type !== 'curved_beam') continue;
            const otherPts = getBeamEndpoints(other);
            if (!otherPts) continue;

            const d1 = Math.hypot(pt.x - otherPts.start.x, pt.y - otherPts.start.y);
            const d2 = Math.hypot(pt.x - otherPts.end.x, pt.y - otherPts.end.y);

            if (d1 < 2.0 || d2 < 2.0) {
                return true;
            }
        }
        return false;
    }

    function updateAllBeams() {
        if (!state || !state.elements) return;
        for (const [, elem] of state.elements) {
            if (elem.type === 'beam' || elem.type === 'curved_beam') {
                updateElementSVG(elem);
            }
        }
    }

    function appendElementToDOM(elem, g) {
        let target = appElemLayer;
        if (elem.type === 'beam' || elem.type === 'curved_beam') {
            target = appElemLayer.querySelector('#beams-layer') || appElemLayer;
        } else {
            target = appElemLayer.querySelector('#other-elements-layer') || appElemLayer;
        }
        target.appendChild(g);
    }
    /* ═══════════════════════════════════════════════════════
       SAFE MATH EXPRESSION PARSER
       ═══════════════════════════════════════════════════════ */
    function safeMathEval(expr, variables) {
        var sanitized = expr.replace(/Math\./g, '');
        var pos = 0;
        var tokens = [];

        // ── Tokenizer ──
        (function tokenize() {
            var i = 0;
            while (i < sanitized.length) {
                if (/\s/.test(sanitized[i])) { i++; continue; }
                if (/[0-9]/.test(sanitized[i]) || (sanitized[i] === '.' && i + 1 < sanitized.length && /[0-9]/.test(sanitized[i + 1]))) {
                    var num = '';
                    while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) { num += sanitized[i++]; }
                    tokens.push({ t: 'num', v: parseFloat(num) });
                    continue;
                }
                if (/[a-zA-Z_]/.test(sanitized[i])) {
                    var id = '';
                    while (i < sanitized.length && /[a-zA-Z_0-9]/.test(sanitized[i])) { id += sanitized[i++]; }
                    tokens.push({ t: 'id', v: id });
                    continue;
                }
                if (sanitized[i] === '*' && sanitized[i + 1] === '*') {
                    tokens.push({ t: 'op', v: '**' }); i += 2; continue;
                }
                if ('+-*/%(),'.indexOf(sanitized[i]) !== -1) {
                    tokens.push({ t: 'op', v: sanitized[i] }); i++; continue;
                }
                // Reject any character not in the allowed set
                throw new Error('Unerlaubtes Zeichen in Formel: ' + sanitized[i]);
            }
            tokens.push({ t: 'end', v: '' });
        })();

        function peek() { return tokens[pos]; }
        function next() { return tokens[pos++]; }
        function expect(val) {
            var tk = tokens[pos];
            if (tk.v !== val) throw new Error('Erwartet: ' + val + ', erhalten: ' + (tk.v || 'Ende'));
            pos++;
            return tk;
        }

        var FUNCS = {
            sin: Math.sin, cos: Math.cos, tan: Math.tan,
            pow: Math.pow, sqrt: Math.sqrt, abs: Math.abs,
            exp: Math.exp, log: Math.log
        };
        var CONSTS = { PI: Math.PI };

        // expression := term (('+' | '-') term)*
        function parseExpr() {
            var left = parseTerm();
            while (peek().v === '+' || peek().v === '-') {
                var op = next().v;
                var right = parseTerm();
                left = op === '+' ? left + right : left - right;
            }
            return left;
        }

        // term := unary (('*' | '/' | '%') unary)*
        function parseTerm() {
            var left = parseUnary();
            while (peek().v === '*' || peek().v === '/' || peek().v === '%') {
                var op = next().v;
                var right = parseUnary();
                if (op === '*') left *= right;
                else if (op === '/') left = right !== 0 ? left / right : 0;
                else left = right !== 0 ? left % right : 0;
            }
            return left;
        }

        // unary := ('-' | '+') unary | power
        function parseUnary() {
            if (peek().v === '-') { next(); return -parseUnary(); }
            if (peek().v === '+') { next(); return parseUnary(); }
            return parsePower();
        }

        // power := call ('**' call)?   (right-associative)
        function parsePower() {
            var base = parseCall();
            if (peek().v === '**') { next(); return Math.pow(base, parseUnary()); }
            return base;
        }

        // call := IDENT '(' expr (',' expr)* ')' | primary
        function parseCall() {
            if (peek().t === 'id' && FUNCS[peek().v] && pos + 1 < tokens.length && tokens[pos + 1].v === '(') {
                var fn = FUNCS[next().v];
                expect('(');
                var args = [parseExpr()];
                while (peek().v === ',') { next(); args.push(parseExpr()); }
                expect(')');
                return fn.apply(null, args);
            }
            return parsePrimary();
        }

        // primary := NUMBER | IDENT | '(' expr ')'
        function parsePrimary() {
            var tk = peek();
            if (tk.t === 'num') { next(); return tk.v; }
            if (tk.t === 'id') {
                next();
                if (variables.hasOwnProperty(tk.v)) return variables[tk.v];
                if (CONSTS.hasOwnProperty(tk.v)) return CONSTS[tk.v];
                throw new Error('Unbekannte Variable: ' + tk.v);
            }
            if (tk.v === '(') {
                expect('(');
                var val = parseExpr();
                expect(')');
                return val;
            }
            throw new Error('Unerwartetes Token: ' + (tk.v || tk.t));
        }

        var result = parseExpr();
        if (peek().t !== 'end') throw new Error('Unerwartete Eingabe nach Ausdruck');
        return result;
    }

    function evalStreckenlastMag(x, L, p) {
        const type = p.distType || 'linear';
        if (type === 'sine') {
            const peak = p.startMag !== undefined ? p.startMag : 50;
            return peak * Math.sin(Math.PI * x / L);
        } else if (type === 'parabola') {
            const peak = p.startMag !== undefined ? p.startMag : 50;
            const val = 2 * x / L - 1;
            return peak * (1 - val * val);
        } else if (type === 'custom') {
            const expr = p.formula || '50 * sin(PI * x / L)';
            try {
                const val = safeMathEval(expr, { x: x, L: L });
                return isNaN(val) ? 0 : val;
            } catch (e) {
                return 0;
            }
        } else {
            const start = p.startMag !== undefined ? p.startMag : 50;
            const end = p.endMag !== undefined ? p.endMag : 50;
            return start + (x / L) * (end - start);
        }
    }

    /* ─── Renderers ─── */

    const RENDERERS = {
        beam(g, p) {
            const h = p.height || 8;
            let x = 0;
            let len = p.length;

            const id = g.getAttribute('data-id');
            if (id && id !== '__ghost__' && typeof state !== 'undefined' && state.elements) {
                const elem = state.elements.get(id);
                if (elem) {
                    const pts = getBeamEndpoints(elem);
                    if (pts) {
                        if (isEndpointShared(id, pts.start)) {
                            x -= h / 2;
                            len += h / 2;
                        }
                        if (isEndpointShared(id, pts.end)) {
                            len += h / 2;
                        }
                    }
                }
            }

            g.appendChild(svgEl('rect', { x: x, y: -h / 2, width: len, height: h, fill: '#e2e8f0', stroke: 'none', rx: 0.5 }));
        },

        curved_beam(g, p) {
            const r = p.radius || 100, h = p.height || 8;
            let sa = p.startAngle || 0;
            let ea = p.endAngle || 90;

            const id = g.getAttribute('data-id');
            if (id && id !== '__ghost__' && typeof state !== 'undefined' && state.elements) {
                const elem = state.elements.get(id);
                if (elem) {
                    const pts = getBeamEndpoints(elem);
                    if (pts) {
                        const ddeg = (h / 2) / r * 180 / Math.PI;
                        const clockwise = ea >= sa;
                        if (isEndpointShared(id, pts.start)) {
                            if (clockwise) sa -= ddeg;
                            else sa += ddeg;
                        }
                        if (isEndpointShared(id, pts.end)) {
                            if (clockwise) ea += ddeg;
                            else ea -= ddeg;
                        }
                    }
                }
            }

            const sr = sa * Math.PI / 180, er = ea * Math.PI / 180;
            const x1 = r * Math.cos(sr), y1 = r * Math.sin(sr);
            const x2 = r * Math.cos(er), y2 = r * Math.sin(er);
            const sweepFlag = ea >= sa ? 1 : 0;
            const largeArcFlag = Math.abs(ea - sa) > 180 ? 1 : 0;
            const d = 'M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArcFlag + ' ' + sweepFlag + ' ' + x2 + ' ' + y2;
            g.appendChild(svgEl('path', { d: d, fill: 'none', stroke: '#e2e8f0', 'stroke-width': h, 'stroke-linecap': 'butt' }));
        },

        section_cut(g, p) {
            const length = p.length || 80, label = p.label || 'A', dir = p.dir || 'right';
            const hl = 6;
            g.appendChild(svgEl('line', { x1: 0, y1: -length / 2 + 8, x2: 0, y2: length / 2 - 8, stroke: '#1e293b', 'stroke-width': 1, 'stroke-dasharray': '5,2,1,2' }));
            g.appendChild(svgEl('line', { x1: 0, y1: -length / 2, x2: 0, y2: -length / 2 + 8, stroke: '#1e293b', 'stroke-width': 3 }));
            g.appendChild(svgEl('line', { x1: 0, y1: length / 2, x2: 0, y2: length / 2 - 8, stroke: '#1e293b', 'stroke-width': 3 }));
            const arrowTailX = dir === 'right' ? -15 : 15;
            const arrowTipX = 0;
            const arrowDir = dir === 'right' ? 1 : -1;
            g.appendChild(svgEl('line', { x1: arrowTailX, y1: -length / 2, x2: arrowTipX, y2: -length / 2, stroke: '#1e293b', 'stroke-width': 1.8 }));
            g.appendChild(svgEl('polygon', { points: `${arrowTipX},${-length / 2} ${arrowTipX - arrowDir * hl},${-length / 2 - 3.5} ${arrowTipX - arrowDir * hl},${-length / 2 + 3.5}`, fill: '#1e293b' }));
            const t1 = svgEl('text', { x: arrowTailX - arrowDir * 4, y: -length / 2 + 4, 'font-size': 14, 'font-family': 'Inter, sans-serif', 'font-weight': '700', fill: '#1e293b', 'text-anchor': dir === 'right' ? 'end' : 'start' });
            t1.textContent = label; g.appendChild(t1);
            g.appendChild(svgEl('line', { x1: arrowTailX, y1: length / 2, x2: arrowTipX, y2: length / 2, stroke: '#1e293b', 'stroke-width': 1.8 }));
            g.appendChild(svgEl('polygon', { points: `${arrowTipX},${length / 2} ${arrowTipX - arrowDir * hl},${length / 2 - 3.5} ${arrowTipX - arrowDir * hl},${length / 2 + 3.5}`, fill: '#1e293b' }));
            const t2 = svgEl('text', { x: arrowTailX - arrowDir * 4, y: length / 2 + 4, 'font-size': 14, 'font-family': 'Inter, sans-serif', 'font-weight': '700', fill: '#1e293b', 'text-anchor': dir === 'right' ? 'end' : 'start' });
            t2.textContent = label; g.appendChild(t2);
        },

        cross_section(g, p) {
            const label = p.label || 'A-A';
            const shapes = p.shapes || [];
            g.appendChild(svgEl('line', { x1: -50, y1: 0, x2: 50, y2: 0, stroke: '#94a3b8', 'stroke-width': 0.8, 'stroke-dasharray': '3,3' }));
            g.appendChild(svgEl('line', { x1: 0, y1: -50, x2: 0, y2: 50, stroke: '#94a3b8', 'stroke-width': 0.8, 'stroke-dasharray': '3,3' }));
            const solids = shapes.filter(s => s.mode !== 'hole');
            const holes = shapes.filter(s => s.mode === 'hole');
            if (solids.length > 0) {
                const solidG = svgEl('g', { filter: 'url(#outline)' });
                g.appendChild(solidG);
                solids.forEach(s => {
                    const fill = '#cbd5e1';
                    if (s.type === 'rectangle') {
                        const w = s.w !== undefined ? s.w : 30;
                        const h = s.h !== undefined ? s.h : 40;
                        solidG.appendChild(svgEl('rect', { x: s.x - w / 2, y: s.y - h / 2, width: w, height: h, fill: fill, stroke: 'none' }));
                    } else if (s.type === 'circle') {
                        const r = s.r !== undefined ? s.r : 15;
                        solidG.appendChild(svgEl('circle', { cx: s.x, cy: s.y, r: r, fill: fill, stroke: 'none' }));
                    } else if (s.type === 'triangle') {
                        const b = s.w !== undefined ? s.w : 30;
                        const h = s.h !== undefined ? s.h : 30;
                        const pts = [`${s.x - b / 2},${s.y + h / 2}`, `${s.x + b / 2},${s.y + h / 2}`, `${s.x},${s.y - h / 2}`].join(' ');
                        solidG.appendChild(svgEl('polygon', { points: pts, fill: fill, stroke: 'none' }));
                    }
                });
            }
            holes.forEach(s => {
                const fill = '#ffffff';
                const stroke = '#1e293b';
                const strokeWidth = 1.5;
                const strokeDash = '3,3';
                if (s.type === 'rectangle') {
                    const w = s.w !== undefined ? s.w : 30;
                    const h = s.h !== undefined ? s.h : 40;
                    g.appendChild(svgEl('rect', { x: s.x - w / 2, y: s.y - h / 2, width: w, height: h, fill: fill, stroke: stroke, 'stroke-width': strokeWidth, 'stroke-dasharray': strokeDash }));
                } else if (s.type === 'circle') {
                    const r = s.r !== undefined ? s.r : 15;
                    g.appendChild(svgEl('circle', { cx: s.x, cy: s.y, r: r, fill: fill, stroke: stroke, 'stroke-width': strokeWidth, 'stroke-dasharray': strokeDash }));
                } else if (s.type === 'triangle') {
                    const b = s.w !== undefined ? s.w : 30;
                    const h = s.h !== undefined ? s.h : 30;
                    const pts = [`${s.x - b / 2},${s.y + h / 2}`, `${s.x + b / 2},${s.y + h / 2}`, `${s.x},${s.y - h / 2}`].join(' ');
                    g.appendChild(svgEl('polygon', { points: pts, fill: fill, stroke: stroke, 'stroke-width': strokeWidth, 'stroke-dasharray': strokeDash, 'stroke-linejoin': 'round' }));
                }
            });
            const t = svgEl('text', { x: 0, y: 70, 'font-size': 15, 'font-family': 'Inter, sans-serif', 'font-weight': '700', fill: '#1e293b', 'text-anchor': 'middle' });
            renderMathText(t, 'Schnitt ' + label); g.appendChild(t);
        },

        bar(g, p) {
            const h = p.height || 4;
            const r = p.radius !== undefined ? p.radius : 4.5;
            g.appendChild(svgEl('rect', { x: 0, y: -h / 2, width: p.length, height: h, fill: '#e2e8f0', stroke: '#1e293b', 'stroke-width': 1.2, rx: 0.5 }));
            g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r, fill: 'white', stroke: '#1e293b', 'stroke-width': 1.5 }));
            g.appendChild(svgEl('circle', { cx: p.length, cy: 0, r: r, fill: 'white', stroke: '#1e293b', 'stroke-width': 1.5 }));
        },

        festlager(g, p, rot) {
            const s = p.size || 22, triH = s, triW = s * 0.75;
            g.appendChild(svgEl('polygon', { points: '0,0 ' + (-triW) + ',' + triH + ' ' + triW + ',' + triH, fill: 'none', stroke: '#1e293b', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
            const gw = triW + 6;
            g.appendChild(svgEl('line', { x1: -gw, y1: triH, x2: gw, y2: triH, stroke: '#1e293b', 'stroke-width': 2 }));
            const n = Math.floor(gw * 2 / 6);
            for (let i = 0; i < n; i++) {
                const x = -gw + 2 + i * (gw * 2 / n);
                g.appendChild(svgEl('line', { x1: x, y1: triH, x2: x - 5, y2: triH + 7, stroke: '#1e293b', 'stroke-width': 1.2 }));
            }
            const r = p.radius !== undefined ? p.radius : 3;
            g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r, fill: 'white', stroke: '#1e293b', 'stroke-width': 1.5 }));
            if (p.label) {
                const dirKey = p.labelPos || 'E';
                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.E;
                const { lx, ly } = getBearingLabelCoords(p, rot, triW, triH, dirKey, p.labelHorizontal);
                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + lx + ',' + ly + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b' }); renderMathText(t, p.label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: lx, y: ly + align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b' }); renderMathText(t, p.label); g.appendChild(t);
                }
            }
        },

        loslager(g, p, rot) {
            const s = p.size || 22, triH = s, triW = s * 0.75;
            const variant = p.variant || 'lines';
            g.appendChild(svgEl('polygon', { points: '0,0 ' + (-triW) + ',' + triH + ' ' + triW + ',' + triH, fill: 'none', stroke: '#1e293b', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
            const gw = triW + 6;
            if (variant === 'rollers') {
                const rollerR = s * 0.16;
                const rollerY = triH + rollerR + 1;
                g.appendChild(svgEl('circle', { cx: -triW * 0.5, cy: rollerY, r: rollerR, fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5 }));
                g.appendChild(svgEl('circle', { cx: 0, cy: rollerY, r: rollerR, fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5 }));
                g.appendChild(svgEl('circle', { cx: triW * 0.5, cy: rollerY, r: rollerR, fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5 }));
                const groundY = rollerY + rollerR + 1;
                g.appendChild(svgEl('line', { x1: -gw, y1: groundY, x2: gw, y2: groundY, stroke: '#1e293b', 'stroke-width': 2 }));
                const n = Math.floor(gw * 2 / 6);
                for (let i = 0; i < n; i++) {
                    const x = -gw + 2 + i * (gw * 2 / n);
                    g.appendChild(svgEl('line', { x1: x, y1: groundY, x2: x - 5, y2: groundY + 7, stroke: '#1e293b', 'stroke-width': 1.2 }));
                }
            } else {
                const sliderY = triH;
                g.appendChild(svgEl('line', { x1: -gw, y1: sliderY, x2: gw, y2: sliderY, stroke: '#1e293b', 'stroke-width': 1.5 }));
                const gy = sliderY + 4;
                g.appendChild(svgEl('line', { x1: -gw, y1: gy, x2: gw, y2: gy, stroke: '#1e293b', 'stroke-width': 2 }));
                const n = Math.floor(gw * 2 / 6);
                for (let i = 0; i < n; i++) {
                    const x = -gw + 2 + i * (gw * 2 / n);
                    g.appendChild(svgEl('line', { x1: x, y1: gy, x2: x - 5, y2: gy + 7, stroke: '#1e293b', 'stroke-width': 1.2 }));
                }
            }
            const r = p.radius !== undefined ? p.radius : 3;
            g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r, fill: 'white', stroke: '#1e293b', 'stroke-width': 1.5 }));
            if (p.label) {
                const dirKey = p.labelPos || 'E';
                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.E;
                const { lx, ly } = getBearingLabelCoords(p, rot, triW, triH, dirKey, p.labelHorizontal);
                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + lx + ',' + ly + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b' }); renderMathText(t, p.label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: lx, y: ly + align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b' }); renderMathText(t, p.label); g.appendChild(t);
                }
            }
        },

        einspannung(g, p) {
            const wl = p.wallLength || 70, ww = p.wallWidth || 12;
            g.appendChild(svgEl('line', { x1: 0, y1: -wl / 2, x2: 0, y2: wl / 2, stroke: '#1e293b', 'stroke-width': 2.5 }));
            const sp = 8, n = Math.floor(wl / sp);
            for (let i = 0; i <= n; i++) {
                const y = -wl / 2 + i * sp;
                g.appendChild(svgEl('line', { x1: 0, y1: y, x2: ww, y2: y + sp, stroke: '#1e293b', 'stroke-width': 1.2 }));
            }
        },

        gelenk(g, p, rot) {
            const r = p.radius || 6;
            g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r, fill: 'white', stroke: '#1e293b', 'stroke-width': 2 }));
            if (p.label) {
                const dirKey = p.labelPos || 'NE';
                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.NE;
                const { lx, ly } = getLabelCoords(p, rot, 0, 0, r + 6, dirKey, p.labelHorizontal);
                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + lx + ',' + ly + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: align.dy, 'text-anchor': align.anchor, 'font-size': 14, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b' }); renderMathText(t, p.label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: lx, y: ly + align.dy, 'text-anchor': align.anchor, 'font-size': 14, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b' }); renderMathText(t, p.label); g.appendChild(t);
                }
            }
        },

        einzelkraft(g, p, rot) {
            const mag = p.magnitude || 70, hl = 10, hw = 5;
            g.appendChild(svgEl('line', { x1: 0, y1: 0, x2: mag - hl, y2: 0, stroke: '#1e293b', 'stroke-width': 2.2 }));
            g.appendChild(svgEl('polygon', { points: mag + ',0 ' + (mag - hl) + ',' + (-hw) + ' ' + (mag - hl) + ',' + hw, fill: '#1e293b' }));
            if (p.label) {
                const dirKey = p.labelPos || 'NW';
                const dirVec = DIR_VECTORS[dirKey] || DIR_VECTORS.NW;

                const textLen = String(p.label).replace(/\\/g, '').length;
                const w = textLen * 9 + 4;
                const h = 16;

                const rad = (rot || 0) * Math.PI / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const arrowStart = { x: 0, y: 0 };
                const arrowEnd = { x: mag * cos, y: mag * sin };

                let d = 12;
                const maxIterations = 15;
                let finalLx = 0, finalLy = 0;
                let finalAnchor = 'end', finalDy = -4;

                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.NW;
                finalAnchor = align.anchor;
                finalDy = align.dy;

                for (let iter = 0; iter < maxIterations; iter++) {
                    let lx = 0, ly = 0;

                    if (p.labelHorizontal && rot) {
                        const gdx = dirVec.x * d;
                        const gdy = dirVec.y * d;
                        lx = mag + gdx * cos + gdy * sin;
                        ly = -gdx * sin + gdy * cos;
                    } else {
                        lx = mag + dirVec.x * d;
                        ly = dirVec.y * d;
                    }

                    let segStart, segEnd, rectX, rectY;
                    if (p.labelHorizontal && rot) {
                        segStart = { x: 0, y: 0 };
                        segEnd = { x: mag * cos, y: mag * sin };
                        rectX = lx * cos - ly * sin;
                        rectY = lx * sin + ly * cos;
                    } else {
                        segStart = { x: 0, y: 0 };
                        segEnd = { x: mag, y: 0 };
                        rectX = lx;
                        rectY = ly;
                    }

                    if (dirKey === 'N' || dirKey === 'S') rectX -= w / 2;
                    else if (dirKey === 'W' || dirKey === 'NW' || dirKey === 'SW') rectX -= w;

                    if (dirKey === 'E' || dirKey === 'W') rectY -= h / 2;
                    else if (dirKey === 'N' || dirKey === 'NE' || dirKey === 'NW') rectY -= h;

                    const labelRect = { x: rectX - 3, y: rectY - 3, w: w + 6, h: h + 6 };

                    if (lineSegmentIntersectsRect(segStart, segEnd, labelRect)) {
                        d += 4;
                    } else {
                        finalLx = lx;
                        finalLy = ly;
                        break;
                    }

                    if (iter === maxIterations - 1) {
                        finalLx = lx;
                        finalLy = ly;
                    }
                }

                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + finalLx + ',' + finalLy + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: finalDy, 'text-anchor': finalAnchor, 'font-size': 18, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' });
                    renderMathText(t, p.label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: finalLx, y: finalLy + finalDy, 'text-anchor': finalAnchor, 'font-size': 18, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' });
                    renderMathText(t, p.label); g.appendChild(t);
                }
            }
        },

        streckenlast(g, p, rot) {
            const { length, label, arrowSpacing } = p;
            const L = length;
            const hl = 6, hw = 3;
            const samples = 50;
            const pts = [];
            for (let i = 0; i <= samples; i++) {
                const x = (i / samples) * L;
                const mag = evalStreckenlastMag(x, L, p);
                pts.push(x + ',' + (-mag));
            }
            g.appendChild(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: '#1e293b', 'stroke-width': 1.5 }));

            const sp = arrowSpacing || 25;
            const numArrows = Math.max(2, Math.floor(L / sp) + 1);
            for (let i = 0; i < numArrows; i++) {
                const t = i / (numArrows - 1);
                const x = t * L;
                const mag = evalStreckenlastMag(x, L, p);
                if (Math.abs(mag) < 2) continue;

                const dir = mag >= 0 ? 1 : -1;
                g.appendChild(svgEl('line', { x1: x, y1: -mag, x2: x, y2: -dir * hl, stroke: '#1e293b', 'stroke-width': 1.5 }));
                g.appendChild(svgEl('polygon', { points: x + ',0 ' + (x - hw) + ',' + (-dir * hl) + ' ' + (x + hw) + ',' + (-dir * hl), fill: '#1e293b' }));
            }

            if (label) {
                let maxMag = -Infinity;
                let maxX = L / 2;
                for (let i = 0; i <= samples; i++) {
                    const x = (i / samples) * L;
                    const mag = Math.abs(evalStreckenlastMag(x, L, p));
                    if (mag > maxMag) { maxMag = mag; maxX = x; }
                }
                if (maxMag === -Infinity || maxMag === 0) maxMag = 50;

                const dirKey = p.labelPos || 'N';
                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.N;
                const { lx, ly } = getLabelCoords(p, rot, maxX, -maxMag, 12, dirKey, p.labelHorizontal);

                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + lx + ',' + ly + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' });
                    renderMathText(t, label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: lx, y: ly + align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' });
                    renderMathText(t, label); g.appendChild(t);
                }
            }
        },

        moment(g, p, rot) {
            const r = p.radius || 25, dir = p.direction || 'cw', hl = 8;
            const sa = -90, sw = dir === 'cw' ? 270 : -270, ea = sa + sw;
            const sr = sa * Math.PI / 180, er = ea * Math.PI / 180;
            const x1 = r * Math.cos(sr), y1 = r * Math.sin(sr);
            const x2 = r * Math.cos(er), y2 = r * Math.sin(er);
            const la = Math.abs(sw) > 180 ? 1 : 0, sf = sw > 0 ? 1 : 0;
            g.appendChild(svgEl('path', { d: 'M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + la + ' ' + sf + ' ' + x2 + ' ' + y2, fill: 'none', stroke: '#1e293b', 'stroke-width': 2 }));
            const ta = er + (dir === 'cw' ? -Math.PI / 2 : Math.PI / 2);
            const ax = x2 + hl * Math.cos(ta + 0.4), ay = y2 + hl * Math.sin(ta + 0.4);
            const bx = x2 + hl * Math.cos(ta - 0.4), by = y2 + hl * Math.sin(ta - 0.4);
            g.appendChild(svgEl('polygon', { points: x2 + ',' + y2 + ' ' + ax + ',' + ay + ' ' + bx + ',' + by, fill: '#1e293b' }));
            if (p.label) {
                const dirKey = p.labelPos || 'N';
                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.N;
                const { lx, ly } = getLabelCoords(p, rot, 0, 0, r + 10, dirKey, p.labelHorizontal);
                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + lx + ',' + ly + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: align.dy, 'text-anchor': align.anchor, 'font-size': 18, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' }); renderMathText(t, p.label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: lx, y: ly + align.dy, 'text-anchor': align.anchor, 'font-size': 18, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' }); renderMathText(t, p.label); g.appendChild(t);
                }
            }
        },

        dimension(g, p, rot) {
            const { length, label, offset } = p;
            const th = offset || 8, hl = 6, hw = 3;
            g.appendChild(svgEl('line', { x1: 0, y1: -th, x2: 0, y2: th, stroke: '#1e293b', 'stroke-width': 1.3 }));
            g.appendChild(svgEl('line', { x1: length, y1: -th, x2: length, y2: th, stroke: '#1e293b', 'stroke-width': 1.3 }));
            g.appendChild(svgEl('line', { x1: 0, y1: 0, x2: length, y2: 0, stroke: '#1e293b', 'stroke-width': 1.3 }));
            g.appendChild(svgEl('polygon', { points: '0,0 ' + hl + ',' + (-hw) + ' ' + hl + ',' + hw, fill: '#1e293b' }));
            g.appendChild(svgEl('polygon', { points: length + ',0 ' + (length - hl) + ',' + (-hw) + ' ' + (length - hl) + ',' + hw, fill: '#1e293b' }));
            if (label) {
                const dirKey = p.labelPos || 'N';
                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.N;
                const { lx, ly } = getLabelCoords(p, rot, length / 2, 0, th + 6, dirKey, p.labelHorizontal);
                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + lx + ',' + ly + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' }); renderMathText(t, label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: lx, y: ly + align.dy, 'text-anchor': align.anchor, 'font-size': 16, 'font-family': 'Inter, sans-serif', 'font-style': 'italic', 'font-weight': '500', fill: '#1e293b' }); renderMathText(t, label); g.appendChild(t);
                }
            }
        },

        label(g, p, rot) {
            if (p.labelHorizontal && rot) {
                const lg = svgEl('g', { transform: 'rotate(' + (-rot) + ')' });
                const t = svgEl('text', { x: 0, y: 0, 'font-size': p.fontSize || 18, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b', 'dominant-baseline': 'central' });
                renderMathText(t, p.text || 'A'); lg.appendChild(t); g.appendChild(lg);
            } else {
                const t = svgEl('text', { x: 0, y: 0, 'font-size': p.fontSize || 18, 'font-family': 'Inter, sans-serif', 'font-weight': '600', fill: '#1e293b', 'dominant-baseline': 'central' });
                renderMathText(t, p.text || 'A'); g.appendChild(t);
            }
        },

        line(g, p) {
            const sw = parseFloat(p.strokeWidth) || 1.5;
            const L = p.length || 150;
            const dash = p.style === 'dashed' ? '6,4' : (p.style === 'dotted' ? '2,2' : 'none');
            g.appendChild(svgEl('line', { x1: 0, y1: 0, x2: L, y2: 0, stroke: '#1e293b', 'stroke-width': sw, 'stroke-dasharray': dash }));
        },

        arrow(g, p, rot) {
            const sw = parseFloat(p.strokeWidth) || 1.8;
            const L = p.length || 100;
            const dash = p.style === 'dashed' ? '6,4' : (p.style === 'dotted' ? '2,2' : 'none');
            g.appendChild(svgEl('line', { x1: 0, y1: 0, x2: L - 6, y2: 0, stroke: '#1e293b', 'stroke-width': sw, 'stroke-dasharray': dash }));
            const aw = 6 + sw * 1.5;
            const ah = 4 + sw;
            g.appendChild(svgEl('polygon', { points: `${L},0 ${L - aw},-${ah / 2} ${L - aw},${ah / 2}`, fill: '#1e293b' }));
            if (p.label) {
                const dirKey = p.labelPos || 'N';
                const dirVec = DIR_VECTORS[dirKey] || DIR_VECTORS.N;

                const textLen = String(p.label).replace(/\\/g, '').length;
                const w = textLen * 7 + 4;
                const h = 12;

                const rad = (rot || 0) * Math.PI / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const arrowStart = { x: 0, y: 0 };
                const arrowEnd = { x: L * cos, y: L * sin };

                let d = 8 + sw;
                const maxIterations = 15;
                let finalLx = 0, finalLy = 0;

                const alignments = {
                    N: { anchor: 'middle', dy: -4 },
                    NE: { anchor: 'start', dy: -4 },
                    E: { anchor: 'start', dy: 4 },
                    SE: { anchor: 'start', dy: 12 },
                    S: { anchor: 'middle', dy: 14 },
                    SW: { anchor: 'end', dy: 12 },
                    W: { anchor: 'end', dy: 4 },
                    NW: { anchor: 'end', dy: -4 }
                };
                const align = alignments[dirKey] || alignments.N;
                const finalAnchor = align.anchor;
                const finalDy = align.dy;

                for (let iter = 0; iter < maxIterations; iter++) {
                    let lx = 0, ly = 0;
                    if (p.labelHorizontal && rot) {
                        const gdx = dirVec.x * d;
                        const gdy = dirVec.y * d;
                        lx = L / 2 + gdx * cos + gdy * sin;
                        ly = -gdx * sin + gdy * cos;
                    } else {
                        lx = L / 2 + dirVec.x * d;
                        ly = dirVec.y * d;
                    }

                    let segStart, segEnd, rectX, rectY;
                    if (p.labelHorizontal && rot) {
                        segStart = { x: 0, y: 0 };
                        segEnd = { x: L * cos, y: L * sin };
                        rectX = lx * cos - ly * sin;
                        rectY = lx * sin + ly * cos;
                    } else {
                        segStart = { x: 0, y: 0 };
                        segEnd = { x: L, y: 0 };
                        rectX = lx;
                        rectY = ly;
                    }

                    if (dirKey === 'N' || dirKey === 'S') rectX -= w / 2;
                    else if (dirKey === 'W' || dirKey === 'NW' || dirKey === 'SW') rectX -= w;

                    if (dirKey === 'E' || dirKey === 'W') rectY -= h / 2;
                    else if (dirKey === 'N' || dirKey === 'NE' || dirKey === 'NW') rectY -= h;

                    const labelRect = { x: rectX - 3, y: rectY - 3, w: w + 6, h: h + 6 };
                    if (lineSegmentIntersectsRect(segStart, segEnd, labelRect)) {
                        d += 4;
                    } else {
                        finalLx = lx;
                        finalLy = ly;
                        break;
                    }
                    if (iter === maxIterations - 1) {
                        finalLx = lx;
                        finalLy = ly;
                    }
                }

                if (p.labelHorizontal && rot) {
                    const lg = svgEl('g', { transform: 'translate(' + finalLx + ',' + finalLy + ') rotate(' + (-rot) + ')' });
                    const t = svgEl('text', { x: 0, y: finalDy, 'text-anchor': finalAnchor, 'font-size': 12, 'font-family': 'Inter, sans-serif', fill: '#1e293b' });
                    renderMathText(t, p.label); lg.appendChild(t); g.appendChild(lg);
                } else {
                    const t = svgEl('text', { x: finalLx, y: finalLy + finalDy, 'text-anchor': finalAnchor, 'font-size': 12, 'font-family': 'Inter, sans-serif', fill: '#1e293b' });
                    renderMathText(t, p.label); g.appendChild(t);
                }
            }
        },

        coord_system_xy(g, p) {
            const sizeX = parseFloat(p.sizeX) || 80;
            const sizeY = parseFloat(p.sizeY) || 80;
            const labelX = p.labelX !== undefined ? p.labelX : 'x';
            const labelY = p.labelY !== undefined ? p.labelY : 'y';
            g.appendChild(svgEl('line', { x1: 0, y1: 0, x2: sizeX - 6, y2: 0, stroke: '#1e293b', 'stroke-width': 1.3 }));
            g.appendChild(svgEl('polygon', { points: `${sizeX},0 ${sizeX - 6},-3.5 ${sizeX - 6},3.5`, fill: '#1e293b' }));
            if (labelX) {
                const t = svgEl('text', { x: sizeX + 8, y: 3, 'font-size': 12, 'font-family': 'Inter, sans-serif', fill: '#1e293b' });
                renderMathText(t, labelX);
                g.appendChild(t);
            }
            g.appendChild(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: -(sizeY - 6), stroke: '#1e293b', 'stroke-width': 1.3 }));
            g.appendChild(svgEl('polygon', { points: `0,-${sizeY} -3.5,-${sizeY - 6} 3.5,-${sizeY - 6}`, fill: '#1e293b' }));
            if (labelY) {
                const t = svgEl('text', { x: 0, y: -sizeY - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'Inter, sans-serif', fill: '#1e293b' });
                renderMathText(t, labelY);
                g.appendChild(t);
            }
        },

        coord_system_x(g, p) {
            const sizeX = parseFloat(p.sizeX) || 100;
            const labelX = p.labelX !== undefined ? p.labelX : 'x';
            g.appendChild(svgEl('line', { x1: 0, y1: 0, x2: sizeX - 6, y2: 0, stroke: '#1e293b', 'stroke-width': 1.3 }));
            g.appendChild(svgEl('polygon', { points: `${sizeX},0 ${sizeX - 6},-3.5 ${sizeX - 6},3.5`, fill: '#1e293b' }));
            if (labelX) {
                const t = svgEl('text', { x: sizeX + 8, y: 3, 'font-size': 12, 'font-family': 'Inter, sans-serif', fill: '#1e293b' });
                renderMathText(t, labelX);
                g.appendChild(t);
            }
        },
    };

    /* ════════════════════════════════════════════════════
       CANVAS MODULE
       ════════════════════════════════════════════════════ */

    let canvasSvg = null, gridMinorPat = null, gridMajorPat = null, gridRectEl = null;

    function initCanvas(svg) {
        canvasSvg = svg;
        gridMinorPat = svg.querySelector('#grid-minor');
        gridMajorPat = svg.querySelector('#grid-major');
        gridRectEl = svg.querySelector('#grid-rect');
        updateViewBox();
        updateGridPattern();
    }

    function updateViewBox() {
        if (!canvasSvg) return;
        canvasSvg.setAttribute('viewBox', state.panX + ' ' + state.panY + ' ' + (state.canvasWidth / state.zoom) + ' ' + (state.canvasHeight / state.zoom));
    }

    function updateGridPattern() {
        if (!gridMinorPat || !gridMajorPat) return;
        const gs = state.gridSize, ms = gs * 5;
        gridMinorPat.setAttribute('width', gs);
        gridMinorPat.setAttribute('height', gs);
        const mp = gridMinorPat.querySelector('path');
        if (mp) mp.setAttribute('d', 'M ' + gs + ' 0 L 0 0 0 ' + gs);
        gridMajorPat.setAttribute('width', ms);
        gridMajorPat.setAttribute('height', ms);
        const mr = gridMajorPat.querySelector('rect');
        if (mr) { mr.setAttribute('width', ms); mr.setAttribute('height', ms); }
        const mpa = gridMajorPat.querySelector('path');
        if (mpa) mpa.setAttribute('d', 'M ' + ms + ' 0 L 0 0 0 ' + ms);
    }

    function setGridVisible(v) { if (gridRectEl) gridRectEl.style.display = v ? 'block' : 'none'; }

    function screenToSVG(cx, cy) {
        if (!canvasSvg) return { x: 0, y: 0 };
        const pt = canvasSvg.createSVGPoint();
        pt.x = cx; pt.y = cy;
        const ctm = canvasSvg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const sp = pt.matrixTransform(ctm.inverse());
        return { x: sp.x, y: sp.y };
    }

    function applyZoom(delta, cx, cy) {
        const old = state.zoom;
        const f = delta > 0 ? 1.1 : 1 / 1.1;
        state.zoom = Math.min(5, Math.max(0.1, state.zoom * f));
        if (cx !== undefined && cy !== undefined) {
            const sp = screenToSVG(cx, cy);
            const s = old / state.zoom;
            state.panX = sp.x - (sp.x - state.panX) * s;
            state.panY = sp.y - (sp.y - state.panY) * s;
        }
        updateViewBox();
    }

    function applyPan(dx, dy) { state.panX += dx; state.panY += dy; updateViewBox(); }
    function resetView() { state.zoom = 1; state.panX = 0; state.panY = 0; updateViewBox(); }

    function fitToContent(elements) {
        if (!elements || elements.size === 0) { resetView(); return; }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [, elem] of elements) {
            if (elem.svgGroup) {
                try {
                    const bb = elem.svgGroup.getBBox();
                    const corners = [
                        { x: bb.x, y: bb.y }, { x: bb.x + bb.width, y: bb.y },
                        { x: bb.x, y: bb.y + bb.height }, { x: bb.x + bb.width, y: bb.y + bb.height },
                    ];
                    for (const c of corners) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y); }
                } catch (e) { /* ignore */ }
            }
        }
        if (!isFinite(minX)) { resetView(); return; }
        const pad = 80; minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        const cw = maxX - minX, ch = maxY - minY;
        state.zoom = Math.min(state.canvasWidth / cw, state.canvasHeight / ch, 3);
        state.panX = minX; state.panY = minY;
        updateViewBox();
    }

    /* ════════════════════════════════════════════════════
       PROPERTIES MODULE
       ════════════════════════════════════════════════════ */

    let propsContainer = null, propsOnChange = null, propsOnDelete = null;

    function initProperties(container, onChange, onDelete) {
        propsContainer = container;
        propsOnChange = onChange;
        propsOnDelete = onDelete;
    }

    function showProperties(elem) {
        if (!propsContainer) return;
        propsContainer.innerHTML = '';
        if (!elem) { hideProperties(); return; }

        const td = ELEMENT_TYPES[elem.type];
        const badge = document.createElement('div');
        badge.className = 'prop-type-badge';
        badge.textContent = td ? td.name : elem.type;
        propsContainer.appendChild(badge);

        addPropGroup(propsContainer, 'Position', function () {
            const f = document.createDocumentFragment();
            f.appendChild(makePropRow('X', numInput(elem.x, function (v) { propsOnChange(elem.id, '_x', v); }), 'px'));
            f.appendChild(makePropRow('Y', numInput(elem.y, function (v) { propsOnChange(elem.id, '_y', v); }), 'px'));
            f.appendChild(makePropRow('Drehung', numInput(elem.rotation || 0, function (v) { propsOnChange(elem.id, '_rotation', v); }, { min: -360, max: 360, step: 5 }), '°'));
            return f;
        });

        switch (elem.type) {
            case 'beam':
                addPropGroup(propsContainer, 'Balken', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.length, function (v) { propsOnChange(elem.id, 'length', v); }, { min: 10, step: 25 }), 'px'));
                    f.appendChild(makePropRow('Höhe', numInput(elem.props.height || 8, function (v) { propsOnChange(elem.id, 'height', v); }, { min: 2, max: 30, step: 1 }), 'px'));
                    return f;
                }); break;
            case 'curved_beam':
                addPropGroup(propsContainer, 'Gebogener Balken', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Radius', numInput(elem.props.radius, function (v) { propsOnChange(elem.id, 'radius', v); }, { min: 10, step: 10 }), 'px'));
                    f.appendChild(makePropRow('Startwinkel', numInput(elem.props.startAngle, function (v) { propsOnChange(elem.id, 'startAngle', v); }, { min: -360, max: 360, step: 15 }), '°'));
                    f.appendChild(makePropRow('Endwinkel', numInput(elem.props.endAngle, function (v) { propsOnChange(elem.id, 'endAngle', v); }, { min: -360, max: 360, step: 15 }), '°'));
                    f.appendChild(makePropRow('Höhe', numInput(elem.props.height || 8, function (v) { propsOnChange(elem.id, 'height', v); }, { min: 2, max: 30, step: 1 }), 'px'));
                    return f;
                }); break;
            case 'bar':
                addPropGroup(propsContainer, 'Stab', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.length, function (v) { propsOnChange(elem.id, 'length', v); }, { min: 10, step: 25 }), 'px'));
                    f.appendChild(makePropRow('Höhe', numInput(elem.props.height || 4, function (v) { propsOnChange(elem.id, 'height', v); }, { min: 1, max: 20, step: 1 }), 'px'));
                    f.appendChild(makePropRow('Gelenkradius', numInput(elem.props.radius !== undefined ? elem.props.radius : 4.5, function (v) { propsOnChange(elem.id, 'radius', v); }, { min: 1, max: 20, step: 0.5 }), 'px'));
                    return f;
                }); break;
            case 'festlager':
                addPropGroup(propsContainer, 'Lager', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Größe', numInput(elem.props.size, function (v) { propsOnChange(elem.id, 'size', v); }, { min: 10, max: 60, step: 2 }), 'px'));
                    f.appendChild(makePropRow('Gelenkradius', numInput(elem.props.radius !== undefined ? elem.props.radius : 3, function (v) { propsOnChange(elem.id, 'radius', v); }, { min: 1, max: 20, step: 0.5 }), 'px'));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || '', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'E', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'loslager':
                addPropGroup(propsContainer, 'Lager', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Größe', numInput(elem.props.size, function (v) { propsOnChange(elem.id, 'size', v); }, { min: 10, max: 60, step: 2 }), 'px'));
                    f.appendChild(makePropRow('Gelenkradius', numInput(elem.props.radius !== undefined ? elem.props.radius : 3, function (v) { propsOnChange(elem.id, 'radius', v); }, { min: 1, max: 20, step: 0.5 }), 'px'));
                    f.appendChild(makePropRow('Darstellung', selInput(elem.props.variant || 'lines', [
                        { value: 'lines', label: 'Linien (Gleiter)' },
                        { value: 'rollers', label: 'Rollen (Kugeln)' }
                    ], function (v) { propsOnChange(elem.id, 'variant', v); })));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || '', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'E', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'einspannung':
                addPropGroup(propsContainer, 'Einspannung', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.wallLength, function (v) { propsOnChange(elem.id, 'wallLength', v); }, { min: 20, max: 200, step: 5 }), 'px'));
                    f.appendChild(makePropRow('Breite', numInput(elem.props.wallWidth, function (v) { propsOnChange(elem.id, 'wallWidth', v); }, { min: 5, max: 30, step: 1 }), 'px'));
                    return f;
                }); break;
            case 'gelenk':
                addPropGroup(propsContainer, 'Gelenk', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Radius', numInput(elem.props.radius, function (v) { propsOnChange(elem.id, 'radius', v); }, { min: 3, max: 20, step: 1 }), 'px'));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || '', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'NE', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'einzelkraft':
                addPropGroup(propsContainer, 'Kraft', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.magnitude, function (v) { propsOnChange(elem.id, 'magnitude', v); }, { min: 20, max: 300, step: 5 }), 'px'));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || 'F', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'NW', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'streckenlast':
                addPropGroup(propsContainer, 'Streckenlast', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.length, function (v) { propsOnChange(elem.id, 'length', v); }, { min: 25, step: 25 }), 'px'));
                    f.appendChild(makePropRow('Verteilung', selInput(elem.props.distType || 'linear', [
                        { value: 'linear', label: 'Linear' },
                        { value: 'sine', label: 'Sinus' },
                        { value: 'parabola', label: 'Parabel' },
                        { value: 'custom', label: 'Formel' }
                    ], function (v) {
                        propsOnChange(elem.id, 'distType', v);
                        showProperties(elem);
                    })));
                    if (!elem.props.distType || elem.props.distType === 'linear') {
                        f.appendChild(makePropRow('Start', numInput(elem.props.startMag, function (v) { propsOnChange(elem.id, 'startMag', v); }, { min: 0, step: 5 }), 'px'));
                        f.appendChild(makePropRow('Ende', numInput(elem.props.endMag, function (v) { propsOnChange(elem.id, 'endMag', v); }, { min: 0, step: 5 }), 'px'));
                    } else if (elem.props.distType === 'sine' || elem.props.distType === 'parabola') {
                        f.appendChild(makePropRow('Amplitude', numInput(elem.props.startMag !== undefined ? elem.props.startMag : 50, function (v) { propsOnChange(elem.id, 'startMag', v); }, { min: 0, step: 5 }), 'px'));
                    } else if (elem.props.distType === 'custom') {
                        f.appendChild(makePropRow('Formel', txtInput(elem.props.formula || '50 * sin(PI * x / L)', function (v) { propsOnChange(elem.id, 'formula', v); })));
                    }
                    f.appendChild(makePropRow('Abstand', numInput(elem.props.arrowSpacing || 25, function (v) { propsOnChange(elem.id, 'arrowSpacing', v); }, { min: 10, max: 100, step: 5 }), 'px'));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || 'q₀', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'N', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'moment':
                addPropGroup(propsContainer, 'Moment', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Radius', numInput(elem.props.radius, function (v) { propsOnChange(elem.id, 'radius', v); }, { min: 10, max: 80, step: 5 }), 'px'));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || 'M', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Richtung', selInput(elem.props.direction || 'cw', [
                        { value: 'cw', label: 'Uhrzeigersinn' }, { value: 'ccw', label: 'Gegen Uhrzeigersinn' },
                    ], function (v) { propsOnChange(elem.id, 'direction', v); })));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'N', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'dimension':
                addPropGroup(propsContainer, 'Bemaßung', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.length, function (v) { propsOnChange(elem.id, 'length', v); }, { min: 25, step: 25 }), 'px'));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || 'a', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Offset', numInput(elem.props.offset || 8, function (v) { propsOnChange(elem.id, 'offset', v); }, { min: 2, max: 30, step: 1 }), 'px'));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'N', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'label':
                addPropGroup(propsContainer, 'Text', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Text', txtInput(elem.props.text || 'A', function (v) { propsOnChange(elem.id, 'text', v); })));
                    f.appendChild(makePropRow('Größe', numInput(elem.props.fontSize || 18, function (v) { propsOnChange(elem.id, 'fontSize', v); }, { min: 8, max: 72, step: 1 }), 'px'));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    return f;
                }); break;
            case 'section_cut':
                addPropGroup(propsContainer, 'Schnittlinie', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.length, function (v) { propsOnChange(elem.id, 'length', v); }, { min: 20, max: 200, step: 5 }), 'px'));
                    f.appendChild(makePropRow('Bez.', txtInput(elem.props.label || 'A', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Richtung', selInput(elem.props.dir || 'right', [
                        { value: 'right', label: 'Rechts (►)' },
                        { value: 'left', label: 'Links (◄)' }
                    ], function (v) { propsOnChange(elem.id, 'dir', v); })));
                    return f;
                }); break;
            case 'cross_section':
                addPropGroup(propsContainer, 'Querschnitts-Zeichnung', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Titel', txtInput(elem.props.label || 'A-A', function (v) { propsOnChange(elem.id, 'label', v); })));
                    const listTitle = document.createElement('div');
                    listTitle.className = 'prop-group-title';
                    listTitle.style.marginTop = '12px';
                    listTitle.textContent = 'Formen (Zusammengesetzt)';
                    f.appendChild(listTitle);
                    const shapes = elem.props.shapes || [];
                    shapes.forEach((shape, index) => {
                        const box = document.createElement('div');
                        box.style.border = '1px solid #e2e8f0';
                        box.style.padding = '8px';
                        box.style.borderRadius = '6px';
                        box.style.marginBottom = '8px';
                        box.style.background = '#f8fafc';
                        box.style.position = 'relative';
                        const delShape = document.createElement('button');
                        delShape.textContent = '✕';
                        delShape.style.position = 'absolute';
                        delShape.style.right = '4px';
                        delShape.style.top = '4px';
                        delShape.style.border = 'none';
                        delShape.style.background = 'none';
                        delShape.style.color = '#ef4444';
                        delShape.style.cursor = 'pointer';
                        delShape.style.fontSize = '12px';
                        delShape.addEventListener('click', function () {
                            const newShapes = shapes.filter((_, i) => i !== index);
                            propsOnChange(elem.id, 'shapes', newShapes);
                            showProperties(elem);
                        });
                        box.appendChild(delShape);
                        const label = document.createElement('div');
                        label.style.fontWeight = '600';
                        label.style.fontSize = '11px';
                        label.style.marginBottom = '6px';
                        label.style.color = '#475569';
                        label.textContent = `Form #${index + 1}: ${shape.type === 'rectangle' ? 'Rechteck' : shape.type === 'circle' ? 'Kreis' : 'Dreieck'}`;
                        box.appendChild(label);
                        const r1 = document.createElement('div');
                        r1.className = 'prop-row';
                        const typeSel = selInput(shape.type, [
                            { value: 'rectangle', label: 'Rechteck' },
                            { value: 'triangle', label: 'Dreieck' },
                            { value: 'circle', label: 'Kreis' }
                        ], function (val) {
                            shape.type = val;
                            if (val === 'circle') shape.r = 15;
                            else if (val === 'rectangle') { shape.w = 30; shape.h = 40; }
                            else if (val === 'triangle') { shape.w = 30; shape.h = 30; }
                            propsOnChange(elem.id, 'shapes', shapes);
                            showProperties(elem);
                        });
                        const modeSel = selInput(shape.mode || 'solid', [
                            { value: 'solid', label: 'Voll (Solid)' },
                            { value: 'hole', label: 'Ausschnitt (Loch)' }
                        ], function (val) {
                            shape.mode = val;
                            propsOnChange(elem.id, 'shapes', shapes);
                        });
                        r1.appendChild(typeSel);
                        r1.appendChild(modeSel);
                        box.appendChild(r1);
                        const r2 = document.createElement('div');
                        r2.className = 'prop-row';
                        r2.style.display = 'flex';
                        r2.style.gap = '8px';
                        const xInput = numInput(shape.x || 0, function (val) {
                            shape.x = val;
                            propsOnChange(elem.id, 'shapes', shapes);
                        });
                        const yInput = numInput(shape.y || 0, function (val) {
                            shape.y = val;
                            propsOnChange(elem.id, 'shapes', shapes);
                        });
                        r2.appendChild(makePropRow('dx', xInput, 'px'));
                        r2.appendChild(makePropRow('dy', yInput, 'px'));
                        box.appendChild(r2);
                        const r3 = document.createElement('div');
                        r3.className = 'prop-row';
                        r3.style.display = 'flex';
                        r3.style.gap = '8px';
                        if (shape.type === 'circle') {
                            const rInput = numInput(shape.r || 15, function (val) {
                                shape.r = val;
                                propsOnChange(elem.id, 'shapes', shapes);
                            });
                            r3.appendChild(makePropRow('Radius', rInput, 'px'));
                        } else {
                            const wLabel = shape.type === 'rectangle' ? 'Breite b' : 'Basis b';
                            const hLabel = shape.type === 'rectangle' ? 'Höhe h' : 'Höhe h';
                            const wInput = numInput(shape.w || 30, function (val) {
                                shape.w = val;
                                propsOnChange(elem.id, 'shapes', shapes);
                            });
                            const hInput = numInput(shape.h || 30, function (val) {
                                shape.h = val;
                                propsOnChange(elem.id, 'shapes', shapes);
                            });
                            r3.appendChild(makePropRow(wLabel, wInput, 'px'));
                            r3.appendChild(makePropRow(hLabel, hInput, 'px'));
                        }
                        box.appendChild(r3);
                        f.appendChild(box);
                    });
                    const addBtn = document.createElement('button');
                    addBtn.className = 'prop-btn';
                    addBtn.style.width = '100%';
                    addBtn.style.marginTop = '8px';
                    addBtn.style.marginBottom = '12px';
                    addBtn.textContent = '+ Form hinzufügen';
                    addBtn.addEventListener('click', function () {
                        const nextId = shapes.length > 0 ? Math.max(...shapes.map(s => s.id)) + 1 : 1;
                        shapes.push({ id: nextId, type: 'rectangle', mode: 'solid', x: 0, y: 0, w: 30, h: 40 });
                        propsOnChange(elem.id, 'shapes', shapes);
                        showProperties(elem);
                    });
                    f.appendChild(addBtn);
                    return f;
                }); break;
            case 'line':
                addPropGroup(propsContainer, 'Linie', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.length, function (v) { propsOnChange(elem.id, 'length', v); }, { min: 10, step: 25 }), 'px'));
                    f.appendChild(makePropRow('Stärke', numInput(elem.props.strokeWidth || 1.5, function (v) { propsOnChange(elem.id, 'strokeWidth', v); }, { min: 0.5, max: 15, step: 0.5 }), 'px'));
                    f.appendChild(makePropRow('Stil', selInput(elem.props.style || 'solid', [
                        { value: 'solid', label: 'Durchgehend' },
                        { value: 'dashed', label: 'Gestrichelt' },
                        { value: 'dotted', label: 'Gepunktet' }
                    ], function (v) { propsOnChange(elem.id, 'style', v); })));
                    return f;
                }); break;
            case 'arrow':
                addPropGroup(propsContainer, 'Pfeil', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.length, function (v) { propsOnChange(elem.id, 'length', v); }, { min: 10, step: 25 }), 'px'));
                    f.appendChild(makePropRow('Stärke', numInput(elem.props.strokeWidth || 1.8, function (v) { propsOnChange(elem.id, 'strokeWidth', v); }, { min: 0.5, max: 15, step: 0.5 }), 'px'));
                    f.appendChild(makePropRow('Stil', selInput(elem.props.style || 'solid', [
                        { value: 'solid', label: 'Durchgehend' },
                        { value: 'dashed', label: 'Gestrichelt' },
                        { value: 'dotted', label: 'Gepunktet' }
                    ], function (v) { propsOnChange(elem.id, 'style', v); })));
                    f.appendChild(makePropRow('Beschr.', txtInput(elem.props.label || '', function (v) { propsOnChange(elem.id, 'label', v); })));
                    f.appendChild(makePropRow('Textausricht.', selInput(elem.props.labelHorizontal ? 'horizontal' : 'rotate', [
                        { value: 'rotate', label: 'Mit Element drehen' },
                        { value: 'horizontal', label: 'Horizontal halten' }
                    ], function (v) { propsOnChange(elem.id, 'labelHorizontal', v === 'horizontal'); })));
                    f.appendChild(makePropRow('Textposition', selInput(elem.props.labelPos || 'N', [
                        { value: 'NW', label: 'Nordwest' },
                        { value: 'N', label: 'Norden' },
                        { value: 'NE', label: 'Nordost' },
                        { value: 'E', label: 'Osten' },
                        { value: 'SE', label: 'Südost' },
                        { value: 'S', label: 'Süden' },
                        { value: 'SW', label: 'Südwest' },
                        { value: 'W', label: 'Westen' }
                    ], function (v) { propsOnChange(elem.id, 'labelPos', v); })));
                    return f;
                }); break;
            case 'coord_system_xy':
                addPropGroup(propsContainer, 'Koordinatensystem (x-y)', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge X', numInput(elem.props.sizeX || 80, function (v) { propsOnChange(elem.id, 'sizeX', v); }, { min: 10, step: 10 }), 'px'));
                    f.appendChild(makePropRow('Länge Y', numInput(elem.props.sizeY || 80, function (v) { propsOnChange(elem.id, 'sizeY', v); }, { min: 10, step: 10 }), 'px'));
                    f.appendChild(makePropRow('Label X', txtInput(elem.props.labelX !== undefined ? elem.props.labelX : 'x', function (v) { propsOnChange(elem.id, 'labelX', v); })));
                    f.appendChild(makePropRow('Label Y', txtInput(elem.props.labelY !== undefined ? elem.props.labelY : 'y', function (v) { propsOnChange(elem.id, 'labelY', v); })));
                    return f;
                }); break;
            case 'coord_system_x':
                addPropGroup(propsContainer, 'Koordinatenachse (x)', function () {
                    const f = document.createDocumentFragment();
                    f.appendChild(makePropRow('Länge', numInput(elem.props.sizeX || 100, function (v) { propsOnChange(elem.id, 'sizeX', v); }, { min: 10, step: 10 }), 'px'));
                    f.appendChild(makePropRow('Label', txtInput(elem.props.labelX !== undefined ? elem.props.labelX : 'x', function (v) { propsOnChange(elem.id, 'labelX', v); })));
                    return f;
                }); break;
        }

        const del = document.createElement('button');
        del.className = 'prop-btn-danger';
        del.textContent = '✕ Element löschen';
        del.addEventListener('click', function () { if (propsOnDelete) propsOnDelete(elem.id); });
        propsContainer.appendChild(del);
    }

    function hideProperties() {
        if (!propsContainer) return;
        while (propsContainer.firstChild) propsContainer.removeChild(propsContainer.firstChild);
        var msg = document.createElement('div');
        msg.className = 'no-selection';
        var icon = svgEl('svg', { viewBox: '0 0 48 48', width: 40, height: 40, fill: 'none', stroke: '#94a3b8', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        icon.appendChild(svgEl('rect', { x: 8, y: 8, width: 32, height: 32, rx: 4 }));
        icon.appendChild(svgEl('path', { d: 'M16 28 L22 22 L28 26 L36 18' }));
        icon.appendChild(svgEl('circle', { cx: 16, cy: 18, r: 2.5 }));
        msg.appendChild(icon);
        var t = document.createElement('p');
        t.className = 'hint-title';
        t.textContent = 'Kein Element ausgewählt';
        msg.appendChild(t);
        var h = document.createElement('p');
        h.className = 'hint-text';
        h.textContent = 'Wählen Sie ein Werkzeug und klicken Sie auf die Zeichenfläche.';
        msg.appendChild(h);
        propsContainer.appendChild(msg);
    }

    function addPropGroup(c, title, fn) {
        const g = document.createElement('div'); g.className = 'prop-group';
        const t = document.createElement('div'); t.className = 'prop-group-title'; t.textContent = title;
        g.appendChild(t); g.appendChild(fn()); c.appendChild(g);
    }

    function makePropRow(label, input, unit) {
        const r = document.createElement('div'); r.className = 'prop-row';
        const l = document.createElement('span'); l.className = 'prop-label'; l.textContent = label; r.appendChild(l);
        r.appendChild(input);
        if (unit) { const u = document.createElement('span'); u.className = 'prop-unit'; u.textContent = unit; r.appendChild(u); }
        return r;
    }

    function numInput(val, onChange, opts) {
        opts = opts || {};
        const i = document.createElement('input'); i.type = 'number'; i.className = 'prop-input prop-input-sm'; i.value = val;
        if (opts.min !== undefined) i.min = opts.min;
        if (opts.max !== undefined) i.max = opts.max;
        if (opts.step !== undefined) i.step = opts.step;
        i.addEventListener('input', function () { const v = parseFloat(i.value); if (!isNaN(v)) onChange(v); });
        return i;
    }

    function txtInput(val, onChange) {
        const i = document.createElement('input'); i.type = 'text'; i.className = 'prop-input'; i.value = val;
        i.addEventListener('input', function () { onChange(i.value); });
        return i;
    }

    function selInput(val, options, onChange) {
        const s = document.createElement('select'); s.className = 'prop-select';
        for (const o of options) { const op = document.createElement('option'); op.value = o.value; op.textContent = o.label; if (o.value === val) op.selected = true; s.appendChild(op); }
        s.addEventListener('change', function () { onChange(s.value); });
        return s;
    }

    /* ════════════════════════════════════════════════════
       EXPORT MODULE
       ════════════════════════════════════════════════════ */

    function exportSVG(svg, elements) {
        const r = buildCleanSVG(svg); const b = new Blob([r.svgString], { type: 'image/svg+xml;charset=utf-8' }); downloadBlob(b, 'aufgabenbild.svg');
    }

    function exportPNG(svg, elements, scale) {
        scale = scale || 2;
        const r = buildCleanSVG(svg);
        const canvas = document.createElement('canvas'); canvas.width = r.width * scale; canvas.height = r.height * scale;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        const blob = new Blob([r.svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = function () {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
            canvas.toBlob(function (b) { if (b) downloadBlob(b, 'aufgabenbild.png'); }, 'image/png');
        };
        img.onerror = function () { URL.revokeObjectURL(url); };
        img.src = url;
    }

    function buildCleanSVG(svg) {
        const el = svg.querySelector('#elements-layer');
        let bb; try { bb = el.getBBox(); } catch (e) { bb = { x: 0, y: 0, width: 800, height: 600 }; }
        const pad = 40, vx = bb.x - pad, vy = bb.y - pad, vw = Math.max(bb.width + pad * 2, 200), vh = Math.max(bb.height + pad * 2, 150);
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.element-group').forEach(function (g) { g.classList.remove('selected'); g.removeAttribute('data-id'); });
        const s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="' + SVG_NS + '" viewBox="' + vx + ' ' + vy + ' ' + vw + ' ' + vh + '" width="' + vw + '" height="' + vh + '">\n  <defs>\n    <filter id="outline" x="-20%" y="-20%" width="140%" height="140%">\n      <feMorphology operator="dilate" radius="1.5" in="SourceAlpha" result="dilated" />\n      <feColorMatrix type="matrix" values="0 0 0 0 0.12   0 0 0 0 0.16   0 0 0 0 0.23  0 0 0 1 0" in="dilated" result="coloredOutline" />\n      <feMerge>\n        <feMergeNode in="coloredOutline" />\n        <feMergeNode in="SourceGraphic" />\n      </feMerge>\n    </filter>\n  </defs>\n  <rect x="' + vx + '" y="' + vy + '" width="' + vw + '" height="' + vh + '" fill="white"/>\n  ' + clone.innerHTML + '\n</svg>';
        return { svgString: s, width: vw, height: vh };
    }

    function downloadBlob(blob, filename) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 100);
    }

    /* ════════════════════════════════════════════════════
       INTERACTIONS MODULE
       ════════════════════════════════════════════════════ */

    let intSvg = null, intElemLayer = null, intGhostLayer = null, intUiLayer = null, intCallbacks = null;
    let isDragging = false, isRotating = false, isPanning = false;
    let dragStartSVG = null, dragStartElemPos = null, rotateStartAngle = null, rotateStartElemAngle = null;
    let panStartScreen = null, ghostElem = null;

    function initInteractions(svg, cbs) {
        intSvg = svg; intElemLayer = svg.querySelector('#elements-layer');
        intGhostLayer = svg.querySelector('#ghost-layer'); intUiLayer = svg.querySelector('#ui-layer');
        intCallbacks = cbs;
        svg.addEventListener('mousedown', onMouseDown);
        svg.addEventListener('mousemove', onMouseMove);
        svg.addEventListener('mouseup', onMouseUp);
        svg.addEventListener('mouseleave', onMouseLeave);
        svg.addEventListener('wheel', onWheel, { passive: false });
        svg.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    function updateGhost(sx, sy) {
        clearGhost();
        if (!state.activeTool || state.activeTool === 'pointer') return;
        const x = state.snapEnabled ? snapToGrid(sx) : sx, y = state.snapEnabled ? snapToGrid(sy) : sy;
        const d = createElementData(state.activeTool, x, y, 0); d.id = '__ghost__';
        const g = renderElement(d); g.classList.add('ghost-element'); g.style.pointerEvents = 'none';
        const target = (state.activeTool === 'beam' || state.activeTool === 'curved_beam') ?
            document.getElementById('ghost-beams-layer') :
            document.getElementById('ghost-other-layer');
        (target || intGhostLayer).appendChild(g); ghostElem = g;
    }

    function clearGhost() {
        if (ghostElem) { ghostElem.remove(); ghostElem = null; }
        const gb = document.getElementById('ghost-beams-layer');
        const go = document.getElementById('ghost-other-layer');
        if (gb) { while (gb.firstChild) gb.removeChild(gb.firstChild); }
        if (go) { while (go.firstChild) go.removeChild(go.firstChild); }
    }

    function updateSelectionUI() {
        while (intUiLayer && intUiLayer.firstChild) intUiLayer.removeChild(intUiLayer.firstChild);
        if (!state.selectedId) return;
        const elem = state.elements.get(state.selectedId);
        if (!elem || !elem.svgGroup) return;
        let bb; try { bb = elem.svgGroup.getBBox(); } catch (e) { return; }
        const pad = 6, bx = bb.x - pad, by = bb.y - pad, bw = bb.width + pad * 2, bh = bb.height + pad * 2;
        const ug = document.createElementNS(SVG_NS, 'g');
        ug.setAttribute('transform', 'translate(' + elem.x + ', ' + elem.y + ') rotate(' + (elem.rotation || 0) + ')');
        ug.style.pointerEvents = 'none';
        const sr = document.createElementNS(SVG_NS, 'rect');
        sr.setAttribute('x', bx); sr.setAttribute('y', by); sr.setAttribute('width', bw); sr.setAttribute('height', bh);
        sr.setAttribute('class', 'selection-box'); ug.appendChild(sr);
        const hd = 25, hx = bx + bw / 2, hy = by - hd;
        const hl = document.createElementNS(SVG_NS, 'line');
        hl.setAttribute('x1', hx); hl.setAttribute('y1', by); hl.setAttribute('x2', hx); hl.setAttribute('y2', hy);
        hl.setAttribute('class', 'rotation-handle-line'); ug.appendChild(hl);
        const hc = document.createElementNS(SVG_NS, 'circle');
        hc.setAttribute('cx', hx); hc.setAttribute('cy', hy); hc.setAttribute('r', 6);
        hc.setAttribute('class', 'rotation-handle-circle'); hc.style.pointerEvents = 'all'; hc.style.cursor = 'grab';
        hc.addEventListener('mousedown', function (e) {
            e.stopPropagation(); isRotating = true;
            const sp = screenToSVG(e.clientX, e.clientY);
            rotateStartAngle = Math.atan2(sp.y - elem.y, sp.x - elem.x);
            rotateStartElemAngle = elem.rotation || 0;
            intSvg.style.cursor = 'grabbing';
        });
        ug.appendChild(hc); intUiLayer.appendChild(ug);
    }

    function clearInteractionState() { isDragging = false; isRotating = false; clearGhost(); }

    function findElementGroupAt(target) {
        let c = target;
        while (c && c !== intSvg) { if (c.classList && c.classList.contains('element-group')) return c; c = c.parentElement; }
        return null;
    }

    function onMouseDown(e) {
        if (e.button === 1) {
            e.preventDefault(); isPanning = true; panStartScreen = { x: e.clientX, y: e.clientY };
            intSvg.parentElement.classList.add('panning'); return;
        }
        if (e.button !== 0) return;
        const sp = screenToSVG(e.clientX, e.clientY);
        if (state.activeTool && state.activeTool !== 'pointer') {
            const x = state.snapEnabled ? snapToGrid(sp.x) : sp.x, y = state.snapEnabled ? snapToGrid(sp.y) : sp.y;
            clearGhost(); if (intCallbacks.onPlaceElement) intCallbacks.onPlaceElement(state.activeTool, x, y, 0);
            return;
        }
        const cg = findElementGroupAt(e.target);
        if (cg) {
            const id = cg.getAttribute('data-id');
            if (intCallbacks.onSelectElement) intCallbacks.onSelectElement(id);
            isDragging = true; const elem = state.elements.get(id);
            if (elem) { dragStartSVG = sp; dragStartElemPos = { x: elem.x, y: elem.y }; }
            intSvg.parentElement.classList.add('dragging');
        } else {
            if (intCallbacks.onSelectElement) intCallbacks.onSelectElement(null);
        }
    }

    function onMouseMove(e) {
        const sp = screenToSVG(e.clientX, e.clientY);
        const ce = document.getElementById('status-coords');
        if (ce) { const sx = state.snapEnabled ? snapToGrid(sp.x) : Math.round(sp.x); const sy = state.snapEnabled ? snapToGrid(sp.y) : Math.round(sp.y); ce.textContent = 'X: ' + sx + '  Y: ' + sy; }
        if (isPanning) {
            const rect = intSvg.getBoundingClientRect(), vb = intSvg.viewBox.baseVal;
            const scx = vb.width / rect.width, scy = vb.height / rect.height;
            applyPan(-(e.clientX - panStartScreen.x) * scx, -(e.clientY - panStartScreen.y) * scy);
            panStartScreen = { x: e.clientX, y: e.clientY }; return;
        }
        if (isRotating && state.selectedId) {
            const elem = state.elements.get(state.selectedId);
            if (elem) {
                const ca = Math.atan2(sp.y - elem.y, sp.x - elem.x);
                let na = rotateStartElemAngle + (ca - rotateStartAngle) * 180 / Math.PI;
                if (e.shiftKey) na = Math.round(na / 15) * 15;
                if (intCallbacks.onRotateElement) intCallbacks.onRotateElement(state.selectedId, na);
            }
            return;
        }
        if (isDragging && state.selectedId && dragStartSVG) {
            let nx = dragStartElemPos.x + sp.x - dragStartSVG.x, ny = dragStartElemPos.y + sp.y - dragStartSVG.y;
            if (state.snapEnabled) { nx = snapToGrid(nx); ny = snapToGrid(ny); }
            if (intCallbacks.onMoveElement) intCallbacks.onMoveElement(state.selectedId, nx, ny);
            return;
        }
        if (state.activeTool && state.activeTool !== 'pointer') updateGhost(sp.x, sp.y);
    }

    function onMouseUp() {
        if (isPanning) { isPanning = false; intSvg.parentElement.classList.remove('panning'); return; }
        if (isRotating) { isRotating = false; intSvg.style.cursor = ''; if (intCallbacks.onMoveEnd) intCallbacks.onMoveEnd(); return; }
        if (isDragging) { isDragging = false; intSvg.parentElement.classList.remove('dragging'); if (intCallbacks.onMoveEnd) intCallbacks.onMoveEnd(); return; }
    }

    function onMouseLeave() { clearGhost(); if (isPanning) { isPanning = false; intSvg.parentElement.classList.remove('panning'); } }

    function onWheel(e) {
        e.preventDefault(); applyZoom(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
        const zd = document.getElementById('status-zoom'); if (zd) zd.textContent = Math.round(state.zoom * 100) + '%';
    }

    /* ════════════════════════════════════════════════════
       APP MODULE — Main Entry Point
       ════════════════════════════════════════════════════ */

    let appSvg = null, appElemLayer = null, appCanvasContainer = null;

    document.addEventListener('DOMContentLoaded', function () {
        appSvg = document.getElementById('canvas');
        appElemLayer = appSvg.querySelector('#elements-layer');
        appCanvasContainer = document.getElementById('canvas-container');

        const rect = appCanvasContainer.getBoundingClientRect();
        state.canvasWidth = rect.width || 1600;
        state.canvasHeight = rect.height || 1000;

        initCanvas(appSvg);
        initInteractions(appSvg, {
            onPlaceElement: handlePlaceElement,
            onSelectElement: handleSelectElement,
            onMoveElement: handleMoveElement,
            onRotateElement: handleRotateElement,
            onDeleteSelected: handleDeleteSelected,
            onMoveEnd: handleMoveEnd,
        });
        initProperties(document.getElementById('properties-content'), handlePropertyChange, handleDeleteElement);

        setupToolbox();
        setupToolbar();
        setupStatusBar();
        setupKeyboard();
        setupShareBar();

        window.addEventListener('resize', function () {
            const r = appCanvasContainer.getBoundingClientRect();
            state.canvasWidth = r.width || 1600; state.canvasHeight = r.height || 1000;
            updateViewBox();
        });

        updateStatusBar();
    });

    function setupToolbox() {
        document.querySelectorAll('.tool-item[data-tool]').forEach(function (item) {
            item.addEventListener('click', function () { setActiveTool(item.getAttribute('data-tool')); });
        });
        var pb = document.getElementById('btn-pointer');
        if (pb) pb.addEventListener('click', function () { setActiveTool(null); });
    }

    function setActiveTool(tool) {
        state.activeTool = tool; clearInteractionState();
        document.querySelectorAll('.tool-item').forEach(function (it) { it.classList.toggle('active', it.getAttribute('data-tool') === tool); });
        var pb = document.getElementById('btn-pointer'); if (pb) pb.classList.toggle('active', !tool);
        if (appCanvasContainer) appCanvasContainer.classList.toggle('pointer-mode', !tool);
    }

    function getBearingPartition(value) {
        if (value <= 0) return [];
        var result = [];
        function findCombinations(rem, current, startIndex) {
            if (rem === 0) {
                result.push([...current]);
                return;
            }
            var candidates = [3, 2, 1];
            for (var i = startIndex; i < candidates.length; i++) {
                var val = candidates[i];
                if (val <= rem) {
                    current.push(val);
                    findCombinations(rem - val, current, i);
                    current.pop();
                }
            }
        }
        findCombinations(value, [], 0);
        if (result.length === 0) {
            var fallback = [];
            for (var i = 0; i < value; i++) fallback.push(1);
            return fallback;
        }
        return result[Math.floor(Math.random() * result.length)];
    }

    function generateRandomSystem(beamsCount, barsCount, bearingValue, loadsCount) {
        saveSnapshot();
        for (var [, elem] of state.elements) {
            if (elem.svgGroup) elem.svgGroup.remove();
        }
        state.elements.clear();
        state.selectedId = null;

        var y = 0;
        var beamLength = 200;
        var totalBeamsLength = beamsCount * beamLength;
        var startX = -totalBeamsLength / 2;

        var nodes = [];
        for (var i = 0; i <= beamsCount; i++) {
            nodes.push({
                x: startX + i * beamLength,
                y: y,
                hasJoint: false,
                hasBearing: false,
                hasBar: false
            });
        }

        for (var i = 0; i < beamsCount; i++) {
            var id = generateId();
            var elem = createElementData('beam', nodes[i].x, nodes[i].y, 0, { length: beamLength }, id);
            elem.id = id;
            var g = renderElement(elem);
            appendElementToDOM(elem, g);
            state.elements.set(elem.id, elem);
        }

        for (var i = 1; i < beamsCount; i++) {
            if (Math.random() < 0.5) {
                var id = generateId();
                var elem = createElementData('gelenk', nodes[i].x, nodes[i].y, 0, {}, id);
                elem.id = id;
                var g = renderElement(elem);
                appendElementToDOM(elem, g);
                state.elements.set(elem.id, elem);
                nodes[i].hasJoint = true;
            }
        }

        var partition = getBearingPartition(bearingValue);
        var availableNodeIndices = [];
        for (var i = 0; i <= beamsCount; i++) {
            availableNodeIndices.push(i);
        }

        partition.sort((a, b) => b - a);

        partition.forEach(val => {
            var nodeIndex = -1;
            if (val === 3) {
                if (availableNodeIndices.includes(0)) {
                    nodeIndex = 0;
                } else if (availableNodeIndices.includes(beamsCount)) {
                    nodeIndex = beamsCount;
                } else {
                    if (availableNodeIndices.length > 0) {
                        nodeIndex = availableNodeIndices[Math.floor(Math.random() * availableNodeIndices.length)];
                    }
                }
            } else {
                if (availableNodeIndices.length > 0) {
                    var middles = availableNodeIndices.filter(idx => idx > 0 && idx < beamsCount);
                    if (middles.length > 0 && Math.random() < 0.7) {
                        nodeIndex = middles[Math.floor(Math.random() * middles.length)];
                    } else {
                        nodeIndex = availableNodeIndices[Math.floor(Math.random() * availableNodeIndices.length)];
                    }
                }
            }

            if (nodeIndex !== -1) {
                availableNodeIndices = availableNodeIndices.filter(idx => idx !== nodeIndex);
                var type = (val === 3) ? 'einspannung' : (val === 2 ? 'festlager' : 'loslager');
                var rotation = 0;
                if (type === 'einspannung') {
                    if (nodeIndex === 0) rotation = 180;
                    else if (nodeIndex === beamsCount) rotation = 0;
                    else rotation = 90;
                } else {
                    rotation = 0;
                }

                var id = generateId();
                var elem = createElementData(type, nodes[nodeIndex].x, nodes[nodeIndex].y, rotation, {}, id);
                elem.id = id;
                var g = renderElement(elem);
                appendElementToDOM(elem, g);
                state.elements.set(elem.id, elem);
                nodes[nodeIndex].hasBearing = true;
            }
        });

        var barsPlaced = 0;
        var nodesForBars = [];
        for (var i = 0; i <= beamsCount; i++) {
            if (!nodes[i].hasBearing) {
                nodesForBars.push(i);
            }
        }

        nodesForBars.sort(() => Math.random() - 0.5);

        for (var i = 0; i < nodesForBars.length && barsPlaced < barsCount; i++) {
            var nodeIdx = nodesForBars[i];
            if (!nodes[nodeIdx].hasJoint) {
                var idG = generateId();
                var elemG = createElementData('gelenk', nodes[nodeIdx].x, nodes[nodeIdx].y, 0, {}, idG);
                elemG.id = idG;
                var gG = renderElement(elemG);
                appendElementToDOM(elemG, gG);
                state.elements.set(elemG.id, elemG);
                nodes[nodeIdx].hasJoint = true;
            }

            var barLength = 120;
            var barX = nodes[nodeIdx].x;
            var barY = nodes[nodeIdx].y;
            var idB = generateId();
            var elemB = createElementData('bar', barX, barY, 90, { length: barLength }, idB);
            elemB.id = idB;
            var gB = renderElement(elemB);
            appendElementToDOM(elemB, gB);
            state.elements.set(elemB.id, elemB);

            var idL = generateId();
            var elemL = createElementData('festlager', barX, barY + barLength, 0, {}, idL);
            elemL.id = idL;
            var gL = renderElement(elemL);
            appendElementToDOM(elemL, gL);
            state.elements.set(elemL.id, elemL);

            nodes[nodeIdx].hasBar = true;
            barsPlaced++;
        }

        var loadTypes = ['einzelkraft', 'streckenlast', 'moment'];
        for (var i = 0; i < loadsCount; i++) {
            var loadType = loadTypes[Math.floor(Math.random() * loadTypes.length)];
            if (loadType === 'streckenlast') {
                var beamIdx = Math.floor(Math.random() * beamsCount);
                var beamNodeLeft = nodes[beamIdx];
                var id = generateId();
                var startVal = 30 + Math.floor(Math.random() * 5) * 10;
                var endVal = Math.random() < 0.5 ? startVal : 30 + Math.floor(Math.random() * 5) * 10;
                var dists = ['linear', 'sine', 'parabola'];
                var dist = dists[Math.floor(Math.random() * dists.length)];
                var elem = createElementData('streckenlast', beamNodeLeft.x, beamNodeLeft.y, 0, {
                    length: beamLength,
                    startMag: startVal,
                    endMag: endVal,
                    distType: dist,
                    label: 'q_' + (i + 1)
                }, id);
                elem.id = id;
                var g = renderElement(elem);
                appendElementToDOM(elem, g);
                state.elements.set(elem.id, elem);
            } else if (loadType === 'einzelkraft') {
                var anchorX, anchorY;
                if (Math.random() < 0.4) {
                    var nodeIdx = Math.floor(Math.random() * (beamsCount + 1));
                    anchorX = nodes[nodeIdx].x;
                    anchorY = nodes[nodeIdx].y;
                } else {
                    var beamIdx = Math.floor(Math.random() * beamsCount);
                    anchorX = nodes[beamIdx].x + beamLength / 2;
                    anchorY = nodes[beamIdx].y;
                }
                var rot = Math.random() < 0.7 ? 90 : (Math.random() < 0.5 ? 45 : 135);
                var label = 'F_' + (i + 1);
                var id = generateId();
                var elem = createElementData('einzelkraft', anchorX, anchorY, rot, {
                    magnitude: 60 + Math.floor(Math.random() * 5) * 10,
                    label: label
                }, id);
                elem.id = id;
                var g = renderElement(elem);
                appendElementToDOM(elem, g);
                state.elements.set(elem.id, elem);
            } else if (loadType === 'moment') {
                var anchorX, anchorY;
                if (Math.random() < 0.6) {
                    var nodeIdx = Math.floor(Math.random() * (beamsCount + 1));
                    anchorX = nodes[nodeIdx].x;
                    anchorY = nodes[nodeIdx].y;
                } else {
                    var beamIdx = Math.floor(Math.random() * beamsCount);
                    anchorX = nodes[beamIdx].x + beamLength / 2;
                    anchorY = nodes[beamIdx].y;
                }
                var id = generateId();
                var elem = createElementData('moment', anchorX, anchorY, 0, {
                    radius: 20 + Math.floor(Math.random() * 3) * 5,
                    direction: Math.random() < 0.5 ? 'cw' : 'ccw',
                    label: 'M_' + (i + 1)
                }, id);
                elem.id = id;
                var g = renderElement(elem);
                appendElementToDOM(elem, g);
                state.elements.set(elem.id, elem);
            }
        }

        if (state.elements.size > 0) {
            fitToContent(state.elements);
        }
        updateStatusBar();
    }

    function openRandomGeneratorDialog() {
        if (document.getElementById('random-dialog-overlay')) return;

        var overlay = document.createElement('div');
        overlay.id = 'random-dialog-overlay';
        overlay.className = 'modal-overlay';

        var box = document.createElement('div');
        box.className = 'modal-box';

        box.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Zufälliges Aufgabenbild generieren</h2>
            <p class="modal-subtitle">Geben Sie die Parameter für die Generierung ein.</p>
        </div>
        <div class="modal-body">
            <div class="modal-row">
                <span class="modal-label">Anzahl Balken:</span>
                <input type="number" id="rand-beams" class="modal-input" value="2" min="1" max="10" step="1">
            </div>
            <div class="modal-row">
                <span class="modal-label">Anzahl Pendelstäbe:</span>
                <input type="number" id="rand-bars" class="modal-input" value="1" min="0" max="10" step="1">
            </div>
            <div class="modal-row">
                <span class="modal-label">Wertigkeit der Lager:</span>
                <input type="number" id="rand-bearings" class="modal-input" value="3" min="1" max="15" step="1">
            </div>
            <div class="modal-row">
                <span class="modal-label">Anzahl Lasten:</span>
                <input type="number" id="rand-loads" class="modal-input" value="2" min="0" max="10" step="1">
            </div>
        </div>
        <div class="modal-actions">
            <button id="rand-cancel" class="modal-btn modal-btn-cancel">Abbrechen</button>
            <button id="rand-ok" class="modal-btn modal-btn-ok">Generieren</button>
        </div>
    `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var beamsInput = document.getElementById('rand-beams');
        var barsInput = document.getElementById('rand-bars');
        var bearingsInput = document.getElementById('rand-bearings');
        var loadsInput = document.getElementById('rand-loads');

        var cancelBtn = document.getElementById('rand-cancel');
        var okBtn = document.getElementById('rand-ok');

        okBtn.focus();

        function closeDialog() {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }

        cancelBtn.addEventListener('click', closeDialog);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closeDialog();
            }
        });

        okBtn.addEventListener('click', function () {
            var beamsCount = parseInt(beamsInput.value, 10);
            if (isNaN(beamsCount) || beamsCount < 1) beamsCount = 2;
            var barsCount = parseInt(barsInput.value, 10);
            if (isNaN(barsCount) || barsCount < 0) barsCount = 0;
            var bearingValue = parseInt(bearingsInput.value, 10);
            if (isNaN(bearingValue) || bearingValue < 1) bearingValue = 3;
            var loadsCount = parseInt(loadsInput.value, 10);
            if (isNaN(loadsCount) || loadsCount < 0) loadsCount = 0;

            generateRandomSystem(beamsCount, barsCount, bearingValue, loadsCount);
            closeDialog();
        });

        var inputs = [beamsInput, barsInput, bearingsInput, loadsInput];
        inputs.forEach(function (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    okBtn.click();
                }
            });
        });
    }

    function setupToolbar() {
        var u = document.getElementById('btn-undo'); if (u) u.addEventListener('click', undo);
        var r = document.getElementById('btn-redo'); if (r) r.addEventListener('click', redo);
        var gt = document.getElementById('grid-toggle'); if (gt) gt.addEventListener('change', function (e) { state.showGrid = e.target.checked; setGridVisible(state.showGrid); });
        var gs = document.getElementById('grid-size'); if (gs) gs.addEventListener('input', function (e) { var v = parseInt(e.target.value, 10); if (v >= 5 && v <= 100) { state.gridSize = v; updateGridPattern(); var sg = document.getElementById('status-grid'); if (sg) sg.textContent = 'Raster: ' + v + ' px'; } });
        var st = document.getElementById('snap-toggle'); if (st) st.addEventListener('change', function (e) { state.snapEnabled = e.target.checked; });
        var del = document.getElementById('btn-delete'); if (del) del.addEventListener('click', handleDeleteSelected);
        var es = document.getElementById('btn-export-svg'); if (es) es.addEventListener('click', function () { exportSVG(appSvg, state.elements); });
        var ep = document.getElementById('btn-export-png'); if (ep) ep.addEventListener('click', function () { exportPNG(appSvg, state.elements); });
        var rnd = document.getElementById('btn-random'); if (rnd) rnd.addEventListener('click', openRandomGeneratorDialog);
    }

    function setupStatusBar() {
        var zi = document.getElementById('btn-zoom-in'); if (zi) zi.addEventListener('click', function () { applyZoom(1); updateZoomDisplay(); });
        var zo = document.getElementById('btn-zoom-out'); if (zo) zo.addEventListener('click', function () { applyZoom(-1); updateZoomDisplay(); });
        var zf = document.getElementById('btn-zoom-fit'); if (zf) zf.addEventListener('click', function () { if (state.elements.size > 0) fitToContent(state.elements); else resetView(); updateZoomDisplay(); });
    }

    function updateZoomDisplay() { var e = document.getElementById('status-zoom'); if (e) e.textContent = Math.round(state.zoom * 100) + '%'; }

    function updateStatusBar() {
        updateAllBeams();
        var e = document.getElementById('status-elements'); if (e) e.textContent = state.elements.size + ' Element' + (state.elements.size !== 1 ? 'e' : '');
        var d = document.getElementById('btn-delete'); if (d) d.disabled = !state.selectedId;
        updateUndoRedoButtons();
        updateStateCode();
    }

    function updateUndoRedoButtons() {
        var u = document.getElementById('btn-undo'), r = document.getElementById('btn-redo');
        if (u) u.disabled = state.undoStack.length === 0;
        if (r) r.disabled = state.redoStack.length === 0;
    }

    function setupKeyboard() {
        document.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDeleteSelected(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
            if (e.key === 'Escape') { setActiveTool(null); handleSelectElement(null); return; }
            if (e.key === 'v' || e.key === 'V') { setActiveTool(null); return; }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return; }
        });
    }

    function handlePlaceElement(type, x, y, rotation) {
        saveSnapshot();
        var id = generateId(), d = createElementData(type, x, y, rotation); d.id = id;
        var g = renderElement(d); appendElementToDOM(d, g);
        state.elements.set(id, d); handleSelectElement(id);
        setActiveTool(null); updateStatusBar(); return id;
    }

    function handleSelectElement(id) {
        if (state.selectedId) { var old = state.elements.get(state.selectedId); if (old && old.svgGroup) old.svgGroup.classList.remove('selected'); }
        state.selectedId = id;
        if (id) { var elem = state.elements.get(id); if (elem && elem.svgGroup) elem.svgGroup.classList.add('selected'); showProperties(elem); }
        else hideProperties();
        updateSelectionUI(); updateStatusBar();
    }

    function handleMoveElement(id, x, y) {
        var elem = state.elements.get(id); if (!elem) return;
        elem.x = x; elem.y = y; updateElementSVG(elem); updateSelectionUI();
    }

    function handleRotateElement(id, angle) {
        var elem = state.elements.get(id); if (!elem) return;
        elem.rotation = angle; updateElementSVG(elem); updateSelectionUI();
    }

    function handleMoveEnd() {
        saveSnapshot(); updateUndoRedoButtons();
        if (state.selectedId) { var elem = state.elements.get(state.selectedId); if (elem) showProperties(elem); }
        updateStatusBar();
    }

    function handleDeleteSelected() { if (!state.selectedId) return; handleDeleteElement(state.selectedId); }

    function handleDeleteElement(id) {
        saveSnapshot();
        var elem = state.elements.get(id); if (elem && elem.svgGroup) elem.svgGroup.remove();
        state.elements.delete(id);
        if (state.selectedId === id) { state.selectedId = null; hideProperties(); updateSelectionUI(); }
        updateStatusBar();
    }

    function handlePropertyChange(elemId, propName, value) {
        var elem = state.elements.get(elemId); if (!elem) return;
        if (propName === '_x') { saveSnapshot(); elem.x = value; }
        else if (propName === '_y') { saveSnapshot(); elem.y = value; }
        else if (propName === '_rotation') { saveSnapshot(); elem.rotation = value; }
        else { saveSnapshot(); elem.props[propName] = value; }
        updateElementSVG(elem); updateSelectionUI(); updateUndoRedoButtons();
        updateStatusBar();
    }

    function duplicateSelected() {
        if (!state.selectedId) return;
        var elem = state.elements.get(state.selectedId); if (!elem) return;
        saveSnapshot();
        var off = state.gridSize || 25, id = generateId();
        var d = createElementData(elem.type, elem.x + off, elem.y + off, elem.rotation, Object.assign({}, elem.props)); d.id = id;
        var g = renderElement(d); appendElementToDOM(d, g);
        state.elements.set(id, d); handleSelectElement(id); updateStatusBar();
    }

    function undo() {
        if (state.undoStack.length === 0) return;
        state.redoStack.push(getCurrentSnapshot());
        restoreSnapshot(state.undoStack.pop()); updateUndoRedoButtons();
    }

    function redo() {
        if (state.redoStack.length === 0) return;
        state.undoStack.push(getCurrentSnapshot());
        restoreSnapshot(state.redoStack.pop()); updateUndoRedoButtons();
    }

    function restoreSnapshot(snapshot) {
        for (var [, elem] of state.elements) { if (elem.svgGroup) elem.svgGroup.remove(); }
        state.elements.clear();
        for (var data of snapshot) {
            var elem = createElementData(data.type, data.x, data.y, data.rotation, data.props, data.id);
            elem.id = data.id;
            var g = renderElement(elem); appendElementToDOM(elem, g);
            state.elements.set(data.id, elem);
            var n = parseInt(data.id.replace('elem_', ''), 10);
            if (!isNaN(n) && n >= state.nextId) state.nextId = n + 1;
        }
        state.selectedId = null; hideProperties(); updateSelectionUI(); updateStatusBar();
    }

    function serializeStateToDSL() {
        let parts = [];
        parts.push(`Raster: ${state.gridSize}`);
        for (const [, elem] of state.elements) {
            const typeName = {
                beam: 'Balken',
                curved_beam: 'Geb_Balken',
                bar: 'Stab',
                section_cut: 'Schnittlinie',
                cross_section: 'Querschnitt',
                festlager: 'Festlager',
                loslager: 'Loslager',
                einspannung: 'Einspannung',
                gelenk: 'Gelenk',
                einzelkraft: 'Einzelkraft',
                streckenlast: 'Streckenlast',
                moment: 'Moment',
                dimension: 'Bemaßung',
                label: 'Text',
                line: 'Linie',
                arrow: 'Pfeil',
                coord_system_xy: 'Ksys_XY',
                coord_system_x: 'Ksys_X'
            }[elem.type] || elem.type;
            let props = [];
            props.push(`x=${elem.x}`);
            props.push(`y=${elem.y}`);
            if (elem.rotation) props.push(`rot=${elem.rotation}`);
            const p = elem.props || {};
            if (elem.type === 'beam') {
                props.push(`L=${p.length}`);
                props.push(`h=${p.height || 8}`);
            } else if (elem.type === 'curved_beam') {
                props.push(`r=${p.radius}`);
                props.push(`sa=${p.startAngle}`);
                props.push(`ea=${p.endAngle}`);
                props.push(`h=${p.height || 8}`);
            } else if (elem.type === 'bar') {
                props.push(`L=${p.length}`);
                props.push(`h=${p.height || 4}`);
                props.push(`r=${p.radius !== undefined ? p.radius : 4.5}`);
            } else if (elem.type === 'section_cut') {
                props.push(`L=${p.length || 80}`);
                props.push(`label="${p.label || 'A'}"`);
                props.push(`dir="${p.dir || 'right'}"`);
            } else if (elem.type === 'cross_section') {
                props.push(`label="${p.label || 'A-A'}"`);
                const shapeLines = (p.shapes || []).map(s => {
                    let sParts = [];
                    sParts.push(`type=${s.type}`);
                    sParts.push(`mode=${s.mode || 'solid'}`);
                    sParts.push(`x=${s.x || 0}`);
                    sParts.push(`y=${s.y || 0}`);
                    if (s.type === 'circle') {
                        sParts.push(`r=${s.r || 15}`);
                    } else {
                        sParts.push(`w=${s.w || 30}`);
                        sParts.push(`h=${s.h || 30}`);
                    }
                    return sParts.join(',');
                });
                props.push(`shapes=[${shapeLines.join(' | ')}]`);
            } else if (elem.type === 'festlager' || elem.type === 'loslager') {
                props.push(`size=${p.size}`);
                props.push(`label="${p.label || ''}"`);
                props.push(`r=${p.radius !== undefined ? p.radius : 3}`);
                if (p.labelPos) props.push(`lp="${p.labelPos}"`);
                if (elem.type === 'loslager') props.push(`variant="${p.variant || 'lines'}"`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'einspannung') {
                props.push(`wl=${p.wallLength}`);
                props.push(`ww=${p.wallWidth}`);
            } else if (elem.type === 'gelenk') {
                props.push(`r=${p.radius}`);
                props.push(`label="${p.label || ''}"`);
                if (p.labelPos) props.push(`lp="${p.labelPos}"`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'einzelkraft') {
                props.push(`mag=${p.magnitude}`);
                props.push(`label="${p.label || 'F'}"`);
                if (p.labelPos) props.push(`lp="${p.labelPos}"`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'streckenlast') {
                props.push(`L=${p.length}`);
                props.push(`start=${p.startMag}`);
                props.push(`end=${p.endMag}`);
                props.push(`label="${p.label || 'q₀'}"`);
                props.push(`spacing=${p.arrowSpacing || 25}`);
                props.push(`dist="${p.distType || 'linear'}"`);
                props.push(`formula="${p.formula || ''}"`);
                if (p.labelPos) props.push(`lp="${p.labelPos}"`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'moment') {
                props.push(`r=${p.radius || 25}`);
                props.push(`label="${p.label || 'M'}"`);
                props.push(`dir="${p.direction || 'cw'}"`);
                if (p.labelPos) props.push(`lp="${p.labelPos}"`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'dimension') {
                props.push(`L=${p.length}`);
                props.push(`label="${p.label || 'a'}"`);
                props.push(`offset=${p.offset || 8}`);
                if (p.labelPos) props.push(`lp="${p.labelPos}"`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'label') {
                props.push(`txt="${p.text || ''}"`);
                props.push(`size=${p.fontSize || 18}`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'line') {
                props.push(`L=${p.length}`);
                props.push(`sw=${p.strokeWidth || 1.5}`);
                props.push(`style="${p.style || 'solid'}"`);
            } else if (elem.type === 'arrow') {
                props.push(`L=${p.length}`);
                props.push(`sw=${p.strokeWidth || 1.8}`);
                props.push(`style="${p.style || 'solid'}"`);
                props.push(`label="${p.label || ''}"`);
                if (p.labelPos) props.push(`lp="${p.labelPos}"`);
                if (p.labelHorizontal) props.push('lh=1');
            } else if (elem.type === 'coord_system_xy') {
                props.push(`sx=${p.sizeX || 80}`);
                props.push(`sy=${p.sizeY || 80}`);
                props.push(`lx="${p.labelX || 'x'}"`);
                props.push(`ly="${p.labelY || 'y'}"`);
            } else if (elem.type === 'coord_system_x') {
                props.push(`sx=${p.sizeX || 100}`);
                props.push(`lx="${p.labelX || 'x'}"`);
            }
            parts.push(`${typeName}: ${props.join(', ')}`);
        }
        return parts.join('; ');
    }

    function parseDSLToState(dslStr) {
        if (!dslStr || !dslStr.trim()) return null;
        const tokens = [];
        let currentToken = '';
        let inBrackets = false;
        let inQuotes = false;
        for (let i = 0; i < dslStr.length; i++) {
            const char = dslStr[i];
            if (char === '"') inQuotes = !inQuotes;
            if (char === '[') inBrackets = true;
            if (char === ']') inBrackets = false;
            if (char === ';' && !inBrackets && !inQuotes) {
                tokens.push(currentToken.trim());
                currentToken = '';
            } else {
                currentToken += char;
            }
        }
        if (currentToken.trim()) {
            tokens.push(currentToken.trim());
        }
        const elements = [];
        let gridSize = 25;
        const typeMap = {
            'Balken': 'beam',
            'Geb_Balken': 'curved_beam',
            'Stab': 'bar',
            'Schnittlinie': 'section_cut',
            'Querschnitt': 'cross_section',
            'Festlager': 'festlager',
            'Loslager': 'loslager',
            'Einspannung': 'einspannung',
            'Gelenk': 'gelenk',
            'Einzelkraft': 'einzelkraft',
            'Streckenlast': 'streckenlast',
            'Moment': 'moment',
            'Bemaßung': 'dimension',
            'Text': 'label',
            'Linie': 'line',
            'Pfeil': 'arrow',
            'Ksys_XY': 'coord_system_xy',
            'Ksys_X': 'coord_system_x'
        };
        for (let token of tokens) {
            if (!token) continue;
            if (token.startsWith('Raster:')) {
                gridSize = parseInt(token.split(':')[1].trim(), 10) || 25;
                continue;
            }
            const colonIdx = token.indexOf(':');
            if (colonIdx === -1) continue;
            const typeLabel = token.substring(0, colonIdx).trim();
            const type = typeMap[typeLabel] || typeLabel;
            const propsStr = token.substring(colonIdx + 1).trim();
            const parsedProps = {};
            let currentKey = '';
            let currentValue = '';
            let inB = false;
            let inQ = false;
            let mode = 'key';
            const addProp = () => {
                const k = currentKey.trim();
                let v = currentValue.trim();
                if (v.startsWith('"') && v.endsWith('"')) {
                    v = v.substring(1, v.length - 1);
                }
                if (k) {
                    parsedProps[k] = v;
                }
                currentKey = '';
                currentValue = '';
                mode = 'key';
            };
            for (let i = 0; i < propsStr.length; i++) {
                const char = propsStr[i];
                if (char === '"') {
                    inQ = !inQ;
                    currentValue += char;
                } else if (char === '[') {
                    inB = true;
                    currentValue += char;
                } else if (char === ']') {
                    inB = false;
                    currentValue += char;
                } else if (char === '=' && !inB && !inQ) {
                    mode = 'value';
                } else if (char === ',' && !inB && !inQ) {
                    addProp();
                } else {
                    if (mode === 'key') {
                        currentKey += char;
                    } else {
                        currentValue += char;
                    }
                }
            }
            addProp();
            const x = parseFloat(parsedProps.x) || 0;
            const y = parseFloat(parsedProps.y) || 0;
            const rot = parseFloat(parsedProps.rot) || 0;
            const props = {};
            if (type === 'beam') {
                props.length = parseFloat(parsedProps.L) || 200;
                props.height = parseFloat(parsedProps.h) || 8;
            } else if (type === 'curved_beam') {
                props.radius = parseFloat(parsedProps.r) || 100;
                props.startAngle = parseFloat(parsedProps.sa) || 0;
                props.endAngle = parseFloat(parsedProps.ea) || 90;
                props.height = parseFloat(parsedProps.h) || 8;
            } else if (type === 'bar') {
                props.length = parseFloat(parsedProps.L) || 200;
                props.height = parseFloat(parsedProps.h) || 4;
                props.radius = parsedProps.r !== undefined ? parseFloat(parsedProps.r) : 4.5;
            } else if (type === 'section_cut') {
                props.length = parseFloat(parsedProps.L) || 80;
                props.label = parsedProps.label || 'A';
                props.dir = parsedProps.dir || 'right';
            } else if (type === 'cross_section') {
                props.label = parsedProps.label || 'A-A';
                const shapes = [];
                let shapesStr = parsedProps.shapes || '';
                if (shapesStr.startsWith('[') && shapesStr.endsWith(']')) {
                    shapesStr = shapesStr.substring(1, shapesStr.length - 1);
                }
                if (shapesStr.trim()) {
                    const shapeTokens = shapesStr.split('|');
                    shapeTokens.forEach((tok, idx) => {
                        if (!tok.trim()) return;
                        const sp = {};
                        tok.split(',').forEach(pair => {
                            const [sk, sv] = pair.split('=');
                            if (sk) sp[sk.trim()] = sv ? sv.trim() : '';
                        });
                        shapes.push({
                            id: idx + 1,
                            type: sp.type || 'rectangle',
                            mode: sp.mode || 'solid',
                            x: parseFloat(sp.x) || 0,
                            y: parseFloat(sp.y) || 0,
                            w: parseFloat(sp.w) || 30,
                            h: parseFloat(sp.h) || 30,
                            r: parseFloat(sp.r) || 15
                        });
                    });
                }
                props.shapes = shapes;
            } else if (type === 'festlager' || type === 'loslager') {
                props.size = parseFloat(parsedProps.size) || 22;
                props.label = parsedProps.label || '';
                props.radius = parsedProps.r !== undefined ? parseFloat(parsedProps.r) : 3;
                props.labelPos = parsedProps.lp || 'E';
                if (type === 'loslager') props.variant = parsedProps.variant || 'lines';
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'einspannung') {
                props.wallLength = parseFloat(parsedProps.wl) || 70;
                props.wallWidth = parseFloat(parsedProps.ww) || 12;
            } else if (type === 'gelenk') {
                props.radius = parseFloat(parsedProps.r) || 6;
                props.label = parsedProps.label || '';
                props.labelPos = parsedProps.lp || 'NE';
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'einzelkraft') {
                props.magnitude = parseFloat(parsedProps.mag) || 70;
                props.label = parsedProps.label || 'F';
                props.labelPos = parsedProps.lp || 'NW';
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'streckenlast') {
                props.length = parseFloat(parsedProps.L) || 200;
                props.startMag = parseFloat(parsedProps.start) || 50;
                props.endMag = parseFloat(parsedProps.end) || 50;
                props.label = parsedProps.label || 'q₀';
                props.arrowSpacing = parseFloat(parsedProps.spacing) || 25;
                props.distType = parsedProps.dist || 'linear';
                props.formula = parsedProps.formula || '';
                props.labelPos = parsedProps.lp || 'N';
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'moment') {
                props.radius = parseFloat(parsedProps.r) || 25;
                props.label = parsedProps.label || 'M';
                props.direction = parsedProps.dir || 'cw';
                props.labelPos = parsedProps.lp || 'N';
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'dimension') {
                props.length = parseFloat(parsedProps.L) || 200;
                props.label = parsedProps.label || 'a';
                props.offset = parseFloat(parsedProps.offset) || 8;
                props.labelPos = parsedProps.lp || 'N';
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'label') {
                props.text = parsedProps.txt || 'A';
                props.fontSize = parseFloat(parsedProps.size) || 18;
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'line') {
                props.length = parseFloat(parsedProps.L) || 150;
                props.strokeWidth = parseFloat(parsedProps.sw) || 1.5;
                props.style = parsedProps.style || 'solid';
            } else if (type === 'arrow') {
                props.length = parseFloat(parsedProps.L) || 100;
                props.strokeWidth = parseFloat(parsedProps.sw) || 1.8;
                props.style = parsedProps.style || 'solid';
                props.label = parsedProps.label || '';
                props.labelPos = parsedProps.lp || 'N';
                if (parsedProps.lh === '1') props.labelHorizontal = true;
            } else if (type === 'coord_system_xy') {
                props.sizeX = parseFloat(parsedProps.sx) || 80;
                props.sizeY = parseFloat(parsedProps.sy) || 80;
                props.labelX = parsedProps.lx !== undefined ? parsedProps.lx : 'x';
                props.labelY = parsedProps.ly !== undefined ? parsedProps.ly : 'y';
            } else if (type === 'coord_system_x') {
                props.sizeX = parseFloat(parsedProps.sx) || 100;
                props.labelX = parsedProps.lx !== undefined ? parsedProps.lx : 'x';
            }
            elements.push({ type, x, y, rotation: rot, props });
        }
        return { gridSize, elements };
    }

    function updateStateCode() {
        try {
            const dsl = serializeStateToDSL();
            const input = document.getElementById('state-code-input');
            if (input) {
                input.value = dsl;
            }
        } catch (e) {
            console.error('Fehler beim Serialisieren des Zustands:', e);
        }
    }

    function loadStateFromCode(codeStr) {
        if (!codeStr || !codeStr.trim()) return;
        try {
            const parsed = parseDSLToState(codeStr);
            if (!parsed || !Array.isArray(parsed.elements)) {
                alert('Ungültiger Zeichnungs-Code!');
                return;
            }
            saveSnapshot();
            for (var [, elem] of state.elements) {
                if (elem.svgGroup) elem.svgGroup.remove();
            }
            state.elements.clear();
            state.nextId = 1;
            for (var data of parsed.elements) {
                var id = data.id || generateId();
                var elem = createElementData(data.type, data.x, data.y, data.rotation || 0, data.props, id);
                elem.id = id;
                var g = renderElement(elem);
                appendElementToDOM(elem, g);
                state.elements.set(id, elem);
                var n = parseInt(id.replace('elem_', ''), 10);
                if (!isNaN(n) && n >= state.nextId) state.nextId = n + 1;
            }
            if (parsed.gridSize) {
                state.gridSize = parsed.gridSize;
                var gi = document.getElementById('grid-size');
                if (gi) gi.value = state.gridSize;
                updateGridPattern();
                var sg = document.getElementById('status-grid');
                if (sg) sg.textContent = 'Raster: ' + state.gridSize + ' px';
            }
            handleSelectElement(null);
            updateStatusBar();
        } catch (e) {
            console.error('Fehler beim Laden des Codes:', e);
            alert('Fehler beim Laden des Zeichnungs-Codes: ' + e.message);
        }
    }

    function setupShareBar() {
        const input = document.getElementById('state-code-input');
        const copyBtn = document.getElementById('btn-copy-code');
        const loadBtn = document.getElementById('btn-load-code');

        if (copyBtn && input) {
            copyBtn.addEventListener('click', function () {
                if (!input.value) return;
                input.select();
                input.setSelectionRange(0, 99999);
                try {
                    navigator.clipboard.writeText(input.value);
                    const oldText = copyBtn.textContent;
                    copyBtn.textContent = 'Kopiert!';
                    copyBtn.style.background = '#10b981';
                    copyBtn.style.borderColor = '#10b981';
                    setTimeout(() => {
                        copyBtn.textContent = oldText;
                        copyBtn.style.background = '';
                        copyBtn.style.borderColor = '';
                    }, 2000);
                } catch (err) {
                    console.error('Kopieren fehlgeschlagen:', err);
                }
            });
        }

        if (loadBtn && input) {
            loadBtn.addEventListener('click', function () {
                loadStateFromCode(input.value);
            });
        }

        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    loadStateFromCode(input.value);
                }
            });
        }
    }

})();
