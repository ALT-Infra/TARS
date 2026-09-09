Open [drone-autonomy-atlas.html](drone-autonomy-atlas.html) directly in a browser. The atlas is a standalone file: no server, installation or internet connection is needed. External evidence links need internet access.

The canvas contains 159 project records, 126 sourced relationships and 36 drone-related checks of the shared Grok conversation. The original research snapshot is 8 September 2026; the project-identity and assembly-source review is 9 September 2026.

- **Assembled systems:** explore 22 system clusters and the independently published projects incorporated into them. Select a component to unfold another dependency level or visit its other appearances.
- **Focused components:** discover 135 projects by the problem they tackle, then reveal dependencies and consumers. Some projects appear in both modes through the same underlying record.
- **Project direction:** a continuous essay describing the intended simulation-only application, its hard requirements, product references and open implementation choices. Open `drone-autonomy-atlas.html#direction` to read it directly.
- Search covers every record, including reference-only entries. Sources, evidence boundaries and licensing live in project details. The reference menu opens the conversation audit, methodology and complete library. Compare up to four projects from their details.

Drag to pan, scroll or pinch to zoom, and use Fit or Overview to orient yourself. With the canvas focused, arrow keys pan, +/− zoom, F fits and Home shows the overview. Press / to search. On phones, assemblies use two columns and project details open as a bottom sheet.

Connections distinguish documented integration, optional integration, copied/adapted code, research lineage and evaluation. Internal directories remain part of their parent project. The atlas introduces problems and contributions without scoring projects against an assumed specification.

This is a source and paper review, not an independent build or flight reproduction. Evidence depth varies and is stated per project. It is a broad curated landscape, not an exhaustive repository inventory.

`dataset.json` contains records, typed edges, claim checks and sources. `../evidence/canvas-source-review.json` records the additional assembly review; the neighboring evidence folder preserves the original discovery and source audits. `browser-checks.json` records interface verification, which does not validate the drone software.

To rebuild from the project root:

```sh
python research/atlas/build_data.py
python research/atlas/build_html.py
```

The current interface sources are `canvas.template.html`, `canvas.css`, `canvas.js` and `project-direction.html`; `canvas_data.py` enriches the original inventory. `atlas.template.html` and `check_browser.mjs` are retained legacy sources and are not used by the current build. Typeface license notices are embedded and included in `fonts/`.

The current browser check is `node research/atlas/check_canvas.mjs 9337`, with a Chromium-compatible browser exposing its debugging port at 9337. It saves interaction results and desktop/mobile preview images.
