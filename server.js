// Ngen H2O online server
// - Serves the game page (so the server URL itself is playable)
// - Waiting room: the first two players waiting are paired automatically
// - Each match runs on the server with the real game engine (so both players see the same game),
//   and sends a snapshot to both players 20 times a second.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const NAMES = require('./names');

const PORT = process.env.PORT || 8787;
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ENGINE_SRC = HTML.slice(HTML.indexOf('<script>') + 8, HTML.lastIndexOf('</script>'));
// Each match gets its own copy of the engine (the engine keeps one game in memory at a time).
function makeEngine(){ const m = { exports: {} }; new Function('module', ENGINE_SRC)(m); return m.exports; }

const TICK = 1 / 60, SNAP_EVERY = 3, COUNTDOWN = 3.2, MATCH_SETTINGS = { diff: 'rookie', qlen: 30, size: 5 };
const waiting = [];          // players in the waiting room, oldest first
const matches = new Set();
let nextId = 1;

// ---------- web page + health check ----------
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(`ok waiting=${waiting.length} matches=${matches.size}`); }
  if (req.url === '/' || req.url.startsWith('/?') || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    return res.end(HTML);
  }
  res.writeHead(404); res.end('not found');
});

// ---------- websockets ----------
const wss = new WebSocketServer({ server, maxPayload: 4096 });
const send = (ws, msg) => { if (ws.readyState === 1) ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); };
function lobbyInfo(){ return { t: 'lobby', waiting: waiting.length, playing: matches.size * 2 }; }
function broadcastLobby(){ const m = JSON.stringify(lobbyInfo()); for (const p of waiting) send(p.ws, m); }

wss.on('connection', (ws) => {
  const player = { id: nextId++, ws, name: NAMES.random(), match: null, team: -1, alive: true };
  ws.on('pong', () => { player.alive = true; });
  ws.on('message', (data) => {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'hello') {                       // join the waiting room
      if (player.match) return;
      player.name = NAMES.valid(m.name) ? m.name : NAMES.random();
      if (!waiting.includes(player)) waiting.push(player);
      send(ws, { t: 'waiting', name: player.name });
      tryPair(); broadcastLobby();
    } else if (m.t === 'in') {                   // controls during a match
      if (player.match && player.match.engine) {
        const prev = player.match.inputs[player.team];          // keep button presses that haven't been used yet
        m.a = (m.a|0) + (prev ? prev.a|0 : 0); m.b = (m.b|0) + (prev ? prev.b|0 : 0);
        player.match.inputs[player.team] = m;
      }
    } else if (m.t === 'leave') {
      leave(player, 'left');
    }
  });
  ws.on('close', () => leave(player, 'disconnected'));
  ws.on('error', () => {});
  send(ws, lobbyInfo());
});

function tryPair(){
  while (waiting.length >= 2) {
    const a = waiting.shift(), b = waiting.shift();
    if (a.ws.readyState !== 1) { if (b.ws.readyState === 1) waiting.unshift(b); continue; }
    if (b.ws.readyState !== 1) { waiting.unshift(a); continue; }
    startMatch(a, b);
  }
}

function startMatch(a, b){
  const E = makeEngine();
  const seed = Math.floor(Math.random() * 1e9);
  const teamCfg = (pl, i) => ({ name: pl.name, short: pl.name.split(' ')[0].toUpperCase().slice(0, 8), cap: i === 0 ? '#1f3c8f' : '#f7f8fc', numCol: i === 0 ? '#ffffff' : '#0b1e33' });
  const cfg = { home: teamCfg(a, 0), away: teamCfg(b, 1), ...MATCH_SETTINGS, seed };
  const match = { id: seed, players: [a, b], engine: null, E, cfg, inputs: [null, null], countdown: COUNTDOWN, tick: 0, ended: false };
  a.match = b.match = match; a.team = 0; b.team = 1;
  for (const [i, pl] of [a, b].entries()) send(pl.ws, { t: 'match', team: i, names: [a.name, b.name], cfg: { ...cfg, net: undefined } });
  matches.add(match);
  console.log(`match ${match.id}: ${a.name} vs ${b.name} (${matches.size} running)`);
}

function leave(player, why){
  const i = waiting.indexOf(player); if (i >= 0) { waiting.splice(i, 1); broadcastLobby(); }
  const m = player.match; if (!m) return;
  player.match = null;
  if (!m.ended) {
    m.ended = true; matches.delete(m);
    for (const other of m.players) if (other !== player) { other.match = null; send(other.ws, { t: 'left', why }); }
    console.log(`match ${m.id} ended early (${why})`);
  }
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
  if (G.state === 'final' && G.stateT > 2) {
    m.ended = true; matches.delete(m);
    const score = [G.teams[0].score, G.teams[1].score], winner = E.winnerId();
    for (const p of m.players) { p.match = null; send(p.ws, { t: 'end', score, winner }); }
    console.log(`match ${m.id} finished ${score.join('-')}`);
  }
}

// keep connections alive through hosting proxies, drop dead ones
setInterval(() => {
  for (const ws of wss.clients) {
    const pl = [...waiting, ...[...matches].flatMap(m => m.players)].find(p => p.ws === ws);
    if (pl && !pl.alive) { ws.terminate(); continue; }
    if (pl) pl.alive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 25000);

server.listen(PORT, () => console.log(`Ngen H2O server on :${PORT}`));
