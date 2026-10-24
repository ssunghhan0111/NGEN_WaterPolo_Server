# 🤽 Ngen H2O

A cartoon water polo game for the web. Play as **Ngen Aquatics** against the computer, run a whole season, or go head-to-head with a real player online.

**Play it:** [ngen-waterpolo-server.onrender.com](https://ngen-waterpolo-server.onrender.com) (also on itch.io)

> The free server naps when nobody is playing. If it says "waking up the server", give it about a minute.

---

## What's in the game

- **4 vs 4 water polo** (plus goalies) with real rules. Five swimmers take turns: each quarter the next one rests on the bench. shot clock, exclusions, the 2 m and 5 m lines, and penalty shootouts for ties
- **Season mode:** play 8 rival teams, with standings, stats and league leaders. The top 2 meet in a **Championship Final** under the lights, and the winner lifts the trophy 🏆
- **Surprise games:** some games are a 🌙 night game (glowing caps), a 🌊 wave pool (currents push everyone) or a 🏖️ beach party (giant beach ball, extra power-ups)
- **Levels & locker:** start at Level 1 and level up as you play. 30 levels unlock over 100 items: patterned caps, swim suits, balls, team logos, goal parties and extras. Rival teams get a little tougher each level
- **Online 1v1:** pick your name, see who's online, and challenge a teammate. Talk with the 🎤 button. Records and match history are saved
- **Boss battles:** every 5 levels a crazy boss team shows up (Kraken Crew, Robo Rays, Great White Squad, Ice Titans, Thunder Whales, Poseidon's Legends). Beat them for rare prizes
- **Ultimate moves:** fill the meter, then fire your move: ⚡ Super Shot, 🦈 Shark Dash, 🌩️ Lightning Pass or 🌊 Tsunami Shot (a boss prize). Pick it in the locker
- **Super Shot**, **power-ups** (turbo, mega ball, freeze, rubber duck, octopus) and **Mega Goalie** after a goal against
- **Goal celebrations** for every player, an announcer who calls names, and the team cheer at the end: *"Ngen on me, Ngen on three… one, two, three, NGEN!"*
- **Star challenges** every game for bonus XP
- **Learn mode** with quick tips about the rules
- **Divisions:** everyone starts in **Rookie**. Finish a season winning at least half your games to move up: Club → Olympic → Olympic II → Olympic III → Olympic Legends

## How to play

| | Keyboard | Phone |
|---|---|---|
| Swim | Arrow keys | Joystick (bottom left) |
| Pass / switch swimmer | A (or Space) | PASS button |
| Shoot / tackle | Hold S, aim with ↑ ↓, let go to shoot | Hold SHOOT, aim with the joystick, let go |
| Sprint | D (or Shift) | SPRINT button |
| Pause | P | ⏸ at the top |

Sprinting uses energy. A tired swimmer slows down, and a tired shooter misses more.

## Online play

- The first time, pick your name from the list (or add a new one). No code needed.
- Tap **CHALLENGE** next to a teammate. They get a pop-up and can say yes or no.
- In a game, tap 🎤 to talk. The mic is off until you turn it on. Voice goes through the game server, so it works on any network where the game works.
- Online, each player's team wears their own locker items: caps, suits, extras and team logo (if both pick the same cap, the second team wears white).
- Every result is saved, like *"Ian lost to Jayden 3–5 · 2026/10/21 10:00 AM"*, and everyone's online record shows in the lobby.
- Send emoji reactions with 😀 (or keys 1–8), tap **REMATCH** after a game, and win the most games in a week to become 👑 **King of the Pool**.
- The server runs the match, so both players always see the same game.

---

## Files

| File | What it does |
|---|---|
| `index.html` | The whole game (graphics, sound, AI, everything) in one file |
| `server.js` | The online lobby, challenges and match runner |
| `store.js` | Saves online records and match history |
| `package.json` | Tells Render how to start the server |

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start
```

Then open http://localhost:8787. To test online play, open it in two browser windows, go online with two different names and challenge each other. Locally, records are saved in `data.json`.

## Update the live game

1. Replace `index.html` (or any file) here on GitHub.
2. Render sees the change and redeploys by itself in about a minute.
3. For itch.io, upload the new game zip on the project's edit page.

## Hosting

Hosted on [Render](https://render.com) on the free plan:
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables (Render → your service → **Environment**):

| Key | What it's for |
|---|---|
| `UPSTASH_REDIS_REST_URL` | From your free Upstash database: keeps records and history |
| `UPSTASH_REDIS_REST_TOKEN` | From your free Upstash database |

Without the Upstash keys the game still works, but records reset whenever the free server restarts.

---

Made for Ngen Aquatics. 💙
