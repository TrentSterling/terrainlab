// Close-up geometry candidates: presets x edge overlays, camera pulled in tight on a surface, into tools/out/geo-*.png.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import {launch, sleep, until} from './cdp.mjs';
const root = path.resolve(import.meta.dirname, '..');
const server = http.createServer((req, res) => { res.writeHead(200, {'content-type': 'text/html'}); res.end(fs.readFileSync(path.join(root, 'index.html'))); }).listen(0);
const out = path.join(root, 'tools', 'out'); fs.mkdirSync(out, {recursive: true});
const P = await launch({port: 9466, width: 1200, height: 630});
await P.goto(`http://127.0.0.1:${server.address().port}/`);
await until(() => P.eval("!!window.__surfaceWorld && document.getElementById('loading').hidden"), {timeout: 60000, label: 'boot'});
await P.eval('__surfaceWorld.whenIdle(90000)');
const hideChrome = `document.documentElement.style.setProperty('--header','0px');
 for (const s of ['.topbar','.tool-dock','.dock-top','.dock-controls','.dock-history','.hud-position','#crosshair','#tool-hint','#loading','#event-pill','#fly-banner','#discovery-hud','#caption','.toast','#menu','#controls-drawer','#about','#inspect-panel','#sculpt-modes','.distance-widget','#resume','.vitals']) document.querySelectorAll(s).forEach(e => e.style.setProperty('display','none','important'));
 window.dispatchEvent(new Event('resize')); 'ok'`;
const idle = () => P.eval('__surfaceWorld.whenIdle(120000)');
// Load a preset with display settings, camera at pos looking at tgt.
const setScene = async ({preset, n = 24, palette = 'natural', edges = 'none', pos, tgt, trees = true}) => {
  await P.eval(`(()=>{const s=__surfaceWorld.snapshot();s.params.preset='${preset}';s.params.n=${n};s.params.caves=true;s.edits=[];s.display.palette='${palette}';s.display.edges='${edges}';s.display.trees=${trees};s.display.shadows=true;
   const d=[(${tgt[0]})-(${pos[0]}),(${tgt[1]})-(${pos[1]}),(${tgt[2]})-(${pos[2]})],h=Math.hypot(d[0],d[2]);s.camera.position=[${pos.join(',')}];s.camera.rotation=[Math.atan2(-d[0],-d[2]),Math.atan2(d[1],h)];s.camera.nav='fly';__surfaceWorld.loadSnapshot(s);return 1})()`);
  await idle();
};
const shot = async (name) => { await P.eval(hideChrome); await sleep(500); await P.shot(path.join(out, `geo-${name}.png`)); console.log('shot', name); };
const carve = async (p, r, shape = 'sphere') => { await P.eval(`__surfaceWorld.stampAt([${p.join(',')}], false, '${shape}', ${r})`); await sleep(30); };
const ground = (x, z) => P.eval(`JSON.stringify(__surfaceWorld.groundAt(${x},${z}))`).then(JSON.parse);

// 1. Highlands hillside: carve a cave mouth into a slope, camera 9 m out, quads on and off.
await setScene({preset: 'highlands', pos: [45, 60, 62], tgt: [0, 13, 0]});
let g = await ground(20, 20); console.log('ground', JSON.stringify(g));
if (g) {
  const [x, y, z] = g.point;
  for (let i = 0; i < 7; i++) await carve([x - i * 2.2, y - 0.5 - i * 0.6, z - i * 1.4], 3.4);
  await carve([x + 5, y + 0.5, z + 3], 2.5, 'box'); await carve([x + 8, y, z - 4], 2, 'box');
  await P.eval('__surfaceWorld.flushLive(); 1'); await idle();
  const setCam = (pos, tgt) => P.eval(`(()=>{const s=__surfaceWorld.snapshot();const d=[(${tgt[0]})-(${pos[0]}),(${tgt[1]})-(${pos[1]}),(${tgt[2]})-(${pos[2]})],h=Math.hypot(d[0],d[2]);s.camera.position=[${pos.join(',')}];s.camera.rotation=[Math.atan2(-d[0],-d[2]),Math.atan2(d[1],h)];__surfaceWorld.loadSnapshot(s);return 1})()`).then(idle);
  await setCam([x + 9, y + 4, z + 9], [x - 2, y - 1, z - 2]); await shot('cave-natural');
  await P.eval(`(()=>{const s=__surfaceWorld.snapshot();s.display.edges='quads';__surfaceWorld.loadSnapshot(s);return 1})()`); await idle(); await shot('cave-quads');
  await P.eval(`(()=>{const s=__surfaceWorld.snapshot();s.display.edges='triangles';s.display.palette='chunks';__surfaceWorld.loadSnapshot(s);return 1})()`); await idle(); await shot('cave-tris-chunks');
  await P.eval(`(()=>{const s=__surfaceWorld.snapshot();s.display.edges='quads';s.display.palette='normals';__surfaceWorld.loadSnapshot(s);return 1})()`); await idle(); await shot('cave-quads-normals');
}
// 2. Islands: volumetric floating shelves and undercuts, close under a shelf.
await setScene({preset: 'islands', pos: [45, 62, 62], tgt: [0, 28, 0]});
let hit = await P.eval('JSON.stringify(__surfaceWorld.pick(600,315))').then(JSON.parse); console.log('islands hit', JSON.stringify(hit));
if (hit) { const [x, y, z] = hit.point; await setScene({preset: 'islands', pos: [x + 14, y + 6, z + 14], tgt: [x, y, z]}); await shot('islands-natural');
  await P.eval(`(()=>{const s=__surfaceWorld.snapshot();s.display.edges='quads';__surfaceWorld.loadSnapshot(s);return 1})()`); await idle(); await shot('islands-quads'); }
// 3. Canyon walls, close.
await setScene({preset: 'canyon', pos: [45, 60, 62], tgt: [0, 13, 0]});
hit = await P.eval('JSON.stringify(__surfaceWorld.pick(600,315))').then(JSON.parse); console.log('canyon hit', JSON.stringify(hit));
if (hit) { const [x, y, z] = hit.point; await setScene({preset: 'canyon', pos: [x + 12, y + 8, z + 12], tgt: [x, y + 1, z]}); await shot('canyon-natural');
  await P.eval(`(()=>{const s=__surfaceWorld.snapshot();s.display.edges='quads';__surfaceWorld.loadSnapshot(s);return 1})()`); await idle(); await shot('canyon-quads'); }
// 4. Caverns interior, headlamp.
await setScene({preset: 'caverns', pos: [45, 60, 62], tgt: [0, 13, 0]});
await P.eval("(()=>{const h=document.getElementById('headlamp');if(h&&!h.checked){h.click();}return 1})()");
hit = await P.eval('JSON.stringify(__surfaceWorld.pick(600,315))').then(JSON.parse); console.log('caverns hit', JSON.stringify(hit));
if (hit) { const [x, y, z] = hit.point; await setScene({preset: 'caverns', pos: [x + 10, y + 5, z + 10], tgt: [x, y, z]}); await shot('caverns-natural');
  await P.eval(`(()=>{const s=__surfaceWorld.snapshot();s.display.edges='quads';__surfaceWorld.loadSnapshot(s);return 1})()`); await idle(); await shot('caverns-quads'); }
console.log('exceptions', P.logs.filter(l => /EXCEPTION|error/i.test(l)).slice(0, 10));
P.kill(); server.close(); process.exit(0);
