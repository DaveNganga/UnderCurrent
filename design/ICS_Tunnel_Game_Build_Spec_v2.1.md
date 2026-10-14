# ICS Tunnel Game: Build Specification (v2.1)

A first-person stealth game in a browser. The player is an attacker crawling through maintenance tunnels that represent a utility's hidden network. Patrol bots and sensors defend it. A security architect strengthens the defenses after every capture. All gameplay is simulated; nothing touches a real network.

---

## 0. How to read this document

Owner update 2026-10-11: all three initial routes must be solvable without zero-days; honeypots summon a bot and capture the trapped player in about 3 seconds. These rules supersede earlier solvability and trap-timing text. The dedicated response animation is a configurable implementation default.

### Tags

| Tag | Meaning |
|---|---|
| **[LOCKED]** | Decided by the project owner. Do not change or silently simplify. |
| **[DEFAULT]** | Not decided. Use the stated value, keep it in config, and note it in `DEVIATIONS.md` only if you change it. |
| **[OPEN]** | Unresolved. Implement the stated fallback and flag it in `DEVIATIONS.md`. |

Precedence: `[LOCKED]` > schemas in this document > `[DEFAULT]`.

### Working rules for the implementing agent

1. Make routine decisions yourself. Do not stop to ask questions.
2. Record any material deviation from this document in `DEVIATIONS.md` (what, why).
3. Every tunable number lives in `config/game.config.json` (section 4). No magic numbers in code.
4. The simulation (`src/sim/`) must contain no DOM, no Three.js, no `Math.random`, no `Date.now`. See section 3.
5. Level content ships as data in `blueprints/`: nine blueprint files (`t1_a` to `t3_c`), the shared final module `modules/control_room_v1.json`, and `index.json`. **Do not author, edit, or regenerate level content.** Load it, validate it, and generate obstacle fills from it. Author only the small fixtures needed for unit tests in `tests/fixtures/`. If a blueprint seems wrong, report it in `DEVIATIONS.md` instead of changing it.

### Glossary (use these terms consistently)

| Term | Meaning |
|---|---|
| **Run** | One playthrough from prologue to win or loss. Has one seed. |
| **Tier** | Difficulty band 1, 2, or 3. A run plays one level from each tier, in order. |
| **Level** | One generated instance of a blueprint, for one tier. |
| **Blueprint** | Authored level geometry plus obstacle slots. Fixed content; no randomness inside the file. |
| **Route** | One of three solution families (A, B, C) through a level. Never exposed to the player as a label. |
| **Slot** | A chokepoint on a route where the generator places one obstacle. |
| **Obstacle** | The thing placed in a slot (loose panel, keypad door, and so on). |
| **Pass method** | A way to get through an obstacle (force, code, time, permission, ride, zero-day, evade). |
| **Life** | One of three attempts per level. A capture costs one life. |
| **Attempt** | The play-through between respawns. Attempt number = 4 − lives remaining. |
| **Report** | A restricted observation (from a bot or sensor) that the architect is allowed to use. |
| **Fortification** | The single persistent defensive change the architect adds after a capture. |
| **Opening** | The persistent result of a zero-day on a target. Reusable until patched. |
| **Socket** | A place in a blueprint where a fortification may be applied. |
| **Capture** | A bot's zap of the player. Always caused by a bot, including honeypot cases. |
| **Module** | A reusable map piece stitched into a blueprint at load time. Only `control_room_v1` exists (tier 3). |
| **Cell** | One grid square, `world.cellSizeM` (2 m) on a side. All blueprint coordinates are `[x, y]` cell indices with `y` increasing downward. |

---

## 1. Product summary and locked decisions

**Goal:** reach the control-room computer at the end of Level 3 and be accepted by its access check.

**Structure:** simple playable prologue, then three levels (tier 1, 2, 3). Three lives per level. Third capture in a level ends the run.

### Locked decisions

| # | Topic | Decision |
|---|---|---|
| L1 | Perspective | First-person crawl. Hiding is pure occlusion by tunnel geometry (no hide button, no crouch-quiet). **[LOCKED]** |
| L2 | Prologue | Simple playable: walk to a terminal, avoid one camera, plug in. **[LOCKED]** |
| L3 | Lives | Three per level; restored to three on level completion. **[LOCKED]** |
| L4 | Capture | Lose a life, return to the level entrance. Third capture ends the run; replay generates a new run with a new seed. **[LOCKED]** |
| L5 | Maze richness | Many more corridors than routes: dead ends, loops, honeypots, patrol areas. Only three routes are viable. **[LOCKED]** |
| L6 | Level pool | 9 blueprints (3 per tier). One is chosen per tier per run. Difficulty comes from the seeded obstacle fill, not from the geometry. **[LOCKED]** |
| L7 | Tier-3 shared ending | The three tier-3 blueprints share a final approach and control room; only the way to reach them differs. **[LOCKED]** |
| L8 | Difficulty scaling | Higher tiers fill more slots and unlock harder obstacle types. **[LOCKED]** |
| L9 | Solvability | The generator re-rolls until all three routes are independently solvable without using any zero-days. Zero-days are optional shortcuts, never initial route requirements. **[LOCKED]** |
| L10 | Detection | Each bot has its own 0–3 s suspicion meter. Meters are never pooled. Cameras and scanners report and summon bots; only bots capture. **[LOCKED]** |
| L11 | Investigation | A bot goes to the reported spot and stays on alert (faster detection) for a while, then returns to patrol. **[LOCKED]** |
| L12 | Forced entry | Only loose panels can be banged open. It is noisy. Reinforced panels and walls never yield. **[LOCKED]** |
| L13 | Codes | Typed on a 5-digit keypad. Each wrong entry makes noise; three wrong entries lock that door. **[LOCKED]** |
| L14 | Honeypot doors | Accept any 5-digit code. Opening one traps the player in honey and summons a bot that zaps them about 3 seconds after the trap triggers. **[LOCKED]** |
| L15 | Robot hack | Eight seconds, committed, from behind, on a lone robot only. Interrupting it gets the player zapped immediately. **[LOCKED]** |
| L16 | Robot permissions | A successful hack opens that robot's service doors and reveals its patrol path on the map. The robot keeps patrolling and ignores the player. **[LOCKED]** |
| L17 | Paired robots | Unhackable and not zero-day targets. Tier 1 all solo, tier 2 mixed, tier 3 all paired. **[LOCKED]** |
| L18 | Carried permissions | Permissions carry to the next level and a few doors there accept them. Capture strips all robot permissions, carried ones included. They are never required for solvability. **[LOCKED]** |
| L19 | Zero-days | Start with 1; one more reward in the tier-2 hub (`rewardPickup`), once per run. One use opens one electronic target and creates a persistent opening. Cannot affect loose panels or paired robots. **[LOCKED]** |
| L20 | Patching | The architect can patch an opening. A patched target can never be exploited again. **[LOCKED]** |
| L21 | Conveyors | Continuous loop with no stops. The player boards and jumps off at marked platforms as the carrier passes. **[LOCKED]** |
| L22 | Carts | Parked cart with a timed authorization. At expiry it stops and drops the player where it stands. **[LOCKED]** |
| L23 | Capture reset | Everything transient resets; the player keeps map knowledge and codes. Fortifications and unpatched openings persist. Physical tokens must be re-collected. **[LOCKED]** |
| L24 | Map fog | Revealed by line of sight. **[LOCKED]** |
| L25 | Architect knowledge | Only reports from bots and sensors. It never reads the player's inventory, position history, or map. **[LOCKED]** |
| L26 | Architect attribution | Starts from the bot that captured the player and its recent reports, then infers the weaknesses used. **[LOCKED]** |
| L27 | Architect choice | If a reported active opening exists on the attempted route: 60% patch it. Otherwise (or in the other 40%): 70% counter an inferred weakness, 30% random route-local action. **[LOCKED]** |
| L28 | Victory | The final computer accepts a credential, a token, a valid service context, or a zero-day. Reaching it is not enough. **[LOCKED]** |
| L29 | Determinism | Seeded, replayable runs with a headless mode. **[LOCKED]** |
| L30 | Visual style | Grimy, dark, cyberpunk-industrial. See section 5. **[LOCKED]** |
| L31 | Exclusions | No disguises, no gun combat, no multiplayer, no real hacking, no backend. **[LOCKED]** |

---

## 2. Stack and project layout

**Stack [LOCKED]:** browser game on Three.js.

**Tooling [DEFAULT]:** TypeScript, Vite, Vitest, three (current stable, 0.160 or newer, pinned in `package-lock.json`). No external art, audio, or font downloads; everything is procedural or generated in code (section 5).

### Commands (must work)

```
npm install
npm run dev        # starts the game at http://localhost:5173
npm run test       # unit + scenario tests (headless, no browser)
npm run sim -- --seed 42 --script tests/scripts/example.json   # headless run, prints event log
npm run replay -- replays/<file>.json                          # replays a recorded run in the browser
npm run validate   # validates every blueprint in blueprints/ across 200 seeds
```

### Layout

```
/config/game.config.json
/blueprints/            level data: t1_a.json ... t3_c.json, index.json, modules/control_room_v1.json
/src/sim/               pure simulation (no DOM/three). All game rules live here.
/src/render/            Three.js rendering; reads sim snapshots only
/src/ui/                HUD, keypad, map, menus
/src/input/             keyboard/mouse -> InputFrame
/src/tools/             headless runner, replay, validator CLI
/tests/                 unit, scenario, golden-replay tests; fixtures/
/DEVIATIONS.md
```

**Rule:** `src/sim` never imports from `render`, `ui`, or `input`. Rendering reads state; it never mutates it.

---

## 3. Simulation, determinism, replay

1. **Fixed timestep [LOCKED]:** the sim advances in fixed ticks of `1/tickRateHz` (60 Hz). The render loop interpolates between the last two sim states. Never use frame delta time inside the sim.
2. **Time unit:** all durations in config are seconds. Convert to ticks once at load.
3. **RNG [LOCKED]:** a seeded generator (mulberry32 or sfc32). One run seed derives independent named streams by hashing `seed + ":" + name`:
   - `layout` (blueprint choice per tier)
   - `obstacles` (slot fill, obstacle type, codes, token ids)
   - `patrol` (patrol start offsets, camera phases, paired-robot chance)
   - `architect` (fortification choice)
   - `cosmetic` (rendering only; never read by the sim)
4. **No ambient nondeterminism:** no `Math.random`, `Date.now`, `performance.now`, or unordered iteration in the sim. Iterate arrays in ID-sorted order. Use integer or fixed-point-safe comparisons for tick counts.
5. **Draw discipline:** a system must consume the same number of RNG draws regardless of outcome (for example, always draw both architect rolls, section 10.5), so streams stay aligned.
6. **Inputs:** the sim consumes one `InputFrame` per tick:

```ts
interface InputFrame {
  move: { x: number; y: number };     // -1..1, forward = +y
  lookDeltaYawDeg: number;
  lookDeltaPitchDeg: number;
  interactPressed: boolean;           // E
  strikePressed: boolean;             // left mouse
  zeroDayPressed: boolean;            // Q
  abortHackPressed: boolean;          // Backspace
  keypadDigit: number | null;         // 0-9 typed this tick
  keypadConfirm: boolean;             // Enter
  keypadCancel: boolean;              // Esc inside the keypad
}
```

7. **Replay:** a replay file is `{ configHash, seed, inputs: InputFrame[] }` (run-length encode idle frames). Replaying must reproduce the same event log byte for byte. Record every run automatically to a download-able file.
8. **Headless mode [LOCKED]:** `npm run sim` runs the sim with no rendering from a scripted input list or from a "scenario" file (section 16) and prints/exports the event log.
9. **Pause [DEFAULT]:** Esc pauses the sim by not ticking. Pausing never cancels a hack. The typed keypad does NOT pause the sim.
10. **Config hash:** the replay stores a hash of `game.config.json` and refuses to replay if it differs.

---

## 4. Configuration

Create `config/game.config.json` verbatim, then load it everywhere. All values `[DEFAULT]` unless a decision above says otherwise (8 s hack, 3 s threshold, 60%/70% architect values, 3 strikes, 3 lives, 3 wrong entries, 5 digits are `[LOCKED]`).

```json
{
  "sim": { "tickRateHz": 60 },
  "world": { "cellSizeM": 2.0, "ceilingHeightM": 1.8, "wallHeightM": 1.8 },
  "run": { "livesPerLevel": 3, "levelsPerRun": 3 },
  "player": {
    "crawlSpeedMps": 1.6,
    "radiusM": 0.3,
    "eyeHeightM": 0.7,
    "interactRangeM": 1.8,
    "mapRevealRangeM": 10,
    "mapRevealFovDeg": 100
  },
  "panel": { "strikesToOpen": 3, "strikeCooldownS": 0.8, "strikeNoiseRadiusM": 12 },
  "keypad": { "digits": 5, "wrongEntryNoiseRadiusM": 8, "wrongEntriesToLock": 3 },
  "hack": { "durationS": 8, "rangeM": 1.5, "rearArcDeg": 120, "abortZapDelayS": 0.2 },
  "zeroDay": { "startCount": 1, "rewardCount": 1, "targetRangeM": 2.5 },
  "bot": {
    "patrolSpeedMps": 1.2,
    "investigateSpeedMps": 2.0,
    "viewHalfAngleDeg": 35,
    "viewRangeM": 9,
    "turnRateDegPerS": 120,
    "suspicionThresholdS": 3.0,
    "riseRatePerS": 1.0,
    "decayRatePerS": 0.75,
    "alertDurationS": 10,
    "alertRiseMultiplier": 1.5,
    "alertLookSweepDeg": 60,
    "arrivalRadiusM": 1.0,
    "zapWindupS": 0.4,
    "pairSpacingM": 2.0,
    "hearingAttenuationPerWallM": 3.0
  },
  "camera": {
    "viewHalfAngleDeg": 30,
    "viewRangeM": 12,
    "sweepArcDeg": 90,
    "sweepPeriodS": 8,
    "reportIntervalS": 2,
    "dispatchRadiusM": 25,
    "dispatchCount": 2
  },
  "scanner": {
    "periodS": 6,
    "gapOpenS": { "1": 3.5, "2": 2.6, "3": 2.0 },
    "dispatchRadiusM": 25,
    "dispatchCount": 2
  },
  "listeningSensor": { "radiusM": 14, "dispatchRadiusM": 25, "dispatchCount": 2 },
  "conveyor": { "speedMps": 2.0, "platformLengthM": 6, "carrierSpacingM": 20 },
  "cart": { "speedMps": 1.8, "authMarginFactor": 1.25, "authMarginAddS": 5 },
  "architect": {
    "patchChance": 0.6,
    "counterChance": 0.7,
    "anomalyNoticeRangeM": 6,
    "reportMemoryS": 60,
    "reportsPerBotMax": 8,
    "recencyHalfLifeS": 15
  },
  "honeypot": { "tellsEnabled": false, "captureDelayS": 3.0 },
  "prologue": { "cameraSeesToResetS": 3 },
  "tiers": {
    "1": {
      "optionalSlotFillProbability": 0.5,
      "pairedPatrolChance": 0.0,
      "unlockedObstacles": ["loose_panel", "inspection_gap", "camera_corridor", "keypad_door", "service_door", "conveyor"]
    },
    "2": {
      "optionalSlotFillProbability": 0.75,
      "pairedPatrolChance": 0.5,
      "unlockedObstacles": ["loose_panel", "inspection_gap", "camera_corridor", "keypad_door", "service_door", "conveyor", "paired_patrol", "cart_checkpoint", "mfa_door", "hardened_gate"]
    },
    "3": {
      "optionalSlotFillProbability": 1.0,
      "pairedPatrolChance": 1.0,
      "unlockedObstacles": ["loose_panel", "inspection_gap", "camera_corridor", "keypad_door", "conveyor", "paired_patrol", "cart_checkpoint", "mfa_door", "hardened_gate"]
    }
  },
  "generator": { "maxRerolls": 200 }
}
```

---

## 5. Art direction [LOCKED]

Target: dirty, claustrophobic, cyberpunk-industrial (Watch Dogs mood: dark spaces, hot colored lights, grime). Must run at 60 FPS on a mid-range laptop in a modern browser.

### Look

- **Lighting:** mostly dark. Use a few point lights with flicker, plus bot flashlights (spot lights). Max 2 shadow-casting lights at once; everything else unshadowed.
- **Fog:** dense exponential fog tinted by tier (`THREE.FogExp2`).
- **Palette by tier:** tier 1 sickly green-grey with white-cyan accents; tier 2 amber/rust industrial; tier 3 red/magenta with cold blue accents.
- **Accent colors with meaning:** cyan = terminals/screens, amber = alert state, red = zapping/danger, honey = translucent amber goo. Bot cone light is white-cyan when calm, amber on alert, red during windup.
- **Textures:** generated procedurally on canvas (noise, rust blotches, stains, grate patterns, warning stripes, scratches), tiled. No external image files.
- **Geometry:** low-poly extruded tunnels from the blueprint grid; pipes, cables, vents, grates added as simple instanced props placed by the cosmetic RNG.
- **Post-processing:** `EffectComposer` with bloom, film grain, vignette, slight chromatic aberration, subtle scanlines on screens. Provide a settings toggle to disable post-processing.
- **Camera feel:** slight head bob while crawling, low eye height, short view distance due to fog.
- **Bots:** simple robot meshes with a visible flashlight cone (transparent cone mesh) marking where they face. Pairs are visibly linked (shared color band).
- **Screens:** terminals and keypads emit light and cast it on nearby surfaces (fake with emissive materials + a light only on nearby ones).
- **Audio [DEFAULT]:** generated with WebAudio (hum, footsteps, panel strikes, beeps, zap). Every meaningful sound has a text caption (section 7.4).

### Prologue/transition effect

Plugging in: camera pushes into the terminal screen, glitch/scanline distortion for about 2 seconds, then the tunnel level fades in. Pure post-processing, no assets.

---

## 6. Game flow and state machine

### Game states

```
BOOT -> MENU -> PROLOGUE -> LEVEL_LOADING -> LEVEL_ACTIVE
LEVEL_ACTIVE -> CAPTURING -> (lives > 0) LEVEL_RESET -> LEVEL_ACTIVE
CAPTURING -> (lives == 0) RUN_LOST -> MENU
LEVEL_ACTIVE -> LEVEL_COMPLETE -> (next level) LEVEL_LOADING
LEVEL_ACTIVE -> (final access accepted) RUN_WON -> MENU
```

Rules:

- Entering `CAPTURING` disables all further capture requests until the reset finishes. If several bots request capture on the same tick, the lowest bot ID wins; log the others as `CAPTURE_SUPPRESSED`.
- `LEVEL_COMPLETE` triggers when the player enters the exit trigger volume (tiers 1 and 2) or passes the final access check (tier 3). It restores lives to 3, unloads the level, and carries state per section 12.
- Earlier levels are never revisited in a run.

### Prologue [LOCKED], details [DEFAULT]

- Small facility space: start inside the gate area, a dark room, one sweeping camera, cover objects (crates, pillars), and a security-room terminal at the far end.
- The player walks to the terminal while avoiding the camera. The camera uses the same cone rules as section 8.2.
- If the camera sees the player continuously for `prologue.cameraSeesToResetS` (3 s), fade out and restart the prologue. **No life is lost and the architect does not act.** Log `PROLOGUE_RESET`.
- Interacting with the terminal (E) starts the plug-in transition into Level 1.
- The camera phase is drawn from the `patrol` RNG stream so it is seeded.
- The prologue does not use lives, bots, or the architect.

### Run and level state

```ts
interface RunState {
  runId: string; seed: number;
  status: 'prologue'|'active'|'won'|'lost';
  levelIndex: 0|1|2;
  blueprintIds: [string, string, string];   // chosen via 'layout' stream
  zeroDays: number;                         // inventory
  deeperRewardCollected: boolean;
  carriedPermissions: string[];             // permission tags, see 9.5
  knownCodes: KnownCode[];                  // persists across captures in a run
  log: LogEvent[];
}

interface LevelState {
  blueprintId: string; tier: 1|2|3;
  lives: number;                            // starts 3
  attempt: number;                          // 1..3
  fortifications: Fortification[];          // persistent
  openings: Opening[];                      // persistent
  discovered: Set<string>;                  // "x,y" cells seen
  markers: MapMarker[];                     // seen obstacles, learned traps, learned robot paths
  instance: LevelInstance;                  // generated obstacles (immutable per level)
  transient: TransientWorld;                // rebuilt on every capture
  reports: Report[];                        // architect-visible only
}
```

---

## 7. Player, controls, HUD, map

### 7.1 Controls [DEFAULT], remappable

| Input | Action |
|---|---|
| Mouse | Look |
| W A S D | Crawl |
| E | Interact (board, pick up, open keypad, plug in, start hack when prompted) |
| Left mouse | Strike a loose panel (needs panel within `interactRangeM` and in view) |
| Q | Use a zero-day on the targeted electronic obstacle (requires confirmation prompt: press Q again) |
| M | Toggle discovered map |
| Backspace | Abort a hack (shows a warning: you will be zapped) |
| Esc | Pause menu (inside keypad: cancel entry) |
| 0-9 / Enter | Typed digits and confirm while the keypad is open |

All interaction ranges (`player.interactRangeM`, `hack.rangeM`, `zeroDay.targetRangeM`) are measured from the player's position to the nearest point of the target's cell footprint (door, panel, terminal) or to the robot's position, not to a cell centre. A player standing in a cell next to a door cell is always in range.

### 7.2 Keypad [LOCKED typed; rest DEFAULT]

- Pressing E on a keypad door opens an on-screen keypad. The sim keeps running; mouse look and movement are locked while it is open.
- The player types five digits and presses Enter. Esc cancels without penalty.
- A wrong entry makes a noise event (`keypad.wrongEntryNoiseRadiusM`) and increments that door's wrong-entry counter. At `wrongEntriesToLock` the door is locked for the rest of the attempt. Counters and locks reset on capture.
- A correct entry opens the door for the rest of the attempt (resets on capture).
- Honeypot doors accept any five digits (section 9.9).
- Each keypad shows a door label (for example `MAINT-3`). Code notes reference that label so players can match them.

### 7.3 Minimum HUD

- Lives, level number, zero-days held.
- Reticle and contextual prompt ("Pry panel", "Hack robot (8 s)", "Enter code").
- Eight-second hack progress bar.
- A suspicion indicator for each bot that currently sees the player (a screen-edge arrow toward the bot, filling with its meter). Never show bots that cannot see the player.
- Inventory strip: physical tokens, active permission tags, carried permission tags.
- Notebook panel: known codes with their door label and where they were found.
- Event captions (7.4).
- Win, run-lost, and capture-summary screens, plus replay.

### 7.4 Captions

Every meaningful sound (strike, wrong code, camera sweep, zap, honey) emits a text caption line for about 2 seconds.

### 7.5 Discovered map [LOCKED fog by line of sight]

- Each tick, raycast from the player's eye across `mapRevealFovDeg` up to `mapRevealRangeM`, stopping at walls and closed doors. Every grid cell hit is added to `discovered`.
- Obstacles the player has seen get a marker with an icon (panel, gap, camera, keypad, robot path, conveyor, cart, trap).
- A honeypot that has captured the player gets a permanent `TRAP` marker for the rest of the level.
- Revealed robot paths are drawn as lines. The map never shows undiscovered cells, route labels, or bots currently out of sight.
- The map persists across captures within a level.

### 7.6 Capture summary screen

After a capture show: cause (seen by bot, trap, aborted hack), the capturing bot's location in discovered terms, and one line saying that "security was increased" without revealing which fortification. (The full architect action is only in the exported log.)

---

## 8. Perception and bot behavior

### 8.1 Bot detection and the suspicion meter [LOCKED rules, DEFAULT numbers]

A bot sees the player when all hold:

1. distance ≤ `bot.viewRangeM`,
2. the player is within `bot.viewHalfAngleDeg` of the bot's facing,
3. a grid raycast between them hits no wall or closed door.

Per bot, each tick:

```
if bot.mode in {HACKED_PASSIVE, BEING_HACKED}:      meter unchanged, no detection
elif sees player:
    rate = riseRatePerS * (mode in {INVESTIGATE, ALERT} ? alertRiseMultiplier : 1)
    meter = min(threshold, meter + rate * dt)
else:
    meter = max(0, meter - decayRatePerS * dt)
if meter >= threshold and mode != WINDUP:  -> WINDUP
```

- Meters are independent. Two bots at 1.5 s each do not capture.
- While the meter is above 0 and the bot sees the player, it pauses movement and turns toward the player at `turnRateDegPerS`. When the meter returns to 0 it resumes its current task. **[DEFAULT]**
- A UI arrow per seeing bot shows its meter (7.3).

### 8.2 Bot modes and transitions

Modes: `PATROL`, `INVESTIGATE`, `ALERT`, `RETURN`, `WINDUP`, `BEING_HACKED`, `HACKED_PASSIVE`, `RESPOND_TRAP`.

| From | Trigger | To | Notes |
|---|---|---|---|
| PATROL, RETURN | dispatch or heard noise | INVESTIGATE | Remember waypoint index. Move at `investigateSpeedMps` to the reported position via grid A*. |
| INVESTIGATE | within `arrivalRadiusM` of target | ALERT | Start `alertDurationS` timer. Sweep view ±`alertLookSweepDeg` while waiting. |
| INVESTIGATE, ALERT | newer dispatch or noise | INVESTIGATE | Retarget. |
| ALERT | timer ends | RETURN | |
| RETURN | reaches nearest patrol waypoint | PATROL | Resume path from that waypoint. |
| any except BEING_HACKED, HACKED_PASSIVE, WINDUP | meter ≥ threshold | WINDUP | Stop, face player, `zapWindupS` telegraph (red cone, charging sound). Player cannot escape once windup begins. |
| WINDUP | windup elapsed | (capture request) | Emit `CaptureRequest(botId, 'SEEN')`. |
| PATROL, RETURN | player starts a valid hack | BEING_HACKED | Section 9.6. |
| BEING_HACKED | hack completes | HACKED_PASSIVE | Ignore player until capture or level end. Resume patrol. |
| BEING_HACKED | hack aborted | WINDUP | Windup is `abortZapDelayS` instead of `zapWindupS`. Cause `'HACK_ABORT'`. |
| any except those above | assigned as trap responder | RESPOND_TRAP | Section 9.9. On arrival adjacent to the player: WINDUP with cause `'TRAP'`. |

Bots never chase beyond these rules. They follow waypoints, investigate reports, and zap. They are intentionally "dumb": the flashlight cone shows exactly what they can see.

### 8.3 Cameras [LOCKED role, DEFAULT numbers]

- A camera sweeps back and forth over `sweepArcDeg` with period `sweepPeriodS` (phase from the `patrol` stream).
- It uses the same visibility test as bots with its own cone values. It never captures and has no meter.
- While it sees the player it emits a `CAMERA_SIGHTING` report every `reportIntervalS` and dispatches the nearest `dispatchCount` eligible bots (by path distance ≤ `dispatchRadiusM`, excluding BEING_HACKED, HACKED_PASSIVE, WINDUP, RESPOND_TRAP) to the sighted position.
- Cameras are electronic zero-day targets (disable).

### 8.4 Inspection scanners (the "misaligned inspection gap") [DEFAULT]

- Two overlapping beams oscillate so that a gap in coverage opens for `scanner.gapOpenS[tier]` out of every `scanner.periodS` seconds.
- The gap window must exceed the player's crossing time. Blueprints specify crossing length; the validator checks `gapOpenS ≥ crossLengthM / crawlSpeedMps + 0.5`.
- Crossing while closed emits a `SCANNER_TRIGGER` report and dispatches bots like a camera.
- A scanner is an electronic zero-day target (disable).

### 8.5 Noise [DEFAULT]

A noise event is `{ pos, radiusM, source }`. For each bot and listening sensor:

```
effectiveDistance = euclideanDistance + hearingAttenuationPerWallM * (number of wall cells on the grid ray between them)
heard = effectiveDistance <= radiusM
```

- A bot that hears a noise (not in WINDUP, BEING_HACKED, HACKED_PASSIVE, RESPOND_TRAP) goes to `INVESTIGATE` at the noise position.
- A listening sensor that hears it emits a `NOISE_*` report and dispatches bots like a camera.
- Noise itself never captures.

### 8.6 Anomaly notice (how the architect can learn about changed objects) [DEFAULT]

An altered object (forced panel, active zero-day opening, hacked robot) becomes reportable when any bot (in any mode except WINDUP) or sensor has line of sight to it within `architect.anomalyNoticeRangeM`. Each object emits at most one anomaly report per attempt:

- forced panel → `ANOMALY_PANEL`
- active zero-day opening on a target → `ANOMALY_OPENING`
- hacked robot (when observed by another bot or sensor) → `ANOMALY_ROBOT`

Anomaly state resets with the rest of the transient world on capture, but zero-day openings persist, so `ANOMALY_OPENING` can be emitted again in later attempts.

---

## 9. Obstacles and mechanics

### 9.1 Obstacle catalog

| Obstacle type | Electronic? | Pass methods | Notes |
|---|---|---|---|
| `loose_panel` | no | `FORCE` | Strikes make noise. Physical; zero-day never applies. |
| `inspection_gap` | yes | `TIME`, `ZERO_DAY` | Cross during the open window. |
| `camera_corridor` | yes | `EVADE`, `ZERO_DAY` | Hazard: pass using cover and timing. |
| `keypad_door` | yes | `CODE`, `ZERO_DAY` | Code note supplied upstream on the same route. |
| `mfa_door` | yes | `CODE_AND_TOKEN`, `ZERO_DAY` | Needs both a code and a physical token. |
| `hardened_gate` | yes | `ZERO_DAY` only | No code exists in the level. |
| `service_door` | yes | `PERMISSION`, `ZERO_DAY` | Opened by its slot-bound robot's permission (`patrolRef`, `grantsDoorSlotIds`). Hackable only while that robot is solo. |
| `conveyor` | no | `RIDE` | Crosses a barrier that is otherwise impassable. |
| `cart_checkpoint` | yes | `SESSION`, `ZERO_DAY` | Cart's authorization passes the checkpoint. |
| `paired_patrol` | no | `EVADE` | Hazard only: paired robots cannot be hacked or zero-dayed. |

`EVADE` obstacles are hazards, not gates; they remain passable by stealth. The validator checks only that cover exists nearby (section 11.5).

Any slot may carry `acceptsTags`. When the placed obstacle is a door type (`keypad_door`, `mfa_door`, `hardened_gate`, `service_door`) and the player holds any listed tag (active or carried), the door opens. This never counts toward solvability. The final computer is not a slot obstacle; it is the `computer` object in the final module (section 13).

### 9.2 Loose panels and forced entry [LOCKED]

- Left-click while aiming at an intact loose panel within range counts as one strike (cooldown `strikeCooldownS`). Each strike emits a noise event with `strikeNoiseRadiusM`.
- After `strikesToOpen` strikes the panel opens for the rest of the attempt. It becomes `ANOMALY_PANEL`-reportable (8.6).
- Reinforced panels and walls have no hit points and never open.
- The pry tool is permanent and reusable.

### 9.3 Credentials: code notes and tokens

- A **code note** is a pickup with text such as `MAINT-3 access: 58319`. Picking up (or reading it in view) adds it to `knownCodes` permanently within the run.
- **Physical tokens** are pickups with an ID. They are held in the inventory strip. On capture they are removed from the inventory and return to their pickup location (the player must fetch them again). On level completion they are discarded.
- Codes are random five-digit strings from the `obstacles` stream, unique per door.

### 9.4 Zero-days [LOCKED]

- The player holds `runState.zeroDays` (starts at 1). The deeper reward adds 1 once per run, picked up at the tier-2 blueprint's `rewardPickup` cell, which sits in the hub (`deeperRewardCollected`).
- Q targets the electronic obstacle under the reticle within `targetRangeM`. Press Q again to confirm. Then:
  - consume one zero-day,
  - create an `Opening { targetId, active: true, createdTick }`,
  - apply the effect (keypad/MFA/gate/service door opens; camera/scanner disabled; computer's access check satisfied).
- An opening **persists across captures** and works at that exact target at no cost until patched.
- If the architect patches the target, the opening deactivates and **the target can never be exploited again**. Further Q presses on it show "No exploitable weakness".
- Zero-days never target: loose panels, paired robots, honey traps once triggered, or non-electronic obstacles.
- An opening becomes architect-visible only through `ANOMALY_OPENING` (8.6).

### 9.5 Robot permissions [LOCKED]

Each robot defines `grantsTags: string[]` and `grantsDoorIds: string[]`.

- On a successful hack the player receives each tag in `grantsTags` (active until capture), and the robot's `grantsDoorIds` doors open for the rest of the attempt.
- The robot's patrol path and origin point are added to the map as markers.
- On level completion, held tags move to `carriedPermissions`.
- A door in a later level may list `acceptsTags` (for example tier 2 door accepts `T1_MAINT`). It opens when the player holds any listed tag, active or carried.
- **Capture removes all tags, carried ones too.**
- Carried permissions are optional shortcuts. The validator never counts them toward solvability.

### 9.6 Robot hack [LOCKED]

Eligibility, all required:

1. The robot is solo (no `pairId`) and in mode `PATROL` or `RETURN`, with meter 0.
2. The player is within `hack.rangeM` and inside the robot's rear arc (`hack.rearArcDeg`, centered behind its facing).
3. No wall between them.

Prompt "Hack robot (8 s)" appears when eligible. E starts it.

During the hack:

- The robot is `BEING_HACKED` and stationary with a readable animation. The player's movement is locked; looking is allowed.
- A progress bar fills over `hack.durationS`.
- Other bots and cameras keep operating and can still capture the player.
- Backspace aborts: the robot immediately enters `WINDUP` with `abortZapDelayS` (cause `HACK_ABORT`).
- Pausing freezes the hack; it does not abort.

On success: grant permissions (9.5), reveal the path, mode becomes `HACKED_PASSIVE`, log `HACK_SUCCESS`. A hacked robot ignores the player until capture or level end.

### 9.7 Paired robots [LOCKED]

- A pair is two robots with the same `pairId` that follow the same waypoints separated by `pairSpacingM`. Each has its own meter.
- A paired robot is never hackable, even when the partner is out of sight. No lure or separation mechanic exists.
- Tier 1: all patrols solo. Tier 2: each **ambient** patrol (`slotless: true`) is paired with probability `tiers.2.pairedPatrolChance` (0.5). Tier 3: all patrols are paired.
- A **slot-bound** patrol (`slotless: false`, referenced by a slot's `patrolRef`) spawns only when its slot's placed obstacle is `service_door` (solo, hackable, grants its `grantsTags` and opens `grantsDoorSlotIds`) or `paired_patrol` (a paired hazard that grants nothing). It never spawns for any other obstacle type. Pairing probability does not apply to slot-bound patrols.
- Patrol `mode`: `pingpong` walks the waypoint list forward and then backward; `cycle` goes from the last waypoint straight back to the first.
- Ambient patrols may carry `grantsTags` (for example `T1_MAINT`). A successful hack of such a robot grants the tag but opens no door in its own level; the tag carries to the next level (section 9.5).

### 9.8 Conveyors and carts

**Conveyor [LOCKED loop; DEFAULT numbers]**

- A `ConveyorDef` is a closed loop of cells. It passes through its slot's `barrierCells` (three cells blocked to walkers) and through wall cells (`housing`). Carriers are spaced `carrierSpacingM` apart and move along the path at `speedMps`.
- It has two platforms of three cells (`platformLengthM` = 6 m) on the route, one before and one after the barrier. The player boards by pressing E when a carrier is inside a platform within range. Pressing E again while a carrier is inside any platform dismounts onto that platform. (Window ≈ 6 m / 2 m/s = 3 s.)
- Missing a platform means riding another lap (about 20 s). The danger is exposure: the carrier passes cameras, scanners, and bot sightlines that can see the rider.
- The conveyor exists only if its slot is filled with `conveyor`. Otherwise `barrierCells` are open corridor and the housing stays rock.

**Cart [LOCKED expiry; DEFAULT numbers]**

- A `CartDef` has a `sessionTag`, a `startCell`, a `path` (route cells, in order), and the slot whose obstacle is `cart_checkpoint`. The checkpoint's `barrierCells` block walkers but accept a cart whose session is valid.
- Carts are not solid. The player boards by pressing E within range of the cart's current cell. The cart then drives along `path` at `cart.speedMps`. Pressing E while riding dismounts the player onto the nearest walkable cell beside the cart; the cart stops there and does not move again until boarded. **[DEFAULT]**
- The authorization timer starts at boarding. `authSeconds` is set by the generator: `ceil(totalPathLengthM / speedMps * authMarginFactor + authMarginAddS)`. For a `finalService` cart, the total path includes the module's `serviceTunnel` (section 11.7).
- At expiry the cart stops immediately, its session is removed, and the player is placed on the walkable cell beside it. If the cart is stopped short of a checkpoint, the checkpoint stays closed. No automatic capture.
- On capture, carts return to `startCell` with a fresh timer, unless the architect revoked the session (`REVOKE_CART_SESSION`).
- A cart exists only if its slot is filled with `cart_checkpoint`, except `finalService` carts, which are always active.

### 9.9 Honeypots [LOCKED]

Types: `honeypot_door` (keypad that accepts any five digits and leads to a trap chamber) and `honeypot_terminal` (pressing E triggers it).

- Visual design should be indistinguishable from real versions, **[OPEN]** except for optional subtle tells (extra-clean casing, a slightly different hum) the owner may enable later via `honeypot.tellsEnabled` (default false).
- On trigger: immobilize the player in honey, emit `TRAP_TRIGGERED`, and summon responding bots. A bot must zap the player approximately `honeypot.captureDelayS` (3 seconds) after the trigger. This is the total trap-to-capture time, including approach and zap animation, not an additional three-second sight-confirmation phase. **[LOCKED]**
- **[DEFAULT response implementation]** Prefer the nearest eligible bot that can arrive within that time. If patrol distance, closed barriers, or hacked bots prevent timely arrival, use a dedicated trap-response bot introduced through a procedural security hatch at the trap chamber. This is a scripted trap response, not a new player-accessible route; it requires no authored blueprint changes. Tier-3 reinforcements arrive as a pair, preserving the all-paired rule. Responders are in `RESPOND_TRAP`, cannot be hacked, and cannot be diverted while completing this capture.
- Keep a bot visible as the source of the zap. Do not leave the player waiting indefinitely or have the trap itself inflict a botless capture. A trap response bypasses ordinary patrol travel restrictions only for this scripted event; it does not grant normal patrols passage through walls.
- Validate that every trap has space for its response animation and produces exactly one capture at the configured delay, including when all ordinary responders are blocked or hacked.
- Zero-days cannot free a trapped player.
- On capture the trap rearms. The map keeps a `TRAP` marker.

### 9.10 Dead ends and loops

Blueprints contain at least two ordinary dead ends and at least one loop per level (validator check). Dead ends are plain geometry with no gameplay tag, or `rubble` flavor. Loops allow bots and players to circle.

---

## 10. Reports and the architect

### 10.1 Report schema

```ts
type ReportKind =
  | 'BOT_SIGHTING' | 'CAMERA_SIGHTING' | 'SCANNER_TRIGGER'
  | 'NOISE_PANEL' | 'NOISE_KEYPAD'
  | 'ANOMALY_PANEL' | 'ANOMALY_OPENING' | 'ANOMALY_ROBOT'
  | 'CONVEYOR_RIDER_SIGHTED' | 'CART_RIDER_SIGHTED'
  | 'TRAP_TRIGGERED' | 'CAPTURE';

interface Report {
  id: number; tick: number;
  kind: ReportKind;
  sourceId: string;          // bot or sensor that emitted it
  zoneId: string;            // zone of the observed event
  routeId: 'A'|'B'|'C'|'shared';
  targetId?: string;         // obstacle/slot involved, if known to the reporter
  pos: [number, number];
  attempt: number;
}
```

Reports hold no player inventory, no position history, and no map knowledge.

### 10.2 Who emits what

| Event | Emitter | Report |
|---|---|---|
| A bot sees the player for the first tick in a continuous sighting, and again each 2 s while seen | the bot | `BOT_SIGHTING` |
| A camera sees the player | camera | `CAMERA_SIGHTING` |
| Scanner triggered | scanner | `SCANNER_TRIGGER` (`targetId` = scanner slot) |
| Panel strike noise heard | listening sensor or bot | `NOISE_PANEL` (`targetId` = panel slot if within 4 m of source) |
| Wrong keypad entry heard | listening sensor or bot | `NOISE_KEYPAD` (`targetId` = door slot) |
| Anomaly noticed (8.6) | noticing bot or sensor | `ANOMALY_*` |
| Rider seen on a conveyor or cart | camera, bot, or sensor | `CONVEYOR_RIDER_SIGHTED` / `CART_RIDER_SIGHTED` (`targetId` = that obstacle) |
| Trap triggered | the trap | `TRAP_TRIGGERED` |
| Capture | capturing bot | `CAPTURE` |

Each bot keeps a ring buffer of the last `reportsPerBotMax` reports it emitted or acted on, discarding any older than `reportMemoryS`.

### 10.3 Route attribution [LOCKED approach]

On capture, take the capturing bot's buffer plus the `CAPTURE` report. For each report whose `routeId` is not `shared`:

```
weight = 1 / (1 + ageSeconds / recencyHalfLifeS)         // newer counts more
score[routeId] += weight
chosenRoute = argmax(score), ties broken by the route of the capture zone
if every report is 'shared': chosenRoute = null
```

### 10.4 Weakness inference and counters

| Report kinds (on chosen route) | Inferred weakness | Preferred counter | Other eligible counters |
|---|---|---|---|
| `NOISE_PANEL`, `ANOMALY_PANEL` | forced panel | `REINFORCE_PANEL` | `ADD_LISTENING_SENSOR` |
| `SCANNER_TRIGGER` or sighting inside a scanner zone | inspection gap | `CLOSE_GAP` | `ADD_CAMERA` |
| `NOISE_KEYPAD` | credential guessing/reuse | `STRENGTHEN_AUTH` | `ADD_LISTENING_SENSOR` |
| `ANOMALY_ROBOT` | compromised robot | `PAIR_ROBOT` | `RESTRICT_ROBOT_PERMISSIONS` |
| `CONVEYOR_RIDER_SIGHTED` | conveyor abuse | `INSPECT_CONVEYOR` | `ADD_CAMERA` |
| `CART_RIDER_SIGHTED` | session reuse | `REVOKE_CART_SESSION` | `ADD_CAMERA` |
| `TRAP_TRIGGERED` | trusted-entry deception | `DEPLOY_HONEYPOT` (empty decoy socket) | `ADD_CAMERA` |
| `BOT_SIGHTING`, `CAMERA_SIGHTING` with no target | general exposure | `ADD_CAMERA` | `ADD_LISTENING_SENSOR` |
| `ANOMALY_OPENING` | zero-day opening | `PATCH_OPENING` | (handled by 10.5 step 1) |

A counter is eligible only if a socket on the chosen route (or the specific target) allows it and it has not already been applied.

### 10.5 Selection algorithm [LOCKED probabilities]

```
function chooseFortification(reports, state, rng /* 'architect' stream */):
    patchRoll   = rng.next()          // ALWAYS draw all three, in this order
    counterRoll = rng.next()
    pickRoll    = rng.next()

    route = attribute(reports)
    if route == null:
        return sharedFallback(state, pickRoll)       // ADD_CAMERA or ADD_LISTENING_SENSOR at the shared
                                                      // socket nearest the capture zone

    patchCands   = active, unpatched openings on route with an ANOMALY_OPENING report
    counterCands = eligible preferred/other counters from the inference table
    randomCands  = every allowed, not-yet-applied action across the route's sockets

    if patchCands not empty and patchRoll < config.architect.patchChance:
        return PATCH_OPENING on most recently reported target (ties by id)
    if counterCands not empty and counterRoll < config.architect.counterChance:
        return pick from counterCands, weighted by report recency, using pickRoll
    if randomCands not empty:
        return pickRoll-indexed choice from randomCands (sorted by id)
    return sharedFallback(state, pickRoll)
```

Exactly one fortification is chosen per capture, including the third capture of a level (logged for consistency, then the run ends).

### 10.6 Fortification actions

| ActionId | Where | Effect | Removes pass methods | Allowed on shared sockets |
|---|---|---|---|---|
| `PATCH_OPENING` | opening target | opening inactive forever; target never exploitable again | `ZERO_DAY` | no |
| `REINFORCE_PANEL` | `loose_panel` | panel becomes reinforced | `FORCE` | no |
| `ADD_CAMERA` | any camera socket | spawns a camera | none | **yes** |
| `ADD_LISTENING_SENSOR` | any sensor socket | spawns a listening sensor | none | **yes** |
| `CLOSE_GAP` | `inspection_gap` | gap window becomes 0 | `TIME` | no |
| `STRENGTHEN_AUTH` | `keypad_door` | adds a token requirement (needs `reservedTokenSupplyId`) | none (adds a requirement) | no |
| `RESTRICT_CONNECTION` | any slot | bulkhead seals the slot | all, including `ZERO_DAY` | no |
| `INSPECT_CONVEYOR` | `conveyor` | adds an inspection point on the loop that reports riders and dispatches bots | none | no |
| `REVOKE_CART_SESSION` | `cart_checkpoint` | the cart cannot pass | `SESSION` | no |
| `RESTRICT_ROBOT_PERMISSIONS` | `service_door` | the robot grants nothing for that door | `PERMISSION` | no |
| `PAIR_ROBOT` | solo patrol | adds a companion | `PERMISSION` via hack | no |
| `DEPLOY_HONEYPOT` | decoy socket | converts an empty decoy branch into a honeypot | none | no |

Rules:

- **Shared sockets may only allow `ADD_CAMERA` and `ADD_LISTENING_SENSOR`.** This guarantees that no fortification can close more than one route.
- A fortification applies to exactly one socket.
- Fortifications persist until the level ends. Earlier ones remain active. Base-level difficulty is separate from capture-driven fortification.
- Sockets that depend on a supply (for example `STRENGTHEN_AUTH` needs a spare token pickup) are offered only if that supply exists upstream on the same route.

### 10.7 Why three lives remain fair

A fortification affects at most one route. After two non-terminal captures at most two routes are closed, so the third route remains for the final life. The validator guarantees every route is initially independently solvable without zero-days (section 11.5), and the socket rules above guarantee independence.

---

## 11. Blueprints, generation, and validation

### 11.1 What a blueprint is

Authored JSON describing geometry and slots. It contains no randomness. The generator fills it per seed. The nine blueprint files and the shared module ship as data in `blueprints/` (Appendix B). The agent supplies the loader, module stitcher, schema validation, generator, and validator.

### 11.2 Blueprint schema

All shipped files use `schemaVersion: 1`. Load them with a strict schema validator (for example `zod`) and fail loudly on unknown required fields.

```ts
type Cell = [x: number, y: number];

interface Blueprint {
  schemaVersion: 1;
  id: string;                         // "t1_a" ... "t3_c"
  tier: 1 | 2 | 3;
  name: string;
  cellSizeM: number;
  notes?: string[];                   // author commentary; ignore at runtime
  grid: string[];                     // rows, top to bottom; legend below
  start: Cell;
  exit?: { cell: Cell; zoneId: string };                       // tiers 1 and 2
  finalModule?: { id: string; anchor: Cell;                    // tier 3 only
                  links: { route: 'A'|'B'|'C'; fromCell: Cell; moduleEntrance: 'entA'|'entB'|'entC' }[] };
  rewardPickup?: { cell: Cell; kind: 'zero_day' };             // tier 2 only, in the hub
  zones: Zone[]; routes: RouteDef[]; slots: Slot[]; supplyPoints: SupplyPoint[];
  patrols: PatrolDef[]; conveyors: ConveyorDef[]; carts: CartDef[];
  decoyBranches: DecoyBranch[]; sensors: FixedSensor[]; sockets: Socket[];
}
```

**Grid legend:** `#` wall or rock, `.` floor, `S` start (floor), `X` exit (floor). In tier 3 the module's area is all `#` in the blueprint grid and is replaced at load time (section 11.7); the module's own grid also uses `K` (the computer, solid). Everything else (doors, panels, robots, supplies) is placed by coordinates in the lists below, never in the grid.

```ts
interface Zone { id: string; rect: [x: number, y: number, w: number, h: number];
                 routeId: 'A'|'B'|'C'|'shared';
                 tags: ('entry'|'loop'|'alcove'|'deadEnd'|'finalApproach')[]; }
// Zones tile the floor exactly: every floor cell is in exactly one zone. Use them for report attribution.

interface RouteDef { id: 'A'|'B'|'C'; name: string; slotOrder: string[];
                     finalAccess?: 'CREDENTIAL'|'TOKEN'|'SERVICE'; }   // finalAccess: tier 3 only

interface Slot {
  id: string; routeId: 'A'|'B'|'C'; order: number;      // order 1.. along the route
  cell: Cell;
  facing: 'N'|'E'|'S'|'W';                              // direction of player travel through the slot
  mandatory: boolean;                                   // false => filled with tier probability
  allowedTypes: ObstacleType[];                         // all are legal for the blueprint's tier
  crossLengthM?: number;                                // inspection_gap
  acceptsTags?: string[];                               // optional carried-permission shortcut
  patrolRef?: string;                                   // service_door and paired_patrol robots
  conveyorRef?: string; cartRef?: string;
  barrierCells?: Cell[];                                // cells blocked while the obstacle is active
  coverZoneIds?: string[];                              // alcove zones for hazard slots
}

interface SupplyPoint {
  id: string; routeId: 'A'|'B'|'C'; order: number; cell: Cell;
  accepts: ('code_note'|'token'|'final_code_note'|'final_token')[];
  reservedForSlotId?: string;           // token held back for a STRENGTHEN_AUTH fortification
}
// order k means "located after slot k and before slot k+1" (k = 0 is before the first slot).
// A supply may only be used by a slot whose order > supply.order. Each supply point holds at most one item.
// Id conventions: <R>_SP<n> code-note, <R>_TOK<n> reserved token, <R>_MT<n> MFA token, <R>_FINAL final-access item.

interface PatrolDef { id: string; routeId: 'A'|'B'|'C'|'shared';
                      slotless: boolean;                // true = ambient, always present
                      mode: 'pingpong'|'cycle'; waypoints: Cell[];
                      grantsTags: string[]; grantsDoorSlotIds: string[]; }

interface ConveyorDef { id: string; slotId: string; closedLoop: true; housing: true;
                        path: Cell[];                    // closed loop of adjacent cells, including housing cells
                        platforms: { id: string; cells: Cell[] }[]; }   // two platforms, 3 cells each

interface CartDef { id: string; slotId: string; routeId: 'A'|'B'|'C'; sessionTag: string;
                    startCell: Cell; path: Cell[];       // adjacent route cells from start to end
                    finalService?: true; continuesIntoModule?: 'serviceTunnel'; }

interface DecoyBranch { id: string; routeHint: 'A'|'B'|'C'|'shared'; zoneIds: string[];
                        allowedTypes: ('dead_end'|'honeypot_door'|'honeypot_terminal')[];
                        doorCell: Cell;                  // first cell of the branch (where a honeypot door sits)
                        terminalCell?: Cell;             // centre of the branch's room (honeypot terminal), if it has one
                        responderPathFrom: Cell; }       // the corridor cell the branch opens from

interface FixedSensor { id: string; kind: 'camera'|'listening'; routeId: string; zoneId: string; cell: Cell;
                        facing: 'N'|'E'|'S'|'W'; }

interface Socket { id: string; routeId: 'A'|'B'|'C'|'shared'; zoneId: string; cell: Cell;
                   targetSlotId?: string; decoyBranchId?: string;
                   allowedActions: ActionId[]; reservedTokenSupplyId?: string; }
```

### 11.2.1 Semantics the schema does not spell out

- **`allowedActions` is a superset.** At fortification time keep only actions that apply to the obstacle actually placed in `targetSlotId` (for example `REINFORCE_PANEL` only if the slot holds a `loose_panel`).
- `PAIR_ROBOT` and `RESTRICT_ROBOT_PERMISSIONS` on a slot socket act on that slot's `patrolRef` robot.
- `DEPLOY_HONEYPOT` sockets carry `decoyBranchId` and apply only to a decoy branch currently typed `dead_end`.
- `STRENGTHEN_AUTH` uses `reservedTokenSupplyId`: the reserved token appears at that supply point (once) and the keypad then needs code and token.
- A `camera_corridor` camera sits at the slot cell and faces opposite to `facing` (back along the approach). An `inspection_gap` scanner arch occupies the slot cell.
- `barrierCells` block walkers only while the obstacle is active (conveyor shutter, cart checkpoint). For all other obstacle types the blocking cell is `Slot.cell` itself.
- `notes` and zone ids are for people and for report attribution; nothing in the rules depends on id naming.

### 11.3 Generation algorithm

Run once per level load with the `obstacles` and `patrol` streams derived from the run seed and the level index.

```
for attempt in 1..generator.maxRerolls:
    instance = empty
    for each slot (sorted by id):
        fill = slot.mandatory or obstacles.next() < tier.optionalSlotFillProbability
        if fill: type = uniform pick from slot.allowedTypes (obstacles stream)
        instantiate by type:
            loose_panel      -> panel at slot.cell
            inspection_gap   -> scanner with gap window tier.gapOpenS
            camera_corridor  -> camera at slot.cell facing back along the approach
            keypad_door      -> random unique 5-digit code; place the note at an unused code_note SupplyPoint
                                with order < slot.order on the same route
            mfa_door         -> as keypad_door, plus a token at an unused MFA token supply (id contains "_MT")
                                with order < slot.order
            hardened_gate    -> electronic gate with no code anywhere in the level
            service_door     -> activate slot.patrolRef as a SOLO robot (grants its tags/doors)
            paired_patrol    -> activate slot.patrolRef as a PAIRED hazard (grants nothing)
            conveyor         -> activate slot.conveyorRef (barrierCells close; carriers start moving)
            cart_checkpoint  -> activate slot.cartRef (cart parked at startCell, authSeconds computed)
    activate ambient patrols (slotless): paired or solo by tier.pairedPatrolChance (patrol stream)
    tier 3 only: place the final code at the route-A "A_FINAL" supply, the final token at the route-B
                 "B_FINAL" supply, and always activate the final service cart on route C
    assign decoy branch types, ensuring >= 2 dead_end and >= 1 honeypot (door or terminal)
    classify routes (11.4); if valid (11.5): return instance
fail loudly: "blueprint <id> cannot satisfy constraints"
```

Notes:

- Reserved token supply points (`reservedForSlotId`) stay empty until a `STRENGTHEN_AUTH` fortification uses them.
- Unfilled optional slots leave plain corridor.
- The generator must be pure: the same blueprint, seed, and level index give the same instance.

### 11.4 Route classification

```
function classify(route, instance, fortifications):
    zdNeeded = 0
    for slot in route.slots in order (filled slots only):
        methods = passMethodsAvailable(slot, instance, fortifications)
        // a method counts only if its requirements are suppliable upstream on this route
        nonZD = methods minus {ZERO_DAY}
        if nonZD is not empty:      continue
        if ZERO_DAY in methods and target not patched:   zdNeeded += 1;  continue
        return CLOSED
    return zdNeeded == 0 ? FREE : (zdNeeded <= 1 ? NEEDS_ONE : CLOSED)
```

`EVADE` hazards count as passable (cover checked separately). `acceptsTags` shortcuts and carried permissions are never counted.

`NEEDS_ONE` remains a useful classification after fortification, but is never accepted for a fresh level. An initial `hardened_gate` has only `ZERO_DAY`, so a generated fill containing one must be rejected. Keep the supplied blueprint allowed-type lists unchanged; enforce the stronger rule in generation/validation. The other two route families must remain unchanged when one route is fortified. Final access prerequisites are obtainable on their respective routes without zero-days.

### 11.5 Validator rules (each is a test)

**Data-integrity rules (run on every file at load):**

1. Every id referenced (`patrolRef`, `conveyorRef`, `cartRef`, `coverZoneIds`, `targetSlotId`, `decoyBranchId`, `reservedForSlotId`, `reservedTokenSupplyId`, `grantsDoorSlotIds`, `zoneId`, `slotOrder`) resolves. Ids are unique.
2. The zones tile the floor exactly (no gaps, no overlaps).
3. In tier 3, the module area in the blueprint grid is all `#`.

**Rules on a generated instance:**

4. Exactly three routes; each route's slots have strictly increasing `order`.
5. **All three routes classify as `FREE` before capture-driven fortifications.** [LOCKED L9] Reject and re-roll any initial fill classified `NEEDS_ONE` or `CLOSED`.
6. Every code note and token a filled slot needs sits on a supply point with a smaller order on the same route. Each supply point holds at most one item.
7. Tier 2: the `rewardPickup` cell is in a `shared` zone (the hub).
8. After decoy assignment: at least 2 `dead_end`, at least 1 loop (zone tagged `loop`), at least 1 honeypot.
9. Every honeypot has a valid trap-response location and can produce a bot capture in `honeypot.captureDelayS`, even if no ordinary patrol has a traversable path. Test the dedicated response fallback from section 9.9.
10. Every hazard slot (`camera_corridor` or `paired_patrol` allowed) has a `coverZoneIds` alcove within 6 m (3 cells) of path distance of the slot cell, or of any cell on its patrol beat for `paired_patrol`.
11. Inspection gap windows satisfy `gapOpenS >= crossLengthM / crawlSpeedMps + 0.5`.
12. Carts: `authSeconds` >= total travel time, and no other slot lies on a cart's path. Conveyors: housing cells are rock, platforms and barrier cells are floor.
13. Sockets: each `targetSlotId` belongs to the socket's route; `shared` sockets allow only `ADD_CAMERA` and `ADD_LISTENING_SENSOR`.
14. **Reachability on the stitched map:** start reaches the goal (the exit cell for tiers 1 and 2; any cell next to the computer for tier 3); every floor cell is reachable from start.
15. **Chokepoints:** every slot cell has exactly two walkable neighbours. Blocking the cells of all mandatory slots (using `barrierCells` where present) makes the goal unreachable. Blocking every slot of the other two routes leaves the goal reachable. Blocking one slot alone plus all slots of the other routes makes the goal unreachable.
16. Every decoy branch has exactly one boundary edge (its `doorCell` meeting `responderPathFrom`); every alcove has exactly one walkable neighbour.
17. Tier 3: all patrols are paired; no `service_door` slots; route A has exactly one `final_code_note` supply after its last slot; route B has exactly one `final_token` supply after its last slot; route C's last slot allows only `cart_checkpoint` and its cart has `finalService`; each link's `fromCell` is 4-adjacent to the module entrance it names.
18. Under every single allowed fortification applied to any one route, the other two routes' classifications are unchanged.

`npm run validate` runs the generator for each blueprint across 200 seeds and reports failures with seed numbers. The shipped blueprints were reference-checked against rules 1-3 and 14-17 from their JSON alone and against rules 5 and 6 with a random-fill simulation (worst case 5 re-rolls over 200 seeds). Your implementation must reach the same verdicts.

### 11.6 Tier summary

| | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Optional slot fill | 50% | 75% | 100% |
| Ambient patrols | solo | 50% paired | all paired |
| Obstacle types | panel, gap, camera corridor, keypad, service door, conveyor | + paired patrol, cart, MFA door, hardened gate | no service doors; final code, token, and service cart supplies |
| Extra | carried permissions: none yet | second zero-day in the hub; some doors accept tier-1 tags | shared final approach and control room |

### 11.7 Tier-3 shared ending and the control-room module [LOCKED]

All three tier-3 blueprints name `finalModule: "control_room_v1"` and share one control room. Only the way to reach it differs. The module lives in `blueprints/modules/control_room_v1.json`.

```ts
interface Module {
  schemaVersion: 1; id: string; size: [w: number, h: number]; notes?: string[];
  grid: string[];                                   // '.' floor, '#' wall, 'K' computer (solid)
  zones: Zone[];                                    // ids start with "FM_"
  entrances: { entA: { cell: Cell; route: 'A' }; entB: { cell: Cell; route: 'B' }; entC: { cell: Cell; route: 'C' } };
  computer: { id: 'computer'; cell: Cell; zoneId: string; solid: true;
              accepts: ('CREDENTIAL'|'TOKEN'|'SERVICE'|'ZERO_DAY')[] };
  serviceDock: { cell: Cell };
  serviceTunnel: { path: Cell[] };                  // from entC to the dock, adjacent cells
  patrols: PatrolDef[]; decoyBranches: DecoyBranch[]; sensors: FixedSensor[]; sockets: Socket[];
}
```

**Stitching algorithm (do this once at level load, before generation and validation):**

```
anchor = blueprint.finalModule.anchor
for every cell in the module (grid, zones, entrances, computer, serviceDock, serviceTunnel,
        patrols, decoyBranches, sensors, sockets): add anchor to its coordinates
for each module grid cell: overwrite the blueprint grid at that position ('.' floor, 'K' computer)
for each link in finalModule.links:
        assert manhattanDistance(link.fromCell, anchor + module.entrances[link.moduleEntrance].cell) == 1
for each cart with continuesIntoModule == 'serviceTunnel':
        cart.path = cart.path + (anchor + module.serviceTunnel.path)
concatenate module zones, patrols, decoyBranches, sensors, sockets onto the blueprint's lists
```

**What the module contains (local coordinates, 16 x 21 cells):**

- **Final approach hall:** `entA` and `entB` lead (via corridors along rows 2 and 10) into a hall that runs down column 4 and then east along row 10 to the computer room door. One paired patrol (`P_FM_hall`) walks the hall. Four alcoves give cover. This is the shared final approach; fortifications on it can only add cameras or listening sensors (section 10.6).
- **Computer room:** a 5 x 4 room holding the computer at `[13,11]`. The computer cell is solid. A fixed camera watches the room.
- **Service tunnel:** `entC` leads along row 18 and then north up column 13 to the **service dock** at `[13,12]`, directly below the computer. The tunnel never meets the hall, so route C bypasses the hall and the paired patrol. Route C's final cart rides the tunnel and stops at the dock.
- **Decoys:** `FM_DM1` (a room that may become a honeypot terminal) and `FM_DM2` (a dead end) hang off the hall. They count toward the level's decoy rules but have no `DEPLOY_HONEYPOT` socket.

### 11.8 Loader checklist

1. Read `blueprints/index.json` and pick one blueprint per tier with the `layout` stream (avoid repeating the exact previous triple).
2. Schema-validate the blueprint (and the module for tier 3). Apply data-integrity rules 1-3.
3. Stitch the module (tier 3).
4. Build the walkable grid and the zone lookup (cell to zone id, zone id to route).
5. Run the generator (11.3) and the instance validator (11.5).
6. Spawn entities. Place the player on `start`. For tier 2, place the zero-day pickup at `rewardPickup`.

---

## 12. Persistence and reset

### 12.1 Capture reset matrix [LOCKED]

| State | After capture with lives remaining |
|---|---|
| Lives | −1 |
| Player position | Level entrance (checkpoint) |
| Layout, route topology, obstacle types, codes | Unchanged |
| Map discoveries, markers, known codes | **Kept** |
| Learned robot paths and origins | Kept |
| Physical tokens | Removed from inventory; respawn at pickup |
| Robot permission tags (active and carried) | **Removed** |
| Hacked robots | Return to hostile default behavior; rehackable if still eligible |
| Bots, cameras, sensors, alarms, meters, alert timers | Reset to starting state with fortifications applied |
| Conveyors and carts | Start positions; carts get a fresh timer unless revoked |
| Opened doors, forced panels, wrong-entry counters, locks | Reset to base, fortifications applied |
| Zero-day inventory | Unchanged; spent tools stay spent |
| Zero-day openings | **Kept if unpatched** |
| Architect fortifications | **Kept**, plus the new one |
| Honeypots | Rearmed (map marker stays) |
| Deeper zero-day reward | Not respawned |

"Everything resets" means transient activity. Persistent architect changes and unpatched openings are deliberate exceptions.

### 12.2 Level completion

- Lives → 3. Level unloaded permanently.
- Keep: unused zero-days, known codes, held robot tags (move to `carriedPermissions`).
- Discard: tokens, fortifications, openings, discovered cells (all level-specific).

### 12.3 Run loss and replay

On the third capture: log the architect's action, set `RUN_LOST`, show the loss screen. **Try again** creates a new random seed, clears the run entirely (inventory back to 1 zero-day, no carried permissions, no known codes), and starts at the prologue. Using a fixed seed from the menu is also supported.

### 12.4 Capture handler pseudocode

```
onCaptureRequest(botId, cause):
    if gameState != LEVEL_ACTIVE: logSuppressed(); return
    gameState = CAPTURING
    emit CAPTURE report from botId
    level.lives -= 1
    action = architect.chooseFortification(reports, level, rngArchitect)
    level.fortifications.push(stamp(action))   // stamped with revision number
    if level.lives == 0: gameState = RUN_LOST; return
    level.transient = rebuild(base instance)
    apply(level.fortifications)
    apply(level.openings where active)
    clear tags (active + carried), tokens, anomaly states, wrong-entry counters
    reset bots/sensors/transport/honeypots
    player = level.start
    level.attempt += 1
    gameState = LEVEL_ACTIVE
```

Fortification and opening records carry a monotonic revision number so a later patch always overrides an earlier opening, regardless of load order.

---

## 13. Final computer and victory [LOCKED L28]

Reaching the control room does not win. The player must interact with the `computer` (a solid object in the module) from an adjacent walkable cell and pass one acceptance condition. The computer is shared; each route supplies a different way to satisfy it:

| Route (tier 3) | Method | How it is supplied |
|---|---|---|
| A | `CREDENTIAL` | The final code note at supply point `A_FINAL`, placed after route A's last slot. The player types the five digits on the computer's keypad. A learned final code stays in `knownCodes` across captures, so a later attempt can reach the computer by any route and still type it. |
| B | `TOKEN` | The final token at supply point `B_FINAL`, after route B's last slot. The player presents it at the computer's reader. Tokens are lost on capture and respawn at the supply point. |
| C | `SERVICE` | The `finalService` cart (session tag `FINAL_SERVICE`) rides route C and then the module's service tunnel to the dock, which is adjacent to the computer. Interact while the cart's session is still valid. Expiry ends the context. |
| any | `ZERO_DAY` | A zero-day used on the computer's access check. |

- A wrong credential entry makes noise like any keypad and counts toward the lockout (3 wrong entries lock the computer for the attempt).
- Old robot permissions are never sufficient.
- Honeypot terminals look similar but never award victory.
- On success: log `FINAL_ACCESS_ACCEPTED` with the method, freeze hostile systems, show win stats (time, captures, methods used, zero-days used), and offer replay.

---

## 14. Event log

An ordered list of structured events, exportable as JSON.

```ts
interface LogEvent {
  seq: number; tick: number; tSec: number;
  runId: string; levelIndex: number; attempt: number;
  kind: LogKind;
  actor: 'player'|'bot:<id>'|'camera:<id>'|'sensor:<id>'|'architect'|'system';
  targetId?: string; pos?: [number, number];
  concept?: string;       // mapping from Appendix A, for the report
  data?: Record<string, unknown>;
}
```

Required kinds: `RUN_START`, `PROLOGUE_RESET`, `LEVEL_START`, `LEVEL_COMPLETE`, `PANEL_STRIKE`, `PANEL_OPENED`, `KEYPAD_WRONG`, `KEYPAD_LOCKED`, `KEYPAD_OPENED`, `CODE_FOUND`, `TOKEN_PICKED`, `HACK_START`, `HACK_SUCCESS`, `HACK_ABORT`, `ZERO_DAY_USED`, `OPENING_REUSED`, `OPENING_PATCHED`, `CONVEYOR_BOARD`, `CONVEYOR_EXIT`, `CART_BOARD`, `CART_EXPIRED`, `SCANNER_TRIGGER`, `CAMERA_SIGHTING`, `BOT_SIGHTING`, `NOISE`, `BOT_MODE_CHANGE`, `SUSPICION_CROSSED_THRESHOLD`, `TRAP_TRIGGERED`, `CAPTURE`, `CAPTURE_SUPPRESSED`, `REPORT_EMITTED`, `ARCHITECT_ACTION` (with the supporting report IDs, the rolls, and the candidate lists), `FINAL_ACCESS_ACCEPTED`, `RUN_WON`, `RUN_LOST`.

The UI shows a readable log panel (toggle with L). A "Download log" button exports JSON. The log must not expose designer-only data (route labels, undiscovered slots) in the normal UI; the exported log may contain it for debugging.

---

## 15. Architecture and tick order

### 15.1 Modules (all under `src/sim` unless noted)

| Module | Owns | Does not touch |
|---|---|---|
| `RunManager` | RunState, level transitions, seeds, replay creation | per-tick logic |
| `Rng` | streams | everything else |
| `BlueprintLoader` | JSON → typed blueprint + schema errors | runtime state |
| `LevelGenerator` | instance from blueprint + seed | transient state |
| `Validator` | classification and rule checks | architect decisions (it is a build-time tool and a generator gate) |
| `World` | TransientWorld for a level attempt | persistence rules |
| `PlayerSystem` | movement, collision, interaction targeting | bots |
| `Perception` | visibility rays, noise propagation | state changes (returns events) |
| `BotSystem` | bot modes, meters, pathing | architect |
| `SensorSystem` | cameras, scanners, listening sensors | bots' modes (emits dispatch commands) |
| `ObstacleSystem` | panels, keypads, doors, gates, zero-days, honeypots | architect |
| `TransportSystem` | conveyors and carts | everything else |
| `ArchitectSystem` | report buffers, attribution, choice, fortification records | player inventory (forbidden) |
| `ResetSystem` | `rebuild()` per 12.1 | rule decisions |
| `DiscoveryMap` | fog, markers | game rules |
| `EventLog` | ordered logging | everything |
| `render/*`, `ui/*`, `input/*` | presentation | the sim (read-only access via snapshots) |

### 15.2 Data flow

Systems communicate through a per-tick **command/event queue** processed in fixed order. A system never mutates another system's state directly; it emits events or commands that the owner consumes on the next stage of the same tick.

### 15.3 Tick order

1. Apply `InputFrame` (player look, movement intent, button edges).
2. `PlayerSystem`: move, collide, update targeting.
3. `TransportSystem`: advance conveyors and carts; handle cart expiry.
4. `ObstacleSystem`: strikes, keypad entry, zero-day use, hack start/abort, pickups, trap triggers.
5. `Perception`: noise events → hearing; visibility tests for bots, cameras, scanners.
6. `SensorSystem`: reports and dispatch commands.
7. `BotSystem`: modes, meters, movement, windups.
8. `ArchitectSystem`: ingest reports.
9. Process `CaptureRequest`s (first wins), run 12.4 if any.
10. Win/level-complete checks.
11. Flush events to `EventLog`; produce a render snapshot.

---

## 16. Testing

### 16.1 Harness

- Vitest for unit and scenario tests; no browser needed.
- A **scenario runner** that builds a small fixture level (`tests/fixtures/*.json`), accepts scripted inputs per tick, and asserts on events and state.
- A **golden replay test**: run seed 42 with a scripted input file and compare the event log to `tests/golden/seed42.log.json`.

### 16.2 Required tests (each acceptance item is a test)

**Determinism:** same seed + inputs → identical log; different seeds → different obstacle fills; changing the `cosmetic` stream does not change the log.

**Detection:** meter reaches 3 s after 3 s of continuous sight; decays at 0.75/s; resumes from the remaining value; two bots at 1.5 s each do not capture; cameras summon bots but do not capture; panel strikes cause investigation but not capture; two simultaneous captures produce one life lost.

**Obstacles:** loose panel opens after 3 strikes and is noisy; reinforced panel never opens; keypad wrong entries make noise, three lock the door; honeypot door accepts any code and produces exactly one bot capture about 3 seconds after activation, including with distant, blocked, or hacked patrols; zero-day cannot target a panel or a paired robot; patched target rejects a second zero-day; opening persists across capture.

**Robot hack:** requires solo robot, rear arc, range, meter 0; completes in 8 s; abort causes zap within `abortZapDelayS`; paired robot is never eligible even when its partner is out of sight; successful robot ignores the player; permissions are removed on capture.

**Transport:** conveyor loop timing and platform windows; missing a platform loops; cart stops and drops the player at expiry on a walkable cell; revoked cart cannot be used.

**Reset and persistence:** capture matrix row by row (section 12.1); lives restore on level completion; tokens respawn; carried tags removed on capture; deeper reward not farmable.

**Architect:** exactly one fortification per capture; uses reports only (the decision function's inputs are type-checked to exclude inventory); attribution picks the route of the capturing bot's reports; patch chance and counter chance follow the `architect` stream on seeded fixtures (assert exact outcomes for seeds 1–5); shared-zone capture falls back to a camera/listening sensor; shared sockets reject all other actions.

**Generator and validator:** each rule in 11.5 has a failing fixture and a passing fixture; `npm run validate` passes for all nine shipped blueprints across 200 seeds; for every seed all three routes initially classify as `FREE`; the data-integrity rules hold for every shipped file; the tier-3 stitch produces a map where every link is adjacent, the dock is next to the computer, and each route reaches the goal alone.

**Final access:** reaching the computer without an accepted method does not win; a typed final code, the final token, a valid service context at the dock, and a zero-day each win; an expired cart context, a wrong code, old robot permissions, and a honeypot terminal do not; a final code learned on an earlier attempt still works after capture, while the token must be re-fetched.

---

## 17. Milestones and definitions of done

| Milestone | Scope | Done when |
|---|---|---|
| **M0 Scaffold** | Project setup, config loader, Rng, fixed-timestep loop, headless runner, greybox movement and collision in a test room with one bot, one alcove, capture/reset | `npm run dev` shows a grimy greybox; determinism and detection tests pass; headless run prints a log |
| **M1 Mechanics room** | Every obstacle and mechanic from section 9 in a single dev room, each with tests | All obstacle/hack/transport tests pass; each mechanic demonstrable by key press |
| **M2 Persistence and architect** | Report system, architect, fortification sockets, reset matrix, event log, prologue | Reset, architect, and log tests pass; seed 42 golden replay committed |
| **M3 Playable slice** | Blueprint loader and module stitcher, generator, validator, tier progression using `t1_a`, `t2_a`, `t3_a`, final computer, win/loss, HUD, map | A player can complete the prologue and win from a fresh seed; `npm run validate` passes on 3 blueprints × 200 seeds |
| **M4 Full pool** | The remaining blueprints (`t1_b`, `t1_c`, `t2_b`, `t2_c`, `t3_b`, `t3_c`) loaded | Validator passes on all 9 × 200 seeds; replay works for each |
| **M5 Polish** | Art pass, audio, captions, post-processing toggle, 60-second demo path in `docs/DEMO.md` | Runs at 60 FPS on target hardware; demo path replays deterministically |

Deliver milestones in order. State plainly in the final message which milestone was reached.

---

## 18. Open items and defaults to confirm

| # | Item | Fallback in this doc |
|---|---|---|
| D1 | Prologue failure | Restart prologue; no life lost; no architect action |
| D2 | Keypad lock duration | Locked until capture (resets with other doors) |
| D3 | Bot behavior while suspicious | Pauses and turns toward the player |
| D4 | Alert numbers | 10 s, 1.5× rise |
| D5 | Zap windup | 0.4 s, unavoidable once started; abort zap 0.2 s |
| D6 | Honeypot tells | None (`honeypot.tellsEnabled` default false) |
| D7 | Hack abort key | Backspace |
| D8 | Keypad keeps the sim running | Yes |
| D9 | Conveyor detection hazard | Rider is visible to cameras/bots along the loop; no special alarm |
| D10 | Tier-2 `acceptsTags` count | "A few" doors; set per blueprint by the author |
| D11 | Ambient listening sensors | Authored in blueprint `sensors`; none generated |
| D12 | Optional slot behavior | A skipped optional slot leaves an open corridor |
| D13 | Cart dismount | E while riding dismounts; the cart stops there until boarded again |
| D14 | Interaction range | Measured to the nearest point of the target's cell footprint |
| D15 | Final code reuse | A learned final code persists in `knownCodes` and can be typed on any later attempt |
| D16 | Ambient robots with grants | They grant a tag that carries to the next level but open no door in their own level |
| D17 | Camera facing | A `camera_corridor` camera faces back along the approach |

---

## Appendix A. Cyber concept mapping (for the event log `concept` field)

| Mechanic | Concept |
|---|---|
| Loose panel / forced entry | Exploitable weakness or access-path misconfiguration (physical metaphor, not literal brute force) |
| Keypad wrong entries and lockout | Credential guessing and account lockout |
| Inspection gap | Monitoring coverage gap |
| Trusted conveyor | Abuse of a trusted service or data flow across a boundary |
| Hacked robot and service doors | Compromise of a service with excess privileges |
| Abandoned cart | Reuse of an existing authenticated session |
| Code + physical token | Credential plus a separate possession factor (MFA) |
| Honeypot | Deception and detection of adversary interaction |
| Zero-day | Unknown vulnerability, simplified for gameplay |
| Patch | Remediation of a known vulnerability |
| Camera, listening sensor, bots | Monitoring and active inspection |
| Architect responding after capture | Observe, improve defenses, retest (the purple-team loop) |

Paired robots, banging on panels, and the three-second meter are gameplay metaphors, not literal cyber controls.

---

## Appendix B. Blueprint inventory

All files are in `blueprints/`. Route lengths are the shortest path from start to goal through that route alone. `index.json` lists the ids per tier.

| File | Tier | Grid | Route A / B / C (m) | Shape and notable content |
|---|---|---|---|---|
| `t1_a` | 1 | 40 x 21 | 98 / 70 / 98 | Three straight lanes, one loop on A, conveyor on B, service-robot doors on B and C |
| `t1_b` | 1 | 44 x 24 | 122 / 94 / 122 | Bent lanes, loop on A, conveyor on A, southern dip on B |
| `t1_c` | 1 | 34 x 32 | 122 / 78 / 126 | Vertical lanes, hub at top, loop on A, conveyors on A and B |
| `t2_a` | 2 | 52 x 26 | 126 / 94 / 134 | Long straight lanes, conveyors on A and C, cart on B, zero-day in hub |
| `t2_b` | 2 | 50 x 28 | 142 / 106 / 146 | Stepped lanes, conveyor on A and C, loop on A, cart on B |
| `t2_c` | 2 | 40 x 38 | 142 / 106 / 142 | Vertical switchbacks, loop on A, conveyors on A and C, cart on B |
| `t3_a` | 3 | 64 x 24 | 148 / 136 / 148 | Straight A and C, stepped B, loop on A, conveyors on A and C, cart on B |
| `t3_b` | 3 | 64 x 24 | 164 / 128 / 156 | Zigzags on all routes, loop on B, conveyors on A and C, cart on B |
| `t3_c` | 3 | 64 x 26 | 160 / 136 / 160 | Long outer bends, loops on B and C, conveyors on A and C, cart on B |

Every tier-3 blueprint ends in `control_room_v1` anchored at `[48,2]`: routes A, B, and C arrive on rows 4, 12, and 20 at x = 47.
