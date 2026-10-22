# 🤽 Ngen H2O

A cartoon water polo game for the web. Play as **Ngen Aquatics** against the computer, run a whole season, or go head-to-head with a real player online.

**Play it:** [ngen-waterpolo-server.onrender.com](https://ngen-waterpolo-server.onrender.com) (also on itch.io)

> The free server naps when nobody is playing. If it says "waking up the server", give it about a minute.

---

## What's in the game

- **5 vs 5 water polo** with real rules: shot clock, exclusions, the 2 m and 5 m lines, and penalty shootouts for ties
- **Season mode:** play 8 rival teams, with standings, stats and league leaders
- **Levels & locker:** start at Level 1 and level up as you play. New levels unlock caps, swim suits, balls, goal parties and extras, and rival teams get a little tougher
- **Online 1v1:** pick your name, see who's online, and challenge a teammate. Talk with the 🎤 button. Records and match history are saved
- **Super Shot**, **power-ups** (turbo, mega ball, freeze, rubber duck, octopus) and **Mega Goalie** after a goal against
- **Goal celebrations** for every player, an announcer who calls names, and the team cheer at the end: *"Ngen on me, Ngen on three… one, two, three, NGEN!"*
- **Star challenges** every game for bonus XP
- **Learn mode** with quick tips about the rules
- Three levels: **Rookie** (the default), **Club** and **Olympic**

## How to play

| | Keyboard | Phone |
|---|---|---|
| Swim | Arrow keys | Joystick (bottom left) |
| Pass / switch swimmer | A (or Space) | PASS button |
| Shoot / tackle | S (hold for power) | SHOOT / TACKLE button |
| Sprint | D (or Shift) | SPRINT button |
| Pause | P | ⏸ at the top |

Sprinting uses energy. A tired swimmer slows down, and a tired shooter misses more.

## Online play

- The first time, pick your name from the list (or add a new one) and type the **team code**. Only people with the code can see who's online.
- Tap **CHALLENGE** next to a teammate. They get a pop-up and can say yes or no.
- In a game, tap 🎤 to talk. The mic is off until you turn it on, and the sound goes straight between the two devices.
- Every result is saved, like *"Ian lost to Jayden 3–5 · 2026/10/21 10:00 AM"*, and everyone's online record shows in the lobby.
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

Then open http://localhost:8787. To test online play, open it in two browser windows, go online with two different names (team code `NGEN` unless you set one) and challenge each other. Locally, records are saved in `data.json`.

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
| `TEAM_CODE` | The secret code players type to go online. If you don't set it, it's `NGEN`. |
| `UPSTASH_REDIS_REST_URL` | From your free Upstash database: keeps records and history |
| `UPSTASH_REDIS_REST_TOKEN` | From your free Upstash database |
| `ICE_SERVERS` | Optional voice-chat relay (TURN) list, so voice works when players are on different networks |

Without the Upstash keys the game still works, but records reset whenever the free server restarts.

---

Made for Ngen Aquatics. 💙
