# Ngen H2O — online server

This little server runs the online 1v1 waiting room. Two players join, and they get matched.

## Put it online (free, about 10 minutes)

1. Make a free account at github.com and create a new repository called `ngen-h2o-server`.
2. Upload every file in this folder (server.js, names.js, package.json, package-lock.json, index.html, README.md).
3. Make a free account at render.com and sign in with GitHub.
4. Click **New → Web Service** and pick the `ngen-h2o-server` repo.
5. Fill in:
   - Name: **ngen-h2o** (this makes the address `ngen-h2o.onrender.com`, which the game already uses)
   - Build command: `npm install`
   - Start command: `node server.js`
   - Plan: **Free**
6. Click **Create Web Service** and wait until it says "Live".

That's it. Open https://ngen-h2o.onrender.com to play, or play on itch.io.

If Render gives you a different address, send it over and the game can be updated to use it.

## Good to know

- The free server takes a nap when nobody plays. The first player of the day may wait about a minute.
- Players get random fun names like "Cosmic Marlin". There is no chat.
