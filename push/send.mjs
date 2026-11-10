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
  if (process.env.SHOW_ADV) { const pr = await list(F + '/people').catch(e => String(e)); const pf = await list(F + '/prefs').catch(e => String(e)); console.log('בדיקה: משימות', jobs.length, 'פרופילים', Array.isArray(pr) ? pr.length : pr, 'prefs', Array.isArray(pf) ? pf.map(d => d.id).join(',') : pf, 'advice?', adv === null ? 'אין מסמך' : Object.keys(adv).length + ' שדות'); }
  if (process.env.SHOW_ADV) console.log('החלטות:', JSON.stringify(Object.fromEntries(Object.entries(adv || {}).map(([k, v]) => [k, k.startsWith('_') ? v : (v && v.s)]))));
  // "צא לפיתוח": אבא לחץ באפליקציה, ההחלטות נכתבות לקובץ בריפו כדי שקלוד יקרא אותן
  if (adv && adv._dev && adv._dev.at) {
    const mk = await getDoc(F + '/prefs/devout');
    if (!mk || Number(mk.at) !== Number(adv._dev.at)) {
      const dec = {};
      for (const k in adv) if (!k.startsWith('_') && adv[k] && adv[k].s) dec[k] = { s: adv[k].s, by: adv[k].by || '', at: adv[k].at || 0 };
      fs.mkdirSync('dev', { recursive: true });
      fs.writeFileSync('dev/request.json', JSON.stringify({ at: adv._dev.at, by: adv._dev.by || '', ids: adv._dev.ids || [], decisions: dec }, null, 2) + '\n');
      await put(F + '/prefs/devout', { at: Number(adv._dev.at) });
      console.log('בקשת פיתוח נכתבה ל-dev/request.json');
    }
  }
  if (!subs.length) { console.log('אין טלפונים רשומים להתראות.'); return; }
  const on = id => ((adv && adv[id] && adv[id].s) || ADV0[id]) === 'yes';
  const sent = new Set(logs.map(l => l.id));
  const out = []; // {key, who:[...], body, tab}

  for (const j of jobs) {
    if (!j.hasT || !j.due || j.done) continue;
    const who = j.to === 'fam' ? ['dad', 'mom', ...KIDS] : j.to !== 'all' ? [j.to] : j.claim ? [j.claim] : KIDS;
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
    // משימות שאבא ואמא שלחו זה לזו ועוד לא נכנסו לרשימה (האפליקציה של המקבל סגורה)
    for (const p of ppl) {
      if (!Array.isArray(p.inbox)) continue;
      for (const x of p.inbox) {
        const r = Number(x && x.rm) || 0, t = String((x && x.t) || '').trim();
        if (!r || !t || r > now || now - r > WINDOW) continue;
        out.push({ key: `t_${p.id}_${r}_${hsh(t)}`, who: [p.id], tab: 'today', body: 'תזכורת: ' + (x.from === 'mom' ? 'משימה מאמא' : 'משימה מאבא') + ' ‹ ' + t });
      }
    }
    // הרשימה המשפחתית הישנה הוסרה, המשימות שלה עברו למשימות "לכל המשפחה"
  }

  // פידבק כתוב מההורים: התראה לילדה כשמגיע פידבק חדש
  {
    const nts = await list(F + '/notes').catch(() => []);
    for (const n of nts) {
      const at = Number(n.at) || 0;
      if (!n.to || n.seen || !at || now - at > 6 * 3600e3) continue;
      const t = String(n.t || '').trim(); if (!t) continue;
      out.push({ key: `n_${n.id}`, who: [n.to], tab: 'today', body: (n.by === 'mom' ? 'פידבק מאמא: ' : 'פידבק מאבא: ') + (t.length > 90 ? t.slice(0, 90) + '…' : t) });
    }
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
      out.push({ key: `d_${ymd(p.y, p.m, p.d)}_${k}`, who: [who], tab: 'dog', body: 'תורך להוציא את לוני (' + DOGT[k][2] + ')' });
    }
  }

  // יום רביעי: 18:00 תזכורת למי שעוד לא מילא אילוצים לשבוע הבא. 22:00 המועד נסגר והאפליקציה משבצת את כל המשמרות
  {
    const p = parts(now);
    if (p.wd === 3) {
      const nx = new Date(Date.UTC(p.y, p.m - 1, p.d) + 4 * 864e5);
      const nk = ymd(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate());
      const t18 = localToUtc(p.y, p.m, p.d, 18, 0), t22 = localToUtc(p.y, p.m, p.d, 22, 0);
      const in18 = t18 <= now && now - t18 <= WINDOW, in22 = t22 <= now && now - t22 <= WINDOW;
      if (in18 || in22) {
        const w = await getDoc(`${F}/weeks/${nk}`);
        const cons = (w && w.cons) || {};
        if (in18 && !(w && w.gen)) {
          const who = [...KIDS, 'mom'].filter(id => !cons[id]);
          if (who.length) out.push({ key: `c_${nk}`, who, tab: 'dog', body: 'עד 22:00 הערב ממלאים אילוצים לשבוע הבא בלשונית של לוני. ב-22:00 האפליקציה משבצת את כולם.' });
        }
        // פתיחת האפליקציה בטלפון כלשהו מריצה את השיבוץ, אז שולחים לכולם
        if (in22) out.push({ key: `g_${nk}`, who: ['dad', 'mom', ...KIDS], tab: 'dog', body: '🐩 השיבוץ של לוני לשבוע הבא נקבע. פותחים ורואים מתי התור שלך. אפשר להחליף דרך האפליקציה.' });
      }
    }
  }

  // בקשות החלפה בתורנות של לוני: הודעה למי שביקשו ממנה, ולמבקשת כשענו לה
  {
    const sw = await list(F + '/swaps').catch(() => []);
    const NM = { dad: 'אבא', mom: 'אמא', ziv: 'זיו', roni: 'רוני', hili: 'הילי', aviv: 'אביב' };
    for (const x of sw) {
      const at = Number(x.at) || 0;
      if (!at || now - at > 12 * 3600e3 || !x.to || !x.from) continue;
      if (x.status === 'pending') out.push({ key: `s_${x.id}`, who: [x.to], tab: 'dog', body: `🐩 ${NM[x.from] || ''} מבקש${x.from === 'dad' ? '' : 'ת'} להחליף איתך תורנות של לוני. נכנסים לאשר או לסרב.` });
      else if (x.status === 'approved' || x.status === 'declined') {
        const m = x.to === 'dad', ok = x.status === 'approved';
        out.push({ key: `s_${x.id}_${x.status}`, who: [x.from], tab: 'dog', body: `🐩 ${NM[x.to] || ''} ${ok ? (m ? 'אישר' : 'אישרה') + ' את ההחלפה. הלוח עודכן.' : (m ? 'לא יכול' : 'לא יכולה') + ' להחליף. אפשר לבקש ממישהו אחר.'}` });
      }
    }
  }

  // אוכל: מ-20:00 ועד חצות, כל רבע שעה, לבנות שעוד לא הזמינו ארוחת עשר וצהרון למחר (לא בליל שבת)
  {
    const p = parts(now);
    if (p.h >= 20 && p.h < 24 && p.wd !== 5) {
      const q = Math.floor(p.mi / 15) * 15;
      const nx = new Date(Date.UTC(p.y, p.m - 1, p.d) + 864e5);
      const nk = ymd(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate());
      const fd = await getDoc(`${F}/food/${nk}`);
      const ord = (fd && fd.orders) || {}, pls = (fd && fd.plans) || {};
      const pl = id => pls[id] && pls[id].at && pls[id].st ? pls[id] : null;
      const who = KIDS.filter(id => !pl(id) && !(ord[id] && ord[id].at));
      if (who.length) out.push({ key: `f_${nk}_${p.h}${String(q).padStart(2, '0')}`, who, tab: 'food', body: '🍽️ מה להכין לך מחר? בוחרים ארוחת עשר, צהרון ושעת השכמה' });
      const wp = KIDS.filter(id => pl(id) && pl(id).st === 'wait');
      if (wp.length) out.push({ key: `fw_${nk}_${p.h}${String(q).padStart(2, '0')}`, who: wp, tab: 'food', body: '🍽️ מחכה לך תכנון אוכל למחר. מאשרים או מבקשים משהו אחר' });
    }
  }

  // תכנון אוכל של אבא/אמא לבנות: הודעה לבת על תכנון חדש, להורים על בקשה למשהו אחר, ולבת על התשובה
  {
    const p = parts(now);
    const NM = { dad: 'אבא', mom: 'אמא', ziv: 'זיו', roni: 'רוני', hili: 'הילי', aviv: 'אביב' };
    const ks = [0, 1].map(n => { const x = new Date(Date.UTC(p.y, p.m - 1, p.d) + n * 864e5); return ymd(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); });
    const docs = await Promise.all(ks.map(k => getDoc(`${F}/food/${k}`)));
    const mt = (o, mk) => [...((o && o[mk]) || []), ...(o && o[mk + 'X'] ? [o[mk + 'X']] : [])].join(', ') || '—';
    const fresh = t => t && now - Number(t) < 12 * 3600e3;
    ks.forEach((k, i) => {
      const pls = (docs[i] && docs[i].plans) || {};
      const when = i ? 'מחר' : 'היום';
      for (const id of KIDS) {
        const x = pls[id]; if (!x || !x.at || !x.st) continue;
        const pm = x.by === 'mom';
        if (x.st === 'wait' && fresh(x.at)) out.push({ key: `fp_${k}_${id}_${x.at}`, who: [id], tab: 'food', body: `🍽️ ${pm ? 'אמא תכננה' : 'אבא תכנן'} לך אוכל ל${when}. מאשרים או מבקשים משהו אחר` });
        if (x.st === 'alt' && x.alt && fresh(x.alt.at)) out.push({ key: `fa_${k}_${id}_${x.alt.at}`, who: ['dad', 'mom'], tab: 'food', body: `🍽️ ${NM[id]} ביקשה משהו אחר ל${when}: ארוחת עשר – ${mt(x.alt, 'ten')}, צהרון – ${mt(x.alt, 'lunch')}` });
        if ((x.st === 'altok' || x.st === 'kept') && fresh(x.dt)) {
          const dm = (x.dby || x.by) === 'mom';
          out.push({ key: `fd_${k}_${id}_${x.dt}`, who: [id], tab: 'food', body: x.st === 'altok' ? `🍽️ ${dm ? 'אמא אישרה' : 'אבא אישר'} את הבקשה שלך` : `🍽️ ${dm ? 'אמא השאירה' : 'אבא השאיר'} את התכנון ל${when}` });
        }
      }
    });
  }

  // לוח משפחתי: תזכורות לאירועים (ולבחינות מ-teach-me שהוגדרה להן תזכורת). אין הגדרה = אין תזכורת
  {
    const [evs, tmo] = await Promise.all([list(F + '/cal'), list(F + '/caltm')]);
    const ALL = ['dad', 'mom', ...KIDS];
    const KN = { cls: ['חוג', '🎨'], exam: ['בחינה', '📝'], event: ['אירוע', '🎉'], bday: ['יום הולדת', '🎂'], appt: ['תור', '🩺'], other: ['אחר', '📌'] };
    const p = parts(now);
    const dk = n => { const x = new Date(Date.UTC(p.y, p.m - 1, p.d) + n * 864e5); return ymd(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); };
    const A = dk(-1), B = dk(8), T0 = dk(0), T1 = dk(1);
    const kd = k => { const a = k.split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); };
    const kOf = ms => { const x = new Date(ms); return ymd(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); };
    const occ = ev => {
      const o = [], skip = new Set(ev.skip || []);
      if (!ev.date) return o;
      if (!ev.rep) { if (ev.date >= A && ev.date <= B) o.push(ev.date); return o; }
      const end = ev.until && ev.until < B ? ev.until : B;
      if (ev.rep === 'w') {
        let d = kd(ev.date); const a = kd(A);
        if (d < a) d += Math.floor((a - d) / (7 * 864e5)) * 7 * 864e5;
        for (let i = 0; i < 4; i++, d += 7 * 864e5) { const k = kOf(d); if (k > end) break; if (k >= A && !skip.has(k)) o.push(k); }
      } else if (ev.rep === 'y') {
        const md = ev.date.slice(4);
        for (const y of new Set([+A.slice(0, 4), +B.slice(0, 4)])) { const k = y + md; if (k >= ev.date && k >= A && k <= end && !skip.has(k)) o.push(k); }
      }
      return o;
    };
    const remAt = (ev, k) => {
      const r = ev.rem; if (!r) return 0;
      const [y, m, d] = k.split('-').map(Number);
      if (ev.time) {
        const [hh, mm] = String(ev.time).split(':').map(Number);
        if (r[0] === 'm') return localToUtc(y, m, d, hh, mm) - Number(r.slice(1)) * 60e3;
        if (r[0] === 'd') { const x = new Date(kd(k) - Number(r.slice(1)) * 864e5); return localToUtc(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), hh, mm); }
        return localToUtc(y, m, d, hh, mm);
      }
      if (r[0] === 'd') { const x = new Date(kd(k) - Number(r.slice(1)) * 864e5); return localToUtc(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), 19, 0); }
      return localToUtc(y, m, d, 7, 30);
    };
    const items = evs.map(e => Object.assign({}, e));
    for (const o of tmo) if (o.rem && o.date && o.pid) items.push({ id: 'tm_' + o.id, kind: 'exam', title: o.title || 'בחינה', who: [o.pid], date: o.date, time: o.time || '', rem: o.rem, by: o.by || '' });
    for (const ev of items) {
      if (!ev.rem) continue;
      const who = new Set(ev.fam ? ALL : (ev.who || []));
      if (ev.by) who.add(ev.by);
      for (const k of occ(ev)) {
        const t = remAt(ev, k);
        if (!t || t > now || now - t > WINDOW) continue;
        const kn = KN[ev.kind] || KN.other;
        const when = k === T0 ? 'היום' : k === T1 ? 'מחר' : k.slice(8).replace(/^0/, '') + '.' + k.slice(5, 7).replace(/^0/, '');
        out.push({ key: `e_${ev.id}_${k}_${ev.rem}_${String(ev.time || '').replace(':', '')}`, who: [...who], tab: 'cal', body: kn[1] + ' ' + (ev.title || kn[0]) + ' · ' + when + (ev.time ? ' ב-' + ev.time : '') });
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
