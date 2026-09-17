PROJECT HANDOFF — TRONT TERRAIN LAB + DIRTSTRUCK
================================================

You are inheriting two related browser projects from Trent Sterling / Tront.

PRIMARY PROJECT:
- Tront Terrain Lab 3.8 — Earthworks
- Current source file: surface-nets-world-earthworks.html
- THIS IS THE PROJECT TO PRIORITIZE.

SECONDARY PROJECT:
- DIRTSTRUCK
- Current source file: dirtstruck.html
- This is a new game prototype spun out of the terrain technology.
- It matters, but do not let work on Dirtstruck destabilize or replace Terrain Lab.

The immediate goal is relatively modest:
1. Understand the projects thoroughly.
2. Put them on GitHub Pages cleanly.
3. Make minor polish / deployment fixes.
4. Do not casually rewrite major working systems.
5. Preserve the behavior and performance lessons already learned the hard way.

These projects went through a LOT of iteration. The current files contain solutions to bugs that repeatedly came back when seemingly harmless refactors were made.

Please treat the notes below as tribal knowledge.


================================================
WHO / BRAND CONTEXT
================================================

The developer is Trent Sterling, aka Tront.

Main site:
https://tront.xyz/

Games:
https://tront.xyz/games/

Blog:
https://tront.xyz/blog/

GitHub:
https://github.com/TrentSterling

Terrain Lab should feel like a Tront technical experiment:
- fast
- direct
- systems-heavy
- minimal bullshit
- readable
- playful
- developer-oriented without looking like an internal debug tool

Do not make it look like a generic AI-generated SaaS dashboard.

Do not pepper it with inspirational slogans, giant explanation boxes, or unnecessary prose.

Earlier versions contained garbage text like:
- "Make it work."
- "A world, not a bigger block."
- "One file. All local."
- verbose descriptions repeated in several locations

Trent explicitly hated that.

UI philosophy:
- Every important button needs a readable TEXT LABEL.
- Do not use icon-only mystery buttons requiring hover.
- Do not use tiny text.
- Do not flood the screen with text either.
- If the UI feels text-heavy, REDUCE UI rather than shrinking text.
- Gameplay viewport gets priority.
- Advanced/debug controls belong in drawers/details panels.
- Main actions should be obvious without a tutorial.
- Normal text should not accidentally become selected while dragging/clicking the game.
- Actual text inputs must remain selectable/editable.
- Avoid clutter.
- Avoid giant persistent sidebars unless they are genuinely useful.
- Controls/About must be discoverable.

Trent likes programmer-art aesthetics and clean functional UI more than glossy fake-professional template styling.


================================================
PROJECT 1 — TRONT TERRAIN LAB
================================================

Terrain Lab began as a single-block Surface Nets demonstration and evolved into a large streamed editable world.

It is currently the stronger/more mature project.

DO NOT turn Terrain Lab into Dirtstruck.

Terrain Lab should remain an unrestricted terrain sandbox / technical playground.

Current version:
"Tront Terrain Lab 3.8 — Earthworks"

It is still intentionally a SINGLE HTML FILE with Three.js embedded.

That is an important feature.

No npm build is required to play it.
No CDN is required for Three.js.
It can run locally from file://.

For GitHub Pages, feel free to rename/copy it to:
terrain-lab/index.html

But preserve the self-contained nature unless there is a very compelling deployment reason not to.


================================================
TERRAIN ENGINE FUNDAMENTALS
================================================

The world is an implicit scalar/density field.

Surface Nets converts the scalar field to visible geometry.

Very roughly:

world-space scalar field
        ↓
sample density grid for a chunk
        ↓
detect active/crossed cells
        ↓
one representative vertex per active cell
        ↓
connect vertices around sign-changing grid edges
        ↓
quad topology
        ↓
triangles for WebGL

Terrain is NOT Minecraft cubes.

It is smooth editable terrain generated from density samples.

The scalar field is authoritative.
Chunk meshes are disposable render products.

This distinction is important.


================================================
CHUNK MODEL
================================================

Terrain Lab uses chunked terrain streaming.

Important parameters/concepts in the current implementation include:

- 24-unit chunks
- Five vertical world layers
- Historical vertical band around y = -48 to +72
- Configurable cells/chunk, including:
  - 16³
  - 24³
  - 32³
- View radius configurable up to 16 chunks
- Current default in Earthworks source is 7 chunks
- At radius 7 the requested visible region is approximately 360 × 120 × 360 metres
- Current UI can show much larger radii and Trent often runs beefy settings

Do not secretly lower terrain resolution or view distance in the name of performance.

Trent has a powerful desktop PC and explicitly prefers using available hardware.

Performance optimizations should increase throughput rather than quietly reducing fidelity.


================================================
CHUNK SEAMS / OWNERSHIP
================================================

Chunk borders were a major correctness concern.

The implementation uses world-space sampling and halo / ghost samples so neighboring chunks independently derive matching border vertices.

Sign-changing grid edge ownership is deterministic.

Neighboring chunks are expected to produce identical shared positions/normals.

There is/has been a chunk-border audit tool.

Do not introduce skirts to hide broken borders.

The intended solution is mathematically matching seams, not covering cracks cosmetically.


================================================
WORKER / STREAMING ARCHITECTURE
================================================

World generation is threaded with Web Workers.

This evolved significantly because early versions felt terribly slow despite low CPU utilization.

Important historical problems that were fixed:

1. The worker pool was originally capped too low.
2. Workers sometimes finished a job and sat idle until the next animation frame.
3. Streaming uploads were too aggressively throttled.
4. A global edit batch could starve incoming terrain.
5. Finished terrain could pile up and upload too much in one frame.
6. Streaming followed the player too reactively rather than predicting movement.

Current philosophy:

- Workers should immediately receive another job when they finish.
- Auto worker count should use the CPU aggressively but sensibly.
- Historical implementation supported up to 16 workers automatically and up to 32 manually.
- Worker results use transferable typed-array buffers.
- Streaming predicts player velocity.
- Prefetch is based on where the player is actually moving, including strafing/backwards movement.
- Mesh uploads are frame-budgeted so huge bursts do not cause giant main-thread spikes.
- Recently unloaded meshes can be cached in CPU memory to make reversals fast.
- Current historical cache target is roughly 128 MiB.
- Old visible terrain should not disappear before useful replacements are available when avoidable.
- Streaming should feel like the terrain is staying ahead of you.

DO NOT assume "more workers" is the only optimization.
Main-thread uploads, scene mutation, trees, shadows, and queue scheduling all caused hitches in older versions.


================================================
VERY IMPORTANT: LIVE SCULPTING IS A SEPARATE FAST PATH
================================================

The interactive terrain-editing path was deliberately separated from bulk chunk generation.

This was one of the biggest performance wins in the whole project.

DO NOT casually route live brushing back through full asynchronous chunk rebuilds.

Historical bad pipeline:

mouse brush
→ record edit
→ mark several chunks dirty
→ wait
→ worker rebuilds whole chunks
→ wait for batch
→ GPU upload
→ visible result

It felt awful.

Current intended live path is approximately:

brush sampled this rendered frame
        ↓
modify resident density values
        ↓
reevaluate affected cells / topology
        ↓
update affected mesh ranges
        ↓
render this same frame

Workers remain useful for:
- streaming
- cold chunk construction
- bulk regeneration
- some undo/rebuild operations

But interactive carving/addition should be local and synchronous enough to visibly update before rendering.


================================================
ABSOLUTE UX RULE: NO BRUSH RATE LIMIT
================================================

This is critical.

Earlier versions accidentally contained things like:
- ~95 ms brush stamping throttles
- ~65 ms batching delay
- delayed edit publishing

Trent hated this.

If the game is rendering at 60 Hz, held carving should have an opportunity to modify terrain on every rendered frame.

Never intentionally cap carving to 10 Hz, 20 Hz, etc. just to make profiling easier.

If performance is too expensive:
OPTIMIZE THE WORK.

Do not make the tool feel broken.


================================================
HELD CARVE INPUT — DO NOT REGRESS
================================================

This took several passes to get correct.

LEFT MOUSE DOWN means:
"I am firing the carve tool until I release left mouse."

A failed raycast does NOT mean the trigger was released.

If the player is holding the button and moves the aim:

terrain → hole → empty air → terrain

the laser must:
- stay armed through the miss
- keep checking every rendered frame
- immediately resume carving when terrain is hit again
- require NO second click

Bugs that previously broke this:
- mousemove's buttons mask being interpreted incorrectly
- releasing another mouse button canceling left fire
- pointer-lock acquisition clearing held input
- tool-switch functions calling broad clearInput()
- zero-width center ray falling through the newly cut hole

Current carving also tries to maintain brush contact around the rim of a hole rather than relying only on a zero-width center ray.

The carving brush has width.
The hit logic should behave like a brush, not like a rifle bullet.

Short target motion can be swept/interpolated so fast mouse movement does not leave gaps.

However:
DO NOT carve huge tunnels between unrelated distant surfaces.
Continuity should only bridge local target motion.


================================================
ADD TOOL
================================================

Add is historically one of the smoothest tools.

Use its responsiveness as the standard Carve should match.

Important fixed bug:
When walking and adding terrain underneath the player, the capsule could become completely embedded inside the new solid density field and fall through / trigger world recovery.

Current intended behavior:
- Building under yourself lifts you onto the newly created surface in the same frame.
- If the required lift would push the player into a ceiling, reject that addition rather than burying or teleporting the player.
- Carving away support should still naturally make the player fall.

Do not regress this.


================================================
MOVEMENT
================================================

Terrain Lab intentionally ended up with only TWO movement modes:

FLY
WALK

Orbit/editor-camera mode was explicitly removed.

Default is Fly.

Double-tap Space switches between Fly and Walk.

Important behavior:
Changing modes changes movement rules.
It does NOT respawn/reposition the player.

Fly → Walk:
- preserve exact world position
- preserve look direction
- preserve XYZ momentum
- gravity begins acting naturally
- if high in the air, fall from that height
- do not snap to terrain

Walk → Fly:
- preserve position
- preserve look
- preserve current motion, including jumping/falling momentum

Air control should not silently erase inherited horizontal velocity.

High-speed movement/collision has had extra substeps to reduce tunneling.


================================================
MOVEMENT INPUT
================================================

Recent control direction was deliberately Minecraft-ish / simple.

Typical intended controls:

WASD — move
Ctrl — run / flight boost
Space:
- Walk: jump
- Fly: move upward
Double Space:
- toggle Fly / Walk
Shift:
- Fly: move downward
- Walk: slower/sneak behavior depending current implementation

Esc:
- release pointer lock

Menus should clearly allow resuming mouse capture.

Do not make the player repeatedly fight pointer lock just to change basic modes/settings.


================================================
SCROLL WHEEL
================================================

Important UX choice:

SCROLL WHEEL SHOULD NOT SWITCH TOOLS.

That felt terrible.

Current intended behavior:
- wheel = brush radius
- Alt + wheel = flight speed
- dedicated speed slider may also be visible
- radius slider should remain conveniently near the tools

Scrolling while holding the carve trigger must NOT:
- stop firing
- finish the stroke
- lose target continuity
- deselect the tool


================================================
TERRAIN LAB MAIN TOOLS
================================================

The current dock is intentionally compact.

Core categories:

1. Carve
2. Add
3. Powers
4. Forest

Undo/Redo nearby.

Do not grow this back into a 10-button god-power toolbar casually.


================================================
CARVE / ADD EARTHWORK OPERATIONS
================================================

Earthworks added secondary sculpt modes around the basic terrain tools:

BRUSH
- existing continuous carve/add behavior

SMOOTH
- modifies the actual density field
- not merely normals/shading

FLATTEN
- uses the initial contact height for the stroke
- useful for pads, paths, excavation cleanup

RAMP / BRIDGE
- two-point placement
- creates actual editable solid terrain
- supports sloped spans
- can be carved after creation
- should be walkable terrain, not a decorative mesh

These systems are technically impressive but should remain secondary to immediate Carve/Add UX.


================================================
KNOWN ISSUE: SMOOTH HISTORY LIMIT
================================================

This is a known unresolved design/implementation issue in Terrain Lab 3.8.

There is a hardcoded smoothing patch history limit.

Earthworks stores smoothing operations as patches of density deltas.

The current logic counts stored patch sample values and stops allowing smoothing once approximately 4,000,000 samples are stored.

With large brushes this can happen surprisingly quickly.

The warning currently says something like:
"Smoothing history is full. Save or start a new world."

THIS MESSAGE IS MISLEADING.

Saving does not magically erase the smoothing history.
Loading the world rebuilds the same history and counter.

Do NOT simply tell the player to save if it does not solve the problem.

Long-term correct architecture:
- decouple persistent terrain state from infinite undo history
- bake/checkpoint older operations into chunk field state
- keep a bounded recent undo stack
- preserve resulting terrain even when older individual operations stop being undoable

Alternative shorter-term optimizations:
- store smoothing patch deltas sparsely
- store only meaningful changed samples
- compress patches
- coalesce consecutive smoothing operations
- increase limit only if memory use is measured and safe

Do not fix this by silently disabling Smooth or lowering its update rate.


================================================
TREES / FOREST
================================================

Trees caused several performance and correctness bugs historically.

Old architecture had one giant global instanced-tree list.

Terrain chunks could become invisible while their trees remained visible until the chunk was physically evicted from cache.

Result:
floating / lingering forests.

This was fixed by tying rendered tree visibility to chunk visibility while allowing underlying cached tree data to survive for quick return.

Principle:
CACHED WORLD DATA != CURRENTLY DRAWN OBJECTS

Trees should:
- disappear in the same rendered frame as their terrain is culled
- not wait for chunk eviction
- not cause a full global instance rebuild unnecessarily
- not upload instance data every stationary frame

Tree storage historically grew beyond the old fixed 4096-tree ceiling.

Forest tool was improved from simply deleting vegetation.

Current Forest behavior:
- Left click: plant trees on suitable terrain
- Right click: clear trees
- changes persist in world saves
- same spot should not accumulate infinite duplicate trees
- clearing a tree can show a short falling visual
- tree collision should disappear immediately when cleared
- cached/in-flight generation must not resurrect a tree intentionally removed by an edit


================================================
SHADOWS
================================================

This was another repeatedly regressed system.

At one point "Live" shadows secretly:
- waited ~450 ms
- required no chunk upload that frame
- waited for settled motion

Trent explicitly rejected that.

Current desired behavior:
When geometry or relevant trees visibly change, their shadow update should happen immediately / in the same visible frame whenever practical.

Do not hide perceived latency behind "performance friendly" delayed shadows.

Also:
do not blindly redraw shadow maps on every unchanged frame.

The correct principle is:
NO CHANGE → reuse shadow map
VISIBLE CHANGE → refresh immediately

Realtime shadows are the intended default.


================================================
FOG
================================================

Trent hated the heavy fog.

The current project should effectively have no oppressive distance fog.

Earlier versions looked like murky green soup.

Do not bring that aesthetic back.

A clear horizon is preferred.

If some edge transition is required for streaming, keep it subtle.


================================================
VIEW DISTANCE
================================================

This increased substantially after streaming performance improved.

Earthworks source currently exposes:
- minimum around 2 chunks
- maximum 16 chunks
- default 7 chunks

Trent frequently runs near/max settings on his desktop and found performance good.

The current source displays approximately:
7 chunks → 360 × 120 × 360 m requested region

At max 16, the region becomes very large.

Do not hardcode the deployment to a tiny conservative radius because you assume all players have weak PCs.

Auto settings are acceptable, but Trent likes the ability to crank the game.

If you change defaults:
be conservative and test.

Do not lower terrain resolution as a hidden view-distance optimization.


================================================
GPU / THREE.JS CONTEXT
================================================

This project is currently WebGL / Three.js.

The major historical performance problems were NOT simply:
"Three.js is slow, switch to WebGPU."

The big wins came from:
- worker utilization
- immediate worker refeeding
- predictive streaming
- bounded GPU uploads
- local live meshing
- avoiding global tree updates
- correct cache/render separation
- avoiding hidden edit timers

Do not propose a giant WebGPU rewrite as a minor deployment task.

Terrain Lab already demonstrates that the current approach can run extremely well.

A WebGPU rewrite may be interesting later, but it is not the current objective.


================================================
POWERS / DISASTERS
================================================

"Powers" replaced several redundant individual weapons.

Current interesting powers include:

METEOR
- visible incoming projectile
- impact effects
- actual crater edit

BOMBS
- ballistic projectile
- gravity
- craters

VOLCANO
- actual terrain construction
- not merely a decorative cone

Volcano evolved into an interactive terrain system:
- generates a cone/chamber/vent
- has pressure/buildup
- can erupt
- plugging the summit should build pressure
- carving a side vent should redirect the eruption
- sufficiently blocked volcano can rupture through terrain
- magma/lava visuals are not full fluid simulation

There are also:
- meteor showers / "hell rain"
- stress bomb tests
- optional effects/debris/audio/shake

These are sandbox spectacle.
Do not let them overwhelm the core terrain-editing UI.


================================================
FOSSIL / EXCAVATION ACTIVITY
================================================

Earthworks includes a buried fossil/digsite activity.

The idea:
- give the terrain tech something interesting to uncover
- bones stay intact while surrounding terrain is removed
- scanner gives directional information
- player excavates around a large buried skeleton
- fossil is a protected landmark mesh, not voxelized destructible bone
- collision exists
- rendering was batched rather than one draw call per bone

There is/has been:
- "Volcanic digsite · new world"
- "Bury fossil here"
- remove fossil
- scanning
- exposed-section progress

This is a side activity.

Do not turn the whole Terrain Lab into a fossil game.


================================================
CORE HUNT
================================================

Another optional sandbox activity:
- three buried cores
- markers / scanning
- excavate to them
- approach after creating a real path / clearance
- collect them
- progression/timer saved

Important historical fix:
Missing collision data because a chunk is still loading must NOT count as a clear path to an objective.


================================================
SAVING / PERSISTENCE — TERRAIN LAB
================================================

Terrain Lab has an edit journal separate from the seed/generator.

It can save/load JSON.

Current Earthworks validation supports save format versions up through version 4.

World saves can include:
- seed / generator params
- view distance
- terrain edits
- camera state
- movement/tool state
- display settings
- planted/removed vegetation
- volcano edits/state where relevant
- fossil/discovery state
- activity state where supported

It also has/had:
- Save playable HTML
- Save photo PNG
- OBJ export of resident terrain

"Save playable HTML" is a useful feature:
the resulting HTML can embed the current world/camera so someone can send a self-contained modified scene.

Preserve backwards compatibility with old Terrain Lab saves if making deployment tweaks.

DO NOT mix Dirtstruck saves with Terrain Lab saves.


================================================
TERRAIN LAB PERFORMANCE RULES
================================================

Please protect these:

- Do not add brush timers.
- Do not defer live sculpt publication unnecessarily.
- Do not force live editing through worker round trips.
- Do not run expensive full-scene bookkeeping after every tiny edit.
- Do not rebuild all tree instances every edit.
- Do not make invisible cached trees render.
- Do not wait hundreds of milliseconds for shadows after edits.
- Do not kill/recreate the entire worker pool casually.
- Do not let stopped workers leave chunks permanently marked busy.
- Do not block incoming streamed terrain behind long edit batches.
- Do not dump huge numbers of GPU buffers into one frame if they can be paced.
- Do not make input depend on successful ray hits.
- Do not clear held trigger state because another mouse button changed.
- Do not make pointer lock transitions erase movement/trigger state.
- Do not trade responsiveness away for prettier benchmark numbers.


================================================
TERRAIN LAB UI RULES
================================================

Trent has repeatedly emphasized:

NO ICON-ONLY BUTTONS FOR IMPORTANT ACTIONS.

NO TINY TEXT.

NO GENERIC AI COPY.

NO POINTLESS TEXT BOXES.

NO TEXT SELECTION WHILE PLAYING.

Do:
- readable labels
- decent target sizes
- visible About button
- clear Controls button
- compact tool dock
- radius near tools
- speed near tools when useful
- advanced tech settings hidden in drawers
- diagnostics behind F3/details
- make gameplay viewport the focus

Keep branding modest:
Tront Terrain Lab
Trent Sterling / tront.xyz
link to tront.xyz
link to games/blog/GitHub where appropriate

About text should explain:
- why the demo exists
- Surface Nets at a high level
- workers/chunk streaming
- live density editing
- inspiration/sources

Useful source reference:
0fps — Smooth Voxel Terrain Part 2
https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/

And of course:
https://threejs.org/


================================================
GITHUB PAGES PLAN — TERRAIN LAB
================================================

Suggested deployment:

/terrain-lab/
    index.html
    og-image.png

Use the current Terrain Lab HTML as index.html.

It should work without a build step.

Verify:
- relative asset URLs
- OG canonical URLs
- og:image URL
- favicon if added
- tront.xyz backlinks
- mobile viewport
- pointer lock
- downloads from HTTPS GitHub Pages
- Save JSON
- Load JSON
- Save photo
- Save playable HTML
- OBJ export if retained

Likely eventual public URL:
https://tront.xyz/terrain-lab/

But do not assume Trent's redirect/domain config.
GitHub Pages might initially use the repository Pages URL.

Make canonical/social URLs configurable or correct them once the deployment URL is known.

The OG image should be an ACTUAL good in-engine screenshot, ideally:
- broad terrain
- obvious excavation / caves
- maybe volcano/fossil
- no debug UI
- 1200×630
- readable at thumbnail size

Do not use a generic generated illustration if an in-engine screenshot looks good.


================================================
DO NOT REMOVE TERRAIN LAB JUST BECAUSE DIRTSTRUCK EXISTS
================================================

Terrain Lab and Dirtstruck now have different purposes.

Terrain Lab:
"Look what this terrain technology can do."

Dirtstruck:
"Can this terrain technology support a satisfying game?"

Both are worth keeping.


================================================
PROJECT 2 — DIRTSTRUCK
================================================

This is secondary for this handoff.

Current source:
dirtstruck.html

Working title:
DIRTSTRUCK

Funny alternate / lineage name Trent likes:
BUTTLOADS 2: Deepening

The original BUTTLOADS! was an older Motherload-inspired mining game Trent made around 2015.

Original was effectively 2.5D:
- 3D models
- 2D gameplay

Dirtstruck is the modern first-person spiritual successor, NOT a direct port.


================================================
DIRTSTRUCK DESIGN GOAL
================================================

Terrain Lab was cool tech but not inherently a compelling game.

Dirtstruck exists to test a focused loop:

DIG
→ expose valuables
→ collect valuables
→ return to workshop
→ sell
→ buy meaningful upgrade
→ dig deeper
→ discover something strange

The question for playtesting is:

"After the first sale and upgrade, does the player voluntarily want to go back down?"

That matters more than adding more terrain features.


================================================
DIRTSTRUCK SCOPE
================================================

This should stay MUCH leaner than Terrain Lab.

Do not copy every Terrain Lab slider/tool/power into it.

Current idea:
- first-person
- one small backyard / excavation claim
- progression mostly downward
- small workshop at surface
- finite prototype depth
- resources underground
- upgrades
- buried destination / core
- actual ending

Current prototype is roughly:
- ~20 × 20 m excavation claim
- ~44 m playable depth
- small fenced/workshop surface
- not an infinite exploration game yet

Whether the eventual game becomes infinitely deep is undecided.

Do not prematurely expand X/Z into a huge procedural world.


================================================
DIRTSTRUCK CURRENT LOOP
================================================

Current prototype includes:

RESOURCES
- Copper
- Iron
- Crystal

DIGGING
- continuous held cutter
- expose resources by removing soil/rock
- collection when reachable/exposed
- soil does not consume cargo
- cargo fills with valuables

SURFACE
- ore hopper sells cargo
- workshop upgrades

UPGRADES
- Cutter
- Cargo / bag
- Scanner

OBJECTIVE
- buried signal core
- reach it
- recover it
- bring it home / deliver it
- prototype completion state

The loop has been tested through:
- mine copper
- fill cargo
- return to surface
- sell
- buy first cutter upgrade
- descend again
- recover core
- finish


================================================
DIRTSTRUCK CONTROLS / PLAYER
================================================

First-person only.

Typical current controls:

WASD — move
Shift — run
Hold left mouse — dig
Space — jump / upward thruster
E — interact / sell / workshop / recover
F — scanner
Esc / Tab — menus

The upward thruster is intentionally generous/fuel-free in the first prototype.

Why:
getting out of the player's own hole should not be the boring/frustrating part while testing whether the mining loop is fun.

Do not add:
- stamina
- oxygen
- fuel
- repair durability
- hunger

until the core dig/sell/upgrade loop has proven fun.


================================================
DIRTSTRUCK DIGGING FEEL
================================================

This should inherit the most important Terrain Lab lesson:

WEAK STARTER EQUIPMENT MUST STILL FEEL RESPONSIVE.

Progression can reduce:
- cut radius
- penetration speed
- resistance against deep material

But do not simulate a weak tool by dropping input updates or making the cursor randomly fail.

Held dig should behave continuously.

If the center of a shaft opens, brush contact should continue catching the rim sufficiently to make traversable tunnels rather than leaving snaggy collars everywhere.


================================================
DIRTSTRUCK HUD
================================================

Keep it game-like.

Useful persistent information:
- Money
- Cargo
- Cargo value
- Depth
- current objective / interaction

Do NOT expose:
- worker count
- chunk count
- mesh upload budget
- raw density field options
- Surface Nets placement mode
- view radius tuning
- terrain debug parameters

Those belong in Terrain Lab.


================================================
DIRTSTRUCK SAVES
================================================

Dirtstruck has its own save format.

Do not accept Terrain Lab saves.

Current save contains things like:
- game state
- money
- cargo
- upgrades
- collected resource IDs
- current terrain field
- player position
- settings

Current implementation uses IndexedDB for local browser persistence when available.

It also supports JSON export/import.

Keep a portable export even if browser-local save is working.

GitHub Pages should allow IndexedDB normally, but verify on the deployed origin.

Current DB name historically resembles:
tront-dirtstruck-v1


================================================
DIRTSTRUCK GITHUB PAGES PLAN
================================================

Suggested:

/dirtstruck/
    index.html
    og-image.png

Again:
single-file game is fine.

Do not bundle Terrain Lab's giant sandbox menus into this page.

For OG:
show the backyard excavation/workshop and a deep hole / resource vein.

Potential description:
"Dig beneath your backyard, sell what you find, upgrade your gear, and follow the signal deeper."

Working title can remain DIRTSTRUCK unless Trent changes it later.


================================================
QA / PLAYTEST PHILOSOPHY
================================================

These projects have been repeatedly improved by actually testing behavior rather than merely reading code.

Please do browser automation / Playwright style testing when making changes.

Do NOT just load the page and say:
"no console errors, done."

Useful Terrain Lab regression cases:

1. Initial terrain loads completely.
2. Fly rapidly several chunks away.
3. Return to exact original location.
4. Original terrain returns.
5. No chunks stay permanently missing.
6. Trees disappear with hidden terrain.
7. Trees return correctly from cache.
8. Hold Carve over terrain.
9. Keep holding while aiming through the newly opened hole.
10. Sweep onto another nearby surface.
11. Carving resumes without reclick.
12. Add terrain continuously.
13. Walk on freshly added terrain.
14. Add underneath player.
15. Player rises onto surface instead of becoming embedded.
16. Attempt Add under low ceiling.
17. Player does not teleport through ceiling.
18. Fly high.
19. Toggle Walk.
20. Player falls naturally from existing altitude.
21. Toggle back to Fly while falling/jumping.
22. Momentum carries through.
23. Scroll wheel while firing.
24. Brush radius changes.
25. Trigger remains held.
26. Alt+wheel changes fly speed.
27. Save world.
28. Modify terrain.
29. Load save.
30. Geometry/state restores.
31. Edit at a chunk seam.
32. Neighbor borders remain exact.
33. Plant/clear trees.
34. Travel away and back.
35. Tree changes persist.
36. Spawn meteor/bomb.
37. crater occurs.
38. undo.
39. terrain restores.
40. Volcano interaction works.
41. Save playable HTML if retained.
42. Open exported HTML.
43. Embedded world restores.
44. UI at desktop, 1440-ish.
45. narrow desktop.
46. phone portrait.
47. phone landscape.
48. No important button becomes icon-only.
49. No accidental text selection during gameplay.
50. No tiny unreadable control labels.

Useful Dirtstruck regression:
- new claim
- dig
- collect copper
- fill/sell haul
- buy first upgrade
- save
- reload
- hole persists
- mined ore stays mined
- upgrades persist
- core remains correctly recovered/unrecovered
- return from deep hole
- collision with workshop
- hold cutter through center-ray misses
- responsive HUD/modal at phone/desktop sizes


================================================
DEBUGGING HISTORY / BUGS TO WATCH FOR
================================================

If something feels "stuttery" despite 60 FPS:
do not trust the FPS counter alone.

Historically causes included:
- frame-time spikes
- giant GPU buffer uploads
- scene mutation bursts
- shadow refresh scheduling
- worker starvation
- tree instance rebuilds
- mouse target discontinuity
- edit batching latency

Measure:
- p95 frame interval
- p99
- worst frame
- worker duty
- generation throughput
- ready/upload queue
- bytes uploaded per frame
- live sculpt CPU time
- cells visited
- chunks touched

60 average FPS can still feel awful if every few frames stalls.


================================================
SOURCE STYLE
================================================

Both files are large, single-file projects.

They are not textbook architecture.

Before refactoring, understand why systems are separated.

Especially avoid "cleanup" that:
- merges live editing back into worker chunk generation
- centralizes every input reset into one function
- rebuilds all world props after every edit
- makes state easier to read but loses hot-path performance
- removes generation IDs / epochs / stale-result checks
- changes deterministic border ownership

This code has scars for reasons.


================================================
DEPLOYMENT REQUEST FOR THIS HANDOFF
================================================

Trent is handing you ONLY the latest source files.

Your immediate work is primarily:

TERRAIN LAB:
- get it cleanly onto GitHub Pages
- do small polish fixes
- verify UI/controls
- verify meta tags / OG
- ensure Tront branding/backlinks are correct
- run regression tests after any edits
- preserve performance and behavior

DIRTSTRUCK:
- also put it on GitHub Pages
- minor deployment polish
- treat it as an early prototype
- do not spend the Terrain Lab handoff rewriting Dirtstruck into a bigger game

Nothing needs a giant new framework.

Do not convert these to React/Vite/etc. unless Trent explicitly asks.

Their self-contained HTML nature is part of the appeal.


================================================
SUGGESTED REPOSITORY LAYOUT
================================================

If using one GitHub Pages repo:

/
  index.html              optional landing page
  terrain-lab/
    index.html
    og-image.png
  dirtstruck/
    index.html
    og-image.png

Landing page can be extremely simple:
- Terrain Lab
- Dirtstruck
- link back to tront.xyz

Or each can live in its own repository if Trent prefers.

Do not overengineer.


================================================
WHAT "DONE" MEANS FOR THE GITHUB PAGES PASS
================================================

Terrain Lab:
- deployed URL loads directly
- no mixed-content / CDN failures
- pointer lock works
- worker creation works under HTTPS/CSP
- terrain loads
- rapid flight streaming works
- Carve/Add work continuously
- text isn't selectable while playing
- view distance works
- Fly/Walk switching works
- trees cull correctly
- shadows update on edits
- JSON save/load works
- photo export works
- playable HTML export works if retained
- About/Controls are obvious
- no icon-only mystery buttons
- mobile layout doesn't hide critical actions
- OG preview points at a real image

Dirtstruck:
- deployed URL loads
- IndexedDB local save works on actual origin
- export/import works
- pointer lock works
- first dig/sell/upgrade loop works
- no Terrain Lab debug/editor UI leaked in
- OG preview exists
- mobile UI at least lays out sanely even if mouse/keyboard is primary


================================================
PRODUCT DIRECTION — IMPORTANT
================================================

Terrain Lab is ALREADY A GOOD TERRAIN TOY.

Do not feel obligated to make it "a game."

It can remain:
- tech demo
- terrain playground
- portfolio project
- Surface Nets showcase
- destruction sandbox

Dirtstruck is where the game-design pressure belongs.

This distinction is deliberate.


================================================
CURRENT PRIORITIES
================================================

Priority 1:
Do not break Terrain Lab.

Priority 2:
Deploy Terrain Lab cleanly.

Priority 3:
Small UI polish / obvious deployment fixes.

Priority 4:
Deploy Dirtstruck.

Priority 5:
Only after everything is stable, discuss larger changes with Trent.


================================================
PERSONAL PREFERENCE / COMMUNICATION
================================================

Trent is an experienced Unity/C#/VR/network programmer.

Do not explain ordinary programming concepts to him like he's a beginner.

He likes:
- direct answers
- concrete measurements
- profiling
- actual browser QA
- diff review
- straightforward code
- performance evidence
- testing real behavior, not just harness assertions

He dislikes:
- fake confidence
- generic "best practices" replacing measured behavior
- massive rewrites without need
- hiding performance problems with lower settings
- UX regressions from "optimization"
- icon-only UI
- microscopic text
- excessive AI-generated explanatory copy
- promises that something was tested when it wasn't

When changing something important:
state what changed, why, and what was actually tested.

If you're not sure whether a weird implementation exists for a reason:
ASK OR INVESTIGATE before deleting it.


================================================
ONE-SENTENCE SUMMARY
================================================

Terrain Lab is a high-performance, chunk-streamed Three.js Surface Nets sandbox whose core identity is immediate per-frame terrain editing and aggressive streaming; Dirtstruck is the intentionally lean first-person mining game being built from that technology.

PLEASE PRIORITIZE PRESERVING TERRAIN LAB'S HARD-WON RESPONSIVENESS OVER CLEANING UP ITS CODE.