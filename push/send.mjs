// yaya: שולח התראות לטלפונים. רץ ב-GitHub Actions כל 5 דקות.
// קורא משימות ותורנויות מ-Firestore, ושולח למי שהגיע הזמן שלו.
import webpush from 'web-push';
import fs from 'node:fs';

const API_KEY = 'AIzaSyDo6MslDuYf2izjnZuzQfNxJ7WsXbV4hFE';
const PROJECT = 'y-task-ce5ba';
const VAPID_PUB = 'BP2DfRuPoADshH2Pa1jkpdeTA0id0OvlMayYX1E7G5oDirf1hOK9jccPk7ttX0cQeiXWhYyNQU1ZcKcFlSo1hig';
const SITE = 'https://asyiphone1-glitch.github.io/Top-five-family/';
const TZ = 'Asia/Jerusalem';
const WINDOW = 45 * 60e3;          // שולחים עד 45 דקות אחרי הזמן (GitHub מתעכב לפעמים)
const KIDS = ['ziv', 'roni', 'hili', 'aviv'];
const DOGT = { a: [17, 30, '17:30'], b: [20, 0, '20:00'], n: [22, 0, '22:00'] };
const ADV0 = { r_dogring: 'yes', r_pre10: 'yes' };
const STATE = '.state/rt';
const DRY = process.env.DRY_RUN === '1';

const CODE = String(process.env.FAMILY_CODE || '').trim().toLowerCase().replace(/\s+/g, '');
const PRIV = String(process.env.VAPID_PRIVATE || '').trim();
if (!CODE || !PRIV) { console.log('חסרים FAMILY_CODE או VAPID_PRIVATE בהגדרות הסודות של GitHub.'); process.exit(1); }
webpush.setVapidDetails(SITE, VAPID_PUB, PRIV);

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
let token = null;

async function signIn() {
  let rt = null;
  try { rt = fs.readFileSync(STATE, 'utf8').trim(); } catch (e) {}
  if (rt) {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt)
    });
    if (r.ok) { const j = await r.json(); token = j.id_token; save(j.refresh_token); return; }
  }
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}'
  });
  if (!r.ok) throw new Error('כניסה ל-Firebase נכשלה: ' + r.status + ' ' + await r.text());
  const j = await r.json(); token = j.idToken; save(j.refreshToken);
}
function save(rt) { try { fs.mkdirSync('.state', { recursive: true }); fs.writeFileSync(STATE, rt); } catch (e) {} }

const H = () => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' });
const enc = s => s.split('/').map(encodeURIComponent).join('/');

function val(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('mapValue' in v) return obj(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  return null;
}
const obj = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, val(v)]));
const idOf = d => d.name.split('/').pop();

async function getDoc(path) {
  const r = await fetch(`${BASE}/${enc(path)}`, { headers: H() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('קריאה נכשלה ' + path + ': ' + r.status);
  return obj((await r.json()).fields);
}
async function list(path) {
  const out = []; let pt = '';
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${BASE}/${enc(path)}?pageSize=300${pt ? '&pageToken=' + encodeURIComponent(pt) : ''}`, { headers: H() });
    if (!r.ok) throw new Error('קריאה נכשלה ' + path + ': ' + r.status);
    const j = await r.json();
    (j.documents || []).forEach(d => out.push(Object.assign({ id: idOf(d) }, obj(d.fields))));
    if (!j.nextPageToken) break; pt = j.nextPageToken;
  }
  return out;
}
async function put(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) }]));
  if (DRY) return;
  await fetch(`${BASE}/${enc(path)}`, { method: 'PATCH', headers: H(), body: JSON.stringify({ fields }) });
}
async function del(path) { if (!DRY) await fetch(`${BASE}/${enc(path)}`, { method: 'DELETE', headers: H() }); }

// ---- שעון ישראל ----
function parts(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
    .formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
function localToUtc(y, m, d, h, mi) {
  let g = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) { const p = parts(g); g -= Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Date.UTC(y, m - 1, d, h, mi); }
  return g;
}
const ymd = (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');

async function main() {
  await signIn();
  const now = Date.now();
  const F = `families/${CODE}`;
  const [subs, jobs, adv, logs] = await Promise.all([list(F + '/push'), list(F + '/jobs'), getDoc(F + '/prefs/advice'), list(F + '/pushlog')]);
  if (!subs.length) { console.log('אין טלפונים רשומים להתראות.'); return; }
  const on = id => ((adv && adv[id] && adv[id].s) || ADV0[id]) === 'yes';
  const sent = new Set(logs.map(l => l.id));
  const out = []; // {key, who:[...], body, tab}

  for (const j of jobs) {
    if (!j.hasT || !j.due || j.done) continue;
    const who = j.to !== 'all' ? [j.to] : j.claim ? [j.claim] : KIDS;
    const pts = [[j.due, 'd']];
    if (on('r_pre10')) pts.push([j.due - 600e3, 'p']);
    for (const [t, k] of pts) {
      if (t > now || now - t > WINDOW) continue;
      if (k === 'p' && now >= j.due) continue;
      out.push({ key: `j_${j.id}_${k}_${j.due}`, who, tab: 'jobs', body: (k === 'p' ? 'בעוד 10 דקות: ' : 'הגיע הזמן: ') + j.text });
    }
  }

  // תזכורות מהפעמון: משימות אישיות (רק לבעלים) ומשימות משפחתיות (לאבא ולאמא)
  {
    const [ppl, famd] = await Promise.all([list(F + '/people'), getDoc(F + '/prefs/family')]);
    const tp = parts(now), td = ymd(tp.y, tp.m, tp.d);
    const hsh = t => { let x = 0; for (const c of t) x = (x * 31 + c.codePointAt(0)) | 0; return (x >>> 0).toString(36); };
    const scan = (d, owner, who, tab) => {
      if (!d || !Array.isArray(d.tasks) || !Array.isArray(d.rm)) return;
      d.tasks.forEach((t, i) => {
        const r = Number(d.rm[i]) || 0;
        t = String(t || '').trim();
        if (!r || !t || r > now || now - r > WINDOW) return;
        if (d.day === td && Array.isArray(d.done) && d.done[i]) return;
        let m = -1; if (Array.isArray(d.lv) && d.lv[i]) { m = i; while (m > 0 && d.lv[m]) m--; }
        out.push({ key: `t_${owner}_${r}_${hsh(t)}`, who, tab, body: 'תזכורת: ' + (m >= 0 ? String(d.tasks[m]) + ' ‹ ' : '') + t });
      });
    };
    for (const p of ppl) scan(p, p.id, [p.id], 'today');
    scan(famd, 'fam', ['dad', 'mom'], 'fam');
  }

  if (on('r_dogring')) {
    const p = parts(now);
    const sunMs = Date.UTC(p.y, p.m - 1, p.d) - p.wd * 864e5, s = new Date(sunMs);
    const wk = await getDoc(`${F}/weeks/${ymd(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate())}`);
    const slots = (wk && wk.slots) || {}, done = (wk && wk.done) || {};
    for (const k in DOGT) {
      const key = p.wd + '_' + k, who = slots[key];
      if (!who || done[key]) continue;
      const t = localToUtc(p.y, p.m, p.d, DOGT[k][0], DOGT[k][1]);
      if (t > now || now - t > WINDOW) continue;
      out.push({ key: `d_${ymd(p.y, p.m, p.d)}_${k}`, who: [who], tab: 'dog', body: 'תורך להוציא את הכלבה (' + DOGT[k][2] + ')' });
    }
  }

  // יום חמישי 18:00: תזכורת למי שעוד לא מילא אילוצים לשבוע הבא (המועד בסוף היום)
  {
    const p = parts(now);
    if (p.wd === 4) {
      const t = localToUtc(p.y, p.m, p.d, 18, 0);
      if (t <= now && now - t <= WINDOW) {
        const nx = new Date(Date.UTC(p.y, p.m - 1, p.d) + 3 * 864e5);
        const nk = ymd(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate());
        const w = await getDoc(`${F}/weeks/${nk}`);
        const cons = (w && w.cons) || {};
        if (!(w && w.gen)) {
          const who = [...KIDS, 'mom'].filter(id => !cons[id]);
          if (who.length) out.push({ key: `c_${nk}`, who, tab: 'dog', body: 'עד הלילה ממלאים אילוצים לשבוע הבא בלשונית הכלבה. מחר האפליקציה משבצת לבד.' });
        }
      }
    }
  }

  for (const n of out) {
    if (sent.has(n.key)) continue;
    const targets = subs.filter(s => n.who.includes(s.who));
    for (const s of targets) {
      const payload = JSON.stringify({ title: 'yaya', body: n.body, tab: n.tab, tag: n.key });
      if (DRY) { console.log('DRY', s.who, n.body); continue; }
      try { await webpush.sendNotification(JSON.parse(s.sub), payload, { TTL: 3600, urgency: 'high' }); }
      catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await del(`${F}/push/${s.id}`);
        console.log('שליחה נכשלה', s.who, e.statusCode || e.message);
      }
    }
    await put(`${F}/pushlog/${n.key}`, { at: now });
    console.log('נשלח:', n.body, '→', n.who.join(','), '(' + targets.length + ' טלפונים)');
  }

  // ניקוי רישומים ישנים
  for (const l of logs) if (l.at && now - l.at > 3 * 864e5) await del(`${F}/pushlog/${l.id}`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
