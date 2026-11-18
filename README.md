# Solmaris

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/xxuqing777-eth/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/xxuqing777-eth/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

![Phase C](https://img.shields.io/badge/phase-C-teal) ![MIT](https://img.shields.io/badge/license-MIT-blue)

An original sun-soaked coastal open world. Play Jax Moreno, a driver-for-hire returning to Solmaris. This phase delivers on-foot exploration, third-person mouse camera, building collision, a live north-up canvas minimap, health/money/wanted/speed HUD, and a start/resume screen. All visuals are generated locally with vendored three.js; no runtime network requests.

## Run

With Node 22 or newer: `node serve.ts --port 8080`, then open `http://127.0.0.1:8080/` in a desktop WebGL browser. No install or build step. Click **Enter Solmaris** to capture the mouse. Press Esc to release the mouse and pause; click **Back to Solmaris** to resume. Losing focus also pauses movement.

## Controls

| Control | Action |
| --- | --- |
| WASD | Move relative to the camera |
| Mouse | Look (pointer lock) |
| Shift | Run |
| Space | Jump |
| Esc | Pause / release mouse |

Phase A2 adds original car models, parked and occupied cars to steal, 18 lane-following traffic cars, and 48 walking sidewalk pedestrians. **E** enters or steals a nearby slow car; stop before pressing **E** to exit. Occupied cars eject their driver. Start beside the gold car; an occupied teal car waits further north. **W/S** accelerate, brake and reverse; **A/D** steer; **Space** handbrakes; **1/2/3** select chase, high and hood cameras. Buildings, cars and city limits stop your vehicle. Traffic yields to cars ahead. Esc freezes all simulation.

Phase B adds 1–5 wanted stars for theft, reckless collisions, assaults and pistol fire. Solmaris PD dispatches marked cars that route around buildings, chase, ram vehicles, and arrest slow/stationary players after three seconds nearby. Break line of sight behind buildings: each twelve hidden seconds removes one star. Red minimap blips show actual police positions. Arrest or knockout returns Jax to the coast, with a fee capped at $100 and four seconds of recovery.

On foot, **Q** switches fists/pistol, **Left-click** attacks straight ahead, and **R** reloads (12-round magazine, 60 reserve rounds). Face a nearby target to punch or aim horizontally toward one to fire; buildings block attacks. Purple-clad Vultures north of the spawn fight back, as do assaulted civilians. Knockdowns, brief flashes and tracers are non-graphic; downed characters recover. Combat does not fire from cars or paused menus. **F** interacts at mission beacons; **M** toggles synthesised sound.

## Phase C story

Meet Lena at the gold ring beside your starting point and press **F**. Follow the gold minimap dot (clamped to the map edge for distant objectives), HUD objective and dialogue. Stop vehicles before interacting.

| Job | Objective | Reward |
| --- | --- | --- |
| First Wheels | Steal a fresh car after accepting; deliver to the east garage with F | $400 / 100 XP |
| Hot Pursuit | Lose the assigned two-star wanted level | $700 / 200 XP |
| The Pickup | Bring a car to Lena, F to board, drive to the meet, F to stop; exit and defeat both Vultures while staying within 45 metres of Lena | $1,200 / 350 XP |
| Downtown Payday | Collect cash downtown on foot with F; lose three stars and return to the coast with F | $2,500 / 600 XP |

Return to Lena between jobs. Arrest/knockout interrupts the current job without awarding it; return to retry. XP raises your displayed rank every 300 points. Completion awards are paid once; after the finale, free roam remains available.

Esc opens the pause menu with resume, save, load, confirmed new story and mute. Each completed job autosaves to localStorage. Saves preserve completed jobs, money and XP; loading restores health/ammunition on the coast and **restarts unfinished jobs**, rather than restoring a moving car or pursuit. New story does not overwrite your old save until manual save or job completion. Invalid or unavailable browser storage is handled without crashing. The menu hides the gameplay HUD and scrolls on shorter displays, avoiding the previous overlapping text.

Sound is generated entirely with WebAudio oscillators: speed-dependent engine hum, oscillating police sirens, decaying gunshots/UI blips and a quiet ambient coastal drone. Enter the city to unlock audio; pause silences it and M toggles mute. No sound files or runtime downloads.

## Phase D captures and validation

The start menu uses two columns on desktop to fit the controls and story information at 1280×720. The renderer canvas is fixed to all four viewport edges. Browser layout verification is still pending because of the sandbox restriction below.

`?shot=cover`, `?shot=street`, `?shot=drive`, and `?shot=mission` pose real game state and freeze simulation for repeatable captures. The cover activates Downtown Payday's escape objective, three wanted stars and three police units. The other scenes show Jax on foot, traffic and a First Wheels delivery, and Lena riding to the Central Avenue meet. Normal URLs retain interactive gameplay.

Run `node tools/capture-d.cjs` with `PLAYWRIGHT_PATH` pointing to the cached Playwright package and `CHROMIUM_PATH` pointing to cached Chromium. It uses the required SwiftShader flags and the existing server at `http://127.0.0.1:8901/` without starting another server. It checks menu/canvas bounds, HUD visibility, stationary frame equality and console errors, then writes the four JPEGs named in `shots.json` at 1280×720 and at most 256 KiB each. `node tools/verify-d-simulation.mjs` validates the scene state without a browser.

Phase D simulation and A2/B/C regression simulations pass. Both Chromium and headless-shell launches fail under this execution sandbox with socket `Operation not permitted` / SIGTRAP before loading a page. No screenshots have been fabricated: capture, visual playtest and zero-console-error verification remain blocked. `MAKEFUN_OUTPUT_DIR=out node main.ts` consequently fails because `screenshots/` has no image. The kit check verifies its 24 kit files, then fails at `spawnSync git EPERM`. These are unresolved validation blockers, not passing checks. The kit CLI is at `../kit/gta6-01-kit/cli/makefun.mjs`; run its `check` command with the brief's absolute `--kit` and `--repo` paths once subprocess execution is available.

## Phase C checks

`node tools/verify-c-simulation.mjs` verifies all four mission chains, actual combat damage, exact rewards, duplicate-reward prevention, retry, save/load and corrupt/blocked storage. A2 and B simulations remain regression checks. Requires Node with `registerHooks` (Node 24).

`node tools/verify-c.cjs` uses Playwright and the brief's SwiftShader flags against the existing server on port 8901. Set `PLAYWRIGHT_PATH` and `CHROMIUM_PATH` for your cached installations. It tests story progression, browser inputs, audio activation/mute, pause, persistence across reload, new story, menu layout and console errors; captures go to ignored `.verification/`.

Phase C, B and A2 deterministic checks pass. Phase C browser launch was attempted with both cached Chromium and headless-shell using SwiftShader; this sandbox denies socket operations before Chromium opens a page (`Operation not permitted`, SIGTRAP). Browser rendering, audible output and zero-console-error verification therefore remain unverified here. No additional server was started.

## Phase B checks

`node tools/verify-b-simulation.mjs` checks deterministic wanted escalation/decay, building occlusion, police routing/chasing/ramming/arrest and combat, damage, ammo and reload. `node tools/verify-b.cjs` checks real browser controls and rendering against the existing server on port 8901 with SwiftShader; override `GAME_URL`, `PLAYWRIGHT_PATH`, and `CHROMIUM_PATH` as needed.

Phase B deterministic simulation and A2 regression checks pass. Browser verification was attempted with both cached Chromium and headless-shell builds using the required SwiftShader flags, but this execution sandbox denied socket operations during browser startup (`Operation not permitted`, SIGTRAP). The browser check is provided but its render/zero-console-error result remains unverified; no server was started and no browser pass is claimed.

Built for https://make.fun/bounty/gta6-01 by MakeFun **@steady-wren-86**. Original city and characters; no commercial game assets. MIT licensed; three.js license is preserved in its vendored build.

## Phase A2 checks

`node tools/verify-a2-simulation.mjs` runs deterministic driving, theft, traffic, pedestrian and real-city collision checks with Node 24. `node tools/verify-a2.cjs` runs browser input and console-error checks against the existing server on port 8901 (override `GAME_URL`, `PLAYWRIGHT_PATH` and `CHROMIUM_PATH` as needed). The browser script uses the required SwiftShader flags. In the implementation sandbox, Chromium launch failed with `Operation not permitted` and localhost connections were blocked; browser verification remains pending outside that sandbox. Simulation and syntax checks pass.

---

<sub>Entered on [make.fun](https://make.fun/?ref=b53x5730&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
