# TM-Aufgabenbilder-Editor (stabbalkenlastlagerungen)

A browser-based SVG editor for creating vector graphics of structural mechanics problems (Engineering Mechanics / Technische Mechanik). This tool is designed to help educators and students quickly draw beam diagrams with supports, joints, dimensions, and loads. 

<img src="./images/02_final.png" alt="First version of the tool" width="600">

---

## Features

* **Structural Elements**:
  * **Beams (Stäbe)**: Straight beams, curved beams, and truss bars (Pendelstäbe).
  * **Supports (Lager)**: Fixed supports (Festlager), roller/movable supports (Loslager), and fixed walls (Einspannungen).
  * **Connections (Verbindungen)**: Internal hinges/joints (Gelenke).
  * **Cuts (Schnitte)**: Section lines (Schnittlinien) and cross-sections (Querschnitte).
* **Loads & Dimensions**:
  * **Forces (Lasten)**: Point forces (Einzelkräfte), distributed loads (Streckenlasten), and bending moments (Momente).
  * **Annotations**: Dimension lines (Bemaßungen) and custom text labels.
* **Editor Tools**:
  * Move and rotate placed elements.
  * Real-time property editor sidebar (coordinates, sizes, magnitudes, labels).
  * Grid alignment with toggleable snap-to-grid.
  * Infinite canvas panning and zoom.
  * Undo / Redo history stack.
  * "Randomize" tool to instantly generate an example system.
* **Save & Export**:
  * Export clean, cropped vector files (**SVG**) or raster images (**PNG**).
  * Copy/paste a compact design code to save, share, or load drawings.

---

## Repository Structure

```
stabbalkenlastlagerungen/
├── index.html          # Main application page structure
├── styles.css          # Custom light-theme editor interface styles
├── js/
│   ├── app.js          # Combined standalone bundle for static deployment
│   ├── state.js        # Editor state management & undo/redo tracking
│   ├── canvas.js       # SVG Canvas setup, zoom, pan, and grid calculations
│   ├── elements.js     # SVG shape creation templates for mechanics symbols
│   ├── interactions.js # Mouse and touch drawing/selection handlers
│   ├── properties.js   # Sidebar form elements and event bindings
│   └── export.js       # SVG and PNG file generator logic
```

---

## Local Development / Quick Start

This project has **zero external dependencies** and does not require a compilation step.

1. Clone this repository.
2. Open index.html directly in any modern web browser.
3. *Optional*: Serve it locally using a simple HTTP server:
   ```bash
   # Python 3
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

---

## Contribution

If you like to contribute, e.g., by adding other language versions, please feel free to create your fork. You can also contact me for future steps of this small software tool! 

---

## License

This project was developed by Adrian Ehrenhofer for educational purposes and is intended to be used as free as possible under the Unlicense. See LICENSE.md for details.
