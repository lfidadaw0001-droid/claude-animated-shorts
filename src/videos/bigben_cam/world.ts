// The 1859 Westminster world as one Three.js scene: sky, River Thames, embankments, Victorian London town,
// Westminster Bridge, the grand Westminster Clock Tower (Elizabeth Tower) with open Gothic belfry, the 13.5-ton
// bronze Great Bell ("Big Ben") with its dynamic elastic flex, 4-foot jagged crack, quarter-turn rotation,
// square anti-crack notch, monster 700-lb iron hammer vs. sleek lighter hammer, tower hoist rig, park table with
// crystal drinking glass + spoon + heavy ladle analogy, chimney smoke, clouds, and the 2D flat-card cast.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, Strand, boxGeo, quad, V, lam, buildTown, flagTex, Kit, Ray, kitClone } from "./build";
import {
  beam, bed, rep, ctex, planksHD, beamHD, stoneHD, cobbleHD, grassHD, chainHD,
  waterNear, waterFar, cloudHD, bronzeBellHD, westminsterClockHD,
} from "./paint";
import { Pen, fxSign } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, snapFx, splashFx, creakFx, SIGN_AT, SU_SWING } from "./cast";
import {
  FPS, D0, SHOTS, PARK, ANCHOR, SNAP, TOWER_Z, BELFRY_Y, BELL_Y,
  STRIKES, CHIMES, SPOON_TAPS, LADLE_SLAM, GLASS_SPLIT,
  camAt, bridgeState, deckY, shapeZ, snapEnd, BridgeState, V3, smooth, clamp01, FOREGROUND, ShotDef,
} from "./story";

// ---------------- procedural prop kit (zero network 404s) ----------------
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) kitP = Promise.resolve({} as Kit);
  return kitP;
};

// ---------------- bridge geometry constants ----------------
const NZ = 121;
const ZS = Array.from({ length: NZ }, (_, j) => -30 + j * 0.5);
const POSTS = Array.from({ length: 41 }, (_, k) => -30 + k * 1.5);
const HANG = Array.from({ length: 35 }, (_, k) => -25.5 + k * 1.5);
const CZ = Array.from({ length: 73 }, (_, k) => -27 + k * 0.75);
const FLAGS = Array.from({ length: 47 }, (_, k) => -25.3 + k * 1.1);
const catY = (z: number) => 8.5 + 8.1 * (z / 27) ** 2;
export const chainY = (z: number, b: BridgeState) => catY(z) + b.bounce * shapeZ(z) * 0.12;
export const BOLT: V3 = [ANCHOR[0], ANCHOR[1], ANCHOR[2]];
const TOP = 16.6;

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 2: { az: 120 }, 11: { az: -55, el: 10 }, 12: { az: -30, el: 18 }, 13: { az: -50, el: 12 } };
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});

const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private swing: Actor;
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private deckTop: THREE.BufferGeometry; private deckSide: THREE.BufferGeometry;
  private posts: THREE.InstancedMesh; private hangers: THREE.InstancedMesh; private ribs: THREE.InstancedMesh; private bunting: THREE.InstancedMesh;
  private rails: Strand[] = []; private chains: Strand[] = []; private stays: Strand[] = [];
  private boltA: THREE.Mesh; private boltB: THREE.Mesh; private eye: THREE.Mesh;
  private flags: THREE.Mesh[] = [];
  private smoke: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; top: V3; k: number }[] = [];
  private clouds: THREE.Mesh[] = [];
  private sign = new THREE.Group();

  // ---- Big Ben & Westminster Clock Tower dynamic assemblies ----
  private bellGroup = new THREE.Group();
  private bellRimGroup = new THREE.Group();
  private crackGroup = new THREE.Group();
  private notchGroup = new THREE.Group();
  private monsterHammer = new THREE.Group();
  private lightHammer = new THREE.Group();
  private hoistGroup = new THREE.Group();
  private hoistBell = new THREE.Group();
  private soundRings: THREE.Mesh[] = [];

  // ---- Shot 12 Park Table Drinking-Glass / Spoon / Ladle Analogy ----
  private glassGroup = new THREE.Group();
  private glassCrack = new THREE.Group();
  private spoonGroup = new THREE.Group();
  private ladleGroup = new THREE.Group();

  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root, M: Mats = {};
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    const b = new Batch();
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.wall = lam("wallHD", () => ({ map: stoneHD("wallHD", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") }));
    M.cope = lam("copeHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
    M.tower = lam("towerHD", () => ({ map: stoneHD("towerHD") }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }), 0.15);
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#7d8088", specular: "#b0b0b0", shininess: 45 }), 0.15);
    M.bronze = twoTone(new THREE.MeshPhongMaterial({ map: bronzeBellHD(), color: "#e6be70", specular: "#ffe29a", shininess: 52 }), 0.16);
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e8b948", specular: "#fff0b8", shininess: 70 }), 0.16);
    M.slate = lam("slateRoof", () => ({ color: "#4d586b" }));
    M.wood = lam("wood", () => ({ map: beam() }));
    M.bed = lam("bed", () => ({ map: bed() }));
    M.sand = lam("sand", () => ({ color: "#e2c992" }));

    for (const s of [-1, 1]) {
      const zn = s * 30, zf = s * 900;
      b.add(s < 0 ? quadUp(-900, 900, zf, zn, 450, 217.5) : quadUp(-900, 900, zn, zf, 450, 217.5), M.grass);
      b.add(s < 0 ? quadUp(-160, 160, -36.5, -30, 80, 1.625, 0.012) : quadUp(-160, 160, 30, 36.5, 80, 1.625, 0.012), M.cobble);
      b.add(s < 0 ? quadUp(-6, 6, -170, -36.5, 3, 33.375, 0.012) : quadUp(-6, 6, 36.5, 170, 3, 33.375, 0.012), M.cobble);
      b.add(s < 0 ? wallQuad(-900, 900, -30, 1) : wallQuad(900, -900, 30, -1), M.wall);
      for (const [x0, x1] of [[-600, -4.6], [4.6, 600]]) b.add(boxGeo(V(x0, D0, s < 0 ? -30.5 : 30), V(x1, D0 + 0.75, s < 0 ? -30 : 30.5), 2), M.cope);
      b.add(boxGeo(V(-600, D0 - 0.05, s < 0 ? -30.6 : 29.4), V(600, D0 + 0.02, s < 0 ? -29.4 : 30.6), 2), M.cope);
    }
    b.add(quadUp(-900, 900, -30, 30, 225, 7.5, -0.6 - D0), M.bed);

    // Bridge towers at z = +-27
    for (const zc of [-27, 27]) {
      for (const xc of [-3.35, 3.35]) {
        b.add(boxGeo(V(xc - 0.7, -0.6, zc - 0.8), V(xc + 0.7, 15.6, zc + 0.8), 2), M.tower);
        b.add(boxGeo(V(xc - 0.95, -0.6, zc - 1.05), V(xc + 0.95, 1.1, zc + 1.05), 2), M.tower);
        b.add(boxGeo(V(xc - 0.71, D0 + 3.0, zc - 0.81), V(xc + 0.71, D0 + 3.45, zc + 0.81), 2), M.cope);
        const cap = new THREE.ConeGeometry(0.98, 1.5, 4); cap.rotateY(Math.PI / 4);
        b.add(cap, M.tower, new THREE.Matrix4().makeTranslation(xc, 17.9 + 0.75, zc));
      }
      b.add(boxGeo(V(-4.05, 15.6, zc - 0.8), V(4.05, 17.4, zc + 0.8), 2, true), M.tower);
      b.add(boxGeo(V(-4.3, 17.4, zc - 1.0), V(4.3, 17.9, zc + 1.0), 2, true), M.cope);
      for (const x of [-2.7, 2.7]) b.add(boxGeo(V(x - 0.22, 16.25, zc - 0.92), V(x + 0.22, 16.95, zc + 0.92), 0, true), M.iron);
      b.add(boxGeo(V(-0.07, 17.9, zc - 0.07), V(0.07, 21.4, zc + 0.07)), M.wood);
      for (const x of [-2.7, 2.7]) {
        const za = Math.sign(zc) * 37;
        b.add(boxGeo(V(x - 1.0, D0 - 0.4, za - 1.3), V(x + 1.0, D0 + 0.5, za + 1.3), 2), M.cope);
        b.add(boxGeo(V(x - 0.45, D0 + 0.5, za - 0.6), V(x + 0.45, D0 + 0.58, za + 0.6)), M.iron);
      }
    }

    // ─── THE 1859 WESTMINSTER CLOCK TOWER (ELIZABETH TOWER) & BELFRY AT (0, D0, TOWER_Z=34) ───
    const TZ = TOWER_Z;
    // Lower Gothic limestone shaft (y = D0..BELFRY_Y)
    b.add(boxGeo(V(-3.8, D0, TZ - 3.8), V(3.8, BELFRY_Y - 0.2, TZ + 3.8), 2), M.tower);
    // 4 Corner Gothic buttresses with gilded finials
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.add(boxGeo(V(sx * 3.85 - 0.45, D0, TZ + sz * 3.85 - 0.45), V(sx * 3.85 + 0.45, BELFRY_Y + 5.8, TZ + sz * 3.85 + 0.45), 2), M.cope);
      const pin = new THREE.ConeGeometry(0.55, 1.6, 4); pin.rotateY(Math.PI / 4);
      b.add(pin, M.gold, new THREE.Matrix4().makeTranslation(sx * 3.85, BELFRY_Y + 6.6, TZ + sz * 3.85));
    }
    // Ornamental limestone cornices & clock stage housing
    b.add(boxGeo(V(-4.15, D0 + 6.4, TZ - 4.15), V(4.15, D0 + 6.85, TZ + 4.15), 2), M.cope);
    b.add(boxGeo(V(-4.1, D0 + 6.85, TZ - 4.1), V(4.1, D0 + 11.4, TZ + 4.1), 2), M.tower);
    // 4 Westminster Clock faces (south, north, west, east)
    const wClockM = lam("wClockM", () => ({ map: westminsterClockHD() }));
    b.add(quad(V(-2.15, D0 + 7.1, TZ - 4.14), V(2.15, D0 + 7.1, TZ - 4.14), V(2.15, D0 + 11.2, TZ - 4.14), V(-2.15, D0 + 11.2, TZ - 4.14)), wClockM);
    b.add(quad(V(2.15, D0 + 7.1, TZ + 4.14), V(-2.15, D0 + 7.1, TZ + 4.14), V(-2.15, D0 + 11.2, TZ + 4.14), V(2.15, D0 + 11.2, TZ + 4.14)), wClockM);
    b.add(quad(V(-4.14, D0 + 7.1, TZ + 2.15), V(-4.14, D0 + 7.1, TZ - 2.15), V(-4.14, D0 + 11.2, TZ - 2.15), V(-4.14, D0 + 11.2, TZ + 2.15)), wClockM);
    b.add(quad(V(4.14, D0 + 7.1, TZ - 2.15), V(4.14, D0 + 7.1, TZ + 2.15), V(4.14, D0 + 11.2, TZ + 2.15), V(4.14, D0 + 11.2, TZ - 2.15)), wClockM);

    // Belfry Gallery Floor (y = BELFRY_Y = D0 + 12.0 = 18.0 m)
    b.add(boxGeo(V(-4.5, BELFRY_Y - 0.6, TZ - 4.5), V(4.5, BELFRY_Y, TZ + 4.5), 2), M.cope);
    // Low Gothic stone parapet around the belfry deck
    b.add(boxGeo(V(-4.5, BELFRY_Y, TZ + 4.1), V(4.5, BELFRY_Y + 0.55, TZ + 4.5), 2), M.cope);
    b.add(boxGeo(V(4.1, BELFRY_Y, TZ - 4.5), V(4.5, BELFRY_Y + 0.55, TZ + 4.5), 2), M.cope);
    // Heavy oak & iron yoke spanning the belfry overhead (y = BELFRY_Y + 4.5) from which the 13.5-ton bell hangs
    b.add(boxGeo(V(-3.9, BELFRY_Y + 4.35, TZ - 0.45), V(3.9, BELFRY_Y + 4.95, TZ + 0.45), 1), M.wood);
    b.add(boxGeo(V(-1.2, BELFRY_Y + 4.10, TZ - 0.55), V(1.2, BELFRY_Y + 5.05, TZ + 0.55), 1), M.iron);
    // Belfry upper cornice & steep Victorian Gothic slate spire (y = BELFRY_Y + 5.4 .. + 13.5)
    b.add(boxGeo(V(-4.4, BELFRY_Y + 5.3, TZ - 4.4), V(4.4, BELFRY_Y + 5.85, TZ + 4.4), 2), M.cope);
    const belfryRoof = new THREE.ConeGeometry(5.6, 6.2, 4); belfryRoof.rotateY(Math.PI / 4);
    b.add(belfryRoof, M.slate, new THREE.Matrix4().makeTranslation(0, BELFRY_Y + 5.85 + 3.1, TZ));
    b.add(boxGeo(V(-1.6, BELFRY_Y + 11.4, TZ - 1.6), V(1.6, BELFRY_Y + 12.6, TZ + 1.6), 1), M.gold);
    const upperSpire = new THREE.ConeGeometry(2.1, 4.2, 4); upperSpire.rotateY(Math.PI / 4);
    b.add(upperSpire, M.slate, new THREE.Matrix4().makeTranslation(0, BELFRY_Y + 12.6 + 2.1, TZ));
    const finial = new THREE.CylinderGeometry(0.08, 0.16, 2.2, 8);
    b.add(finial, M.gold, new THREE.Matrix4().makeTranslation(0, BELFRY_Y + 17.5, TZ));

    // Park circle & oak picnic table for Shot 12 (Drinking Glass + Spoon + Heavy Ladle Analogy)
    const sandG = new THREE.CircleGeometry(3.4, 32); sandG.rotateX(-Math.PI / 2);
    b.add(sandG, M.sand, new THREE.Matrix4().makeTranslation(PARK[0], D0 + 0.012, PARK[2]));
    // Table top at y = D0 + 0.88, legs down to D0
    b.add(boxGeo(V(PARK[0] - 0.95, D0 + 0.82, PARK[2] - 0.55), V(PARK[0] + 0.95, D0 + 0.90, PARK[2] + 0.55), 1), M.wood);
    for (const sx of [-0.78, 0.78]) for (const sz of [-0.42, 0.42]) {
      b.add(boxGeo(V(PARK[0] + sx - 0.06, D0, PARK[2] + sz - 0.06), V(PARK[0] + sx + 0.06, D0 + 0.82, PARK[2] + sz + 0.06), 1), M.wood);
    }

    b.build(R);
    buildTown(R, kit, sightLines());

    // ─── THE 13.5-TON GREAT BELL ("BIG BEN") DYNAMIC ASSEMBLY ───
    this.bellGroup.position.set(0, BELL_Y, TZ);
    // Upper waist & shoulder
    const waistGeo = new THREE.CylinderGeometry(0.78, 1.16, 1.45, 28);
    waistGeo.translate(0, 0.42, 0);
    const shoulderGeo = new THREE.SphereGeometry(0.78, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.48);
    shoulderGeo.scale(1, 0.55, 1);
    shoulderGeo.translate(0, 1.12, 0);
    const crownGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.48, 16);
    crownGeo.translate(0, 1.55, 0);
    for (const g of [waistGeo, shoulderGeo, crownGeo]) {
      const m = new THREE.Mesh(g, M.bronze);
      m.castShadow = true; m.receiveShadow = true;
      this.bellGroup.add(m);
    }
    // Lower flared sound-bow (in bellRimGroup so it flexes elastically on strikes & in Shot 11!)
    const bowGeo = new THREE.CylinderGeometry(1.16, 1.52, 0.95, 28);
    bowGeo.translate(0, -0.78, 0);
    const lipGeo = new THREE.TorusGeometry(1.48, 0.11, 14, 32);
    lipGeo.rotateX(Math.PI / 2);
    lipGeo.translate(0, -1.24, 0);
    const clapperBall = new THREE.SphereGeometry(0.24, 16, 16);
    clapperBall.translate(0, -1.38, 0);
    for (const [g, mat] of [[bowGeo, M.bronze], [lipGeo, M.bronze], [clapperBall, M.iron]] as const) {
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true; m.receiveShadow = true;
      this.bellRimGroup.add(m);
    }
    this.bellGroup.add(this.bellRimGroup);

    // ─── THE 4-FOOT JAGGED CRACK (hand-painted jagged fissure flush on the front-right (-z / -x) face of the bell, NOINK layer) ───
    const crackTex = ctex("bellCrackDecal", 256, 512, (g) => {
      g.clearRect(0, 0, 256, 512);
      const pts: [number, number][] = [
        [136, 504], [116, 445], [148, 385], [112, 320], [144, 255], [118, 185], [138, 115], [126, 48],
      ];
      // Bright sheared bronze outer bevel
      g.strokeStyle = "#f2be54"; g.lineWidth = 22; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      // Deep dark fissure core
      g.strokeStyle = "#160d18"; g.lineWidth = 12;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      // Side micro-fracture forks
      g.lineWidth = 5;
      for (const [x0, y0, x1, y1] of [[116, 445, 84, 415], [148, 385, 178, 355], [112, 320, 82, 292], [144, 255, 174, 228]]) {
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
    });
    const crackDecalGeo = new THREE.CylinderGeometry(1.13, 1.50, 1.48, 16, 1, true, Math.PI + 0.12, 0.42);
    crackDecalGeo.translate(0, -0.52, 0);
    const crackDecalMat = new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    const crackMesh = new THREE.Mesh(crackDecalGeo, crackDecalMat);
    crackMesh.layers.set(NOINK);
    this.crackGroup.add(crackMesh);
    this.bellGroup.add(this.crackGroup);

    // ─── THE CHIPPED SQUARE NOTCH (at the top of the crack + rim, Shot 14 t = 61.22s, NOINK layer) ───
    const notchTex = ctex("bellNotchDecal", 256, 512, (g) => {
      g.clearRect(0, 0, 256, 512);
      for (const [nx, ny, nw, nh] of [[78, 16, 102, 92], [82, 405, 106, 96]]) {
        g.fillStyle = "#ffd65c"; g.fillRect(nx - 12, ny - 12, nw + 24, nh + 24);
        g.fillStyle = "#160d18"; g.fillRect(nx, ny, nw, nh);
        g.strokeStyle = "#160d18"; g.lineWidth = 7; g.strokeRect(nx - 12, ny - 12, nw + 24, nh + 24);
      }
    });
    const notchDecalGeo = new THREE.CylinderGeometry(1.13, 1.505, 1.48, 16, 1, true, Math.PI + 0.12, 0.42);
    notchDecalGeo.translate(0, -0.52, 0);
    const notchDecalMat = new THREE.MeshBasicMaterial({ map: notchTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });
    const notchMesh = new THREE.Mesh(notchDecalGeo, notchDecalMat);
    notchMesh.layers.set(NOINK);
    this.notchGroup.add(notchMesh);
    this.bellGroup.add(this.notchGroup);
    R.add(this.bellGroup);

    // ─── MONSTER IRON HAMMER (twice as heavy as safe) vs. SLEEK LIGHTER HAMMER ───
    // Pivoted at (-2.65, BELFRY_Y + 0.35, TZ)
    this.monsterHammer.position.set(-2.65, BELFRY_Y + 0.35, TZ);
    const mArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.05, 0.22).translate(0, 1.02, 0), M.iron);
    const mHead = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.64, 0.64).translate(0.32, 1.95, 0), M.iron);
    const mBand = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.16, 0.68).translate(0.32, 1.95, 0), M.gold);
    for (const p of [mArm, mHead, mBand]) { p.castShadow = true; p.receiveShadow = true; this.monsterHammer.add(p); }
    R.add(this.monsterHammer);

    this.lightHammer.position.set(-2.45, BELFRY_Y + 0.35, TZ);
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.90, 10).translate(0, 0.95, 0), M.steel);
    const lHead = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.46, 14).rotateZ(Math.PI / 2).translate(0.22, 1.85, 0), M.gold);
    for (const p of [lArm, lHead]) { p.castShadow = true; p.receiveShadow = true; this.lightHammer.add(p); }
    R.add(this.lightHammer);

    // ─── 3D SOUND / SHOCKWAVE RINGS RADIATING FROM BELFRY ───
    for (let i = 0; i < 3; i++) {
      const rMat = new THREE.MeshBasicMaterial({ color: "#ffd86b", transparent: true, opacity: 0, depthWrite: false });
      const rMesh = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 10, 36), rMat);
      rMesh.position.set(0, BELL_Y - 0.3, TZ - 0.5);
      rMesh.layers.set(NOINK);
      this.soundRings.push(rMesh);
      R.add(rMesh);
    }

    // ─── SHOT 3 TOWER BASE HOIST GANTRY & RISING BELL ───
    this.hoistGroup.position.set(0, D0, 28.0);
    for (const sx of [-1.8, 1.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 9.5, 0.24).translate(sx, 4.75, 0), M.wood);
      post.castShadow = true; this.hoistGroup.add(post);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.30, 0.30).translate(0, 9.5, 0), M.wood);
    const pulleyWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.18, 16).rotateZ(Math.PI / 2).translate(0, 9.1, 0), M.iron);
    const ropeUp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7.0, 8).translate(0, 5.6, 0), M.wood);
    this.hoistGroup.add(crossBeam, pulleyWheel, ropeUp);
    const hBody = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.25, 1.75, 24), M.bronze);
    const hLip = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.09, 12, 24).rotateX(Math.PI / 2).translate(0, -0.85, 0), M.bronze);
    hBody.castShadow = true; hLip.castShadow = true;
    this.hoistBell.add(hBody, hLip);
    this.hoistGroup.add(this.hoistBell);
    R.add(this.hoistGroup);

    // ─── SHOT 12 PARK ANALOGY: CRYSTAL DRINKING GLASS, SILVER SPOON & HEAVY IRON LADLE ───
    this.glassGroup.position.set(PARK[0], D0 + 0.90, PARK[2]);
    const glassM = twoTone(new THREE.MeshPhongMaterial({ color: "#bde8ff", specular: "#ffffff", shininess: 90, transparent: true, opacity: 0.86 }), 0.12);
    const gWall = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.74, 24).translate(0, 0.37, 0), glassM);
    const gRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 10, 24).rotateX(Math.PI / 2).translate(0, 0.74, 0), glassM);
    this.glassGroup.add(gWall, gRim);
    // Jagged split crack up the front (-z) of the drinking glass (appears at GLASS_SPLIT = 51.56s)
    const darkGlassCrackM = new THREE.MeshBasicMaterial({ color: "#140b16" });
    const brightGlassEdgeM = new THREE.MeshBasicMaterial({ color: "#e8fbff" });
    for (let i = 0; i < 4; i++) {
      const gx = -0.10 + (i % 2 ? 0.03 : -0.03), gy = 0.65 - i * 0.14;
      const gEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.21, 0.04), brightGlassEdgeM);
      gEdge.position.set(gx, gy, -0.30);
      gEdge.rotation.z = (i % 2 ? 0.22 : -0.22);
      gEdge.layers.set(NOINK);
      const gc = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.05), darkGlassCrackM);
      gc.position.set(gx, gy, -0.31);
      gc.rotation.z = (i % 2 ? 0.22 : -0.22);
      gc.layers.set(NOINK);
      this.glassCrack.add(gEdge, gc);
    }
    this.glassGroup.add(this.glassCrack);
    R.add(this.glassGroup);

    // Silver spoon (taps at 47.85s and 49.20s)
    this.spoonGroup.position.set(PARK[0] - 0.55, D0 + 1.55, PARK[2]);
    const spStem = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.04).translate(0.18, 0, 0), M.steel);
    const spBowl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10).scale(1.3, 0.45, 0.85).translate(0.42, 0, 0), M.steel);
    this.spoonGroup.add(spStem, spBowl);
    R.add(this.spoonGroup);

    // Heavy iron soup ladle (slams at LADLE_SLAM = 50.69s)
    this.ladleGroup.position.set(PARK[0] - 0.72, D0 + 1.65, PARK[2]);
    const ldStem = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.07, 0.07).translate(0.28, 0, 0), M.iron);
    const ldBowl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65).rotateX(Math.PI).translate(0.64, -0.04, 0), M.iron);
    this.ladleGroup.add(ldStem, ldBowl);
    R.add(this.ladleGroup);

    // ---- water ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "river1";
    const wm = new THREE.Mesh(quadUp(-900, 900, -30, 30, 1, 1, -D0), waterM);
    wm.receiveShadow = true;
    R.add(wm);

    // ---- bridge (dynamic) ----
    this.deckTop = new THREE.BufferGeometry();
    this.deckTop.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NZ * 2 * 3), 3));
    this.deckTop.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(NZ * 2 * 3), 3));
    this.deckTop.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(ZS.flatMap((z) => [0, z / 2, 2.5, z / 2])), 2));
    const ti: number[] = [];
    for (let j = 0; j < NZ - 1; j++) { const a = j * 2, c = j * 2 + 1, d = (j + 1) * 2, e = (j + 1) * 2 + 1; ti.push(a, d, e, a, e, c); }
    this.deckTop.setIndex(ti);
    this.deckSide = new THREE.BufferGeometry();
    this.deckSide.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NZ * 6 * 3), 3));
    const sn: number[] = [], su: number[] = [], si: number[] = [];
    ZS.forEach((z) => { sn.push(-1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, -1, 0, 0, -1, 0); su.push(z / 3, 0, z / 3, 0.3, z / 3, 0, z / 3, 0.3, z / 3, 0, z / 3, 1.2); });
    for (let j = 0; j < NZ - 1; j++) {
      const A = (k: number) => j * 6 + k, B = (k: number) => (j + 1) * 6 + k;
      si.push(A(0), A(1), B(1), A(0), B(1), B(0), A(2), B(2), B(3), A(2), B(3), A(3), A(4), A(5), B(5), A(4), B(5), B(4));
    }
    this.deckSide.setAttribute("normal", new THREE.Float32BufferAttribute(sn, 3));
    this.deckSide.setAttribute("uv", new THREE.Float32BufferAttribute(su, 2));
    this.deckSide.setIndex(si);
    const deckM = lam("planksHD", () => ({ map: planksHD() })), sideM = lam("deckSide", () => ({ map: beamHD() }));
    for (const mm of [deckM, sideM]) if (mm.map) { mm.map.anisotropy = 16; mm.map.needsUpdate = true; }
    for (const [g, m] of [[this.deckTop, deckM], [this.deckSide, sideM]] as const) {
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; R.add(mesh);
    }
    const inst = (g: THREE.BufferGeometry, m: THREE.Material, n: number) => {
      const im = new THREE.InstancedMesh(g, m, n); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; R.add(im); return im;
    };
    this.posts = inst(new THREE.BoxGeometry(0.11, 1.12, 0.11).translate(0, 0.56, 0), M.wood, POSTS.length * 2);
    this.ribs = inst(new THREE.BoxGeometry(5.7, 0.26, 0.24), M.wood, POSTS.length);
    const chainM = twoTone(lam("chainHD", () => ({ map: rep(chainHD(), 1, 1), side: THREE.DoubleSide })) as THREE.MeshLambertMaterial, 0.15);
    chainM.color.set("#8c847c");
    this.hangers = inst(new THREE.CylinderGeometry(0.035, 0.035, 1, 5).translate(0, 0.5, 0), M.iron, HANG.length * 2);
    const pen = new THREE.BufferGeometry();
    pen.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.17, 0, 0, 0.17, 0, -0.42, 0], 3));
    pen.computeVertexNormals();
    this.bunting = inst(pen, lam("pennant", () => ({ side: THREE.DoubleSide })), FLAGS.length * 2);
    const cols = ["#d23b3b", "#f3d35a", "#3f6fb5", "#f7f1e1", "#2f8a4f"].map((c) => new THREE.Color(c));
    for (let i = 0; i < FLAGS.length * 2; i++) this.bunting.setColorAt(i, cols[i % 5]);
    for (const [w, h] of [[0.1, 0.1], [0.07, 0.07], [0.1, 0.1], [0.07, 0.07]]) { const s = new Strand(NZ, w, h, M.wood, 3); this.rails.push(s); R.add(s.mesh); }
    for (let i = 0; i < 2; i++) { const s = new Strand(CZ.length, 0.14, 0.3, chainM, 2); this.chains.push(s); R.add(s.mesh); }
    for (let i = 0; i < 4; i++) { const s = new Strand(18, 0.14, 0.3, chainM, 2); this.stays.push(s); R.add(s.mesh); }

    // Flying bronze shards on SNAP (33.58 s)
    const shardG = new THREE.DodecahedronGeometry(0.11, 0);
    this.boltA = new THREE.Mesh(shardG, M.bronze); this.boltB = new THREE.Mesh(shardG, M.bronze);
    const eyeG = new THREE.TorusGeometry(0.12, 0.04, 8, 16);
    this.eye = new THREE.Mesh(eyeG, M.bronze);
    for (const m of [this.boltA, this.boltB, this.eye]) { m.castShadow = true; R.add(m); }

    const flagM = lam("flagM", () => ({ map: flagTex(), side: THREE.DoubleSide }));
    for (const zc of [-27, 27]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0, 12, 1), flagM);
      f.position.set(0, 20.75, zc); f.castShadow = true; f.frustumCulled = false;
      this.flags.push(f); R.add(f);
    }
    const smokeT = smokeTex();
    for (const [top, n] of [[[-22, D0 + 30.6, -77], 7], [[-80, D0 + 24.6, 93], 6]] as const)
      for (let k = 0; k < n; k++) {
        const mat = new THREE.MeshLambertMaterial({ map: smokeT, transparent: true, depthWrite: false });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        m.layers.set(NOINK);
        this.smoke.push({ m, mat, top: top as unknown as V3, k: k / n }); R.add(m);
      }

    // Whitechapel Foundry Warning / Engineering Diagram Board on the Belfry deck (Shots 4, 5)
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.10, 0.82), new THREE.MeshBasicMaterial({ map: ctex("sign", 700, 520, (g) => fxSign(new Pen(g))), alphaTest: 0.5, color: 0xe6e6e6 }));
    board.layers.set(NOINK);
    board.position.set(SIGN_AT[0], SIGN_AT[1] + 1.42, SIGN_AT[2] - 0.04); board.rotation.y = Math.PI;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.88, 0.06), M.wood); back.position.set(SIGN_AT[0], SIGN_AT[1] + 1.42, SIGN_AT[2] + 0.0);
    this.sign.add(board, back);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.08), M.wood); p.position.set(SIGN_AT[0] + s * 0.40, SIGN_AT[1] + 0.92, SIGN_AT[2] + 0.06); this.sign.add(p); }
    this.sign.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    R.add(this.sign);
    this.swing = new Actor(R, swingGeo);

    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const ss = s as ShotDef & { sunAz?: number; sunEl?: number };
    const az = THREE.MathUtils.degToRad(ss.sunAz ?? SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(ss.sunEl ?? SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tau = s.tau(t), b = bridgeState(id, t), L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);

    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;

    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);

    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;

    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;

    // ---- Pose Bridge, Great Bell, Hammers, Hoist, and Park Drinking-Glass Analogy ----
    this.poseBridge(b, t, tau, id);
    this.poseBellAndProps(b, t, id, cam);

    // Warning diagram board visible in Shot 4 (Foundry Master warning) and Shot 5
    this.sign.visible = id === 4 || id === 5;
    for (const sm of this.smoke) {
      const u = (t * 0.11 + sm.k) % 1, sz = 3 + u * 9;
      sm.m.position.set(sm.top[0] - u * 18, sm.top[1] + u * 13 + u * u * 4, sm.top[2] + u * 3);
      sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(cam.quaternion);
      sm.mat.opacity = 0.85 * (1 - u) ** 1.2;
    }

    // ---- Cast + 2D effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, b, { pos: cam.position, right });
    if (id === 8) {
      snapFx(tau, BOLT, st);
      if (tau > 32.2 && tau < SNAP) creakFx(t, [[BOLT[0] - 0.15, BOLT[1] + 0.25, BOLT[2] - 0.2], [BOLT[0] - 0.1, BOLT[1] - 0.35, BOLT[2] - 0.2]], st, 0.38);
    }
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (p.geo !== "swing" && !this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = p.geo === "swing" ? this.swing : this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = p.geo === "swing" ? true : L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    if (!used.includes(this.swing)) this.swing.mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }

  private poseBellAndProps(b: BridgeState, t: number, id: number, cam: THREE.PerspectiveCamera) {
    // 1. Bell visibility & quarter-turn rotation (Shot 14 rotates so the crack shifts away from the hammer strike point)
    this.bellGroup.visible = id !== 3; // In Shot 3 the bell is being hoisted at the tower base
    this.bellGroup.rotation.y = b.turn * 0.48;
    this.bellGroup.rotation.z = b.bounce * 0.04;

    // 2. Elastic sound-bow flex ("its metal bends in and out like a stiff spring" in Shot 11 + on strikes)
    const flex = b.bounce * (id === 11 ? 0.16 : 0.08);
    this.bellRimGroup.scale.set(1 + flex, 1 - Math.abs(flex) * 0.25, 1 - flex);

    // 3. 4-Foot Jagged Crack & Square Anti-Crack Notch
    this.crackGroup.visible = b.snap > 0.01;
    this.crackGroup.scale.set(1, Math.max(0.05, b.snap), 1);
    this.notchGroup.visible = b.notch > 0.02;
    this.notchGroup.scale.setScalar(Math.max(0.01, b.notch));

    // 4. Monster Iron Hammer vs. Sleek Lighter Hammer
    // Strike angle: 0 = cocked back (-0.68 rad), 1 = slammed against bronze sound-bow (-0.24 rad)
    const ang = -0.68 + b.strike * 0.44;
    this.monsterHammer.visible = (id === 1 || (id >= 6 && id <= 14)) && b.lighter < 0.65;
    this.monsterHammer.rotation.z = ang;
    this.lightHammer.visible = id >= 14 && b.lighter >= 0.35;
    this.lightHammer.rotation.z = ang;

    // 5. 3D Sound / Shockwave Rings expanding from the belfry on hammer strikes & chimes
    const allStrikes = [...STRIKES, ...CHIMES];
    for (let i = 0; i < this.soundRings.length; i++) {
      const rm = this.soundRings[i], rMat = rm.material as THREE.MeshBasicMaterial;
      let bestU = -1;
      for (const st of allStrikes) {
        const dt = t - st - i * 0.14;
        if (dt >= 0 && dt < 1.15) bestU = Math.max(bestU, dt / 1.15);
      }
      if (bestU >= 0) {
        rm.visible = true;
        const sc = 1.0 + bestU * 3.8;
        rm.scale.set(sc, sc, 1);
        rm.lookAt(cam.position);
        rMat.opacity = 0.72 * (1 - bestU) ** 1.4;
      } else {
        rm.visible = false;
      }
    }

    // 6. Shot 3 Tower Base Hoist Rig
    this.hoistGroup.visible = id === 3;
    if (id === 3) {
      this.hoistBell.position.set(0, 1.40 + b.hoist * 2.4, 0);
      this.hoistBell.rotation.z = Math.sin(t * 3.5) * 0.05;
    }

    // 7. Shot 12 Park Drinking-Glass, Silver Spoon & Heavy Iron Ladle Analogy
    const inParkShot = id === 12;
    this.glassGroup.visible = inParkShot;
    this.spoonGroup.visible = inParkShot && t < 49.65;
    this.ladleGroup.visible = inParkShot && t >= 49.65;
    if (inParkShot) {
      // Gentle elastic hum when tapped with spoon at 47.85s and 49.20s
      let gFlex = 0;
      for (const tp of SPOON_TAPS) {
        const dt = t - tp;
        if (dt >= 0 && dt < 1.1) gFlex += Math.exp(-dt * 3.0) * Math.sin(dt * 40) * 0.08;
      }
      const lDt = t - LADLE_SLAM;
      if (lDt >= 0 && lDt < 0.9) gFlex += Math.exp(-lDt * 4.0) * Math.sin(lDt * 45) * 0.16;
      this.glassGroup.scale.set(1 + gFlex, 1 - Math.abs(gFlex) * 0.3, 1 - gFlex);
      this.glassCrack.visible = t >= GLASS_SPLIT - 0.05;
      const splitU = clamp01((t - (GLASS_SPLIT - 0.05)) / 0.18);
      this.glassCrack.scale.set(1, Math.max(0.05, splitU), 1);

      // Spoon tap motion
      let spTap = 0;
      for (const tp of SPOON_TAPS) {
        const dt = t - tp;
        if (dt >= -0.25 && dt < 0.25) spTap = Math.max(spTap, Math.cos((dt / 0.25) * (Math.PI / 2)));
      }
      this.spoonGroup.rotation.z = 0.35 - spTap * 0.55;

      // Heavy ladle slam motion at LADLE_SLAM = 50.69s
      const ldU = lDt >= -0.35 && lDt < 0 ? smooth((lDt + 0.35) / 0.35) : lDt >= 0 && lDt < 0.45 ? 1 - 0.7 * smooth(lDt / 0.45) : 0;
      this.ladleGroup.rotation.z = 0.65 - ldU * 0.92;
    }
  }

  private poseBridge(b: BridgeState, t: number, tau: number, id: number) {
    const dy = ZS.map((z) => deckY(z, b));
    const top = this.deckTop.attributes.position.array as Float32Array, tn = this.deckTop.attributes.normal.array as Float32Array;
    const side = this.deckSide.attributes.position.array as Float32Array;
    for (let j = 0; j < NZ; j++) {
      const z = ZS[j], y = dy[j], slope = (dy[Math.min(NZ - 1, j + 1)] - dy[Math.max(0, j - 1)]) / ((Math.min(NZ - 1, j + 1) - Math.max(0, j - 1)) * 0.5);
      const nl = Math.hypot(1, slope);
      top.set([-2.5, y, z, 2.5, y, z], j * 6);
      tn.set([0, 1 / nl, -slope / nl, 0, 1 / nl, -slope / nl], j * 6);
      side.set([-2.5, y, z, -2.5, y - 0.45, z, 2.5, y, z, 2.5, y - 0.45, z, -2.5, y - 0.45, z, 2.5, y - 0.45, z], j * 18);
    }
    this.deckTop.attributes.position.needsUpdate = true; this.deckTop.attributes.normal.needsUpdate = true;
    this.deckSide.attributes.position.needsUpdate = true;
    const q = new THREE.Quaternion(), one = V(1, 1, 1), pos = V(0, 0, 0), scl = V(1, 1, 1);
    POSTS.forEach((z, k) => {
      const y = deckY(z, b);
      for (const [i, x] of [[0, -2.42], [1, 2.42]] as const) this.posts.setMatrixAt(k * 2 + i, this.m4.compose(pos.set(x, y, z), q, one));
      this.ribs.setMatrixAt(k, this.m4.compose(pos.set(0, y - 0.58, z), q, one));
    });
    this.posts.instanceMatrix.needsUpdate = true; this.ribs.instanceMatrix.needsUpdate = true;
    [[-2.42, 1.08], [-2.42, 0.6], [2.42, 1.08], [2.42, 0.6]].forEach(([x, h], i) => this.rails[i].set(ZS.map((z, j) => V(x, dy[j] + h, z))));
    [-2.7, 2.7].forEach((x, i) => this.chains[i].set(CZ.map((z) => V(x, chainY(z, b), z))));
    HANG.forEach((z, k) => {
      const base = deckY(z, b), up = Math.max(0.01, chainY(z, b) - base);
      for (const [i, x] of [[0, -2.62], [1, 2.62]] as const) this.hangers.setMatrixAt(k * 2 + i, this.m4.compose(pos.set(x, base, z), q, scl.set(1, up, 1)));
    });
    this.hangers.instanceMatrix.needsUpdate = true;
    FLAGS.forEach((z, k) => {
      const s = catY(z) - D0 > 3.3 ? 1 : 0;
      for (const [i, x] of [[0, -2.78], [1, 2.78]] as const) this.bunting.setMatrixAt(k * 2 + i, this.m4.compose(pos.set(x, chainY(z, b) - 0.1, z), q, scl.set(s, s, s)));
    });
    this.bunting.instanceMatrix.needsUpdate = true;

    const sag = (a: THREE.Vector3, e: THREE.Vector3, n: number, dip: number) =>
      Array.from({ length: n }, (_, i) => { const u = i / (n - 1); return a.clone().lerp(e, u).add(V(0, -dip * 4 * u * (1 - u), 0)); });
    const n = 18;
    this.stays[0].set(sag(V(-2.7, TOP, -27), V(-2.7, D0 + 0.86, -37), n, 0.5));
    this.stays[1].set(sag(V(2.7, TOP, -27), V(2.7, D0 + 0.86, -37), n, 0.5));
    this.stays[2].set(sag(V(-2.7, TOP, 27), V(-2.7, D0 + 0.86, 37), n, 0.5));
    this.stays[3].set(sag(V(2.7, TOP, 27), V(2.7, D0 + 0.86, 37), n, 0.5));

    // Flying bronze shards when the Great Bell cracks at SNAP = 33.58s in Shot 8
    const ts = id === 8 && tau >= SNAP ? tau - SNAP : -1;
    if (ts < 0) {
      this.boltA.visible = this.boltB.visible = this.eye.visible = false;
    } else {
      this.boltA.visible = this.boltB.visible = this.eye.visible = true;
      this.eye.position.set(...snapEnd(b.snap));
      for (const [m, vx, vy, vz, sp] of [[this.boltA, -2.2, 3.2, -1.8, 17], [this.boltB, -1.4, 2.6, -2.4, -14]] as const) {
        const tl = Math.min(ts, 0.9);
        m.position.set(BOLT[0] + vx * tl, BOLT[1] + vy * tl - 4.9 * tl * tl, BOLT[2] + vz * tl);
        m.rotation.set(sp * tl * 0.4, sp * tl, 0);
      }
    }

    for (const fl of this.flags) {
      const p = fl.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = (i % 13) / 12, y = i < 13 ? 0.5 : -0.5;
        p.setXYZ(i, -u * 1.7, y + 0.05 * u * Math.sin(t * 4 - u * 3), 0.24 * u * Math.sin(t * 5.5 - u * 5 + fl.position.z));
      }
      p.needsUpdate = true;
    }
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.0);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

const swingGeo = (() => { const g = new THREE.PlaneGeometry(700 * SU_SWING, 2300 * SU_SWING); g.translate(0, -(1150 - 20) * SU_SWING, 0); return g; })();
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
function wallQuad(x0: number, x1: number, z: number, dir: number) {
  const g = new THREE.BufferGeometry(), y0 = -0.6, y1 = D0;
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y0, z, x1, y1, z, x0, y1, z], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([0, 0, dir]).flat(), 3));
  const u = Math.abs(x1 - x0) / 4, v = (y1 - y0) / 4;
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
