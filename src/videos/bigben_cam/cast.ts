// Our 1859 Westminster cast as lit flat sprites in the 3D world: Edmund Beckett Denison (OFFICER),
// Whitechapel Foundry Master (FOUNDRY_MASTER), Victorian Bell-Workers (SOLDIER), London Townsfolk (FOLK),
// and the Park Parent & Kid (PARENT, KID).
// Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, swingKid, soldier, townsfolk, OFFICER, FOUNDRY_MASTER, KID, PARENT,
  fxNote, fxBurst, fxSplash, fxStars, fxCreak, fxRing, fxShadow, fxContact,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, PARK, SHOTS, SNAP, DROP1, TOWER_Z, BELFRY_Y, BELL_Y,
  STRIKES, CHIMES, SPOON_TAPS, LADLE_SLAM, GLASS_SPLIT, HITS,
  V3, smooth, clamp01, BridgeState,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0;
    }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const WORKER = [0, 1, 2, 3].map((v) => soldier(v));
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
const FOLK_BARE = [0, 1, 2, 3, 4, 5].map((v) => ({ ...townsfolk(v), hat: v % 2 ? "bonnet" : null }));
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [720, 1200, 1.2] : d < 6.5 ? [540, 900, 0.9] : d < 16 ? [360, 600, 0.6] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {
  1: [1.32, 4.78],
  4: [15.70, 17.67],
  5: [19.59, 21.08],
  6: [23.05, 25.80],
  7: [27.78, 28.54, 30.60],
  8: [SNAP],
  12: [47.85, 50.69, 51.56],
  14: [59.04, 61.22, 62.19],
};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

// ---------------- ground contact & cast shadows ----------------
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

export type Stage = { places: Place[]; fx: FxPlace[] };

// Warning diagram board location on the Belfry gallery floor (Shots 4 & 5)
export const SIGN_AT: V3 = [-0.62, BELFRY_Y, TOWER_Z - 1.95];

const DENISON_WHO: Who = { i: 99, o: OFFICER, okey: "denison" };
const MASTER_WHO: Who = { i: 88, o: FOUNDRY_MASTER, okey: "master" };

/** Bouncing top-hat sprite for Shot 7 ("rattling hats on the bridge") */
const tophatAlone = (p: Pen) => {
  p.poly([[48, 160], [152, 160], [160, 42], [40, 42]], "#2e2a36", 8);
  p.poly([[42, 134], [158, 134], [158, 152], [42, 152]], "#7b2d42", 6);
  p.ell(100, 160, 74, 12, "#1d1b22", 8);
};

/** Hammer / Chisel strike envelope: 0 = raised, 1 = struck */
const hammerK = (t: number, hits: number[]) => {
  let k = 1;
  for (const th of hits) {
    const n = (t - th) * FPS;
    if (n >= -11 && n < -7) k = Math.min(k, 1 - smooth((n + 11) / 4));
    else if (n >= -7 && n < 0) k = 0;
  }
  return k;
};

/** Helper to emit floating musical notes from a 3D point */
const emitNotes = (t: number, t0: number, x: number, y: number, z: number, cam: CamInfo, out: Stage, count = 4) => {
  if (t < t0) return;
  for (let n = 0; n < count; n++) {
    const age = ((t - t0 + n * 0.38) % 1.52) / 1.52;
    const pop = Math.min(1, age * 7) * (age > 0.80 ? (1 - age) / 0.20 : 1);
    if (pop <= 0.02) continue;
    const kind = n % 2, side = 0.18 + 0.38 * age + 0.06 * Math.sin(age * 9 + n);
    out.fx.push({
      key: `note${kind}`, cw: 220, ch: 260, draw: (p) => fxNote(p, kind),
      x: x + cam.right.x * side * (n % 2 ? 1 : -1),
      y: y + 0.25 + 0.95 * age,
      z: z - 0.2,
      w: 0.22 * pop, h: 0.26 * pop, rot: 0.28 * Math.sin(age * 6 + n),
    });
  }
};

/** Townsfolk along the quays for wide shots (Shots 2, 7, 15) */
const CHEER: [number, number][] = [[8.60 - LEAD, 10.25], [30.30 - LEAD, 31.33], [64.40 - LEAD, 67.50]];
const townsfolkAt = (cam: CamInfo, t: number, out: Stage) => {
  const spots: [number, number][] = [];
  for (let i = 0; i < 24; i++) {
    const bank = i < 12 ? -1 : 1, k = i % 12, sx = k % 2 ? 1 : -1;
    spots.push([sx * (5.4 + (k >> 1) * 1.8 + hh(i) * 0.6), bank * (31.6 + hh(i, 2) * 3.0)]);
  }
  const on = CHEER.some(([a, b]) => t >= a && t < b);
  spots.forEach(([x, z], i) => {
    const kid = i % 5 === 2, o = kid ? KID : FOLK[i % 6], hop = kid && on ? Math.max(0, Math.sin(t * 7 + i)) * 0.18 : 0;
    const who: Who = { i: i + 200, o, okey: kid ? "kid" : `f${i % 6}` };
    const expr: Expr = (["smile", "grin", "laugh", "smile_closed"] as Expr[])[i % 4];
    const fo: FrontOpts = { mode: "stand", expr, wave: i % 3 === 2 || !on ? undefined : q(Math.sin(t * 9 + i * 1.3), 30), blink: lidAt(t, i + 40) };
    out.places.push(person(cam, who, x, D0 + hop, z, { side: false, mirror: false }, fo, {}, kid ? 0.72 : 1));
    blob(out, x, D0, z, kid ? 0.72 : 1, hop > 0 ? 0.6 : 1);
  });
};

// ---------------- Shot-by-Shot Staging ----------------
export const stage = (id: number, t: number, b: BridgeState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (s.towns) townsfolkAt(cam, t, out);

  // ── SHOT 1 (0..5.57s): Hook in Belfry — Big Ben strikes & cracks wide open ("wanted it louder") ──
  if (id === 1) {
    const cracked = t >= 1.32 - LEAD;
    const louder = t >= 4.40 - LEAD;
    // Foundry Master on the +x side (screen-left, clear of the monster hammer at -x), shocked when the bell cracks at t = 1.32s
    const mExpr: Expr = cracked ? "shock" : "nervous";
    out.places.push(person(cam, MASTER_WHO, 1.55, BELFRY_Y, TOWER_Z - 1.35, { side: false, mirror: false },
      { mode: "stand", expr: mExpr, facing: -1, blink: lidAt(t, 88, SWAPS[1]) }, {}));
    blob(out, 1.55, BELFRY_Y, TOWER_Z - 1.35);

    // Edmund Denison at x = 0.55..2.45 (framed in S1a & S1c), grinning & commanding "louder!"
    const dExpr: Expr = louder ? "laugh" : "grin";
    const dWave = louder ? q(Math.sin(t * 10), 30) : undefined;
    const dx = t >= 3.4 ? 0.55 : 2.55;
    out.places.push(person(cam, DENISON_WHO, dx, BELFRY_Y, TOWER_Z - 1.55, { side: false, mirror: false },
      { mode: "stand", expr: dExpr, wave: dWave, facing: -1, blink: lidAt(t, 99, SWAPS[1]) }, {}));
    blob(out, dx, BELFRY_Y, TOWER_Z - 1.55, 1.05);

    // Two bell-workers flanking in the belfry (clear of hammer at -2.65)
    for (const [wx, wz, wi] of [[-3.35, TOWER_Z - 0.85, 1], [3.15, TOWER_Z - 0.85, 2]] as const) {
      out.places.push(person(cam, { i: wi, o: WORKER[wi], okey: `w${wi}` }, wx, BELFRY_Y, wz, { side: false, mirror: false },
        { mode: "stand", expr: cracked ? "shock" : "neutral", facing: wx < 0 ? 1 : -1, blink: lidAt(t, wi, SWAPS[1]) }, {}));
      blob(out, wx, BELFRY_Y, wz);
    }
    // Impact spark burst at t = 1.32s and t = 4.78s
    for (const st of [1.32, 4.78]) {
      if (t >= st && t < st + 0.35) {
        const u = (t - st) / 0.35;
        out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: -1.55, y: BELL_Y - 0.85, z: TOWER_Z - 0.3, w: 1.25, h: 1.25 });
      }
    }
  }

  // ── SHOT 2 (5.57..10.27s): Setting 1859 Westminster — Londoners on Westminster Bridge & Belfry crew ──
  if (id === 2) {
    const cheerOn = t >= 8.60 - LEAD;
    for (let i = 0; i < 16; i++) {
      const x = ((i % 2 ? 1 : -1) * (0.9 + (i % 3) * 0.45)), z = -18 + i * 2.6;
      const who: Who = { i: i + 50, o: FOLK[i % 6], okey: `f${i % 6}` };
      const fo: FrontOpts = { mode: "stroll", phase: q((t * 0.55 + i * 0.17) % 1, 60), expr: cheerOn ? "grin" : "smile",
        wave: cheerOn && i % 2 === 0 ? q(Math.sin(t * 9 + i), 30) : undefined, blink: lidAt(t, i + 50) };
      out.places.push(person(cam, who, x, D0, z, { side: false, mirror: false }, fo, {}));
      blob(out, x, D0, z);
    }
    out.places.push(person(cam, DENISON_WHO, 1.6, BELFRY_Y, TOWER_Z - 1.2, { side: false, mirror: false },
      { mode: "stand", expr: "grin", blink: lidAt(t, 99) }, {}));
    out.places.push(person(cam, MASTER_WHO, -1.6, BELFRY_Y, TOWER_Z - 1.2, { side: false, mirror: false },
      { mode: "stand", expr: "smile", blink: lidAt(t, 88) }, {}));
  }

  // ── SHOT 3 (10.27..15.23s): Hauling the 13-Ton Bell up the Tower Hoist ──
  if (id === 3) {
    const ph = ((t * 1.15) % 1 + 1) % 1;
    // 6 Victorian workmen hauling the hoist ropes in rhythm at the base of the Clock Tower
    const haulSpots: [number, number][] = [
      [-1.35, 23.2], [-1.35, 24.8], [-1.35, 26.4],
      [ 1.35, 23.2], [ 1.35, 24.8], [ 1.35, 26.4],
    ];
    haulSpots.forEach(([x, z], i) => {
      const v = i % 4, who: Who = { i: i + 10, o: WORKER[v], okey: `w${v}` };
      const fo: FrontOpts = { mode: "march", phase: ph, expr: i % 2 ? "stern" : "pained", lift: 42, tilt: (x < 0 ? -6 : 6), blink: lidAt(t, i + 10) };
      out.places.push(person(cam, who, x, D0, z, { side: false, mirror: false }, fo, {}));
      blob(out, x, D0, z);
    });
    // Foundry Master directing the hoist
    out.places.push(person(cam, MASTER_WHO, -2.35, D0, 24.4, { side: false, mirror: false },
      { mode: "stand", expr: "stern", wave: q(Math.sin(t * 5), 30), facing: 1, blink: lidAt(t, 88) }, {}));
    blob(out, -2.35, D0, 24.4);
  }

  // ── SHOT 4 (15.23..18.50s): Makers Warn — Foundry Master with Gentle Hammer & Warning Board ──
  if (id === 4) {
    const gentleBeat = t >= 17.40 - LEAD;
    // Foundry Master stands on screen-left (+x = 0.58, z = TOWER_Z - 1.85, in front of the bell) holding the gentle hammer beside the warning sign at SIGN_AT (-0.62)
    const hPose = gentleBeat ? q(0.35 + 0.25 * Math.sin(t * 8), 30) : 0.25;
    out.places.push(person(cam, MASTER_WHO, 0.58, BELFRY_Y, TOWER_Z - 1.85, { side: false, mirror: false },
      { mode: "stand", expr: gentleBeat ? "nervous" : "stern", prop: ["hammer", hPose], facing: -1, blink: lidAt(t, 88, SWAPS[4]) }, {}));
    blob(out, 0.58, BELFRY_Y, TOWER_Z - 1.85);

    // Assistant founder by the warning board
    out.places.push(person(cam, { i: 12, o: WORKER[1], okey: "w1" }, 1.65, BELFRY_Y, TOWER_Z - 1.75, { side: false, mirror: false },
      { mode: "stand", expr: "nervous", facing: -1, blink: lidAt(t, 12, SWAPS[4]) }, {}));
    blob(out, 1.65, BELFRY_Y, TOWER_Z - 1.75);

    // Denison on the right, unimpressed
    out.places.push(person(cam, DENISON_WHO, 2.35, BELFRY_Y, TOWER_Z - 1.65, { side: false, mirror: false },
      { mode: "stand", expr: "stern", facing: -1, blink: lidAt(t, 99, SWAPS[4]) }, {}));
    blob(out, 2.35, BELFRY_Y, TOWER_Z - 1.65, 1.05);
  }

  // ── SHOT 5 (18.50..22.10s): Stubborn Edmund Denison — "louder is always better" ──
  if (id === 5) {
    const louder = t >= 20.45 - LEAD;
    const best = t >= 21.08 - LEAD;
    const dExpr: Expr = best ? "laugh" : louder ? "grin" : "stern";
    const dWave = louder ? q(Math.sin(t * 9), 30) : undefined;
    out.places.push(person(cam, DENISON_WHO, 1.30, BELFRY_Y, TOWER_Z - 1.25, { side: false, mirror: false },
      { mode: "stand", expr: dExpr, wave: dWave, facing: -1, headTilt: louder ? 5 : -3, blink: lidAt(t, 99, SWAPS[5]) }, {}));
    blob(out, 1.30, BELFRY_Y, TOWER_Z - 1.25, 1.08);

    // Foundry Master in background shaking head / nervous
    out.places.push(person(cam, MASTER_WHO, -0.35, BELFRY_Y, TOWER_Z - 1.35, { side: false, mirror: false },
      { mode: "stand", expr: "nervous", facing: 1, blink: lidAt(t, 88, SWAPS[5]) }, {}));
    blob(out, -0.35, BELFRY_Y, TOWER_Z - 1.35);
  }

  // ── SHOT 6 (22.10..26.37s): Monster Iron Hammer — "rigs it to swing with a massive strike" ──
  if (id === 6) {
    const struck = t >= 25.80 - LEAD;
    out.places.push(person(cam, DENISON_WHO, 1.55, BELFRY_Y, TOWER_Z - 1.15, { side: false, mirror: false },
      { mode: "stand", expr: struck ? "laugh" : "grin", wave: struck ? q(Math.sin(t * 10), 30) : undefined, facing: -1, blink: lidAt(t, 99, SWAPS[6]) }, {}));
    blob(out, 1.55, BELFRY_Y, TOWER_Z - 1.15, 1.05);

    out.places.push(person(cam, MASTER_WHO, 2.55, BELFRY_Y, TOWER_Z - 1.35, { side: false, mirror: false },
      { mode: "stand", expr: struck ? "shock" : "nervous", facing: -1, blink: lidAt(t, 88, SWAPS[6]) }, {}));
    blob(out, 2.55, BELFRY_Y, TOWER_Z - 1.35);

    out.places.push(person(cam, { i: 14, o: WORKER[0], okey: "w0" }, -3.35, BELFRY_Y, TOWER_Z - 0.90, { side: false, mirror: false },
      { mode: "stand", expr: struck ? "shock" : "stern", facing: 1, blink: lidAt(t, 14, SWAPS[6]) }, {}));
    blob(out, -3.35, BELFRY_Y, TOWER_Z - 0.90);

    if (t >= 25.80 && t < 26.20) {
      const u = (t - 25.80) / 0.40;
      out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: -1.55, y: BELL_Y - 0.85, z: TOWER_Z - 0.3, w: 1.35, h: 1.35 });
    }
  }

  // ── SHOT 7 (26.37..31.33s): Hourly Strikes Rattle Hats on Westminster Bridge while Crowd Cheers ──
  if (id === 7) {
    // Hat rattle envelope triggered by the giant strikes at 27.78s ("slams") and 29.50s ("rattling hats")
    let hatBounce = 0;
    for (const st of [27.78, 28.54, 29.50]) {
      const dt = t - st;
      if (dt >= 0 && dt < 0.72) hatBounce = Math.max(hatBounce, Math.sin((dt / 0.72) * Math.PI));
    }
    const cheering = t >= 30.20 - LEAD;
    for (let i = 0; i < 16; i++) {
      const row = i >> 1, side = i % 2 ? 1 : -1;
      const x = side * (0.65 + (i % 3) * 0.48) + (hh(i) - 0.5) * 0.25;
      const z = 9.0 + row * 1.65;
      const hasTophat = (i % 2 === 0);
      const popH = hasTophat ? hatBounce * (0.28 + 0.14 * (i % 3)) : 0;
      const who: Who = {
        i: i + 60,
        o: popH > 0.04 ? FOLK_BARE[i % 6] : FOLK[i % 6],
        okey: popH > 0.04 ? `fb${i % 6}` : `f${i % 6}`,
      };
      const expr: Expr = cheering ? (i % 2 ? "laugh" : "grin") : hatBounce > 0.15 ? "shock" : "smile";
      const wave = cheering ? q(Math.sin(t * 10 + i), 30) : undefined;
      out.places.push(person(cam, who, x, D0 + hatBounce * 0.06, z, { side: false, mirror: false },
        { mode: "stand", expr, wave, blink: lidAt(t, i + 60, SWAPS[7]) }, {}));
      blob(out, x, D0, z);

      // Floating/rattling top-hat sprite above the gentleman's head!
      if (popH > 0.04) {
        out.fx.push({
          key: "tophat", cw: 200, ch: 200, draw: tophatAlone,
          x: x + Math.sin(t * 28 + i) * 0.06,
          y: D0 + 2.02 + popH,
          z: z - 0.08,
          w: 0.44, h: 0.44,
          rot: Math.sin(t * 24 + i) * 0.35,
        });
      }
    }
  }

  // ── SHOT 8 (31.33..35.47s): The Snap — "a four-foot crack rips up its side" (SNAP = 33.58s) ──
  if (id === 8) {
    const snapped = t >= SNAP - LEAD;
    const jolt = t >= SNAP && t < SNAP + 0.55;
    // Foundry Master & Denison on +x (screen-left) recoil in shock when the 4-foot crack rips up the bronze flank
    out.places.push(person(cam, MASTER_WHO, 0.85, BELFRY_Y + (jolt ? 0.14 : 0), TOWER_Z - 1.80, { side: false, mirror: false },
      { mode: jolt ? "fall" : "stand", expr: snapped ? "shock" : "nervous", facing: -1, tilt: jolt ? -14 : 0, blink: lidAt(t, 88, SWAPS[8]) }, {}));
    blob(out, 0.85, BELFRY_Y, TOWER_Z - 1.80);

    out.places.push(person(cam, DENISON_WHO, 1.85, BELFRY_Y + (jolt ? 0.12 : 0), TOWER_Z - 1.75, { side: false, mirror: false },
      { mode: jolt ? "fall" : "stand", expr: snapped ? "shock" : "grin", facing: -1, tilt: jolt ? 14 : 0, blink: lidAt(t, 99, SWAPS[8]) }, {}));
    blob(out, 1.85, BELFRY_Y, TOWER_Z - 1.75, 1.05);
  }

  // ── SHOT 9 (35.47..38.73s): Deadpan 1 ("Luckily, the thirteen-ton bell doesn't crash through the tower floor") ──
  if (id === 9) {
    out.places.push(person(cam, MASTER_WHO, -1.15, BELFRY_Y, TOWER_Z - 1.80, { side: false, mirror: false },
      { mode: "stand", expr: "relief", facing: 1, blink: lidAt(t, 88) }, {}));
    blob(out, -1.15, BELFRY_Y, TOWER_Z - 1.80);

    out.places.push(person(cam, DENISON_WHO, 1.15, BELFRY_Y, TOWER_Z - 1.80, { side: false, mirror: false },
      { mode: "stand", expr: "relief_open", facing: -1, blink: lidAt(t, 99) }, {}));
    blob(out, 1.15, BELFRY_Y, TOWER_Z - 1.80, 1.05);

    for (const [wx, wi] of [[-2.15, 0], [2.15, 1]] as const) {
      out.places.push(person(cam, { i: wi + 20, o: WORKER[wi], okey: `w${wi}` }, wx, BELFRY_Y, TOWER_Z - 1.65, { side: false, mirror: false },
        { mode: "stand", expr: "relief", facing: wx < 0 ? 1 : -1, blink: lidAt(t, wi + 20) }, {}));
      blob(out, wx, BELFRY_Y, TOWER_Z - 1.65);
    }
  }

  // ── SHOT 10 (38.73..42.30s): Deadpan 2 ("Unluckily, London's brand-new voice goes dead silent...") ──
  if (id === 10) {
    // Slumped/sitting deadpan duo on the belfry floor in front of the cracked bell with circling stars overhead
    out.places.push(person(cam, MASTER_WHO, -0.52, BELFRY_Y, TOWER_Z - 1.85, { side: false, mirror: false },
      { mode: "sit", expr: "pained", facing: 1, blink: lidAt(t, 88) }, {}));
    blob(out, -0.52, BELFRY_Y, TOWER_Z - 1.85, 1.05, 0.8);

    out.places.push(person(cam, DENISON_WHO, 0.52, BELFRY_Y, TOWER_Z - 1.85, { side: false, mirror: false },
      { mode: "sit", expr: "dazed", facing: -1, blink: lidAt(t, 99) }, {}));
    blob(out, 0.52, BELFRY_Y, TOWER_Z - 1.85, 1.08, 0.8);

    const u = q((t * 0.9) % 1, 30);
    out.fx.push({ key: `stars${u}`, cw: 420, ch: 210, draw: (p) => fxStars(p, u), x: 0.52, y: BELFRY_Y + 1.35, z: TOWER_Z - 1.85, w: 0.78, h: 0.39 });
  }

  // ── SHOT 11 (42.30..46.57s, Golden): Physics of Bronze ("its metal bends in and out like a stiff spring") ──
  if (id === 11) {
    emitNotes(t, 43.20, -1.55, BELL_Y - 0.5, TOWER_Z - 0.4, cam, out, 3);
    creakFx(t, [[-1.65, BELL_Y - 0.85, TOWER_Z - 0.25], [1.65, BELL_Y - 0.85, TOWER_Z - 0.25]], out, 0.42);
  }

  // ── SHOT 12 (46.57..52.97s, Golden): Park Table Analogy — Drinking Glass, Silver Spoon & Heavy Iron Ladle ──
  if (id === 12) {
    const slamBeat = t >= LADLE_SLAM - LEAD;
    const splitBeat = t >= GLASS_SPLIT - LEAD;

    // Reach/tap motion for Parent on screen-left (+x = PARK[0] + 0.78) of the park table
    let reach = 0.25;
    for (const tp of [...SPOON_TAPS, LADLE_SLAM]) {
      const dt = t - tp;
      if (dt >= -0.25 && dt < 0.25) reach = Math.max(reach, 0.25 + 0.75 * Math.cos((dt / 0.25) * (Math.PI / 2)));
    }
    const pExpr: Expr = splitBeat ? "shock" : slamBeat ? "stern" : "smile";
    const so: SideOpts = { mode: "push", pose: q(reach, 30), expr: pExpr, blink: lidAt(t, 77, SWAPS[12]) };
    out.places.push({
      ...person(cam, { i: 77, o: PARENT, okey: "parent" }, PARK[0] + 0.78, D0, PARK[2] - 0.15, { side: true, mirror: false }, {}, so),
      mirror: false, yaw: 0,
    });
    blob(out, PARK[0] + 0.78, D0, PARK[2] - 0.15);

    // Kid watching eagerly on screen-right (-x = PARK[0] - 0.72) of the park table, then jumping in shock when the ladle splits the glass!
    const kExpr: Expr = splitBeat ? "shock" : slamBeat ? "nervous" : t >= 49.0 ? "laugh" : "grin";
    const kHop = splitBeat && t < GLASS_SPLIT + 0.45 ? Math.sin(((t - GLASS_SPLIT) / 0.45) * Math.PI) * 0.16 : 0;
    out.places.push(person(cam, { i: 78, o: KID, okey: "kid" }, PARK[0] - 0.72, D0 + kHop, PARK[2] - 0.15, { side: false, mirror: false },
      { mode: "stand", expr: kExpr, facing: 1, wave: splitBeat ? q(Math.sin(t * 14), 30) : undefined, blink: lidAt(t, 78, SWAPS[12]) }, {}, 0.78));
    blob(out, PARK[0] - 0.72, D0, PARK[2] - 0.15, 0.78);

    // Musical notes floating up from the humming glass after the gentle spoon taps (47.85s..50.50s)
    if (t >= 47.85 && t < 50.55) {
      emitNotes(t, 47.85, PARK[0], D0 + 1.55, PARK[2] - 0.15, cam, out, 3);
    }
    // Impact burst when heavy ladle slams (50.69s) and when rim splits (51.56s)
    for (const ev of [LADLE_SLAM, GLASS_SPLIT]) {
      if (t >= ev && t < ev + 0.32) {
        const u = (t - ev) / 0.32;
        out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: PARK[0] - 0.22, y: D0 + 1.58, z: PARK[2] - 0.35, w: 0.75, h: 0.75 });
      }
    }
  }

  // ── SHOT 13 (52.97..56.50s, Golden): Analogy Payoff — Monster Hammer Hit Harder Than Bronze Could Flex ──
  if (id === 13) {
    out.places.push(person(cam, MASTER_WHO, 0.95, BELFRY_Y, TOWER_Z - 1.80, { side: false, mirror: false },
      { mode: "stand", expr: "stern", facing: -1, blink: lidAt(t, 88) }, {}));
    blob(out, 0.95, BELFRY_Y, TOWER_Z - 1.80);

    out.places.push(person(cam, DENISON_WHO, 1.85, BELFRY_Y, TOWER_Z - 1.75, { side: false, mirror: false },
      { mode: "stand", expr: t >= 54.83 - LEAD ? "pained" : "nervous", facing: -1, blink: lidAt(t, 99) }, {}));
    blob(out, 1.85, BELFRY_Y, TOWER_Z - 1.75, 1.05);

    if (t >= 54.83 && t < 55.22) {
      const u = (t - 54.83) / 0.39;
      out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: -1.55, y: BELL_Y - 0.85, z: TOWER_Z - 0.3, w: 1.35, h: 1.35 });
    }
  }

  // ── SHOT 14 (56.50..63.10s, Day): The Fix — Quarter-Turn (59.0s) + Square Notch (61.2s) + Lighter Hammer (62.2s) ──
  if (id === 14) {
    const turning = t >= 58.40 && t < 60.20;
    const fixed = t >= 62.10 - LEAD;
    // Foundry Master on screen-left (+x = 0.55) chiseling the square notch at HITS = [60.80, 61.22, 61.65] without blocking the crack
    const hk = q(hammerK(t, HITS), 30);
    out.places.push(person(cam, MASTER_WHO, 0.55, BELFRY_Y, TOWER_Z - 1.80, { side: false, mirror: false },
      { mode: "stand", expr: fixed ? "grin" : "stern", prop: ["hammer", hk], facing: -1, blink: lidAt(t, 88, SWAPS[14]) }, {}));
    blob(out, 0.55, BELFRY_Y, TOWER_Z - 1.80);

    // Chisel spark bursts on the rotated crack notch
    for (const th of HITS) {
      if (t >= th && t < th + 5 / FPS) {
        const u = (t - th) / (5 / FPS);
        out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: -0.35, y: BELL_Y - 0.45, z: TOWER_Z - 1.50, w: 0.92, h: 0.92 });
      }
    }

    // Two bell-workers turning the bell yoke during 58.4..60.2s, then smiling in relief
    for (const [wx, wi] of [[-1.95, 0], [1.95, 1]] as const) {
      out.places.push(person(cam, { i: wi + 30, o: WORKER[wi], okey: `w${wi}` }, wx, BELFRY_Y, TOWER_Z - 1.65, { side: false, mirror: false },
        { mode: turning ? "march" : "stand", phase: q((t * 1.4) % 1, 40), expr: fixed ? "grin" : "smile",
          wave: fixed ? q(Math.sin(t * 8 + wi), 30) : undefined, facing: wx < 0 ? 1 : -1, blink: lidAt(t, wi + 30, SWAPS[14]) }, {}));
      blob(out, wx, BELFRY_Y, TOWER_Z - 1.65);
    }

    // Edmund Denison nodding approvingly
    out.places.push(person(cam, DENISON_WHO, 1.35, BELFRY_Y, TOWER_Z - 1.75, { side: false, mirror: false },
      { mode: "stand", expr: fixed ? "relief_open" : "smile", facing: -1, blink: lidAt(t, 99, SWAPS[14]) }, {}));
    blob(out, 1.35, BELFRY_Y, TOWER_Z - 1.75, 1.05);
  }

  // ── SHOT 15 (63.10..67.50s, Day): Callback Twist — Famous Chime of that Very Same Broken Bell ──
  if (id === 15) {
    // Inside the belfry (visible during S15a f=1893..1930 and in the background of the pullback)
    out.places.push(person(cam, MASTER_WHO, -1.65, BELFRY_Y, TOWER_Z - 1.15, { side: false, mirror: false },
      { mode: "stand", expr: "grin", wave: q(Math.sin(t * 8), 30), facing: 1, blink: lidAt(t, 88) }, {}));
    blob(out, -1.65, BELFRY_Y, TOWER_Z - 1.15);

    out.places.push(person(cam, DENISON_WHO, 1.65, BELFRY_Y, TOWER_Z - 1.15, { side: false, mirror: false },
      { mode: "stand", expr: "laugh", wave: q(Math.cos(t * 8), 30), facing: -1, blink: lidAt(t, 99) }, {}));
    blob(out, 1.65, BELFRY_Y, TOWER_Z - 1.15, 1.05);

    // Musical chime notes floating from the belfry on the lighter hammer chimes (64.55s, 66.20s)
    emitNotes(t, 63.40, -1.35, BELL_Y - 0.2, TOWER_Z - 0.8, cam, out, 4);

    // Strolling Londoners and tourists across Westminster Bridge (visible from f=1930..2025)
    const t0 = 63.10;
    for (let i = 0; i < 22; i++) {
      const sp = 0.55 + hh(i) * 0.45, z = -4 + (i / 22) * 26 + hh(i, 2) * 1.4 - sp * (t - t0), x = (hh(i, 3) - 0.5) * 4.0;
      const who: Who = { i: i + 100, o: FOLK[i % 6], okey: `f${i % 6}` };
      const prop = i % 7 === 3 ? "icecream" : null;
      const lick = prop === "icecream" && (t * 0.7 + hh(i, 4)) % 1 < 0.45;
      const expr: Expr = lick ? "lick" : (["smile", "smile_closed", "grin", "smile"] as Expr[])[i % 4];
      const phase = q(((t - t0) * sp / 1.4 + hh(i, 5)) % 1, 120);
      const look = Math.round(Math.sin(t * 0.8 + i * 1.7) * 1.2);
      const fo: FrontOpts = { mode: "stroll", phase, expr, look: Math.max(-1, Math.min(1, look)), prop, blink: lidAt(t, i + 100) };
      const view = viewOf(cam, x, z, 0, -1);
      const so: SideOpts = { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs };
      out.places.push(person(cam, who, x, D0, z, view, fo, so));
      blob(out, x, D0, z);
    }
  }

  return out;
};

// ---------------- one-off effects ----------------
export const snapFx = (tau: number, at: V3, out: Stage) => {
  if (tau >= SNAP && tau < SNAP + 0.48) {
    const u = (tau - SNAP) / 0.48;
    out.fx.push({ key: `bigburst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: at[0], y: at[1], z: at[2] - 0.25, w: 1.65, h: 1.65 });
  }
};
export const splashFx = (tau: number, out: Stage) => {
  const u = (tau - DROP1) / 1.1;
  if (u < 0 || u >= 1) return;
  for (const [x, z, s] of [[-2.9, -24, 1], [2.9, -21, 0.9]] as const)
    out.fx.push({ key: `splash${q(u, 30)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(u, 30)), x, y: 2.6 * s, z, w: 7 * s, h: 7 * s });
};
export const creakFx = (t: number, pts: V3[], out: Stage, size = 0.8) =>
  pts.forEach(([x, y, z], i) => {
    const u = q((t * 1.3 + i * 0.37) % 1, 30);
    out.fx.push({ key: `creak${u}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, u), x, y, z, w: size, h: size, rot: i * 0.6 - 0.6 });
  });
export { FPS };
