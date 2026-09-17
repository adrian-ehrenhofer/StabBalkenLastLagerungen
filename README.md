# TM-Aufgabenbilder-Editor (stabbalkenlastlagerungen)

A browser-based SVG editor for creating vector graphics of structural mechanics problems (Technical Mechanics / Technische Mechanik). This tool is designed to help educators and students quickly draw beam diagrams with supports, joints, dimensions, and loads.

Live Demo (GitHub Pages): [*\[StabBalkenLastLagerungen\]*](https://adrian-ehrenhofer.github.io/StabBalkenLastLagerungen/)

---

## 🚀 Features

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
  * "Randomize" tool to instantly generate a mock system.
* **Save & Export**:
  * Export clean, cropped vector files (**SVG**) or raster images (**PNG**).
  * Copy/paste a compact design code to save, share, or load drawings.
* **New update V2.0**:
  * Now with different colors!
  * Internationalized with i18n.
---

## 📁 Repository Structure

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
├── sbom.json           # CycloneDX Software Bill of Materials (0 dependencies)
└── LICENSES.md         # License audit and relicensing analysis
```

---

## 💻 Local Development / Quick Start

This project has **zero external dependencies** and does not require a compilation step.

1. Clone this repository.
2. Open [index.html](file:///home/ml_trainer/coding_antigravity_workspace/stabbalkenlastlagerungen/index.html) directly in any modern web browser.
3. *Optional*: Serve it locally using a simple HTTP server:
   ```bash
   # Python 3
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

---

## 📝 License

This project was developed by Adrian Ehrenhofer for educational purposes at TU Dresden. See [LICENSES.md](file:///home/ml_trainer/coding_antigravity_workspace/stabbalkenlastlagerungen/LICENSES.md) for detailed information on dependencies, copyright terms, and the feasibility of releasing the codebase under the Unlicense.
