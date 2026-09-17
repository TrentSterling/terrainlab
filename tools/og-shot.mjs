// Capture 1200x630 in-engine OG candidates into tools/out/og-*.png.
// Scene: the volcanic digsite (fossil + dormant volcano), a few carved holes, then the volcano woken.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import {launch, sleep, until} from './cdp.mjs';
const root = path.resolve(import.meta.dirname, '..');
const server = http.createServer((req, res) => { res.writeHead(200, {'content-type': 'text/html'}); res.end(fs.readFileSync(path.join(root, 'index.html'))); }).listen(0);
const out = path.join(root, 'tools', 'out'); fs.mkdirSync(out, {recursive: true});
const W = 1200, H = 630;
const P = await launch({port: 9461, width: W, height: H});
await P.goto(`http://127.0.0.1:${server.address().port}/`);
await until(() => P.eval("!!window.__surfaceWorld && document.getElementById('loading').hidden"), {timeout: 60000, label: 'boot'});
await P.eval('__surfaceWorld.whenIdle(90000)');
console.log('booted', await P.eval('JSON.stringify(__surfaceWorld.stats())').then(s => s.slice(0, 300)));

// Hide every piece of chrome so the canvas fills the whole 1200x630 frame.
const hideChrome = `document.documentElement.style.setProperty('--header','0px');
 for (const s of ['.topbar','.dock-top','.dock-controls','.dock-history','.hud-position','#crosshair','#tool-hint','#loading','#event-pill','#fly-banner','#discovery-hud','#caption','.toast','#menu','#controls-drawer','#about','#inspect-panel','#sculpt-modes','.distance-widget','#resume','.vitals','.tool-dock']) document.querySelectorAll(s).forEach(e => e.style.setProperty('display','none','important'));
 window.dispatchEvent(new Event('resize')); 'ok'`;

// Digsite scene, then carve into the fossil pit and wake the volcano.
await P.eval('__earthworks.startDigsite()');
await P.eval('__surfaceWorld.whenIdle(90000)');
const fossil = await P.eval('JSON.stringify(__earthworks.discoveryReport())');
console.log('digsite', fossil.slice(0, 300));
const fp = JSON.parse(fossil);
const c = fp.position || fp.p || fp.center || [35, 20, 35];
for (let i = 0; i < 7; i++) {
  const a = i / 7 * Math.PI * 2, r = 5 + (i % 2) * 3;
  await P.eval(`__surfaceWorld.stampAt([${c[0] + Math.cos(a) * r}, ${c[1] + 1.5}, ${c[2] + Math.sin(a) * r}], false, 'sphere', 4.5)`);
  await sleep(60);
}
await P.eval('__surfaceWorld.flushLive(); 1');
await P.eval('__surfaceWorld.whenIdle(90000)');
await P.eval(hideChrome);
await sleep(600);
await P.shot(path.join(out, 'og-0-digsite.png'));

// Wake the volcano and shoot a few frames of the eruption.
await P.eval('__earthworks.wakeVolcano()');
for (let i = 1; i <= 8; i++) { await sleep(1500); await P.eval(hideChrome); await P.shot(path.join(out, `og-${i}-erupt.png`)); }
// Second angle: lower and closer, fossil pit in front, volcano behind.
const look = (pos, tgt) => `(()=>{const s=__surfaceWorld.snapshot();const d=[${tgt[0]}-${pos[0]},${tgt[1]}-${pos[1]},${tgt[2]}-${pos[2]}];const h=Math.hypot(d[0],d[2]);s.camera.position=[${pos.join(',')}];s.camera.rotation=[Math.atan2(-d[0],-d[2]),Math.atan2(d[1],h)];s.camera.nav='fly';__surfaceWorld.loadSnapshot(s);return 1})()`;
await P.eval(look([64, 27, 66], [10, 24, 30]));
await P.eval('__surfaceWorld.whenIdle(90000)');
await P.eval('__earthworks.wakeVolcano()');
for (let i = 9; i <= 20; i++) { await sleep(1500); await P.eval(hideChrome); await P.shot(path.join(out, `og-${i}-low.png`)); }
console.log('volcano', JSON.stringify(await P.eval('__earthworks.volcanoReport()')).slice(0, 300));
console.log('exceptions', P.logs.filter(l => /EXCEPTION|error/i.test(l)).slice(0, 10));
P.kill(); server.close(); process.exit(0);
