# Prototype scope and known gaps

This document distinguishes working prototype behavior from full v2.1 conformance. User instructions prioritized a working initial prototype and deferred tests.

## Environment-driven changes

- Package downloads from both the npm registry and jsDelivr failed in the execution environment, including approved download attempts. The default view is therefore a dependency-free Canvas first-person renderer. The separately implemented Three.js adapter can load the pinned package or CDN in an environment that permits it. It remains unverified here.
- Plain JavaScript ES modules and a Python standard-library server replace TypeScript/Vite for this first drop. A dependency lockfile is included; there is no build command or automated browser-game test suite. `package.json` pins the Three.js version.

## Deliberate prototype simplifications

- The perimeter is a small authored outdoor tutorial with procedural human guards, chain-link fences, and a guardhouse. The tool is available immediately. Being seen restarts the tutorial without consuming network lives.
- Obstacle generation filters out initial zero-day-only gates and allocates matching upstream code/token supplies. It does not yet implement the full semantic route solver or all-seed certification. Authored patrol evasion and transport timing need playtesting.
- The simulation is fixed-step and uses seeded randomness, but the exported log is an event/action record, not a complete movement replay. Separate RNG streams for every category, headless simulation commands, formal schema validation, and replay tooling remain for a later pass.
- The architect uses actual bot/sensor observations and authored action sockets. Its counter-selection policy is simplified; reported noise can preferentially reinforce a panel. The complete v2.1 inference policy and report-ring semantics are not yet reproduced.
- Noise uses a simple three-metre penalty for an obstructed line of sight, rather than counting every intervening wall. Hearing still requires distance and an eligible observer.
- Honeypots use a scripted chamber responder to ensure the approximately three-second visible bot capture. Existing nearby bots also investigate. The fallback is always available rather than being selected by a full responder-arrival predictor.
- Robot pairs are represented as two coordinated patrol members with the same path. Collision avoidance, sophisticated formation behavior, and detailed animations are deferred.
- The optional Three.js adapter is a geometry prototype. Both renderers now show sensor cones using the same geometry as detection. Sophisticated lighting and all interactive prop presentation still need further work.
- New-run creation occurs through the result button after the third capture. Progress is not saved across a page reload. There is no touch/gamepad support.
- Sound is procedural feedback, not a positional audio system. Accessibility narration, remappable keys, and full color-blind modes are not yet implemented.

## Next playthrough priorities

1. Route viability across all nine maps, particularly conveyor boarding and the final service dock.
2. Suspicion, patrol timing, camera coverage, and how clearly players understand why they were captured.
3. Fortification balance across repeated captures and whether alternate routes remain practical.
4. Browser performance, pointer capture, and resolution scaling.
5. Then add meaningful automated simulation and reset-invariant tests.
