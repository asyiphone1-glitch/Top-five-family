// yaya: העלאה חד־פעמית של תמונות למסך התצוגה (families/{code}/tvpic). הקובץ המוצפן והמפתח נמחקים אחרי ההרצה.
import fs from 'node:fs';
import crypto from 'node:crypto';
const API_KEY = 'AIzaSyDo6MslDuYf2izjnZuzQfNxJ7WsXbV4hFE', PROJECT = 'y-task-ce5ba', MAX = 60;
const CODE = String(process.env.FAMILY_CODE || '').trim().toLowerCase().replace(/\s+/g, '');
const PRIV = String(process.env.VAPID_PRIVATE || '').trim();
if (!CODE || !PRIV) { console.log('חסרים סודות'); process.exit(1); }
const rtKey = () => crypto.createHash('sha256').update('yaya-rt:' + PRIV).digest();
function rtOpen(s) { try { const b = Buffer.from(s.trim(), 'base64'), d = crypto.createDecipheriv('aes-256-gcm', rtKey(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); } catch (e) { return null; } }

// לחיצת יד: בהרצה הראשונה השרת יוצר זוג מפתחות ומפרסם רק את הציבורי. המפתח הפרטי נשמר מוצפן בסוד של GitHub.
function seal(buf) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', rtKey(), iv); const x = Buffer.concat([c.update(buf), c.final()]); return Buffer.concat([iv, c.getAuthTag(), x]).toString('base64'); }
function unseal(s) { const b = Buffer.from(s.trim(), 'base64'), d = crypto.createDecipheriv('aes-256-gcm', rtKey(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]); }
if (!fs.existsSync('push/tvkey.sealed') || !fs.existsSync('push/tvpics.key')) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 3072 });
  fs.writeFileSync('push/tvkey.pub', publicKey.export({ type: 'spki', format: 'pem' }));
  fs.writeFileSync('push/tvkey.sealed', seal(privateKey.export({ type: 'pkcs8', format: 'der' })) + '\n');
  console.log('נוצר מפתח. ממתין לקובץ התמונות.'); process.exit(0);
}
const priv = crypto.createPrivateKey({ key: unseal(fs.readFileSync('push/tvkey.sealed', 'utf8')), format: 'der', type: 'pkcs8' });
const KEY = crypto.privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(fs.readFileSync('push/tvpics.key', 'utf8').trim(), 'base64'));
const cand = [];
try { const raw = fs.readFileSync('.state/rt', 'utf8'); const x = rtOpen(raw); if (x) cand.push(x); } catch (e) {}
try { const x = rtOpen(fs.readFileSync('push/rt.enc', 'utf8')); if (x) cand.push(x); } catch (e) {}
let token = null;
for (const rt of [...new Set(cand)]) {
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt) });
  if (r.ok) { token = (await r.json()).id_token; break; }
}
if (!token) { console.log('כניסת השרת נכשלה'); process.exit(1); }
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/families/${encodeURIComponent(CODE)}/tvpic`;
const H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
const b = fs.readFileSync('push/tvpics.enc');
const dc = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12)); dc.setAuthTag(b.subarray(b.length - 16));
const pics = JSON.parse(Buffer.concat([dc.update(b.subarray(12, b.length - 16)), dc.final()]).toString('utf8'));
let have = 0, pt = '';
do { const r = await fetch(`${BASE}?pageSize=300&mask.fieldPaths=at${pt ? '&pageToken=' + encodeURIComponent(pt) : ''}`, { headers: H });
  if (!r.ok) { console.log('קריאה נכשלה ' + r.status); process.exit(1); }
  const j = await r.json(); have += (j.documents || []).length; pt = j.nextPageToken || ''; } while (pt);
const room = Math.max(0, MAX - have);
console.log('יש כבר ' + have + ' תמונות, מקום ל-' + room);
let ok = 0; const t0 = Date.now();
for (let i = 0; i < Math.min(room, pics.length); i++) {
  const fields = { who: { stringValue: 'fam' }, d: { stringValue: pics[i] }, at: { integerValue: String(t0 + i) }, by: { stringValue: 'dad' } };
  const r = await fetch(BASE, { method: 'POST', headers: H, body: JSON.stringify({ fields }) });
  if (r.ok) ok++; else console.log('תמונה ' + (i + 1) + ' נכשלה: ' + r.status);
}
console.log('נוספו ' + ok + ' מתוך ' + pics.length);
fs.writeFileSync('push/tvpics.done', 'נוספו ' + ok + '\n');
// run
