# gta6-01-entry-v2

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/inikangai14-sys/gta6-01-entry-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/inikangai14-sys/gta6-01-entry-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay: Night Shift — a complete original 3D open-world crime game in the
browser, v2. A sun-soaked coastal city to explore on foot and by car, with a
six-job story chain plus endless courier gigs, a live mission timer and payout
in the HUD, dense traffic and pedestrians, a wanted level with police who
chase you, combat, a HUD with a live minimap, a day cycle that slides from
golden hour into dusk, synthesized sound, and a save that remembers your best
cash. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080 in desktop Chrome. (Any static file server
works; `file://` is not enough because the game loads its scripts as ES
modules.)

## How to play

- **WASD** move / drive · **mouse drag** orbit camera · **wheel** zoom
- **Shift** run · **Space** jump (on foot) / handbrake (in a car)
- **E** enter / exit the nearest car · **Click** shoot · **F** melee · **R** reload
- **P** pause · **M** mute

Follow the gold beacon to run Mara's night jobs: pick up a fare at the
marina, deliver a package to the pier, drive Rico through a 2-star tail,
lose the harbor heat, pull the big score, then earn a clean slate. Every job
has a countdown and a payout — beat the clock and the cash is yours. After
the chain, courier gigs keep coming across the map. Steal a car, open fire, or take a hot job and the wanted
stars climb. Lose the tail by staying out of sight until the heat dies down.

## The story

You are Jay Cruz, a driver fresh out of luck in Solmar Bay. Mara runs the
crew from the hideout on Coral Row, Rico knows every shortcut, and the
Solmar PD knows your face. Six night jobs stand between you and a clean
slate — if the city lets you keep it.

## Tech

- three.js r160 (vendored under `game/vendor/three.module.js`), ES modules
  through an import map, plain static files, no build step, no network
  requests at all
- Procedural low-poly city: road grid, towers with rooftop props, neon
  signs, palms, street lamps, benches, billboards, beach, ocean, pier,
  ferris wheel and marina boats
- Deterministic seeded layout (`?seed=7`); screenshot presets
  `?shot=street|drive|chase|mission&seed=7`
- Day cycle: golden hour sliding into dusk, sun and sky tinted as the
  clock runs
- WebAudio-synthesized sound: engine hum, sirens, gunshots, mission jingles
- Progress saved in `localStorage` (best cash, jobs completed)

---

<sub>Entered on [make.fun](https://make.fun/?ref=ze97ra9z&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
