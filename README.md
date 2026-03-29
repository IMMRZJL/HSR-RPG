# Sydney to Wollongong High-Speed Rail Construction Simulator

A browser-based educational prototype for first-year Civil Engineering students. The game teaches project planning fundamentals in an Australian infrastructure context, with a focus on scheduling dependencies, budget control, team allocation, critical path awareness, and quarter-by-quarter review.

## Project overview

This prototype simulates planning and delivering a high-speed rail corridor between Sydney and Wollongong, NSW.

Core loop each quarter:
1. **Planning**: drag tasks from the task bank onto a quarter timeline.
2. **Execution**: advance one quarter and process task progress, costs, and team occupancy.
3. **Event**: apply one random NSW-themed event (positive or negative).
4. **Review**: explain critical path changes, float/slack impacts, budget movement, and risk trend.

Additional systems:
- Player stream selection (Geotechnical, Structural, Transport, Construction/PM, Environmental/Planning)
- Biannual recruitment windows with discipline bias and salary trade-offs
- Emergency active skills that reduce (but do not erase) event damage
- End-of-project scoring and outcome classification

## How to run locally

### Recommended (local web server)
Because the game loads JSON files with `fetch`, a local server is preferred.

Option A (Python):
```bash
python3 -m http.server 8000
```
Then open: `http://localhost:8000`

Option B (Node):
```bash
npx serve .
```

### Direct file open fallback
You can open `index.html` directly. If JSON `fetch` is blocked by browser security, the game automatically falls back to embedded sample data so the prototype still runs.

## Known limitations

- The critical path/slack model is simplified for teaching clarity, not full CPM precision.
- Task drag-and-drop supports single-start-quarter assignment per task (no splitting).
- Event impacts are intentionally bounded and abstracted.
- Character visuals/audio are placeholders only.
- No save/load persistence beyond current browser session state.

## Future Electron packaging notes

The project is intentionally flat and dependency-light so it can be wrapped later:
- Keep `index.html`, `style.css`, `app.js`, and `/data` as renderer assets.
- Add an Electron `main.js` bootstrap and point to local `index.html`.
- Replace placeholder assets progressively without changing game logic.
- Optional future improvements: persistent saves, richer map animations, expanded CPM analytics.
