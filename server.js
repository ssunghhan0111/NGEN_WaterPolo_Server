// Ngen H2O online server
// - Serves the game page (so the server URL itself is playable)
// - Lobby: players with the team code show up as "online"; tap someone to challenge them
// - Each match runs on the server with the real game engine (so both players see the same game),
//   and sends a snapshot to both players 20 times a second
// - Keeps everyone's online record and match history (see store.js)
// - Passes voice-chat setup messages between the two players in a match (the audio itself goes
//   directly between the two devices)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const store = require('./store');

const PORT = process.env.PORT || 8787;
const TEAM_CODE = String(process.env.TEAM_CODE || 'NGEN').trim().toLowerCase();
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ENGINE_SRC = HTML.slice(HTML.indexOf('<script>') + 8, HTML.lastIndexOf('</script>'));
// Each match gets its own copy of the engine (the engine keeps one game in memory at a time).
function makeEngine(){ const m = { exports: {} }; new Function('module', ENGINE_SRC)(m); return m.exports; }

const TICK = 1 / 60, SNAP_EVERY = 3, COUNTDOWN = 3.2, MATCH_SETTINGS = { diff: 'rookie', qlen: 30, size: 5 };
const CHALLENGE_TIMEOUT = 30000;
// Voice chat relay ("TURN") servers, so voice works when players are on different networks.
// Paste the iceServers list from a free TURN provider (e.g. Metered) into the ICE_SERVERS setting on Render.
let ICE = [];
try { if (process.env.ICE_SERVERS) { ICE = JSON.parse(process.env.ICE_SERVERS); if (!Array.isArray(ICE)) ICE = [ICE]; } } catch (e) { console.log('ICE_SERVERS is not valid JSON, voice relay is off'); }
const players = new Set();   // everyone in the lobby (welcomed)
const matches = new Set();
let nextId = 1;

// names: letters (and spaces, - or '), 2-12 characters, e.g. "Ian", "Mary Kate"
function cleanName(n){
  n = String(n || '').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z][A-Za-z '\-]{0,10}[A-Za-z]$/.test(n)) return null;
  return n.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ---------- web page + health check ----------
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(`ok online=${players.size} matches=${matches.size} saved=${store.REMOTE ? 'upstash' : 'local'} voiceRelay=${ICE.length ? 'on' : 'off'}`); }
  if (req.url === '/' || req.url.startsWith('/?') || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    return res.end(HTML);
  }
  res.writeHead(404); res.end('not found');
});

// ---------- websockets ----------
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); };
const byName = name => [...players].find(p => p.name.toLowerCase() === String(name || '').toLowerCase());

function lobbyMsg(){
  return JSON.stringify({ t: 'lobby',
    players: [...players].map(p => { const r = store.recOf(p.name); return { name: p.name, w: r.w, l: r.l, busy: !!p.match }; }),
    recent: store.history().slice(0, 40),
    board: store.all().map(r => ({ name: r.name, w: r.w, l: r.l })) });
}
let lobbyTimer = null;
function broadcastLobby(){            // batch quick changes into one update
  if (lobbyTimer) return;
  lobbyTimer = setTimeout(() => { lobbyTimer = null; const m = lobbyMsg(); for (const p of players) send(p.ws, m); }, 120);
}

wss.on('connection', (ws) => {
  const player = { id: nextId++, ws, name: null, match: null, team: -1, outgoing: null, incoming: null };
  ws.on('message', (data) => {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'hello') return hello(player, m);
    if (!player.name) return;                                   // everything else needs a welcome first
    if (m.t === 'in') {                                         // controls during a match
      if (player.match && player.match.engine) {
        const prev = player.match.inputs[player.team];          // keep button presses that haven't been used yet
        m.a = (m.a|0) + (prev ? prev.a|0 : 0); m.b = (m.b|0) + (prev ? prev.b|0 : 0);
        player.match.inputs[player.team] = m;
      }
    } else if (m.t === 'challenge') challenge(player, m.to);
    else if (m.t === 'answer') answer(player, !!m.ok);
    else if (m.t === 'cancel') cancelOutgoing(player, 'cancelled');
    else if (m.t === 'rtc' || m.t === 'mic') {                  // voice chat: pass it to the other player
      const mt = player.match; if (!mt) return;
      const other = mt.players[1 - player.team];
      if (m.t === 'rtc') send(other.ws, { t: 'rtc', d: m.d });
      else send(other.ws, { t: 'peerMic', on: !!m.on });
    } else if (m.t === 'leave') leaveMatch(player, 'left');
  });
  ws.on('close', () => goodbye(player));
  ws.on('error', () => {});
});

function hello(player, m){
  if (player.name) return;
  if (String(m.code || '').trim().toLowerCase() !== TEAM_CODE) return send(player.ws, { t: 'denied', why: 'code' });
  const name = cleanName(m.name);
  if (!name) return send(player.ws, { t: 'denied', why: 'name' });
  const same = byName(name);
  if (same) {                                                 // same name already here: an old tab on the same device? replace it
    if (same.match) return send(player.ws, { t: 'denied', why: 'taken', name });
    try { send(same.ws, { t: 'denied', why: 'elsewhere' }); same.ws.close(); } catch (e) {}
    goodbye(same);
  }
  player.name = name; players.add(player);
  const r = store.recOf(name);
  send(player.ws, { t: 'welcome', name, w: r.w, l: r.l });
  send(player.ws, lobbyMsg());
  broadcastLobby();
  console.log(`${name} is online (${players.size} online)`);
}

function goodbye(player){
  cancelOutgoing(player, 'left'); declineIncoming(player, 'left');
  leaveMatch(player, 'disconnected');
  if (players.delete(player)) { broadcastLobby(); console.log(`${player.name} went offline`); }
}

// ---------- challenges ----------
function challenge(from, toName){
  if (from.match || from.outgoing) return;
  const to = byName(toName);
  if (!to || to === from) return send(from.ws, { t: 'declined', by: toName, why: 'gone' });
  if (to.match || to.incoming || to.outgoing) return send(from.ws, { t: 'declined', by: to.name, why: 'busy' });
  const c = { from, to, timer: setTimeout(() => { if (from.outgoing === c) { cancelOutgoing(from, 'timeout'); send(from.ws, { t: 'declined', by: to.name, why: 'timeout' }); } }, CHALLENGE_TIMEOUT) };
  from.outgoing = c; to.incoming = c;
  send(to.ws, { t: 'challenged', from: from.name });
  send(from.ws, { t: 'pending', to: to.name });
}
function cancelOutgoing(from, why){
  const c = from.outgoing; if (!c) return;
  clearTimeout(c.timer); from.outgoing = null;
  if (c.to.incoming === c) { c.to.incoming = null; send(c.to.ws, { t: 'cancelled', from: from.name, why }); }
}
function declineIncoming(to, why){
  const c = to.incoming; if (!c) return;
  clearTimeout(c.timer); to.incoming = null;
  if (c.from.outgoing === c) { c.from.outgoing = null; send(c.from.ws, { t: 'declined', by: to.name, why }); }
}
function answer(to, ok){
  const c = to.incoming; if (!c) return;
  if (!ok) return declineIncoming(to, 'no');
  clearTimeout(c.timer); to.incoming = null; c.from.outgoing = null;
  if (c.from.ws.readyState !== 1 || !players.has(c.from) || c.from.match) return send(to.ws, { t: 'cancelled', from: c.from.name, why: 'left' });
  startMatch(c.from, to);
}

// ---------- matches ----------
function startMatch(a, b){
  const E = makeEngine();
  const seed = Math.floor(Math.random() * 1e9);
  const teamCfg = (pl, i) => ({ name: pl.name, short: pl.name.split(' ')[0].toUpperCase().slice(0, 8), cap: i === 0 ? '#1f3c8f' : '#f7f8fc', numCol: i === 0 ? '#ffffff' : '#0b1e33' });
  const cfg = { home: teamCfg(a, 0), away: teamCfg(b, 1), ...MATCH_SETTINGS, seed };
  const match = { id: seed, players: [a, b], engine: null, E, cfg, inputs: [null, null], countdown: COUNTDOWN, tick: 0, ended: false };
  a.match = b.match = match; a.team = 0; b.team = 1;
  for (const [i, pl] of [a, b].entries()) send(pl.ws, { t: 'match', team: i, names: [a.name, b.name], cfg, ice: ICE });
  matches.add(match);
  broadcastLobby();
  console.log(`match ${match.id}: ${a.name} vs ${b.name} (${matches.size} running)`);
}

function leaveMatch(player, why){
  const m = player.match; if (!m) return;
  player.match = null;
  if (!m.ended) {
    m.ended = true; matches.delete(m);
    for (const other of m.players) if (other !== player) { other.match = null; send(other.ws, { t: 'left', why }); }
    console.log(`match ${m.id} ended early (${why})`);
  }
  broadcastLobby();
}

// ---------- game loop for all matches ----------
let last = Date.now(), acc = 0;
setInterval(() => {
  const now = Date.now(); acc += Math.min(0.25, (now - last) / 1000); last = now;
  while (acc >= TICK) { acc -= TICK; for (const m of matches) stepMatch(m); }
}, 1000 / 120);

function stepMatch(m){
  if (m.ended) return;
  if (!m.engine) {                                     // short countdown before kickoff
    m.countdown -= TICK;
    if (m.countdown <= 0) { m.engine = m.E.newGame({ ...m.cfg, net: true }); }
    return;
  }
  const E = m.E;
  for (const t of [0, 1]) { if (m.inputs[t]) { E.netInput(t, m.inputs[t]); m.inputs[t] = { ...m.inputs[t], a: 0, b: 0 }; } }
  E.netTick(TICK); m.tick++;
  if (m.tick % SNAP_EVERY === 0) {
    const msg = JSON.stringify({ t: 's', d: E.netSnap() });
    for (const p of m.players) send(p.ws, msg);
  }
  const G = E.getG();
  if (G.state === 'final' && G.stateT > 2) finishMatch(m, E, G);
}

async function finishMatch(m, E, G){
  m.ended = true; matches.delete(m);
  const score = [G.teams[0].score, G.teams[1].score], winner = E.winnerId();
  const so = G.so ? [G.so.kicks[0].filter(Boolean).length, G.so.kicks[1].filter(Boolean).length] : null;
  const [a, b] = m.players, W = m.players[winner], L = m.players[1 - winner];
  for (const p of m.players) p.match = null;
  const res = await store.addResult(W.name, L.name, score[winner], score[1 - winner], so ? [so[winner], so[1 - winner]] : null);
  for (const p of [a, b]) { const r = store.recOf(p.name); send(p.ws, { t: 'end', score, winner, so, me: { w: r.w, l: r.l }, result: res }); }
  broadcastLobby();
  console.log(`match ${m.id} finished ${score.join('-')}: ${W.name} beat ${L.name}`);
}

// keep connections alive through hosting proxies, drop dead ones
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws._ngenDead) { ws.terminate(); continue; }
    ws._ngenDead = true;
    try { ws.ping(); } catch (e) {}
  }
}, 25000);
wss.on('connection', ws => { ws.on('pong', () => { ws._ngenDead = false; }); });

store.load().then(() => server.listen(PORT, () => console.log(`Ngen H2O server on :${PORT} (team code required)`)));
