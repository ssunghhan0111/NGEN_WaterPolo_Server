// Keeps online records and match history.
// - With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set: saved in a free Upstash Redis database
//   (survives restarts and the free server's naps).
// - Without them: saved to data.json next to this file (fine for testing on your own computer).
'use strict';
const fs = require('fs');
const path = require('path');

const URL_ = process.env.UPSTASH_REDIS_REST_URL, TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REMOTE = !!(URL_ && TOKEN);
const FILE = path.join(__dirname, 'data.json');
const KEEP = 300;                         // how many matches of history to keep
const recs = new Map();                   // lower-case name -> { name, w, l }
let history = [];                         // newest first: { w, l, ws, ls, so, ts }

async function redis(...args){
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(args) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

async function load(){
  try {
    if (REMOTE) {
      const h = await redis('HGETALL', 'ngen:rec') || [];
      for (let i = 0; i < h.length; i += 2) { try { const v = JSON.parse(h[i + 1]); recs.set(h[i], v); } catch (e) {} }
      history = (await redis('LRANGE', 'ngen:matches', 0, KEEP - 1) || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      console.log(`records loaded from Upstash: ${recs.size} players, ${history.length} matches`);
    } else if (fs.existsSync(FILE)) {
      const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      for (const r of d.recs || []) recs.set(r.name.toLowerCase(), r);
      history = d.history || [];
      console.log(`records loaded from data.json: ${recs.size} players, ${history.length} matches`);
    } else console.log('no saved records yet (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep them online)');
  } catch (e) { console.log('could not load records:', e.message); }
}

function recOf(name){ return recs.get(name.toLowerCase()) || { name, w: 0, l: 0 }; }

// winner/loser names, their goals, shootout kicks (or null)
async function addResult(wName, lName, ws, ls, so){
  const W = { ...recOf(wName), name: wName }, L = { ...recOf(lName), name: lName };
  W.w++; L.l++;
  recs.set(wName.toLowerCase(), W); recs.set(lName.toLowerCase(), L);
  const m = { w: wName, l: lName, ws, ls, so: so || null, ts: Date.now() };
  history.unshift(m); if (history.length > KEEP) history.length = KEEP;
  try {
    if (REMOTE) {
      await redis('HSET', 'ngen:rec', wName.toLowerCase(), JSON.stringify(W), lName.toLowerCase(), JSON.stringify(L));
      await redis('LPUSH', 'ngen:matches', JSON.stringify(m));
      await redis('LTRIM', 'ngen:matches', 0, KEEP - 1);
    } else {
      fs.writeFileSync(FILE, JSON.stringify({ recs: [...recs.values()], history }));
    }
  } catch (e) { console.log('could not save result:', e.message); }
  return m;
}

module.exports = { load, recOf, addResult, history: () => history, REMOTE };
