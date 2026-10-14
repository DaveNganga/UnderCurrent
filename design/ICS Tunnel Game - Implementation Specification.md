# ICS Tunnel Game Implementation Specification

## 1. Purpose and authority

Build a working, first-person stealth exploration game for Critical Infrastructure Protection Homework 2, Part 3. The player is an attacker navigating a fictional utility network represented as crawlable maintenance tunnels. The defender consists of patrol bots, sensors, and a security architect that changes defenses after captures.

This document consolidates the user's design decisions. It is a build specification, not a request for another concept pitch. Implement a playable version with simple geometry and clear feedback before adding visual polish.

**Priority:** user-confirmed rules in this document take precedence over implementation defaults. Defaults resolve details that were not explicitly chosen; they must be configurable, rather than treated as new user requirements. Do not silently replace this design with a turn-based board game, credential-only maze, combat shooter, or real hacking environment.

All networks, credentials, exploits, and security events are simulated in the game. No actual network scanning, exploitation, or system access is part of gameplay.

## 2. Game identity

- Perspective: first-person crawling through enclosed maintenance tunnels.
- Setting: a fictional power utility; water-plant theming is an acceptable later variant. Power utility is the initial implementation default because the assignment depicts an electric utility.
- Theme: navigating a hidden digital infrastructure through physical metaphors.
- Main activities: observe, explore, backtrack, hide, force weak panels, use trusted transport, hack isolated robots, and find legitimate access.
- Intended feel: uncertain exploration and stealth, with occasional noisy or time-sensitive commitments.
- The attacker cannot see the complete map. Discoveries persist after capture within the current run.
- No disguise/cargo-camouflage mechanic. No gun combat required. Robots neutralize with a zap.
- Failure teaches the layout but also gives the architect a chance to fortify an observed route.

### Playable structure

1. Brief physical infiltration prologue.
2. Level 1: security network.
3. Level 2: operations network.
4. Level 3: control network and main control computer.
5. Win, or lose the run after three captures in any one level.

Completing a level establishes persistence: the player gets three lives at the next level's entrance. Earlier levels are permanently left behind for that run.

## 3. Confirmed rules at a glance

| Topic | Rule |
|---|---|
| Lives | Three per level; restored to three on level completion. |
| Capture | Lose one life and respawn at the current level entrance, unless no lives remain. |
| Run loss | Third capture in a level ends the entire run. The next run begins with the prologue and newly selected/configured maps. |
| Maze branches | Many branches, loops, dead ends, traps, and patrol areas; only three designed viable route families per level. |
| Route difficulty | Mix obstacle types within every route; do not label routes as solutions to the player. |
| Fortification | Exactly one persistent architect action on the observed attempted route after each capture. |
| Solvability | One fortification may close one route, but must not eliminate the other viable routes. |
| Robot hack | Eight seconds, from an undetected close approach to a lone robot. |
| Hacked robot | Grants permissions and patrol-path/origin information; continues patrolling and ignores the player. Player does not drive it. |
| Paired robots | Unhackable, including with zero-days. Force an alternative approach; do not create separation/distraction hacks. |
| Final-level robots | Every robot is paired. No robot takeover route in Level 3. |
| Bot sight | Three seconds to confirm capture, with gradual cooldown after line of sight breaks. Each bot tracks independently. |
| Cameras | Report sightings and summon bots; cannot directly capture. |
| Forced entry | Only physically weak panels can be banged/pried open; noisy. |
| Zero-days | One at run start, one reward deeper in the game. Each is single-use at one electronic target. |
| Zero-day scope | Any eligible electronic barrier, including the final computer check, except paired robots. Never physical loose panels. |
| Exploit persistence | An exploited opening remains reusable at its exact location until patched. Tool remains consumed. |
| Cart expiry | Stop immediately and drop the player at the cart's current location. |
| Honeypot | A convincing interaction traps the player until a bot arrives and zaps them. |
| Tokens after capture | Physical tokens reset and must be retrieved again. |
| Victory | Main computer accepts a valid credential, valid token, authorized service context, or zero-day bypass. |

## 4. Player controls and presentation

### Implementation defaults

Use desktop keyboard/mouse controls. Keep controls remappable in the input layer.

| Input | Action |
|---|---|
| Mouse | Look around. |
| WASD | Crawl/move. |
| E | Context interaction; start committed actions only with an explicit prompt. |
| Left mouse / contextual hold | Force a breakable panel when equipped with the pry tool. |
| Q | Use an available zero-day on an eligible targeted electronic obstacle after confirmation. |
| M | Discovered-map view, never full designer map. |
| Esc | Pause/menu; pausing does not cancel an active hack. |

Crawling is the default locomotion. Jumping, sprinting, inventory grids, elaborate physics, and weapons are unnecessary for the initial build.

### Minimum interface

- Lives remaining, current level, and zero-day tools remaining.
- Reticle and contextual interaction prompt.
- Eight-second robot hack progress indicator.
- Per-observer suspicion feedback for visible threats, without revealing hidden bots through walls.
- Clear indication of temporary robot permissions, physical tokens, and known codes.
- Capture summary identifying the triggering event; do not disclose undiscovered viable routes.
- A fogged/discovered map that records visited spaces and learned codes/path information.
- A win screen, run-loss screen, and replay action.
- Accessible subtitles/text equivalents for meaningful sounds.

Do not require real command-line syntax or cybersecurity knowledge to execute an action. Use game language such as “Pry loose panel,” “Board carrier,” “Hack robot — 8 seconds,” and “Use exploit device.”

## 5. Run and level state

Use explicit state objects. Never rely on a scene reload alone to decide what persists.

### Run state

- runId and deterministic random seed;
- selected layout IDs for three levels;
- current level index;
- zeroDayInventory, initially 1;
- deeperRewardCollected, initially false;
- knownCodes and discovery records;
- carriedRobotPermissions from successful progression;
- event log;
- status: prologue, active, won, lost.

### Level state

- layoutId, difficulty tier, and stage entry checkpoint;
- livesRemaining, initially 3;
- immutable base configuration;
- persistent fortification records;
- persistent zero-day opening records with target IDs and active/patched status;
- discovered cells/nodes, observed hazards, and learned robot paths;
- temporary physical token inventory;
- active robot permissions;
- currently hacked robots;
- current-attempt movement and interaction events;
- architect-visible reports, stored separately from full gameplay telemetry.

### Capture reset matrix

| State | After capture with lives remaining |
|---|---|
| Lives | Decrease by one. |
| Player position | Current level entry checkpoint. |
| Layout, route topology, assigned codes | Unchanged. |
| Map discoveries and known codes | Retained. |
| Knowledge of robot paths/origins | Retained. |
| Physical tokens | Removed from inventory and restored to pickup positions. |
| Robot permissions | Removed, including permissions carried into this level. |
| Hacked robot behavior | Reset to default hostile behavior. Rehack only if still eligible. |
| Bots, cameras, alarms, suspicion | Reset to their configured starting state, with fortifications applied. |
| Conveyor/cart position | Reset to initial position and schedule. |
| Cart session timer | Reset to initial duration unless persistently revoked by a fortification. |
| Ordinary opened doors and forced panels | Reset to base state, with fortifications applied. |
| Zero-day inventory | Unchanged; spent tools do not return. |
| Zero-day-created openings | Retained if not patched. |
| Existing architect fortifications | Retained. |
| New architect response | Add exactly one fortification to the attempted route. |
| Deeper zero-day reward | Never respawns if already collected in this run. |

**Important reconciliation:** “The network resets” means transient activity resets. Persistent architect changes and unpatched zero-day openings are intentional exceptions to preserve the earlier agreed mechanics.

### Level completion

- Mark the current level complete and unload it; no backtracking to completed stages.
- Preserve unused zero-days, known codes, map knowledge, and currently held robot permissions.
- Start the next level with three lives.
- Implementation default: physical tokens are stage-specific and are not carried to a new stage. This does not affect the confirmed requirement to reacquire them after capture.
- Old robot permissions only work on explicitly compatible objects; never treat them as universal access.
- Level 3 offers no robot-derived substitute for its final access solutions.

### Run loss

On the third capture, log the architect response for consistency, mark the run lost, and show the loss screen. Do not silently respawn into another run. “Try again” creates a fresh seed/configuration and clears all previous-run progress, tools, discoveries, permissions, and fortifications. Begin with one zero-day and the physical prologue again.

## 6. Detection and capture

### Patrol bots

Bots follow authored waypoint paths and visibly illuminate the direction they face. Detection requires view-cone inclusion, range, and unobstructed line of sight. Walls and hiding alcoves must really occlude vision.

Each bot has its own suspicion value between 0 and 3 seconds.

Implementation defaults:

- Visible player: suspicion increases at 1 unit per second.
- Lost line of sight: suspicion decreases at 0.75 units per second until zero.
- Suspicion reaching 3 triggers a zap/capture.
- Seeing the player again before full cooldown resumes from the remaining value.
- Observers do not pool suspicion. Two bots seeing the player for 1.5 seconds each does not equal one completed capture.
- Use simulation delta time, not frame counts.

Bots may share reported positions and investigate them, but never merge detection-progress values.

### Cameras and inspection sensors

Cameras detect through their own visible cones and submit location reports. Nearby bots investigate the last reported position; they do not magically know the player's later position.

Misaligned inspection devices have an authored spatial or temporal gap. Successfully crossing that gap avoids their report, but does not grant permissions or open a different barrier.

### Noise

Forcing panels produces audible events. Listening sensors and bots within range receive an approximate source location and investigate. Noise itself does not automatically capture the player.

Implementation default: distance plus wall attenuation determines hearing. Keep the first implementation simple and predictable. Bots discovering a disturbed panel may also report its location.

### Capture exceptions

- Interrupting a committed robot hack causes an immediate zap from the target robot.
- A triggered honeypot immobilizes the player and dispatches a bot. The bot zaps upon reaching the trap; this is a scripted confirmed capture, not a fresh escape opportunity.
- Otherwise, ordinary capture follows the three-second visual rule.

Guard against duplicate captures when multiple bots confirm on the same frame. Entering CAPTURING disables further capture events until reset completes.

## 7. Attacker mechanics

### 7.1 Loose panels and forced entry

A physical loose panel can be forced with the basic pry tool. The tool is reusable and not a consumable.

Default: three deliberate strikes, each creating noise, open a panel. Reinforced panels and structural walls do not have a hidden health bar that eventually yields. After capture, ordinary forced openings reset unless represented by a persistent architect modification.

No zero-day interaction is available on physical panels.

### 7.2 Credentials and physical tokens

Codes appear as notes, markings, or files translated into environmental clues. Each code has an ID and explicit compatible target set. Codes are stable within a run/level so remembered knowledge stays useful. Do not let one code open every door.

Physical tokens are pickups with scopes. An MFA gate requires a compatible code plus a compatible token. Two static codes are not the MFA mechanic.

Doors may be honeypot entrances even when the code appears plausible. Opening such a door must lead into an actual trap space.

### 7.3 Robot takeover

Eligibility:

- Target is a lone robot, never a member of a pair.
- Player is within interaction range and approaches undetected, typically from behind.
- Target has not currently detected the player.
- There is no forced interaction from across a wall.

Once started, the hack lasts eight seconds and is committed. The target pauses for a readable maintenance animation during the hack, then resumes its route on success; this is an implementation default. Player locomotion is locked, but looking around is allowed. Other observers continue operating and can detect the player.

A deliberate abort/attempt to break away immediately makes the target turn and zap the player. Pausing the game freezes the action rather than counting as an abort.

Success:

1. Grant the target's scoped permissions.
2. Reveal its authored patrol path and origin point, not the full level.
3. Mark this robot as ignoring the player for the rest of the current attempt.
4. Resume its normal movement.

Do not create remote control, combat companions, inventory duplication, or invisibility to other bots. Robot permissions reset on capture. The bot also becomes hostile again. Known route information remains.

### 7.4 Paired patrols

Pair membership is a permanent gameplay property of that patrol configuration. Temporary spacing or a corner hiding the companion does not make a paired robot hackable. Do not offer a lure/separation mechanic.

Level 1 uses solo robots. Level 2 mixes solo and paired patrols. All Level 3 robots are paired. Pairing a previously solo patrol is also an eligible architect fortification.

### 7.5 Trusted conveyors

A conveyor carries trusted information represented by service carriers. Player boards one, travels along a fixed route, and dismounts at authored safe points. It crosses a trust boundary without requiring a code from the player.

This differs from the abandoned cart: the conveyor is an active, recurring service, not a parked transport with a soon-expiring session. Remaining aboard too long can deliver the player to a dangerous inspection bay or an unhelpful destination.

Architect action may add inspection at one route-local crossing. Do not implement cargo disguises.

### 7.6 Abandoned authorized carts

A parked cart has an existing authenticated session, a scoped checkpoint list, and an authorization timer. The player can board and reuse its authorized route.

Default: timer begins on boarding, allowing a readable decision instead of expiring unseen during unrelated exploration. Set duration per cart to allow the intended route plus a modest timing margin.

At expiry:

- Stop movement immediately.
- Remove the cart's authorization context.
- Drop the player beside the cart at its current location.
- Do not automatically capture or teleport them to a checkpoint.

Author every possible stopping point with a safe dismount surface. Avoid a cart stopping inside sealed geometry or above a lethal void. Reset on capture restores its initial state unless the architect has revoked it.

### 7.7 Zero-day tools

Exactly one initial tool and one once-per-run deeper reward. Default reward location is the Level 2 entry, shared by all routes so no solution route monopolizes it. If the first is unused, the player can hold two.

Electronic target examples: authentication gates, electronic scanners, electronic route locks, and the main computer's final check. Paired robots are explicitly excluded. Physical walls and panels are excluded. Zero-days do not refill lives, reveal the map, or globally disable the blue team.

Implementation rule: one use modifies one target object. For a camera/scanner, it disables that object's coverage; for a gate, it opens that gate; for a final access check, it satisfies that check. A compound gate such as MFA is one declared target if authored that way.

Using a tool records a persistent opening with target ID. Capture does not remove it. It can be reused at that exact target without another tool until patched. Patching invalidates the old exploit permanently at that target; replaying the same spent exploit does not reopen it. Default: a remaining fresh tool can exploit a new weakness at that eligible electronic target, subject to that route's fortification rules.

Do not make a robotic pair, or a multi-obstacle fortified route, into one generic zero-day target. This permits a route to remain infeasible even when the player has a tool.

### 7.8 Honeypots

Honeypots are deliberately inviting resources or apparent shortcuts, integrated into the authored maze. They may resemble a credential door, access terminal, or privileged destination.

Confirmed behavior: interaction can trap the player in sticky “honey” until a bot arrives and zaps them. The consequence reveals the deception. No guarantee of a pre-trigger clue has been requested.

Implementation defaults:

- Entering the trap volume or using its terminal triggers it; mere distant visibility does not.
- Trigger immobilizes movement and logs the event.
- Reserve a navigable response path so the arriving bot cannot become stuck.
- Once trapped, no zero-day escape: this is an immobilization state, not another electronic barrier to target. Before triggering, electronic trap components can be eligible zero-day targets if explicitly exposed.
- On capture reset, the trap rearms, but the player's learned map marker identifies it.

## 8. Security architect

The architect designed the infrastructure but does not know every exploitable blind spot. It makes blue-team decisions using reports from bots and sensors. It does not read the player's full map, exact inventory, hidden movements, or unused exploit locations.

Keep two separate data channels:

1. Full telemetry for debugging, assessment, replay, and solvability validation.
2. Restricted observations the architect is allowed to use.

### Fortification cycle

After each capture:

1. Snapshot current-attempt reports before clearing transient state.
2. Identify one attempted route using the capture location and/or reported actions.
3. Build eligible fortification candidates grounded in those observations.
4. Prefer patching a reported active zero-day opening when eligible.
5. Select and persist exactly one action.
6. Rebuild transient level state with all persistent fortifications and unpatched openings applied.

Default weighting: when an observed active zero-day opening has a valid patch candidate, assign the patch category a 60% selection chance. Distribute the remainder among other eligible actions. This number is a tunable starting value, not a user-confirmed requirement. If only patching is eligible, patch. If none is eligible, use a route-local monitoring addition supported by the capture report.

### Available architect actions

| Action | Gameplay effect |
|---|---|
| Patch exploit opening | Disable reuse at one electronic target. |
| Reinforce panel | Remove a forced-entry option. |
| Add/reposition camera | Increase local surveillance. |
| Add listening sensor | Make noisy actions more likely to attract investigation. |
| Close inspection gap | Reconfigure one scanner boundary. |
| Strengthen authentication | Add a token/MFA requirement at a route-local gate. |
| Restrict a connection | Seal a route-local access passage, potentially closing that route. |
| Inspect a conveyor | Add monitoring at that route's trusted-service crossing. |
| Revoke a cart session | Make that cart's authorized shortcut unavailable. |
| Restrict robot permissions | Remove a particular privileged access capability. |
| Pair a solo patrol | Prevent future hacking of that patrol. |
| Deploy honeypot | Activate a preauthored decoy room or branch. |

One action is not permission to modify every door, revoke every session, and add several patrols. Already-present defenses remain. A new level's base difficulty is separate from capture-driven fortification.

### Structural fairness without omniscient AI

The user intends three viable routes to support three lives. Therefore route-closing changes must affect at most one viable route family. Two nonterminal captures can close at most two different routes.

Guarantee alternatives in level construction and validation, not by giving the architect knowledge of the attacker inventory. The three initial route families must each be achievable without consuming a zero-day and must have independently obtainable required resources. Cart resets and token respawns must preserve this property between attempts.

No route-closing target may sit in a shared entry area or shared final approach. Cross-route surveillance changes must not accidentally seal alternatives. If an implementation-time validator detects such an action, reject it as an invalid configuration; do not present that validator as the architect's knowledge.

## 9. Maze design and layout pool

Use approximately 15 predesigned layouts. Implementation default: five layouts for each of the three difficulty tiers. Select one from each tier per run and configure obstacle variants using a seed. Avoid immediately repeating the identical three-layout combination when alternatives exist.

“Three routes” means three designed solution families, not exactly three simple paths in the graph. Loops create many possible walks. Side branches are essential and should remain navigable even when they are not useful.

### Each level must contain

- One stage entry checkpoint.
- Three independently viable solution route families.
- Multiple branches within/around these families.
- At least two ordinary dead ends.
- At least one loop.
- At least one authored honeypot.
- Patrol danger and genuinely usable hiding geometry.
- A mix of challenges rather than one mechanic repeated along a route.
- Route-local fortification sockets.
- A reachable exit or final target.

These minimum counts are implementation defaults to ensure the requested richness. Do not render a visible three-lane menu or mark true routes green and decoys red.

### Difficulty progression

| Tier | Features |
|---|---|
| Level 1 | Wider inspection gaps, solo robots, short transport routes, sparse patrols, introductory loose panels and occasional credentials. |
| Level 2 | Mixed solo/paired robots, more listening coverage, cart authorization timing, MFA opportunities, less forgiving transport decisions. |
| Level 3 | All robots paired, overlapping monitoring, combined transport/stealth challenges, three distinct final-access solutions. |

### Example authored layouts

These show route logic, not what the player can see. Insert bends, junctions, and occlusion so the layout feels like a maze.

#### Level 1 security network

- Route A: scanner gap -> side loop with dead-end branch -> loose panel -> exit.
- Route B: trusted conveyor -> choose correct unloading bay -> camera crossing -> exit. Staying aboard leads to a dangerous inspection bay with a backtracking option.
- Route C: isolated robot -> eight-second hack -> use permission at service passage -> exit. A tempting side terminal leads to a honeypot.

#### Level 2 operations network

- Entry: once-per-run second zero-day reward.
- Route A: authorized parked cart -> checkpoint -> scanner gap -> exit. A signed side duct ends in rubble.
- Route B: trusted conveyor -> maintenance platform -> noisy panel near listening sensor -> exit. A “priority access” branch contains a honeypot.
- Route C: locate a solo robot among mixed patrols -> hack -> restricted lift -> exit. Paired patrol branches are not hack solutions; include a backtracking loop and a dead end.

#### Level 3 control network

- Route A: paired patrols -> inspection gap -> recover valid final credential -> final approach.
- Route B: trusted conveyor -> watched token chamber -> retrieve physical final token -> final approach.
- Route C: locate authorized service cart -> navigate timing and transfer points -> arrive at final check in valid service context.
- Other branches include ordinary dead ends, loops, paired patrol encounters, and honeypot control terminals.
- All three reach the shared final approach; all robots are paired.
- Unused zero-day is an alternative to final authentication, not a fourth authored route.

Each route's prerequisite must be available before its own lock/check. Do not place a route's sole required token behind the gate that requires it.

## 10. Final computer and victory

Reaching the final room is not itself a win. Player must interact with the genuine main computer and pass one acceptance condition:

- valid final credential;
- valid physical final token;
- arrival in a currently authorized service context;
- consuming a zero-day on the final computer's electronic access check.

Old robot permissions are not sufficient for this final check. Honeypot terminals are distinct objects that can resemble the target but cannot award victory.

Default service implementation: Route C's authorized carrier delivers the player to the computer's service dock. Final interaction succeeds while that service context remains valid. Expiry removes it. Give the route a feasible timing margin.

Win records the accepted method, freezes hostile gameplay, and shows completion statistics. No simulated destructive plant action is required: authorized/accepted access to the computer is the objective.

## 11. Suggested implementation architecture

Engine choice is open. Prefer the project's existing engine if one exists. Otherwise select a lightweight 3D stack that supports first-person collision, raycast line of sight, waypoint patrols, and local save/state. Document how to launch it. No backend, account, external service, or paid asset is required.

Suggested modules:

- RunManager: progression, seed, lives, win/loss, replay.
- LevelLoader: immutable authored layouts plus configuration.
- PlayerController: movement, look, collision, interactions.
- InventoryAndAccess: codes, physical tokens, scoped permissions, zero-day charges.
- InteractionController: committed hack, boarding, forcing, final acceptance.
- BotController: patrol, investigation, independent suspicion, hack behavior, zap.
- SensorController: camera/inspection/listening observations.
- TransportController: conveyors, carts, expiry, safe dismount.
- TrapController: honeypot activation and guaranteed responder route.
- ArchitectController: report-based weighted fortification decisions.
- ResetController: explicit reconstruction and persistence rules.
- DiscoveryMap: fogged exploration and learned information.
- EventLogger: ordered game actions and educational mappings.
- LevelValidator: route/resource checks and configuration errors, outside architect cognition.

### Core bot states

PATROL -> INVESTIGATE -> SUSPICIOUS -> CAPTURE

Additional states: BEING_HACKED, HACKED_IGNORE_PLAYER, RESPOND_TO_TRAP.

Use independent bot state, pairedGroupId, permissions, authored origin, and route waypoints. A pair is a stable group even if physical spacing varies.

### Core game states

PROLOGUE -> LEVEL_ACTIVE -> CAPTURING -> LEVEL_RESET -> LEVEL_ACTIVE

LEVEL_ACTIVE -> LEVEL_COMPLETE -> NEXT_LEVEL

CAPTURING -> RUN_LOST when lives reach zero

LEVEL_ACTIVE -> RUN_WON after final acceptance

### Layout data contract

Include stable IDs for:

- rooms, tunnel segments, graph nodes and edges;
- checkpoint, exits, genuine target, decoy targets;
- route-family ownership and shared areas;
- barriers, electronic targets, breakable panels;
- sensor placements/cones and blind spots;
- bots, pair groups, patrol paths, origins, permissions;
- codes and compatible checks;
- physical token pickups/scopes;
- transport paths, boarding/dismount points, session scope/duration;
- honeypot trigger volumes and response paths;
- fortification sockets and permitted modifications;
- resource dependencies for route validation.

IDs must survive capture resets so persistent openings and fortifications reapply to the correct object.

### Capture pseudocode

```text
onCapture(source):
    if gameState != LEVEL_ACTIVE: return
    gameState = CAPTURING
    record capture and snapshot architect-visible reports
    lives -= 1
    action = architect.selectOneEligibleAction(reports)
    persist action
    if lives == 0:
        gameState = RUN_LOST
        show loss and replay option
        return
    preserve knowledge, codes, unused zero-days, reward flag
    preserve fortifications and unpatched exploit openings
    clear robot permissions, hacked behavior, physical tokens
    reconstruct transient world from immutable base layout
    apply persistent fortifications
    apply active exploit openings not invalidated by patches
    reset sensor/bot suspicion and transport activity
    respawn player at current stage checkpoint
    gameState = LEVEL_ACTIVE
```

Fortification/exploit records need timestamps or revision numbers so a later patch overrides an earlier exploit and a valid fresh exploit can override a prior patch at that target. Do not accidentally reopen a patched target because of load order.

## 12. Randomness and logging

Use seeded randomness for layout selection, compatible obstacle variants, small patrol start variations, and weighted architect decisions. Do not randomize required items into unreachable spaces or change remembered codes after capture.

Log at least:

- timestamp, run, level, attempt/life;
- player action and target;
- attack/defense concept;
- sensor or bot observation;
- noise/investigation and sight/cooldown events;
- hack start/success/interruption;
- zero-day use/reuse/patch;
- cart boarding/expiry and conveyor transfer;
- honeypot activation;
- capture reason;
- architect action with supporting observation IDs;
- level completion and final access method.

Provide a readable log panel or post-run summary plus an exportable structured log. Keep designer-only knowledge out of the normal attacker UI.

## 13. Assignment alignment and boundaries

The written assignment asks for a defense-first/attack-second daily simulation, accumulating defenses, randomness, action tracking, an ICS-compromise ending, a 60-second narrated demonstration, and an Analysis and Design document with student/AI code comparison.

The user reports that instructor examples included RPG-style games and intentionally chooses real-time first-person play. This is not independent confirmation that the written turn/day requirement is waived. Preserve real-time gameplay. Label the variance in project documentation, and make event logging rich enough to explain attacker actions and defender responses. Do not claim this version literally implements daily alternating turns.

For subsequent coursework deliverables:

- Requirements/problem restatement and approach.
- Classes, attributes, behavior inputs/outputs, and interactions.
- Design and pseudocode.
- Student implementation and separately identified AI implementation/comparison as required by the instructor; do not misrepresent AI-authored code as student-authored.
- Testing, security/best-practice comparison, and lessons learned.
- A reproducible 60-second gameplay demonstration path with audio narration and no faces.

These are follow-on deliverables, not a claim that this specification completes the whole homework.

### Mechanic-to-cyber mapping

| Mechanic | Concept |
|---|---|
| Loose panel / unintended duct | Exploitable weakness or access-path misconfiguration; physical metaphor, not literal password brute force. |
| Inspection gap | Monitoring coverage gap. |
| Trusted conveyor | Abuse of a trusted service/data flow across a boundary. |
| Robot permissions | Compromise of a service with excessive or useful privileges. |
| Authorized cart | Reuse of an existing authenticated session. |
| Code and physical token | Credential access and a distinct possession factor. |
| Honeypot | Deception and detection of adversary interaction. |
| Zero-day | Previously unknown electronic weakness, simplified for gameplay. |
| Persistent foothold/checkpoint | Retained progress through compromised infrastructure. |
| Capture-driven architect response | Observe, improve defenses, and retest: the purple-team learning loop. |

Robot pairs are an intuitive gameplay protection; do not present them as a literal universal cyber control. Similarly, physical banging is a noisy attack metaphor, not a technically accurate implementation of credential guessing.

## 14. Build sequence

1. Build a single greybox test maze with collision, first-person movement, one bot, an occluding alcove, a scanner, and capture/reset.
2. Implement all interaction mechanics as reusable objects; test them in a development room.
3. Implement persistence, route-local architect actions, and event logging before making more maps.
4. Deliver an end-to-end playable three-level version with one authored layout per tier.
5. Expand to the intended pool of 15 layouts using validated modular geometry. Reusing corridor pieces is fine; do not count identical geometry with only changed codes as separate layouts.
6. Add the physical prologue, UI clarity, audio cues, and demonstration flow.
7. Run acceptance checks and document launch instructions and controls.

The three-layout version is a milestone, not the complete requested 15-layout target. If delivering an intermediate build, clearly state which milestone it reaches.

## 15. Acceptance checks

### Core playability

- A player can launch, complete the prologue, traverse all three levels, and win.
- First-person collision prevents walking through barriers and seeing through walls.
- The map initially hides undiscovered areas.
- Every level contains dead ends, loops, traps, and three valid route families.
- Each unfortified route has obtainable prerequisites and can be completed without a zero-day.

### Detection

- A bot requires three seconds of accumulated sight; cover causes gradual decay.
- Two observers do not combine detection progress.
- A camera summons a bot without directly capturing.
- Panel noise attracts investigation without automatic capture.
- Simultaneous detection cannot remove multiple lives for one capture.

### Interactions

- Undetected solo robot hack takes eight seconds and grants scoped permissions/path knowledge.
- Successful robot remains on patrol and ignores the player; other robots do not.
- Interrupting the hack immediately captures the player.
- Paired robots cannot be hacked, even when a companion is visually occluded; zero-days cannot bypass this.
- Physical weak panels can be forced; reinforced walls cannot; zero-days cannot open physical panels.
- Conveyor boarding, dismounting, and wrong-stop backtracking work.
- Cart expiry stops and dismounts at a safe current-position location.
- Honeypot interaction traps and reliably produces a bot capture.

### Reset and persistence

- Capture respawns at the current level, not Level 1.
- Codes and map knowledge persist; physical tokens must be retrieved again.
- Robot permissions and hacked behavior reset on capture.
- Ordinary panels, sensors, bots, and transport reset with persistent fortifications applied.
- Used zero-days remain consumed; unpatched openings remain reusable only at their original targets.
- A patched opening stays closed after reset.
- Deeper reward cannot be farmed through capture resets.
- Level completion restores three lives and preserves unused zero-days and current robot permissions.
- Third capture ends the run; replay creates a fresh configuration and resets run progress.

### Architect and route integrity

- Exactly one architect action per capture.
- Architect selection uses reports, not hidden attacker telemetry.
- Observed zero-day openings receive increased patch-selection weight.
- One action cannot close more than one viable route family.
- Two distinct route-closing actions leave the third route achievable after reset.
- Shared final approach cannot be permanently sealed.
- Each of the 15 layouts passes route/resource validation under allowed fortifications.

### Final access

- Simply reaching the computer does not win.
- Valid credential, token, authorized service, or zero-day each can win in their designed cases.
- Invalid credentials, expired sessions, robot permissions alone, and decoy terminals do not win.
- All Level 3 bots are paired.

## 16. Defaults requiring no further design meeting

For a first working version, use these defaults unless the user changes them:

- Power utility theme; greybox tunnel geometry.
- Five authored layouts per difficulty tier.
- Second zero-day at Level 2 entry, once per run.
- Three panel strikes; eight-second committed robot hack.
- Three-second sight threshold; suspicion decays at 0.75 units/second.
- Robot pauses during the hack and resumes afterward.
- Cart expiry timer begins on boarding.
- Stage-specific tokens are left behind on successful level progression.
- Triggered honeypot immobilization cannot be escaped with a zero-day.
- Architect patch category starts at 60% when a supported patch candidate exists.
- No multiplayer, shooting, disguises, real hacking, elaborate physics, or required external backend.

Keep these values in configuration. The implementer should make routine implementation choices autonomously, preserve confirmed mechanics, and report material deviations instead of silently simplifying them away.
