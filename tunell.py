"""ICS Tunnel Game - tiny text adventure. Needs Python 3.10+ (uses match/case)."""
import random

OBSTACLES = ["panel", "gap", "camera", "keypad", "robot"]


def ask(prompt, valid):
    while True:
        a = input(prompt).strip().lower()[:1]
        if a and a in valid:
            return a
        print("  (choose one of: " + "/".join(valid) + ")")


def safe(rng, base, fort):
    """Each fortification on this obstacle adds 15% risk."""
    return rng.random() > base + 0.15 * fort


def make_level(rng, lvl):
    routes = {}
    for r in "ABC":
        count = 2 if lvl == 1 else 3
        code = "".join(rng.choice("0123456789") for _ in range(5))
        routes[r] = {"obs": [rng.choice(OBSTACLES) for _ in range(count)], "code": code, "fort": {}}
    return routes


def tackle(rng, game, route, name):
    """Try one obstacle. Returns (result, why): 'pass', 'retreat' or 'caught'."""
    fort = route["fort"].get(name, 0)
    zd = game["zd"] > 0 and fort < 2 and name in ("gap", "camera", "keypad")
    z = "z" if zd else ""
    zt = ", [z]ero-day" if zd else ""
    match name:
        case "panel":
            print("A loose panel blocks the duct.")
            if fort >= 2:
                print("  It was reinforced. It will not budge.")
                return "retreat", ""
            match ask("  [f]orce it (noisy) or [b]ack off? ", "fb"):
                case "f":
                    for strike in range(1, 4):
                        print(f"  BANG {strike}")
                    return ("pass", "") if safe(rng, 0.3, fort) else ("caught", "A bot heard the banging")
                case "b":
                    return "retreat", ""
        case "gap":
            print("Scanner beams sweep the tunnel; a gap opens now and then.")
            match ask("  [w]ait for the gap, [r]ush" + zt + "? ", "wr" + z):
                case "w":
                    risk = 0.1
                case "r":
                    risk = 0.5
                case "z":
                    game["zd"] -= 1
                    return "pass", ""
            return ("pass", "") if safe(rng, risk, fort) else ("caught", "The scanner flagged you")
        case "camera":
            print("A camera sweeps the corridor. There is a niche to hide in.")
            match ask("  [h]ide and time the sweep, [r]un past" + zt + "? ", "hr" + z):
                case "h":
                    risk = 0.2
                case "r":
                    risk = 0.6
                case "z":
                    game["zd"] -= 1
                    return "pass", ""
            return ("pass", "") if safe(rng, risk, fort) else ("caught", "The camera called a bot")
        case "keypad":
            print("A keypad door, and a tempting 'maintenance shortcut' beside it.")
            match ask("  [t]ype the code, [s]hortcut" + zt + "? ", "ts" + z):
                case "s":
                    return "caught", "Honeypot! You are stuck in honey until a bot zaps you"
                case "z":
                    game["zd"] -= 1
                    return "pass", ""
                case "t":
                    for attempt in range(3):
                        guess = input(f"  5-digit code (try {attempt + 1}/3): ").strip()
                        if guess == route["code"]:
                            return "pass", ""
                        print("  Wrong code - that was noisy.")
                        if not safe(rng, 0.15, fort):
                            return "caught", "Bots heard the wrong codes"
                    print("  The door locks.")
                    return "retreat", ""
        case "robot":
            if fort >= 1:
                print("Two robots patrol together now. They cannot be hacked.")
                match ask("  [e]vade them or [b]ack off? ", "eb"):
                    case "e":
                        return ("pass", "") if safe(rng, 0.4, 0) else ("caught", "The pair spotted you")
                    case "b":
                        return "retreat", ""
            print("A lone robot patrols ahead, its flashlight sweeping.")
            match ask("  Hack it from [b]ehind (8 s) or [f]ace it? ", "bf"):
                case "b":
                    for sec in range(1, 9):
                        print(f"  hacking... {sec}/8")
                    return ("pass", "") if safe(rng, 0.1, 0) else ("caught", "Another bot saw you mid-hack")
                case "f":
                    return "caught", "The robot turned and zapped you"
    return "retreat", ""


def run_route(rng, game, route):
    for name in route["obs"]:
        result, why = tackle(rng, game, route, name)
        match result:
            case "pass":
                print("  ...through.")
            case "retreat":
                print("  You back away to the start.")
                return "retreat", "", ""
            case "caught":
                return "caught", name, why
    return "done", "", ""


def architect(rng, routes, pick, reports):
    """Blue team: sees only reports (never your inventory). One fortification per capture."""
    mine = [n for (r, n) in reports if r == pick]
    if mine and rng.random() < 0.7:
        target = mine[-1]                       # counter the weakness that was reported
    else:
        target = rng.choice(routes[pick]["obs"])
    routes[pick]["fort"][target] = routes[pick]["fort"].get(target, 0) + 1
    match target:
        case "panel":
            msg = "reinforced a loose panel"
        case "gap":
            msg = "closed a scanner gap"
        case "camera":
            msg = "added a camera"
        case "keypad":
            msg = "added a honeypot and a second factor"
        case _:
            msg = "paired up the patrol robots"
    print(f"  [Architect] Security {msg} on route {pick}.")


def final_computer(game):
    print("The main control computer waits for a credential.")
    valid = "t" + ("z" if game["zd"] else "")
    match ask("  [t]ype the final code" + (", [z]ero-day" if game["zd"] else "") + "? ", valid):
        case "z":
            game["zd"] -= 1
            return True
        case "t":
            for attempt in range(3):
                if input("  Final code: ").strip() == game["final"]:
                    return True
                print("  Rejected.")
    return False


def play_level(rng, game, lvl):
    routes = make_level(rng, lvl)
    game["routes"] = routes
    game["final"] = "".join(rng.choice("0123456789") for _ in range(5))
    lives, reports = 3, []
    while lives > 0:
        print("\nLives: " + "".join("<3 " for _ in range(lives)))
        for r, info in routes.items():
            print(f"  Route {r}: {len(info['obs'])} obstacles, fortifications: {sum(info['fort'].values())}")
        match ask("Route [a]/[b]/[c], [l]ook, [n]otes, [q]uit: ", "abclnq"):
            case "q":
                return "quit"
            case "n":
                print("  Notes:", ", ".join(sorted(game["codes"])) or "none yet")
            case "l":
                r = ask("  Look along which route (a/b/c)? ", "abc").upper()
                for name in routes[r]["obs"]:
                    print(f"  ahead: {name}")
                game["codes"].add(routes[r]["code"])
                print(f"  You find a note: MAINT code {routes[r]['code']}")
                if lvl == 3:
                    game["codes"].add(game["final"])
                    print(f"  And another note: FINAL code {game['final']}")
            case "a" | "b" | "c" as pick:
                pick = pick.upper()
                game["cur"] = pick
                if sum(routes[pick]["fort"].values()) >= 3:
                    print("  Route sealed by the architect.")
                    continue
                result, name, why = run_route(rng, game, routes[pick])
                if result == "done" and lvl == 3 and not final_computer(game):
                    result, name, why = "caught", "keypad", "The computer locked you out"
                match result:
                    case "done":
                        return "won"
                    case "caught":
                        lives -= 1
                        reports.append((pick, name))
                        print(f"  ZAP! {why}.")
                        architect(rng, routes, pick, reports)
                    case "retreat":
                        pass
    return "lost"


def run(rng):
    game = {"zd": 1, "codes": set()}
    for lvl in (1, 2, 3):
        match lvl:
            case 1:
                print("\n=== LEVEL 1: Security Network ===")
            case 2:
                print("\n=== LEVEL 2: Operations Network ===")
                game["zd"] += 1
                print("You find a second zero-day device in the hub.")
            case 3:
                print("\n=== LEVEL 3: Control Network ===")
        match play_level(rng, game, lvl):
            case "lost":
                print("\nThree captures. The run is over.")
                return "lost"
            case "quit":
                return "quit"
            case "won":
                print(f"\nLevel {lvl} complete! Lives restored. Zero-days left: {game['zd']}")
    print("\nYou are accepted by the control computer. YOU WIN.")
    return "won"


if __name__ == "__main__":
    seed = input("Seed (blank = random): ").strip()
    run(random.Random(seed or None))
