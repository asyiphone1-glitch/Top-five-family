// yaya: העלאה חד־פעמית של תמונות למסך התצוגה (families/{code}/tvpic). הקבצים נמחקים אחרי ההרצה.
// תמונה שכבר קיימת בתצוגה (לפי טביעת אצבע חזותית קטנה) לא מועלית שוב.
import fs from 'node:fs';
import crypto from 'node:crypto';
import jpeg from 'jpeg-js';
const API_KEY = 'AIzaSyDo6MslDuYf2izjnZuzQfNxJ7WsXbV4hFE', PROJECT = 'y-task-ce5ba', MAX = 60;
const CODE = String(process.env.FAMILY_CODE || '').trim().toLowerCase().replace(/\s+/g, '');
const PRIV = String(process.env.VAPID_PRIVATE || '').trim();
const done = m => { console.log(m); fs.writeFileSync('push/tvpics.done', m + '\n'); };
if (!CODE || !PRIV) { done('חסרים סודות'); process.exit(0); }
const rtKey = () => crypto.createHash('sha256').update('yaya-rt:' + PRIV).digest();
const open = s => { const b = Buffer.from(s.trim(), 'base64'), d = crypto.createDecipheriv('aes-256-gcm', rtKey(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]); };
const rtOpen = s => { try { return open(s).toString('utf8'); } catch (e) { return null; } };
let KEY;
try {
  const priv = crypto.createPrivateKey({ key: open(fs.readFileSync('push/tvkey.sealed', 'utf8')), format: 'der', type: 'pkcs8' });
  KEY = crypto.privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(fs.readFileSync('push/tvpics.key', 'utf8').trim(), 'base64'));
} catch (e) { done('פתיחת המפתח נכשלה'); process.exit(0); }
const cand = [];
try { const x = rtOpen(fs.readFileSync('.state/rt', 'utf8')); if (x) cand.push(x); } catch (e) {}
try { const x = rtOpen(fs.readFileSync('push/rt.enc', 'utf8')); if (x) cand.push(x); } catch (e) {}
let token = null;
for (const rt of [...new Set(cand)]) {
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt) });
  if (r.ok) { token = (await r.json()).id_token; break; }
}
if (!token) { done('כניסת השרת נכשלה'); process.exit(0); }
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/families/${encodeURIComponent(CODE)}/tvpic`;
const H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
const b = fs.readFileSync('push/tvpics.enc');
const dc = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12)); dc.setAuthTag(b.subarray(b.length - 16));
const pics = JSON.parse(Buffer.concat([dc.update(b.subarray(12, b.length - 16)), dc.final()]).toString('utf8'));
// טביעת אצבע: 16x16 גווני אפור, ביט לכל משבצת מעל הממוצע
function fp(d) {
  try {
    const m = /^data:image\/jpe?g;base64,(.+)$/.exec(d); if (!m) return null;
    const im = jpeg.decode(Buffer.from(m[1], 'base64'), { useTArray: true, maxMemoryUsageInMB: 512 });
    const N = 16, v = new Float64Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, c = 0;
      for (let yy = Math.floor(y * im.height / N); yy < Math.floor((y + 1) * im.height / N); yy += 2)
        for (let xx = Math.floor(x * im.width / N); xx < Math.floor((x + 1) * im.width / N); xx += 2) {
          const i = (yy * im.width + xx) * 4; s += im.data[i] * .3 + im.data[i + 1] * .59 + im.data[i + 2] * .11; c++;
        }
      v[y * N + x] = c ? s / c : 0;
    }
    const avg = v.reduce((a, x) => a + x, 0) / v.length;
    return { bits: Array.from(v, x => x > avg ? 1 : 0), ar: im.width / im.height };
  } catch (e) { return null; }
}
const same = (a, b) => a && b && Math.abs(Math.log(a.ar / b.ar)) < .05 && a.bits.reduce((n, x, i) => n + (x !== b.bits[i]), 0) <= 20;
const have = []; let pt = '';
do { const r = await fetch(`${BASE}?pageSize=50${pt ? '&pageToken=' + encodeURIComponent(pt) : ''}`, { headers: H });
  if (!r.ok) { done('קריאה נכשלה ' + r.status); process.exit(0); }
  const j = await r.json(); for (const d of j.documents || []) have.push(fp(d.fields?.d?.stringValue || '')); pt = j.nextPageToken || ''; } while (pt);
let room = Math.max(0, MAX - have.length);
console.log('יש כבר ' + have.length + ' תמונות, מקום ל-' + room);
let ok = 0, dup = 0, full = 0, bad = 0; const t0 = Date.now();
for (let i = 0; i < pics.length; i++) {
  const f = fp(pics[i]);
  if (have.some(h => same(h, f))) { dup++; continue; }
  if (room <= 0) { full++; continue; }
  const fields = { who: { stringValue: 'fam' }, d: { stringValue: pics[i] }, at: { integerValue: String(t0 + i) }, by: { stringValue: 'dad' } };
  const r = await fetch(BASE, { method: 'POST', headers: H, body: JSON.stringify({ fields }) });
  if (r.ok) { ok++; room--; have.push(f); } else { bad++; console.log('תמונה ' + (i + 1) + ' נכשלה: ' + r.status); }
}
done(`נוספו ${ok}, כבר היו ${dup}, אין מקום ${full}, נכשלו ${bad}`);
