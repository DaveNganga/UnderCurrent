# UNDERCURRENT — playable prototype

A first-person crawl through a fictional critical-infrastructure network, built from the nine supplied HW 2 layouts. The original blueprint files are unchanged.

## Play

**Double-click `Start Game.sh` and choose Run**, or open a terminal in this folder and run:

```sh
python3 server.py --open
```

Then visit **http://127.0.0.1:5173**. Keep the server window open while playing. Stop it with Ctrl+C. If that port is busy, use `python3 server.py --port 5174 --open`.

No installation or internet access is needed for the default renderer. Use a desktop browser and keyboard/mouse. Click the game view to capture the mouse. If mouse capture is unavailable, use the arrow keys to turn or drag on the view.

## Controls

| Key | Action |
|---|---|
| WASD | Crawl |
| Mouse / left and right arrows | Look / turn |
| E | Read, collect, use, hack, board, or leave transport |
| Left mouse button | Cut the perimeter padlock (one hit) or strike a network panel (three strikes) |
| Q, then Q again | Confirm a zero-day on the targeted electronic barrier |
| M | Discovered map, recovered codes, and carried access |
| Digits + Enter | Submit a five-digit credential |
| Backspace during a hack | Abort, provoking immediate neutralization |
| Escape | Close a terminal or pause |
| L | Pause / access run-log download |

The map and terminals do **not** pause the world. The pause menu does.

## What is playable

- A physical perimeter introduction, with a human guard, CCTV, chain-link fencing, a padlocked gate, and a guardhouse laptop. It can be skipped from the title screen.
- Three network stages, selected deterministically from all nine supplied layouts, plus the supplied final control-room module.
- Three initially passable routes per stage without required zero-days. Code and token barriers receive upstream matching supplies. Hardened gates are excluded from initial obstacle selection.
- First-person movement and collision, discovered-only map, recovered-code notebook, local sound effects, contextual controls, seed selection, and pause menu.
- Noisy panels, code doors, token-based MFA, copied robot permissions, timed inspection gaps, audit cameras, trusted conveyors, authorized service carts, decoy branches, and honeypots.
- Solo robot hacking: approach behind an unaware robot, commit for eight seconds, copy permissions and its patrol path. The robot continues without player control. Paired robots cannot be hacked.
- Three lives per level; capture resets robots, supplies, temporary door states, and transport. Knowledge and unpatched exploit openings persist. Tokens and copied robot access are lost. Reaching the next level restores three lives.
- One initial zero-day and a one-time second-stage pickup. Electronic bypasses persist at that target until patched. Spent tools are never refunded.
- One defender fortification after each capture, selected from reported observations and authored sockets. Fortifications stay local to an observed route; shared-area responses add sensors. Reported exploit openings get a 60% first-choice patch roll.
- Honeypots immobilize the player and visibly summon a chamber responder for a zap after about three seconds.
- Final authentication via the final credential, physical token, legitimate final-service cart, or a zero-day. Arrival alone does not win.
- Downloadable run events for reviewing captures, reports, and defender decisions.

This is an **initial prototype**, not the final conformance build. See `DEVIATIONS.md` for explicit simplifications and work left for the next pass. No automated test suite was added or run, as requested.

## Optional Three.js view

A Three.js adapter is included in `src/render/three.js`. The game automatically selects it when the local package is installed. The package version is pinned to **0.180.0**. To use it, install the dependency with `npm install`, then open:

`http://127.0.0.1:5173/?renderer=three`

Only when explicitly requested with `?renderer=three`, that adapter tries the pinned jsDelivr module. If it cannot load, the playable offline view remains active. The full 3D adapter is preliminary. Use `?renderer=offline` to force the built-in view.

## Project layout

- `src/sim/`: deterministic map construction and game rules; no renderer or browser dependencies.
- `src/render/crawl.js`: offline first-person renderer.
- `src/render/three.js`: optional Three.js adapter.
- `src/main.js`, `src/style.css`, `index.html`: input, menus, HUD, notebook, and run-log export.
- `config/game.config.json`: timing, speeds, lives, and detection constants.
- `public/blueprints/`: copies of the supplied layouts and control-room module.
- `server.py`: dependency-free, local-only game server.

The simulation runs at 60 fixed steps per second. The seed controls layout choice, obstacle fills, and defender choices. Source code is plain ES modules so the prototype can run without a build tool. It does not modify the original homework files, require an account, or contact real industrial systems.

## Playability update

- Moving the mouse up now looks up in both renderers.
- Outdoor intro: human patrol, nighttime lighting, grass and asphalt, chain-link fencing, padlock, and a security-office laptop. The network retains its original dark palette.
- The exact same wall-clipped light footprint now controls detection and the beam drawn by either renderer. Off-screen light sources still illuminate the visible floor.
- Movement, patrols, camera sweeps, and transport are approximately 15–17% slower. Cart authorization is recalculated for the slower ride. Eight-second hacks and three-second honeypots retain their established durations.
- `npm install` now treats Three.js as a normal dependency, so download failures cannot be silently skipped as an optional install. No npm install is required to use the built-in renderer.
