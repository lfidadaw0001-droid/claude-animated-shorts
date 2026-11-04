// Timeline of "The Bell That Broke Itself" (1859 Westminster Great Bell / Big Ben):
// 15 shots timed to voice/words.json (30 fps, 67.50 s = 2025 frames), story physics (bell hoist, monster hammer
// strikes, elastic bronze flex, 4-foot crack at SNAP = 33.58 s, drinking-glass spoon/ladle analogy, quarter-turn
// rotation + square notch + lighter hammer fix), and calibrated camera grammar (smootherstep glides, continuous
// pushK creep on holds, hard cuts on big reframes, 7-frame alternating-sign impact kicks, ~36% thin-lens DOF).
export const FPS = 30;
export const TOTAL = 2025;
export const D0 = 6.0; // bank top + Westminster Bridge deck height (m)
export const HALF = 27; // bridge towers at z = +-27, span 54 m
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 36;
export type V3 = [number, number, number];

export const PARK: V3 = [70, D0, -75]; // park table for Shot 12 drinking-glass analogy
export const TOWER_Z = 34.0;           // Westminster Clock Tower center Z on the north bank
export const BELFRY_Y = D0 + 12.0;     // 18.0 m — open Gothic belfry floor height
export const BELL_Y = D0 + 14.3;       // 20.3 m — center of the 13.5-ton Great Bell
export const BELL_POS: V3 = [0, BELL_Y, TOWER_Z];
// Impact point on the west (-x) sound-bow where the monster hammer slams and the 4-foot crack begins
export const ANCHOR: V3 = [-1.45, D0 + 13.5, TOWER_Z];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- key physical timestamps (seconds, synced to voice/words.json) ----------------
export const SNAP = 33.58;        // Shot 8: "crack" (33.58 s) / "rips" (33.85 s)
export const DROP0 = 33.58;
export const DROP1 = 33.85;
export const DROP_H = 0.0;        // Westminster Bridge never collapses

export const STRIKES = [1.32, 4.78, 25.80, 27.78, 29.50, 33.58, 54.83]; // Monster iron hammer strikes
export const CHIMES = [64.55, 66.20];                                   // Shot 15: Lighter hammer chimes
export const SPOON_TAPS = [47.85, 49.20];                               // Shot 12: "spoon?" (47.85s), "hum" (49.20s)
export const LADLE_SLAM = 50.69;                                        // Shot 12: "ladle" (50.69s)
export const GLASS_SPLIT = 51.56;                                       // Shot 12: "splits" (51.56s)
export const HITS = [60.80, 61.22, 61.65];                              // Shot 14: "chipped a square notch" (61.22s)

// Helpers kept for world.ts / cast.ts compatibility
export const front = (tau: number) => 18 - 0.8 * (tau - 4.0);
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1;
export const amp = (_tau: number) => 0.04;
export const stomp = (_tau: number) => 1.0;
export const shapeZ = (z: number) => (Math.abs(z) < HALF ? Math.cos((Math.PI * z) / (2 * HALF)) : 0);
export const dropW = (z: number) => smooth((20 - z) / 26);
export const dropU = (_tau: number) => 0;

export type BridgeState = {
  bounce: number;    // elastic vibration of bell sound-bow & subtle bridge tremor on strikes
  drop: number;      // 0 (bridge stays up)
  snap: number;      // 0..1 4-foot jagged crack up the Great Bell's flank
  collapsed: boolean;
  strike: number;    // 0..1 hammer swing angle (0 = pulled back, 1 = striking sound-bow)
  turn: number;      // 0..1 quarter-turn (90 deg) bell rotation in Shot 14
  notch: number;     // 0..1 square anti-crack notch chipped at top of crack in Shot 14
  lighter: number;   // 0..1 swap from monster iron hammer to sleek lighter hammer in Shot 14
  hoist: number;     // 0..1 bell height along tower hoist in Shot 3
};

export const deckY = (z: number, b: BridgeState) => D0 + b.bounce * 0.08 * shapeZ(z);

// ---------------- 15 shots timed to voice/words.json ----------------
export type Light = "day" | "golden";
export type Crowd = "march" | "fall" | "water" | "bank" | "tourists" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean };

export const SHOTS: ShotDef[] = [
  { id: 1,  a: 0,    b: 167,  light: "day",    crowd: "march",    tau: (t) => t },
  { id: 2,  a: 167,  b: 308,  light: "day",    crowd: "march",    tau: (t) => t, towns: true },
  { id: 3,  a: 308,  b: 457,  light: "day",    crowd: "march",    tau: (t) => t },
  { id: 4,  a: 457,  b: 555,  light: "day",    crowd: "march",    tau: (t) => t },
  { id: 5,  a: 555,  b: 663,  light: "day",    crowd: "march",    tau: (t) => t },
  { id: 6,  a: 663,  b: 791,  light: "day",    crowd: "march",    tau: (t) => t },
  { id: 7,  a: 791,  b: 940,  light: "day",    crowd: "march",    tau: (t) => t, towns: true },
  { id: 8,  a: 940,  b: 1064, light: "day",    crowd: "fall",     tau: (t) => t },
  { id: 9,  a: 1064, b: 1162, light: "day",    crowd: "water",    tau: (t) => t },
  { id: 10, a: 1162, b: 1269, light: "day",    crowd: "water",    tau: (t) => t },
  { id: 11, a: 1269, b: 1397, light: "golden", crowd: "none",     tau: (t) => t },
  { id: 12, a: 1397, b: 1589, light: "golden", crowd: "none",     tau: (t) => t },
  { id: 13, a: 1589, b: 1695, light: "golden", crowd: "march",    tau: (t) => t },
  { id: 14, a: 1695, b: 1893, light: "day",    crowd: "bank",     tau: (t) => t },
  { id: 15, a: 1893, b: TOTAL,light: "day",    crowd: "tourists", tau: (t) => t, towns: true },
];

/** Crossfades (frames) at place/time changes; 4-frame white flash after Shot 1 hook at f=167 */
export const XFADE: Record<number, number> = { 11: 8, 12: 8, 13: 8, 14: 8 };
export const FLASH_AT = 167;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) {
      return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
    }
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

/** Hammer swing envelope: 0 = cocked back, 1 = contact with sound-bow */
const hammerPose = (t: number, list: number[]): number => {
  let k = 0.15;
  for (const st of list) {
    const dt = t - st;
    if (dt >= -0.45 && dt < -0.08) {
      // Wind-up back to 0
      k = 0.15 * (1 - smooth((dt + 0.45) / 0.37));
    } else if (dt >= -0.08 && dt < 0.0) {
      // Fast downstroke into bronze
      k = smooth((dt + 0.08) / 0.08);
    } else if (dt >= 0.0 && dt < 0.45) {
      // Rebound from bronze sound-bow
      k = 1.0 - 0.85 * easeOut(dt / 0.45);
    }
  }
  return k;
};

export const bridgeState = (id: number, t: number): BridgeState => {
  // Elastic ring vibration after each hammer strike or chime
  let ring = 0;
  for (const st of STRIKES) {
    const dt = t - st;
    if (dt >= 0 && dt < 2.2) ring += Math.exp(-dt * 2.1) * Math.sin(dt * 36) * 0.55;
  }
  for (const ch of CHIMES) {
    const dt = t - ch;
    if (dt >= 0 && dt < 2.8) ring += Math.exp(-dt * 1.4) * Math.sin(dt * 28) * 0.40;
  }
  // Shot 11 ("bends in and out like a stiff spring"): clear visual elastic flex oscillation
  if (id === 11) {
    ring = 0.78 * Math.sin(2 * Math.PI * 1.4 * (t - 42.3));
  }

  // Crack state:
  // Shot 1 (flash-forward hook): cracks at t = 1.32s ("cracked wide open")
  // Shots 2..7: uncracked brand-new bell
  // Shot 8: cracks wide open at SNAP = 33.58s ("a four-foot crack rips up its side")
  // Shots 9, 10, 13, 14, 15: remains cracked (Big Ben was never melted down; the crack is still there!)
  let snap = 0;
  if (id === 1) snap = clamp01((t - 1.32) / 0.25);
  else if (id === 8) snap = clamp01((t - SNAP) / 0.30);
  else if (id === 9 || id === 10 || id === 13 || id === 14 || id === 15) snap = 1;

  const strike = id >= 15 ? hammerPose(t, CHIMES) : hammerPose(t, STRIKES);
  const turn = id === 14 ? smooth((t - 58.50) / 1.50) : id === 15 ? 1 : 0;
  const notch = id === 14 ? smooth((t - 60.80) / 0.90) : id === 15 ? 1 : 0;
  const lighter = id === 14 ? smooth((t - 61.95) / 0.65) : id === 15 ? 1 : 0;
  const hoist = id === 3 ? smooth((t - 10.28) / 4.80) : 1;

  return {
    bounce: ring,
    drop: 0,
    snap,
    collapsed: false,
    strike,
    turn,
    notch,
    lighter,
    hoist,
  };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };

export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;

const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

export const snapEnd = (snap: number): V3 => {
  const u = easeOut(snap);
  return [ANCHOR[0] - 0.4 * u, ANCHOR[1] + 1.2 * u, ANCHOR[2] - 0.4 * u];
};

// ---- framings per shot (calibrated push-ins, glides, and cuts) ----
// Shot 1 (0..167, Hook): Belfry wide 3/4 -> punch in on "cracked wide open" (f=40) -> close on Denison & monster hammer ("louder", f=143)
const S1a = (f: number) => dolly([-1.8, BELFRY_Y + 2.0, TOWER_Z - 5.8], [0, BELL_Y - 0.2, TOWER_Z], pushK(f, 0, 0.0025), { fov: 40 });
const S1b = (f: number) => dolly([-1.6, BELFRY_Y + 1.9, TOWER_Z - 5.2], [-0.5, BELL_Y - 0.3, TOWER_Z], pushK(f, 28, 0.0025, 0.006, 30), { fov: 36, roll: -0.035 });
const S1c = (f: number) => dolly([1.8, BELFRY_Y + 1.8, TOWER_Z - 5.2], [0.4, BELFRY_Y + 1.9, TOWER_Z - 0.5], pushK(f, 105, 0.003), { fov: 35, roll: 0.035 });

// Shot 2 (167..308, Setting 1859 Westminster): High sweeping town & river aerial -> closer to the grand new Clock Tower ("pride and joy")
const S2a = (f: number) => zoom([18, 15.5, -44], [0, 12.5, 16], 44, pushK(f, 167, 0.002));
const S2b = (f: number) => zoom([11, 14.0, -28], [0, 14.0, 26], 41, pushK(f, 215, 0.002));
const S2c = (f: number) => zoom([5.5, 14.5, -12], [0, 16.5, TOWER_Z], 38, pushK(f, 255, 0.0018, 0.006, 35));

// Shot 3 (308..457, Hauling the 13-ton bell): Low angle on workers hauling ropes at tower base -> tilt up to gleaming bronze giant rising
const S3a = (f: number) => dolly([-4.2, D0 + 1.65, 16.5], [0, D0 + 1.85, 27.5], pushK(f, 308, 0.0025), { fov: 42 });
const S3b = (f: number) => dolly([-3.4, D0 + 2.10, 18.5], [0, D0 + 3.60, 28.0], pushK(f, 355, 0.0022, 0.005, 32), { fov: 40, roll: -0.025 });

// Shot 4 (457..555, Makers warn): Belfry MS of Whitechapel Foundry Master holding modest gentle hammer & warning diagram
const S4a = (f: number) => dolly([0.1, BELFRY_Y + 1.68, TOWER_Z - 5.4], [-0.05, BELFRY_Y + 1.55, TOWER_Z - 1.90], pushK(f, 457, 0.0020), { fov: 38 });
const S4b = (f: number) => dolly([0.0, BELFRY_Y + 1.65, TOWER_Z - 4.7], [-0.05, BELFRY_Y + 1.52, TOWER_Z - 1.90], pushK(f, 510, 0.0018, 0.0045, 28), { fov: 36, roll: -0.03 });

// Shot 5 (555..663, Stubborn Edmund Denison): MS on Edmund Denison in tall top hat -> punch closer on "louder is always better"
const S5a = (f: number) => dolly([2.1, BELFRY_Y + 1.75, TOWER_Z - 5.4], [1.2, BELFRY_Y + 1.68, TOWER_Z - 1.2], pushK(f, 555, 0.0025), { fov: 36 });
const S5b = (f: number) => dolly([1.8, BELFRY_Y + 1.78, TOWER_Z - 4.4], [1.3, BELFRY_Y + 1.72, TOWER_Z - 1.2], pushK(f, 604, 0.0025, 0.006, 30), { fov: 33, roll: 0.04 });

// Shot 6 (663..791, Monster Iron Hammer): CU on the giant 700-lb iron hammer -> wider belfry angle as it swings & slams at 25.80s (f=774)
const S6a = (f: number) => dolly([-1.9, BELFRY_Y + 1.75, TOWER_Z - 4.8], [-1.3, BELL_Y - 0.5, TOWER_Z], pushK(f, 663, 0.0025), { fov: 35 });
const S6b = (f: number) => dolly([-2.0, BELFRY_Y + 1.95, TOWER_Z - 5.6], [-0.6, BELL_Y - 0.3, TOWER_Z], pushK(f, 725, 0.0022, 0.005, 30), { fov: 38, roll: -0.03 });

// Shot 7 (791..940, Rattling Hats on the Bridge): Bridge crowd with Clock Tower behind -> MS of hats rattling on the slams -> cheering crowd
const S7a = (f: number) => zoom([-3.2, D0 + 2.0, -4.0], [0, D0 + 6.5, 24.0], 44, pushK(f, 791, 0.002), { roll: -0.025 });
const S7b = (f: number) => dolly([1.8, D0 + 1.75, 4.5], [0, D0 + 1.85, 13.5], pushK(f, 842, 0.0028, 0.005, 28), { fov: 38, roll: 0.025 });
const S7c = (f: number) => dolly([-1.4, D0 + 1.70, 6.5], [0, D0 + 1.80, 14.0], pushK(f, 895, 0.0025), { fov: 36 });

// Shot 8 (940..1064, Four-Foot Crack): Tight on the Great Bell sound-bow -> SNAP at f=1007 (33.58s) -> pull back to reveal 4-foot fissure
const S8a = (f: number) => dolly([-1.6, BELFRY_Y + 1.80, TOWER_Z - 4.6], [-0.6, BELL_Y - 0.4, TOWER_Z], pushK(f, 940, 0.0022, 0.005, 35), { fov: 34 });
const S8b = (f: number) => {
  const u = glide((f - 1007) / 24);
  return {
    pos: [-1.7 - 0.3 * u, BELFRY_Y + 1.85 + 0.15 * u, TOWER_Z - 4.8 - 0.8 * u] as V3,
    look: [-0.5 + 0.2 * u, BELL_Y - 0.35 + 0.15 * u, TOWER_Z] as V3,
    fov: 36,
    roll: 0.04,
  };
};

// Shots 9-10 (1064..1269, "Luckily..." / "Unluckily..."): Shared belfry camera — intact yoke overhead, then push in on deadpan silent duo
const S9a = (f: number) => dolly([0.0, BELFRY_Y + 1.75, TOWER_Z - 5.8], [0.0, BELL_Y - 0.3, TOWER_Z], pushK(f, 1064, 0.0018), { fov: 38, roll: -0.025 });
const S10a = (f: number) => dolly([0.0, BELFRY_Y + 1.65, TOWER_Z - 5.2], [0.0, BELFRY_Y + 1.65, TOWER_Z - 1.85], pushK(f, 1158, 0.0018), { fov: 36, roll: 0.03 });

// Shot 11 (1269..1397, Golden Physics of Bronze): Golden-hour belfry side-profile showing the bronze rim flexing like a stiff spring
const S11a = (f: number) => zoom([-1.8, BELFRY_Y + 1.90, TOWER_Z - 5.4], [-0.3, BELL_Y - 0.3, TOWER_Z], 38, pushK(f, 1265, 0.0018));

// Shot 12 (1397..1589, Golden Park Analogy — Glass, Spoon & Heavy Ladle):
// S12a: gentle spoon taps (47.85s, 49.20s) -> S12b: heavy ladle slam (50.69s) & glass split (51.56s)
const S12a = (f: number) => dolly([PARK[0] + 0.2, D0 + 1.60, PARK[2] - 5.6], [PARK[0], D0 + 1.40, PARK[2]], pushK(f, 1393, 0.0012), { fov: 40 });
const S12b = (f: number) => dolly([PARK[0] - 0.5, D0 + 1.62, PARK[2] - 4.8], [PARK[0], D0 + 1.38, PARK[2]], pushK(f, 1485, 0.0015, 0.004, 28), { fov: 38, roll: 0.025 });

// Shot 13 (1589..1695, Golden Analogy Payoff): Close golden angle on monster hammer & cracked bronze flank
const S13a = (f: number) => dolly([-1.8, BELFRY_Y + 1.90, TOWER_Z - 5.4], [-0.4, BELL_Y - 0.3, TOWER_Z], pushK(f, 1585, 0.002), { fov: 37 });
const S13b = (f: number) => dolly([-1.6, BELFRY_Y + 1.80, TOWER_Z - 4.6], [-0.6, BELL_Y - 0.35, TOWER_Z], pushK(f, 1635, 0.0025), { fov: 35, roll: -0.03 });

// Shot 14 (1695..1893, The Fix — Quarter-Turn + Square Notch + Lighter Hammer):
// S14a: Workers rotate the bell 90 deg (59.0s) -> S14b: Foundry Master chisels square notch (61.2s) & hangs lighter hammer (62.2s)
const S14a = (f: number) => dolly([-1.8, BELFRY_Y + 1.85, TOWER_Z - 5.6], [0.0, BELL_Y - 0.3, TOWER_Z], pushK(f, 1691, 0.002), { fov: 38 });
const S14b = (f: number) => zoom([-1.4, BELFRY_Y + 1.75, TOWER_Z - 4.8], [-0.2, BELL_Y - 0.35, TOWER_Z - 0.8], 36, pushK(f, 1795, 0.0022, 0.004, 24));

// Shot 15 (1893..2025, Callback Twist): Close on the rotated cracked bell chiming with the lighter hammer -> crane pullback over Westminster Bridge
const S15a = (f: number) => dolly([-1.6, BELFRY_Y + 1.85, TOWER_Z - 5.4], [0.0, BELL_Y - 0.3, TOWER_Z], pushK(f, 1889, 0.0022), { fov: 36 });
const S15b = (f: number) => dolly([1.6, D0 + 1.75, -10.5], [0, D0 + 2.2, 6.0], pushK(f, 1930, 0.002, 0.0055, 30), { fov: 38 });
const CRANE: V3[] = [[0, 17, -14], [15, 15, -40], [0, 10, 14]];
const S15c = (f: number): Shot => {
  const a = S15b(1960), s = glide((f - 1960) / 65), r = 1 - s, [C, B, L] = CRANE;
  return {
    pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C[i] + s * s * B[i]) as V3,
    look: [0, 1, 2].map((i) => a.look[i] + (L[i] - a.look[i]) * s) as V3,
    fov: (a.fov ?? 38) + (43 - (a.fov ?? 38)) * s,
    roll: 0,
  };
};

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 28, dur: 28, s: S1b },  // centred on f=40 ("cracked wide open")
    { f: 105, dur: 30, s: S1c }, // centred on f=120..143 ("wanted it louder")
  ],
  2: [
    { f: 167, s: S2a },
    { f: 215, dur: 20, s: S2b },
    { f: 255, dur: 20, s: S2c }, // punch on "pride and joy" (f=263)
  ],
  3: [
    { f: 308, s: S3a },
    { f: 355, dur: 34, s: S3b }, // glide up with the hoisted 13-ton bronze giant
  ],
  4: [
    { f: 457, s: S4a },
    { f: 510, cut: true, s: S4b }, // cut on "gentle hammer" (f=530)
    { f: 510, dur: 20, s: rolled(S4b, 0.03) },
  ],
  5: [
    { f: 555, s: S5a },
    { f: 604, dur: 20, s: S5b }, // centred on "Edmund Denison" / "louder is always better"
    { f: 628, dur: 20, s: rolled(S5b, -0.035) },
  ],
  6: [
    { f: 663, s: S6a },
    { f: 725, cut: true, s: S6b }, // cut to full hammer swing before strike at f=774 (25.80s)
  ],
  7: [
    { f: 791, s: S7a },
    { f: 842, cut: true, s: S7b }, // cut on "rattling hats" (f=856)
    { f: 895, cut: true, s: S7c }, // cut on "crowd cheers" (f=918)
  ],
  8: [
    { f: 940, s: S8a },
    { f: 1007, cut: true, s: S8b }, // cut + kick on SNAP ("four-foot crack rips up its side")
  ],
  9: [
    { f: 1064, s: S9a },
    { f: 1158, dur: 18, s: S10a }, // smooth glide across invisible 9 -> 10 cut on "Unluckily"
  ],
  11: [{ f: 1265, s: S11a }],
  12: [
    { f: 1393, s: S12a },
    { f: 1485, dur: 24, s: S12b }, // glide in for "Slam it with a heavy ladle" (f=1521)
  ],
  13: [
    { f: 1585, s: S13a },
    { f: 1635, cut: true, s: S13b }, // cut on "harder than the metal could flex" (f=1645)
  ],
  14: [
    { f: 1691, s: S14a },
    { f: 1795, cut: true, s: S14b }, // cut to close-medium for square notch chiseling & lighter hammer
  ],
  15: [
    { f: 1889, s: S15a },          // starts on the chiming rotated bell in the belfry
    { f: 1930, cut: true, s: S15b }, // cuts to Londoners on Westminster Bridge as the chime rings out
    { f: 1960, cut: true, s: S15c }, // crane pull-out over the bridge and Clock Tower
  ],
};
CAMS[10] = CAMS[9];

// Impact kicks (reference v14): image offset flips sign every frame (~3 px at 720p per unit), decays in 7 f
const KICKS: [number, number][] = [
  [1.32, 1.1],     // Shot 1: "cracked" hammer strike
  [4.78, 0.8],     // Shot 1: "louder" hammer strike
  [25.80, 1.2],    // Shot 6: "massive strike"
  [27.78, 1.1],    // Shot 7: "slams the bronze"
  [29.50, 0.9],    // Shot 7: second hourly slam
  [SNAP, 1.6],     // Shot 8: 4-FOOT CRACK RIPS UP ITS SIDE (33.58s)
  [LADLE_SLAM, 0.9], // Shot 12: heavy ladle slams glass (50.69s)
  [54.83, 1.0],    // Shot 13: "hit the bronze harder"
  [HITS[0], 0.55], // Shot 14: chisel notch blow 1 (60.80s)
  [HITS[1], 0.65], // Shot 14: chisel notch blow 2 (61.22s)
  [HITS[2], 0.55], // Shot 14: chisel notch blow 3 (61.65s)
];

export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};

export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0,    cInf: 10, focus: (f) => [f >= 105 ? 0.55 : -0.4, BELFRY_Y + 1.8, TOWER_Z - (f >= 105 ? 1.55 : 1.40)] }, // Shot 1 hook: front of bell -> Denison
  { f: 167,  cInf: 0 },                                                      // Shot 2 town aerial: all sharp
  { f: 308,  cInf: 0 },                                                      // Shot 3 bell hoist: all sharp
  { f: 457,  cInf: 9,  focus: () => [-0.85, BELFRY_Y + 1.6, TOWER_Z - 1.5] }, // Shot 4 Foundry Master & diagram MS
  { f: 555,  cInf: 12, focus: () => [1.3, BELFRY_Y + 1.7, TOWER_Z - 1.25] },  // Shot 5 Edmund Denison CU
  { f: 663,  cInf: 8,  focus: () => [-1.4, BELL_Y - 0.5, TOWER_Z - 1.2] },   // Shot 6 monster hammer CU
  { f: 725,  cInf: 0 },                                                      // Shot 6 wide swing & Shot 7 bridge crowd: sharp
  { f: 940,  cInf: 10, focus: () => [-0.5, BELL_Y - 0.4, TOWER_Z - 1.35] },  // Shot 8 4-foot crack insert on front bell wall
  { f: 1064, cInf: 0 },                                                      // Shot 9 wide belfry yoke: sharp
  { f: 1162, cInf: 10, focus: () => [0.1, BELFRY_Y + 1.65, TOWER_Z - 1.30] }, // Shot 10 deadpan silent duo MS
  { f: 1269, cInf: 6,  focus: () => [-0.4, BELL_Y - 0.3, TOWER_Z - 1.35] },  // Shot 11 golden bronze spring flex
  { f: 1397, cInf: 9,  focus: () => [PARK[0], D0 + 1.35, PARK[2]] },         // Shot 12 park glass & spoon/ladle table
  { f: 1589, cInf: 9,  focus: () => [-0.6, BELL_Y - 0.3, TOWER_Z - 1.35] },  // Shot 13 monster hammer payoff
  { f: 1695, cInf: 0 },                                                      // Shot 14 quarter-turn wide: sharp
  { f: 1795, cInf: 9,  focus: () => [-0.4, BELL_Y - 0.4, TOWER_Z - 1.35] },  // Shot 14 square notch chiseling MS
  { f: 1893, cInf: 0 },                                                      // Shot 15 chiming pullback: all sharp
];

export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

/** Near foreground framing silhouettes (0.3-0.5 x focus distance, soft edge framing, never blocking faces) */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  // Shot 3 bell hoist at tower base: a wooden cart in the bottom-left foreground
  { a: 308, b: 457, kit: "cart", pos: [-3.6, D0, 20.8], s: 0.9, yaw: 0.5 },
  // Shot 12 park table analogy: a detailed bush in the bottom-right foreground
  { a: 1397, b: 1589, kit: "plant_bushDetailed", pos: [69.7, D0, -78.8], s: 1.15, yaw: 0.4 },
];
