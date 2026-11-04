# Every sound effect + ambience bed of "The Bell That Broke Itself" (1859 Big Ben) as a cue list timed to
# timeline.py, rendered into one stereo SFX stem. Each EVENT has a naive level (LU relative to the voice stem,
# measured as max momentary loudness) and is placed SFX_DB = -6 dB under it; ambience BEDS (integrated loudness)
# are not reduced.
import math
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, shelf, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise, modal)
import sfx_gen as G
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, group=None, cut=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send, self.cut = kind, p, extra, lpf, send, cut
        self.group = group or name
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None


def cues():
    C = []
    R = rng(1859)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ------------------------------------------------ ambience beds (not reduced by the -6 dB event rule)
    def amb_day(dur, river=0.5, flags=0.25, seed=1):
        def g():
            r = rng(seed)
            n = ns(dur)
            x = G.breeze(dur, r, 1.0, 0.15, 850)
            rv = bp(colored(n, r, 0.8), 180, 1800, 1) * river * (0.8 + 0.2 * smooth_noise(n, r, 0.3))
            x += st(rv)
            x += pan(G.bird_chirps(dur, r, 0.45, "sparrow") * 0.08, 0.5)
            x += pan(G.bird_chirps(dur, r, 0.3, "sparrow") * 0.05, -0.6)
            x += pan(G.flag_flutter(dur, r) * flags, 0.3)
            return fades(x, 0.4, 0.6), 0.0
        return g

    add(Cue(0.0, "amb_day", "Westminster daytime air: Thames breeze, river below, sparrows, tower flags (shots 1-8)",
            _cut(amb_day(35.6, 0.55), 35.6, 0.4, 0.5), -30, "bed", send=0.0))
    add(Cue(35.4, "amb_belfry_silent", "high belfry silence & wind after Big Ben cracks (shots 9-10)",
            _env(lambda: (amb_day(7.1, 0.25, 0.45, seed=41)()[0], 0.0), 7.1, 0.35, 0.35), -28, "bed", send=0.0))
    add(Cue(42.2, "amb_golden", "golden-hour calm: soft breeze, blackbird phrases, distant Thames (shots 11-13)",
            _env(lambda: (_golden(14.5, rng(43)), 0.0), 14.5, 0.5, 0.4), -29, "bed", send=0.0))
    add(Cue(56.4, "amb_fix", "belfry workshop daylight air: breeze, distant river (shot 14)",
            _cut(amb_day(6.8, 0.4, 0.25, seed=44), 6.8, 0.25, 0.35), -28, "bed", send=0.0))
    add(Cue(63.0, "amb_town", "Westminster Bridge day air: breeze, sparrows, flags, river (shot 15)",
            _cut(amb_day(4.5, 0.45, 0.3, seed=45), 4.5, 0.3, 0.05), -29, "bed", send=0.0))

    # ------------------------------------------------ rhythmic hoist / mechanism beats (shots 3, 6, 7, 8, 13)
    for (t, shot, tau, foot) in T.footfalls():
        d = T.column_distance(t)
        g, lpf, send = T.dist_fx(d)
        inten = T.stomp(tau)
        r = rr()
        def gen(r=r, inten=inten, foot=foot, d=d):
            x, pre = G.column_stomp(r, inten, foot, width=float(np.clip(5.0 / d, 0.15, 1.0)), boom_gain=0.55)
            return peq(x, 2200, 4.0, 0.7), pre
        add(Cue(t, "hoist_pulse", f"rhythmic hoist / clockwork pulse (shot {shot})", gen, -11,
                extra=max(g, -13.0) + 16 * math.log10(inten), lpf=lpf, send=send, group="stomps"))

    # ------------------------------------------------ MONSTER IRON HAMMER STRIKES ON 13.5-TON BIG BEN
    # Strikes at 1.32s ("cracked"), 4.78s ("louder"), 25.80s ("strike"), 27.78s ("slams"), 29.50s, 33.58s (SNAP), 54.83s ("harder")
    for idx, st_t in enumerate(T.STRIKES):
        cracked = (st_t == 1.32 or st_t >= T.SNAP)
        cut = T.FLASH + 0.02 if st_t < T.FLASH else None
        add(Cue(st_t - 0.10, "monster_swish", f"700-lb monster hammer wind-up swish #{idx+1}",
                (lambda r=rr(): (G.whoosh(0.24, r, 0.10, 220, 1400, 0.85, 0.06, 0.25), 0.10)),
                -14, p=-0.25, send=0.14, group="bell_strike", cut=cut))
        add(Cue(st_t, "big_ben_toll", f"13.5-ton Great Bell struck by monster iron hammer #{idx+1} ({'cracked' if cracked else 'intact'})",
                (lambda r=rr(), cr=cracked: (_big_bell_strike(r, cracked=cr, lighter=False), 0.0)),
                -2 if st_t in (1.32, 25.80, T.SNAP) else -4, p=-0.15, send=0.28, group="bell_strike", cut=cut))

    # Hook crack & white flash
    add(Cue(1.32, "hook_crack", "hook flash-forward: bronze crack snap on 'cracked wide open'",
            lambda: (G.bolt_snap(rng(132)), 0.0), -2, p=-0.2, send=0.18, cut=T.FLASH + 0.02))
    for tm, nm in [(T.fr(28), "push-in on cracked bell"), (T.fr(105), "push-in on Denison")]:
        add(Cue(tm, "whoosh_cam", f"camera {nm}", (lambda r=rr(): (G.whoosh(0.45, r, 0.07, 400, 2400, 0.8, 0.13, 0.2), 0.07)), -12, send=0.1))
    add(Cue(T.FLASH, "flash_whoosh", "reverse swell into white flash (frame 167) + low boom",
            lambda: _flash(rng(167)), -5, send=0.2))

    # ------------------------------------------------ Shot 2: 1859 Westminster town crowd & cheer
    add(Cue(T.FLASH, "crowd_murmur", "Londoners on Westminster Bridge & quays (shot 2)",
            lambda: (_murmur(4.7, rng(21), 22, early=True), 0.0), -10, lpf=3600, send=0.35))
    add(Cue(8.55, "crowd_cheer", "Londoners cheer on 'crowning it with its pride and joy'",
            lambda: (_cheer(2.4, rng(22)), 0.0), -6, lpf=5000, send=0.35))

    # ------------------------------------------------ Shot 3: Hauling the 13-ton bell up the narrow shaft
    add(Cue(10.35, "rope_haul", "heavy hemp ropes & timber pulley groaning under 13.5-ton Great Bell (shot 3)",
            lambda: (G.chain_groan(4.7, rng(31), 0.65, 0.9, 24, 38, beats=[10.5 + k * 0.5 for k in range(9)], t0=10.35), 0.0),
            -7, p=-0.2, send=0.16))

    # ------------------------------------------------ Shot 4 & 5: Foundry Master gentle hammer tap & Denison's boast
    add(Cue(17.65, "gentle_tap", "Foundry Master demonstrates a gentle hammer tap on 'needs a gentle hammer'",
            lambda: (_big_bell_strike(rng(176), cracked=False, lighter=True) * 0.55, 0.0), -9, p=-0.2, send=0.20))

    # ------------------------------------------------ Shot 6 & 7: Monster hammer rigging & rattling hats on the bridge
    add(Cue(22.30, "winch_ratchet", "heavy iron winch ratcheting the monster 700-lb hammer (shot 6)",
            lambda: (G.chain_groan(3.2, rng(66), 0.55, 0.95, 22, 42, beats=[22.5 + k * 0.5 for k in range(6)], t0=22.30), 0.0),
            -8, p=-0.3, send=0.14))
    for ht in (27.85, 28.54, 29.55):
        add(Cue(ht, "hat_rattle", "top hats rattling & popping on Westminster Bridge from the shockwave",
                (lambda r=rr(): (_scuffle(r), 0.0)), -11, send=0.20, group="hat_rattle"))
    add(Cue(30.25, "bridge_cheer", "crowd on Westminster Bridge cheers on 'while the crowd cheers'",
            lambda: (_cheer(1.8, rng(77)), 0.0), -6, lpf=5000, send=0.35))

    # ------------------------------------------------ Shot 8: THE 4-FOOT CRACK RIPS UP ITS SIDE (SNAP = 33.58s)
    for k, tm in enumerate([32.10, 32.55, 33.00, 33.35]):
        add(Cue(tm, "bronze_strain", f"bronze bell wall micro-stress groan {k + 1}/4 before SNAP",
                (lambda r=rr(), a=0.55 + 0.15 * k: (G.bolt_strain(r, a), 0.0)), -11 + k, p=-0.15, send=0.08, group="bolt_strain"))
    add(Cue(T.SNAP, "bell_crack_snap", "FOUR-FOOT CRACK RIPS UP BIG BEN: catastrophic bronze shear + detuned ring + flying shards",
            lambda: (G.bolt_snap(rng(3358)), 0.0), 0, p=-0.15, send=0.22))
    add(Cue(T.SNAP + 0.06, "crack_rip_tear", "4-foot metallic fissure ripping up the bronze waist ('rips up its side')",
            lambda: (G.chain_whip(rng(3365)), 0.0), -3, p=-0.25, send=0.22))
    for tm, pp in [(T.SNAP + 0.75, -0.4), (T.SNAP + 0.92, 0.15)]:
        add(Cue(tm, "shard_land", "bronze shard clinks on the belfry stone floor", (lambda r=rr(): (_bounces(r), 0.0)), -14, p=pp, send=0.25))

    # ------------------------------------------------ Shots 9 & 10: "Luckily..." / "Unluckily, London's brand-new voice goes dead silent"
    add(Cue(35.55, "yoke_settle", "13-ton bell settles on its oak timber yoke without crashing through the floor",
            lambda: (G.deck_flex(rng(355), 0.75), 0.0), -10, send=0.20))
    add(Cue(39.45, "dead_silent_dud", "pathetic dull clink-buzz from the cracked bell + disappointed sigh ('goes dead silent')",
            lambda: (_pathetic_buzz(rng(3945)), 0.0), -8, p=0.0, send=0.18))
    add(Cue(41.10, "groans", "Denison & Foundry Master groan in dismay ('nobody knows how to get it out')",
            lambda: (_groans(rng(4110), [(0.0, "ugh", 1.0), (0.14, "ow", 0.7)]), 0.0), -12, lpf=4800, send=0.20, group="groans"))

    # ------------------------------------------------ Shot 11 (Golden): Physics of Bronze ("bends in and out like a stiff spring")
    for k in range(5):
        tm = 43.0 + k * 0.68
        add(Cue(tm, "spring_flex", "bronze bell rim flexing in and out like a stiff spring",
                (lambda r=rr(), k=k: (_spring_hum(r, 164.8 * (1.02 if k % 2 else 0.98)), 0.08)), -12,
                p=0.2 if k % 2 else -0.2, send=0.28, group="sway_creak"))

    # ------------------------------------------------ Shot 12 (Golden): Drinking Glass + Spoon ("It hums") + Heavy Ladle ("splits right up")
    for idx, tp in enumerate(T.SPOON_TAPS):
        add(Cue(tp, "spoon_glass_tap", f"silver spoon gently taps crystal drinking glass #{idx+1} -> pure singing hum",
                (lambda r=rr(), idx=idx: (_glass_tap_hum(r, 1318.5 * (1.0 if idx == 0 else 1.06)), 0.0)),
                -5, p=-0.1, send=0.26, group="glass_analogy"))
    add(Cue(T.LADLE_SLAM - 0.10, "ladle_swish", "heavy iron soup ladle swings down ('Slam it with a heavy ladle')",
            lambda: (G.whoosh(0.22, rng(5060), 0.10, 320, 1900, 0.85, 0.05, 0.25), 0.10), -13, p=-0.2, send=0.12, group="glass_analogy"))
    add(Cue(T.LADLE_SLAM, "ladle_slam", "heavy iron soup ladle slams the drinking glass rim",
            lambda: (_ladle_glass_slam(rng(5069)), 0.0), -2, p=-0.1, send=0.20, group="glass_analogy"))
    add(Cue(T.GLASS_SPLIT, "glass_split", "crystal drinking glass rim splits right up ('and the rim splits right up')",
            lambda: (_glass_split(rng(5156)), 0.0), -2, p=0.0, send=0.22, group="glass_analogy"))

    # ------------------------------------------------ Shot 14 (Day): Quarter-Turn Rotation + 3 Square-Notch Chisel Blows + Lighter Hammer
    add(Cue(58.55, "quarter_turn_winch", "workers turn the 13.5-ton bell a quarter circle on its oak yoke",
            lambda: (G.chain_groan(1.55, rng(5855), 0.7, 0.9, 25, 36, beats=[58.7, 59.1, 59.5, 59.9], t0=58.55), 0.0),
            -7, p=0.0, send=0.18))
    for k, th in enumerate(T.HITS):
        big = 1.0 if k < 2 else 1.25
        add(Cue(th - 0.09, "chisel_swish", "hammer swing for square notch",
                (lambda r=rr(): (G.whoosh(0.18, r, 0.08, 600, 2500, 0.6, 0.04, 0.2), 0.08)), -20, p=-0.15, send=0.1, group="hammer"))
        add(Cue(th, "chisel_notch", f"chisel & hammer blow {k + 1}/3 chipping the square anti-crack notch in bronze",
                (lambda r=rr(), big=big: (G.hammer_hit(r, big), 0.0)), -4 if k == 1 else -5, p=-0.15, send=0.22, group="hammer"))
    add(Cue(62.15, "lighter_hammer_rig", "sleek lighter hammer clicks & swings into position ('and hung a lighter hammer')",
            lambda: (G.clink(rng(6215), 1850, 0.22), 0.0), -9, p=-0.2, send=0.18))

    # ------------------------------------------------ Shot 15 (Day): Famous Broken Bell Chimes & Strolling Londoners
    for idx, ch_t in enumerate(T.CHIMES):
        add(Cue(ch_t, "big_ben_chime", f"famous E-natural chime of the rotated, square-notched broken Great Bell #{idx+1}",
                (lambda r=rr(): (_big_bell_strike(r, cracked=True, lighter=True), 0.0)),
                -3, p=0.0, send=0.35, group="bell_chime"))

    for (t, i, x, z, sp) in T.tourist_steps():
        if t < 63.10 or t > T.DUR - 0.05:
            continue
        cam = T.tourist_cam(t)
        d = float(np.linalg.norm(cam - np.array([x, 6.0, z])))
        g, lpf, send = T.dist_fx(d)
        pp = float(np.clip(-(x - cam[0]) / max(d, 1) * 1.6, -0.8, 0.8))
        add(Cue(t, "stroll_step", "Londoner footstep strolling across Westminster Bridge",
                (lambda r=rr(): (shelf(G.stroll_step(r, r.uniform(0.2, 1.0)), 1500, 4.0, "high"), 0.0)),
                -10, p=pp, extra=max(g, -8.0) + float(R.uniform(-2, 1)), lpf=lpf, send=send, group="stroll_steps"))
    add(Cue(63.15, "town_murmur", "Londoners chatting along Westminster Bridge & Thames embankments (shot 15)",
            lambda: (_murmur(4.3, rng(63), 14, early=False), 0.0), -11, lpf=3200, send=0.35))

    # ------------------------------------------------ Camera-move & crossfade whooshes
    for f, desc in [(308, "cut to tower base hoist"), (457, "cut to Foundry Master warning"), (510, "punch in on gentle hammer"),
                    (555, "cut to stubborn Edmund Denison"), (663, "cut to monster iron hammer"), (725, "wide hammer swing"),
                    (791, "cut to Westminster Bridge crowd"), (940, "push in to Great Bell sound-bow"),
                    (1635, "punch in on monster hammer payoff"), (1795, "cut to square notch chiseling"),
                    (1930, "cut to Westminster Bridge strollers"), (1960, "final crane pullback over Thames")]:
        add(Cue(T.fr(f), "whoosh_cam", f"camera {desc}",
                (lambda r=rr(): (G.whoosh(0.55, r, 0.09, 330, 2000, 0.8, 0.18, 0.15), 0.09)), -12, send=0.12))
    for f, desc in [(1269, "crossfade to golden-hour bronze physics"), (1397, "crossfade to park table analogy"),
                    (1589, "crossfade back to golden belfry"), (1695, "crossfade to daylight repair")]:
        add(Cue(T.fr(f), "whoosh_xfade", desc,
                (lambda r=rr(): (G.whoosh(0.75, r, 0.30, 300, 1600, 0.9, 0.22, 0.1), 0.30)), -12, send=0.15))

    return C


# ================================================================ custom physical synthesis helpers for Big Ben
def _big_bell_strike(r, cracked=False, lighter=False):
    """Synthesizes the 13.5-ton bronze Great Bell ('Big Ben', E3 = 164.8 Hz nominal, with characteristic
    inharmonic partials and optional cracked beating/buzz or monster iron hammer impact)."""
    dur = 2.6 if lighter else 2.2
    t = tt(dur)
    # Big Ben's famous E-natural partials (hum 82.4 Hz, prime 164.8 Hz, tierce 196 Hz, quint 247 Hz, nominal 329.6 Hz, superquint 494 Hz)
    modes = [
        (82.4,  0.65, 1.8),
        (164.8, 1.00, 1.4),
        (196.0, 0.55, 1.1),
        (247.0, 0.40, 0.85),
        (329.6, 0.70, 0.75),
        (494.0, 0.35, 0.45),
        (659.2, 0.22, 0.30),
    ]
    if cracked:
        # Characteristic split-mode beating & slight metallic detune that gives Big Ben its famous cracked voice!
        modes += [(167.2, 0.45, 0.95), (334.5, 0.38, 0.55), (784.0, 0.25, 0.22)]
    y = modal(dur, modes, r)
    # Hammer impact transient: monster 700-lb iron hammer has a huge low-mid iron clank; lighter hammer is cleaner
    if lighter:
        clank = modal(0.18, [(1120, 0.45, 0.025), (2240, 0.25, 0.015)], r)
        y[:len(clank)] += clank * 0.45
        thump = np.exp(-t / 0.06) * np.sin(2 * np.pi * 82.4 * t) * 0.4
    else:
        clank = modal(0.28, [(420, 0.8, 0.04), (880, 0.65, 0.03), (1760, 0.45, 0.02), (3100, 0.3, 0.012)], r)
        y[:len(clank)] += clank * 0.85
        thump = np.exp(-t / 0.09) * np.sin(2 * np.pi * 58.0 * t) * 0.85
    return fades(widen(y + thump, r, 11, 0.65), 0.002, 0.25)


def _pathetic_buzz(r):
    """Shot 10 ('London's brand-new voice goes dead silent'): a comical dull, choked clank-buzz."""
    dur = 0.75
    t = tt(dur)
    modes = [(158.0, 0.8, 0.12), (169.0, 0.7, 0.10), (412.0, 0.5, 0.06), (890.0, 0.35, 0.04)]
    y = modal(dur, modes, r) * (1.0 + 0.35 * np.sin(2 * np.pi * 29.0 * t))
    return fades(y, 0.002, 0.15)


def _spring_hum(r, f0):
    """Shot 11 ('its metal bends in and out like a stiff spring'): warm elastic bronze swell."""
    dur = 0.65
    t = tt(dur)
    env = np.sin(np.pi * t / dur) ** 1.4
    y = env * (0.65 * np.sin(2 * np.pi * f0 * t) + 0.30 * np.sin(2 * np.pi * f0 * 2.0 * t) + 0.12 * np.sin(2 * np.pi * f0 * 3.0 * t))
    return fades(y, 0.04, 0.08)


def _glass_tap_hum(r, f0=1318.5):
    """Shot 12 ('Tap a drinking glass with a spoon? It hums.'): crystalline ping + pure singing glass resonance."""
    dur = 1.25
    modes = [
        (f0,        1.00, 0.65),
        (f0 * 2.0,  0.42, 0.40),
        (f0 * 3.02, 0.18, 0.22),
        (3850.0,    0.25, 0.018),
    ]
    y = modal(dur, modes, r)
    return fades(widen(y, r, 8, 0.45), 0.001, 0.18)


def _ladle_glass_slam(r):
    """Shot 12 ('Slam it with a heavy ladle'): heavy iron ladle clang against glass rim."""
    dur = 0.65
    modes = [
        (380.0,  0.9, 0.08),
        (760.0,  0.7, 0.06),
        (1318.5, 0.8, 0.09),
        (2480.0, 0.6, 0.03),
        (4200.0, 0.4, 0.015),
    ]
    y = modal(dur, modes, r)
    return fades(y, 0.001, 0.12)


def _glass_split(r):
    """Shot 12 ('and the rim splits right up'): crisp crystalline glass crack & high-frequency fissure snap."""
    dur = 0.55
    t = tt(dur)
    snap = bp(colored(ns(dur), r, -0.5), 1800, 7500, 2) * np.exp(-t / 0.022) * 1.4
    shards = modal(dur, [(1950, 0.7, 0.06), (3120, 0.6, 0.05), (4680, 0.5, 0.035), (6200, 0.35, 0.02)], r)
    return fades(snap + shards, 0.001, 0.10)


# ================================================================ standard composite helpers
def _cut(gen, dur, fin, fout):
    def g():
        x, a = gen()
        return fades(x, fin, fout), a
    return g


def _env(gen, dur, fin, fout):
    return _cut(gen, dur, fin, fout)


def _golden(dur, r):
    n = ns(dur)
    x = G.breeze(dur, r, 0.7, 0.1, 650)
    x += st(lp(bp(colored(n, r, 0.8), 150, 1400, 1), 1200) * 0.35)
    x += pan(G.bird_chirps(dur, r, 0.35, "blackbird") * 0.06, -0.5)
    x += pan(G.bird_chirps(dur, r, 0.25, "blackbird") * 0.04, 0.6)
    x += widen(G.crickets(dur, r, 3) * 0.008, r, 9, 1.0)
    return x


def _flash(r):
    dur = 0.75
    y = G.whoosh(dur, r, 0.33, 500, 4200, 0.9, 0.09, 0.4)
    t = tt(dur)
    boom = np.where(t > 0.33, np.exp(-(t - 0.33) / 0.12) * np.sin(2 * np.pi * 62 * (t - 0.33)), 0) * 0.8
    return widen(y + boom, r, 12, 0.9), 0.33


def _murmur(dur, r, voices, early=False):
    n = ns(dur)
    out = np.zeros((2, n))
    for v in range(voices):
        kind = r.uniform()
        base, scale = ((r.uniform(95, 140), r.uniform(0.95, 1.05)) if kind < 0.45 else
                       (r.uniform(175, 235), r.uniform(1.12, 1.2)) if kind < 0.85 else (r.uniform(260, 330), r.uniform(1.25, 1.35)))
        y = G.babble(dur, r, base, scale, r.uniform(3.6, 4.8), r.uniform(0.55, 0.8), fmax=3400)
        y = lp(y, r.uniform(2200, 3600), 1) * r.uniform(0.3, 1.0)
        out += pan(y, r.uniform(-0.85, 0.85))
    if early:
        for k in range(4):
            h = G.hurrah(r, r.uniform(110, 230), r.uniform(1.0, 1.18))
            place(out, pan(lp(h, 3000, 1) * 0.5, r.uniform(-0.8, 0.8)), r.uniform(0.2, 1.6))
    return fades(out, 0.25, 0.8)


def _cheer(dur, r):
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for v in range(26):
        kid = v % 6 == 5
        base = r.uniform(270, 340) if kid else (r.uniform(105, 160) if v % 2 else r.uniform(180, 250))
        scale = 1.3 if kid else (1.0 if v % 2 else 1.15)
        for rep in range(1 + int(r.uniform() < 0.4)):
            h = G.hurrah(r, base * r.uniform(0.97, 1.05), scale, kid)
            tm = r.uniform(0.15, 0.8) + rep * r.uniform(0.45, 0.7)
            if tm < dur - 0.3:
                place(out, pan(lp(h, 4000, 1) * r.uniform(0.35, 1.0), r.uniform(-0.9, 0.9)), tm)
    env = np.interp(t, [0, 0.3, 0.8, dur - 0.5, dur], [0.0, 0.6, 1.0, 0.75, 0.0])
    out += G.applause(dur, r, 40, env) * 0.9
    return fades(out, 0.05, 0.4)


def _bounces(r):
    y = np.zeros(ns(0.6))
    for k, (tm, a) in enumerate([(0.0, 1.0), (0.11, 0.45), (0.19, 0.25), (0.24, 0.12)]):
        c = G.clink(r, r.uniform(2600, 3400), 0.12) * a
        y[ns(tm): ns(tm) + len(c)] += c[: len(y) - ns(tm)]
    return y


def _scuffle(r):
    y = np.zeros((2, ns(0.6)))
    for k in range(18):
        s = G.stroll_step(r, r.uniform(0.6, 1.2)) * r.uniform(0.3, 1.0)
        place(y, pan(s, r.uniform(-0.6, 0.6)), r.uniform(0, 0.3))
    return y


def _groans(r, parts):
    out = np.zeros((2, ns(0.9)))
    for tm, kd, g in parts:
        o = G.oof(r, kd, base=r.uniform(90, 125), scale=r.uniform(0.95, 1.05))
        place(out, pan(o * g, r.uniform(-0.6, 0.6)), tm)
    return out


# ================================================================ render
def render(v_ref, on_event=None):
    C = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        if c.cut is not None:
            k = ns(c.cut - (c.t - anchor))
            if 0 < k < x.shape[1]:
                x = fades(x[:, :k], 0.0, 0.02)
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(send, c.send * x.mean(0), t0)
    valley = make_ir(1.1, 77, pre=0.01, hf=1.6, early=[(0.09, 0.45, -0.5), (0.14, 0.3, 0.6), (0.23, 0.2, -0.2)])
    out += 0.55 * convolve_st(send, valley)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.12)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
