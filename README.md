# UnderCurrent

UnderCurrent is a red team simulation game created for Critical Infrastructure Protection Homework 2 by Dave Ng’ang’a. It represents the cat-and-mouse game between attackers seeking access to a network and defenders working to detect them and strengthen its defenses.
The defender makes the first move by establishing the initial network layout. The attacker then explores its routes, discovers credentials, and attempts to reach the utility’s control computer.

Once the attacker is caught, the defender responds by fortifying the network. Observations from the attempt guide defensive changes, such as reinforcing barriers, adding surveillance, or patching an exploited opening. These changes persist across subsequent attempts within the same level.
The attacker learns from exploration, but must adapt to the defender’s response. This repeating cycle of probing, detection, fortification, and adaptation captures the ongoing contest between offense and defense. All attacks, credentials, and infrastructure are simulated.

## Gameplay demonstration

[▶ Watch the UnderCurrent gameplay video on OneDrive](https://livejohnshopkins-my.sharepoint.com/:v:/g/personal/dnganga1_jh_edu/IQCyKxK_hKraSLr1jc9W6DUwAVnoNtLd6E618ODQ1_3D-3c?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=0vS43G)

## Play the browser game

Install Python 3 and use a desktop browser. The built-in renderer needs no additional packages or internet access after cloning.

```bash
git clone https://github.com/DaveNganga/UnderCurrent.git
cd UnderCurrent/ics-tunnel-game
python3 server.py --open
```

If the browser does not open, visit http://127.0.0.1:5173. Keep the terminal open while playing. Press Ctrl+C in the terminal to stop the server. If the port is occupied, use `python3 server.py --port 5174 --open`.

### Optional Three.js renderer

With Node.js and npm installed, run these commands inside `ics-tunnel-game`:

```bash
npm ci
python3 server.py --open
```

Open http://127.0.0.1:5173/?renderer=three to select the Three.js view. Use `?renderer=offline` for the built-in renderer. Refreshing the page restarts the run.

### Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look; click the game to capture the pointer |
| Arrow keys | Alternative turning controls |
| E | Interact, read, collect, hack, or use transport |
| Left click | Cut the perimeter padlock or strike a loose panel |
| Q, then Q again | Confirm use of a zero-day |
| M | View discovered map and recovered codes |
| Digits, then Enter | Submit an access code |
| Escape | Close a terminal or pause |
| L | Pause and access run-log download |

The perimeter gate opens with one hit; network panels require three. The outdoor scene uses nighttime lighting. The attacker moves at 3.0 units/second; guard vision reaches 8.1 units and camera vision reaches 10.8 units. Camera sweeps take approximately 13.57 seconds per cycle. These settings can be adjusted in `ics-tunnel-game/config/game.config.json`.

## Text version

The smaller student implementation requires Python 3.10 or later. From the repository root:

```bash
python3 tunell.py
```

This version expresses the central route-selection, capture, fortification, and final-access mechanics through prompts and probability checks. It is intentionally smaller than the browser implementation.

## Assignment materials

- [Analysis and Design](Analysis%20and%20Design.odt), comparing my and and AI-generated implementations.
- [Design specifications and JSON layouts](design/).
- [Browser implementation for Question 3](ics-tunnel-game/).
- [my text implementation](tunell.py).

The Markdown specifications record the intended design; the JSON files describe nine layouts and the shared control room. Runtime copies are in `ics-tunnel-game/public/blueprints/`. The project was developed through iterative design conversations and AI-assisted implementation and review.

## Verification and scope

Run the text-game behavioral checks from the repository root:

```bash
python3 test_tunell.py
```

These checks cover selected game rules and use controlled inputs and mocks. They are not a complete playthrough or a security audit. See [verification results](verification.txt) for the checks performed on the submitted files.

The browser game is a prototype: it uses continuous gameplay and capture-driven defensive responses rather than an explicit day counter. Fortifications persist within a level, and three captures can end a run. It therefore does not implement every literal condition of the assignment’s day-by-day model. See [prototype limitations](ics-tunnel-game/DEVIATIONS.md) for further implementation details.
