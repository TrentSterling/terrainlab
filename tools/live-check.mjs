// Load the deployed page over HTTPS, confirm workers/streaming/carving/save paths work on the real origin.
import {launch, sleep, until} from './cdp.mjs';
const url = process.argv[2] || 'https://tront.xyz/terrainlab/';
const P = await launch({port: 9464, width: 1280, height: 800});
await P.goto(url);
await until(() => P.eval("!!window.__surfaceWorld && document.getElementById('loading').hidden"), {timeout: 90000, label: 'boot'});
await P.eval('__surfaceWorld.whenIdle(90000)');
const stats = await P.eval('JSON.stringify(__surfaceWorld.stats())');
const st = JSON.parse(stats);
console.log('origin', await P.eval('location.origin'), 'secure', await P.eval('isSecureContext'));
console.log('workers', st.streaming?.workers, 'generated', st.streaming?.generated, 'committed', st.streaming?.committed);
const before = await P.eval('JSON.stringify(__surfaceWorld.pick(640,500))');
await P.eval('__surfaceWorld.setTool("carve"); 1').catch(() => {});
const hit = JSON.parse(before);
if (hit) { await P.eval(`__surfaceWorld.stampAt([${hit.point.join(',')}], false, 'sphere', 5)`); await P.eval('__surfaceWorld.flushLive(); 1'); }
const after = await P.eval('JSON.stringify(__surfaceWorld.pick(640,500))');
console.log('carve moved surface', hit ? JSON.stringify({before: hit.point.map(v => +v.toFixed(2)), after: JSON.parse(after)?.point.map(v => +v.toFixed(2))}) : 'no hit');
const snap = await P.eval('(()=>{const s=__surfaceWorld.snapshot();return JSON.stringify({format:s.format,version:s.version,edits:s.edits.length,bytes:JSON.stringify(s).length})})()');
console.log('snapshot', snap);
console.log('loadSnapshot ok', await P.eval('(()=>{const s=__surfaceWorld.snapshot();__surfaceWorld.loadSnapshot(s);return true})()'));
await P.eval('__surfaceWorld.whenIdle(90000)');
console.log('seams', JSON.stringify(await P.eval('__surfaceWorld.auditSeams()')).slice(0, 200));
console.log('savePhoto threw?', await P.eval('(()=>{try{__surfaceWorld.savePhoto();return false}catch(e){return e.message}})()'));
console.log('savePlayableHTML threw?', await P.eval('(()=>{try{__surfaceWorld.savePlayableHTML();return false}catch(e){return e.message}})()'));
await sleep(1500);
console.log('toasts', await P.eval("[...document.querySelectorAll('.toast')].map(e=>e.textContent).join(' | ')"));
console.log('exceptions', P.logs.filter(l => /EXCEPTION|error/i.test(l)).slice(0, 10));
P.kill(); process.exit(0);
