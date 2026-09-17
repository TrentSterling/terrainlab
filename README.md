# Tront Terrain Lab

Streamed, editable Surface Nets terrain in one HTML file. Carve, add, smooth, flatten, bridge, plant forests, call meteors, wake volcanoes, dig up a fossil.

Play: https://tront.xyz/terrainlab/

- Single file, Three.js r140 embedded, no build step, no CDN. Runs from `file://` too.
- World generation on a Web Worker pool (up to 16 auto, 32 manual), transferable buffers, predictive streaming.
- Live sculpting is a synchronous fast path: the brush edits resident density and remeshes affected cells in the same frame.
- Chunk seams match by construction (world-space sampling + halo samples, deterministic edge ownership). No skirts.
- Saves: JSON world, playable HTML snapshot, PNG photo, OBJ export of resident terrain.

Controls: WASD move, Ctrl run or boost, Space up or jump, double-tap Space to toggle Fly/Walk, Shift down or sneak, wheel = brush radius, Alt+wheel = flight speed, Esc releases the mouse.

`HANDOFF.md` is the tribal-knowledge document: the performance rules, the bugs that came back after "harmless" refactors, and the regression list. Read it before changing anything in `index.html`.

`tools/og-shot.mjs` renders the social image headlessly through Chrome DevTools Protocol (needs Node 20+ and Chrome).

Game code MIT, Trent Sterling. Three.js MIT, Three.js authors. Surface Nets after Mikola Lysenko's [Smooth Voxel Terrain part 2](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/).
