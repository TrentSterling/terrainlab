// Final geometry pass: highlands at 32 cells/chunk, a big cave mouth plus stacked box cuts, three display modes.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import {launch, sleep, until} from './cdp.mjs';
const root = path.resolve(import.meta.dirname, '..');
const server = http.createServer((req, res) => { res.writeHead(200, {'content-type': 'text/html'}); res.end(fs.readFileSync(path.join(root, 'index.html'))); }).listen(0);
const out = path.join(root, 'tools', 'out'); fs.mkdirSync(out, {recursive: true});
const P = await launch({port: 9467, width: 1200, height: 630});
await P.goto(`http://127.0.0.1:${server.address().port}/`);
await until(() => P.eval("!!window.__surfaceWorld && document.getElementById('loading').hidden"), {timeout: 60000, label: 'boot'});
await P.eval('__surfaceWorld.whenIdle(90000)');
const hideChrome = `document.documentElement.style.setProperty('--header','0px');
 for (const s of ['.topbar','.tool-dock','.hud-position','#crosshair','#tool-hint','#loading','#event-pill','#fly-banner','#discovery-hud','#caption','.toast','#menu','#controls-drawer','#about','#inspect-panel','#sculpt-modes','.distance-widget','#resume','.vitals']) document.querySelectorAll(s).forEach(e => e.style.setProperty('display','none','important'));
 window.dispatchEvent(new Event('resize')); 'ok'`;
const idle = () => P.eval('__surfaceWorld.whenIdle(120000)');
const snap = async (fn) => { await P.eval(`(()=>{const s=__surfaceWorld.snapshot();${fn};__surfaceWorld.loadSnapshot(s);return 1})()`); await idle(); };
const cam = (pos, tgt) => `const d=[(${tgt[0]})-(${pos[0]}),(${tgt[1]})-(${pos[1]}),(${tgt[2]})-(${pos[2]})],h=Math.hypot(d[0],d[2]);s.camera.position=[${pos.join(',')}];s.camera.rotation=[Math.atan2(-d[0],-d[2]),Math.atan2(d[1],h)];s.camera.nav='fly'`;
const shot = async (name) => { await P.eval(hideChrome); await sleep(500); await P.shot(path.join(out, `geo3-${name}.png`)); console.log('shot', name); };
const carve = async (p, r, shape = 'sphere') => { await P.eval(`__surfaceWorld.stampAt([${p.join(',')}], false, '${shape}', ${r})`); await sleep(30); };
await snap(`s.params.preset='highlands';s.params.n=32;s.edits=[];s.display.trees=true;s.display.edges='none';s.display.palette='natural';${cam([45, 60, 62], [0, 13, 0])}`);
const g = await P.eval('JSON.stringify(__surfaceWorld.groundAt(20,20))').then(JSON.parse); console.log('ground', JSON.stringify(g));
const [x, y, z] = g.point;
// Cave: wide mouth, tunnel bending left and down.
for (let i = 0; i < 9; i++) await carve([x - i * 2.4, y + 1 - i * 0.7, z - i * 1.6 - (i > 4 ? (i - 4) * 1.2 : 0)], i < 2 ? 5.2 : 4.2);
// Stair of box cuts to the right of the mouth.
for (let i = 0; i < 4; i++) await carve([x + 7 + i * 2.6, y + 2 - i * 1.3, z + 4 - i * 1.5], 2.4, 'box');
// A clean box notch above.
await carve([x - 3, y + 7, z - 9], 3, 'box');
await P.eval('__surfaceWorld.flushLive(); 1'); await idle();
await snap(cam([x + 13, y + 6, z + 12], [x - 3, y - 0.5, z - 3]));
await shot('quads-natural'.replace('quads', 'none'));
await snap(`s.display.edges='quads'`); await shot('quads-natural');
await snap(`s.display.edges='triangles';s.display.palette='chunks'`); await shot('tris-chunks');
await snap(`s.display.edges='quads';s.display.palette='clay'`); await shot('quads-clay');
// Closer, lower: from the stair looking into the mouth.
await snap(`s.display.edges='quads';s.display.palette='natural';${cam([x + 8, y + 3, z + 7], [x - 4, y - 1, z - 4])}`); await shot('quads-natural-close');
await snap(`s.display.edges='triangles';s.display.palette='chunks'`); await shot('tris-chunks-close');
console.log('exceptions', P.logs.filter(l => /EXCEPTION|error/i.test(l)).slice(0, 10));
P.kill(); server.close(); process.exit(0);
