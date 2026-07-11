/**
 * export.js — SVG and PNG Export
 * 
 * Produces clean exports of the drawing without grid, selection UI,
 * or ghost elements. Auto-crops to content bounds.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Export the canvas as a clean SVG file.
 * @param {SVGSVGElement} svgEl - The main canvas SVG element
 * @param {Map<string, Object>} elements - All elements
 */
export function exportSVG(svgEl, elements) {
    const { svgString, width, height } = buildCleanSVG(svgEl, elements);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, 'aufgabenbild.svg');
}

/**
 * Export the canvas as a PNG image.
 * @param {SVGSVGElement} svgEl - The main canvas SVG element
 * @param {Map<string, Object>} elements - All elements
 * @param {number} [scale=2] - Resolution scale factor
 */
export function exportPNG(svgEl, elements, scale = 2) {
    const { svgString, width, height } = buildCleanSVG(svgEl, elements);

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
            if (blob) {
                downloadBlob(blob, 'aufgabenbild.png');
            }
        }, 'image/png');
    };

    img.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('PNG export failed: Could not render SVG to image.');
    };

    img.src = url;
}

/**
 * Build a clean SVG string for export.
 * @returns {{ svgString: string, width: number, height: number }}
 */
function buildCleanSVG(svgEl, elements) {
    // Calculate bounding box of all elements
    const elementsLayer = svgEl.querySelector('#elements-layer');
    let bbox;
    try {
        bbox = elementsLayer.getBBox();
    } catch {
        bbox = { x: 0, y: 0, width: 800, height: 600 };
    }

    const padding = 40;
    const vbX = bbox.x - padding;
    const vbY = bbox.y - padding;
    const vbW = bbox.width + padding * 2;
    const vbH = bbox.height + padding * 2;

    // Ensure minimum size
    const width = Math.max(vbW, 200);
    const height = Math.max(vbH, 150);

    // Clone only the elements layer
    const clone = elementsLayer.cloneNode(true);

    // Remove any selection-related classes and attributes
    clone.querySelectorAll('.element-group').forEach(g => {
        g.classList.remove('selected');
        g.removeAttribute('data-id');
    });

    // Build clean SVG
    const svgStr = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${SVG_NS}" viewBox="${vbX} ${vbY} ${width} ${height}" width="${width}" height="${height}">
  <rect x="${vbX}" y="${vbY}" width="${width}" height="${height}" fill="white"/>
  ${clone.innerHTML}
</svg>`;

    return { svgString: svgStr, width, height };
}

/**
 * Trigger a file download from a Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
    }, 100);
}
