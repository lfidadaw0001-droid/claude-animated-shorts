# Picture timeline mirrored from src/videos/bigben/story.ts + cast.ts ("The Bell That Broke Itself")
# so every musical beat, bell strike, crack, spoon tap, ladle slam, chisel blow, and chime lands on the exact frame.
import math
import numpy as np

FPS = 30
TOTAL = 2025
DUR = TOTAL / FPS            # 67.5 s exactly
fr = lambda f: f / FPS

SNAP, DROP0, DROP1 = 33.58, 33.58, 33.85
FLASH = fr(167)              # 5.567 s
HITS = [60.80, 61.22, 61.65] # Shot 14: square notch chisel blows
STRIKES = [1.32, 4.78, 25.80, 27.78, 29.50, 33.58, 54.83]
CHIMES = [64.55, 66.20]
SPOON_TAPS = [47.85, 49.20]
LADLE_SLAM = 50.69
GLASS_SPLIT = 51.56
SWING_T, PUSH0 = 1.35, 47.85
PUSHES = [PUSH0 + k * SWING_T for k in range(4)]
TOURIST_T0 = 63.10

# id: (first frame, end frame, light, crowd)
SHOTS = {
    1:  (0,    167,  "day",    "march"),
    2:  (167,  308,  "day",    "march"),
    3:  (308,  457,  "day",    "march"),
    4:  (457,  555,  "day",    "march"),
    5:  (555,  663,  "day",    "march"),
    6:  (663,  791,  "day",    "march"),
    7:  (791,  940,  "day",    "march"),
    8:  (940,  1064, "day",    "fall"),
    9:  (1064, 1162, "day",    "water"),
    10: (1162, 1269, "day",    "water"),
    11: (1269, 1397, "golden", "none"),
    12: (1397, 1589, "golden", "none"),
    13: (1589, 1695, "golden", "march"),
    14: (1695, 1893, "day",    "bank"),
    15: (1893, TOTAL,"day",    "tourists"),
}
XFADE = {11: 8, 12: 8, 13: 8, 14: 8}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 15


def tau_of(shot, t):
    return t


def _lin(pts, x):
    return float(np.interp(x, [p[0] for p in pts], [p[1] for p in pts]))


AMP = [(10.28, 0.05), (15.23, 0.08), (22.09, 0.22), (26.37, 0.38), (31.32, 0.48), (SNAP, 0.55), (SNAP + 0.35, 0.0)]
STOMP = [(10.28, 1.0), (22.09, 1.25), (31.32, 1.45)]


def amp(tau):
    return _lin(AMP, tau) if tau >= AMP[0][0] else 0.0


def stomp(tau):
    return _lin(STOMP, tau)


def swing_amp_deg(t):
    return 12.0 + 35.0 * min(1.0, max(0.0, (t - 47.0) / 5.0))


def hh(i, s=0):
    v = math.sin(i * 127.1 + s * 311.7) * 43758.5453
    return v - math.floor(v)


def easeout(u):
    u = min(1.0, max(0.0, u))
    return 1 - (1 - u) ** 4


COLUMN_CAM = {
    1:  [(0, 0, 9.5), (28, 12, 6.2), (105, 12, 5.2)],
    2:  [(167, 0, 62.0), (215, 10, 44.0), (255, 10, 32.0)],
    3:  [(308, 0, 10.5), (355, 14, 8.2)],
    4:  [(457, 0, 5.8), (510, 10, 4.4)],
    5:  [(555, 0, 5.2), (604, 10, 3.8)],
    6:  [(663, 0, 4.8), (725, 12, 6.8)],
    7:  [(791, 0, 12.0), (842, 11, 7.5), (895, 11, 5.8)],
    8:  [(940, 0, 4.6), (1007, 10, 6.2)],
    13: [(1589, 0, 6.2), (1635, 10, 4.5)],
}


def column_distance(t):
    s = shot_at(t)
    keys = COLUMN_CAM.get(s)
    if not keys:
        return 45.0
    f = t * FPS
    ld = math.log(keys[0][2])
    for kf, dur, d in keys[1:]:
        if f < kf:
            break
        ld = ld + (math.log(d) - ld) * easeout((f - kf) / max(dur, 1))
    return math.exp(ld)


def dist_fx(d):
    d = max(d, 3.5)
    g = -14.0 * math.log10(d / 3.5)
    lpf = float(np.clip(17000 * (3.5 / d) ** 0.55, 1800, 17000))
    send = 0.06 + 0.45 * float(np.clip(math.log(d / 3.5) / math.log(25), 0, 1))
    return g, lpf, send


def footfalls():
    """Rhythmic work-haul & clockwork mechanism steps during active belfry/hoist shots."""
    out = []
    for k in range(0, int(DUR * 2) + 1):
        t = k * 0.5
        s = shot_at(t)
        if s not in (3, 6, 7, 8, 13):
            continue
        tau = tau_of(s, t)
        if s == 8 and tau > SNAP + 0.15:
            continue
        out.append((t, s, tau, k % 2))
    return out


def tourist_steps():
    """Shot 15: 22 Londoners strolling across Westminster Bridge."""
    t0 = TOURIST_T0
    a, b = shot_t(15)
    steps = []
    for i in range(22):
        sp = 0.55 + hh(i) * 0.45
        ph0 = hh(i, 5)
        x = (hh(i, 3) - 0.5) * 4.0
        k = 0
        while True:
            t = t0 + (k * 0.5 - ph0) * 1.4 / sp
            k += 1
            if t < a - 0.1:
                continue
            if t > DUR:
                break
            z = -4 + (i / 22) * 26 + hh(i, 2) * 1.4 - sp * (t - t0)
            steps.append((t, i, x, z, sp))
    return steps


def tourist_cam(t):
    f = t * FPS
    p = np.array([-3.6, 19.85, 28.2])
    if f >= 1930:
        p = np.array([1.6, 7.75, -10.5])
    if f >= 1960:
        q = np.array([15.0, 15.0, -40.0])
        p = p + (q - p) * easeout((f - 1960) / 45)
    return p


def words(path):
    import json
    return json.load(open(path, encoding="utf-8"))

