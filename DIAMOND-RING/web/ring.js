// "WILL YOU (Diamond Ring)" — faithful web port of diamond_ring.py by JIN2 (@jin_22ee), 2026.
// Original: https://github.com/JIN2-ASCII/-JIN2-ASCII/tree/main/DIAMOND-RING (see LICENSE.txt).
// Unofficial port for personal, non-commercial use. Artwork and original code credit: JIN2.
"use strict";

const TAU = Math.PI * 2;
const LOOP = 20.0, BUILD = 3.2, TURN = 12.0, FLOOR = -0.78;

const POOLS = ["1il!;:", "rtfjcvxz=+", "aeoun0{}[]<>", "08B$#&%Q"];
const CHARS = " .,:~+*^01|/\\-_#()x" + POOLS.join("");
const AT = {}; for (let i = 0; i < CHARS.length; i++) AT[CHARS[i]] = i;
const NCHARS = CHARS.length;
const FILL = new Uint8Array(4 * 12);
for (let p = 0; p < 4; p++) for (let k = 0; k < 12; k++) FILL[p * 12 + k] = AT[POOLS[p][k % POOLS[p].length]];

const BAND = 0, PRONG = 1, GEM = 2, GLINT = 3, FIRE_R = 4, FIRE_B = 5, FIRE_G = 6, DUST = 7, REFL = 8, STAR = 9;

function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- geometry (same construction as the original) ----------
const R_BAND = 0.55, TUBE = 0.065;

function band() {
  const na = 520, nb = 44, n = na * nb;
  const P = new Float64Array(n * 3), N = new Float64Array(n * 3);
  let i = 0;
  for (let ia = 0; ia < na; ia++) for (let ib = 0; ib < nb; ib++) {
    const a = TAU * ia / na, b = TAU * ib / nb;
    const rr = TUBE * (1 - 0.35 * Math.pow(Math.max(0, Math.sin(a)), 6));
    const cx = Math.cos(a), cy = Math.sin(a);
    const nx = cx * Math.cos(b), ny = cy * Math.cos(b), nz = Math.sin(b);
    P[i * 3] = cx * R_BAND + nx * rr; P[i * 3 + 1] = cy * R_BAND + ny * rr; P[i * 3 + 2] = nz * rr * 1.5;
    const l = Math.hypot(nx, ny, nz);
    N[i * 3] = nx / l; N[i * 3 + 1] = ny / l; N[i * 3 + 2] = nz / l;
    i++;
  }
  return { P, N };
}

const GIRDLE_Y = 0.88, GIRDLE_R = 0.25, TABLE_Y = 1.00, TABLE_R = 0.135, CULET_Y = 0.66;

function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

function diamond() {
  const P = [], N = [], F = [];
  let k = 0;
  function facet(corners, nrm) {
    const l = Math.hypot(nrm[0], nrm[1], nrm[2]);
    const nx = nrm[0] / l, ny = nrm[1] / l, nz = nrm[2] / l;
    const [a, b, c] = corners;
    const m = 16;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      const u = i / (m - 1), v = j / (m - 1);
      if (u + v > 1) continue;
      P.push(a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v,
             a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v,
             a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v);
      N.push(nx, ny, nz); F.push(k);
    }
    k++;
  }
  const m = 16;
  for (let i = 0; i < m; i++) {
    const a0 = TAU * i / m, a1 = TAU * (i + 1) / m;
    const g0 = [GIRDLE_R * Math.cos(a0), GIRDLE_Y, GIRDLE_R * Math.sin(a0)];
    const g1 = [GIRDLE_R * Math.cos(a1), GIRDLE_Y, GIRDLE_R * Math.sin(a1)];
    const t0 = [TABLE_R * Math.cos(a0), TABLE_Y, TABLE_R * Math.sin(a0)];
    const t1 = [TABLE_R * Math.cos(a1), TABLE_Y, TABLE_R * Math.sin(a1)];
    const culet = [0, CULET_Y, 0];
    let crown = cross3(sub3(g1, g0), sub3(t0, g0));
    const cs = Math.sign(crown[1]) || 1; crown = crown.map(v => v * cs);
    facet([g0, g1, t0], crown);
    facet([g1, t1, t0], [crown[0], crown[1] * 1.15, crown[2]]);
    let pav = cross3(sub3(culet, g0), sub3(g1, g0));
    const ps = -Math.sign(pav[1]) || 1; pav = pav.map(v => v * ps);
    facet([g0, g1, culet], pav);
    facet([[0, TABLE_Y, 0], t0, t1], [0, 1, 0]);
  }
  return { P: Float64Array.from(P), N: Float64Array.from(N), F: Int32Array.from(F) };
}

function prongs() {
  const P = [], N = [];
  for (let i = 0; i < 4; i++) {
    const a = TAU * (i + 0.5) / 4;
    const base = [0.08 * Math.cos(a), R_BAND + 0.02, 0.08 * Math.sin(a)];
    const tip = [(GIRDLE_R + 0.015) * Math.cos(a), TABLE_Y - 0.03, (GIRDLE_R + 0.015) * Math.sin(a)];
    let d = sub3(tip, base); const dl = Math.hypot(...d); d = d.map(v => v / dl);
    let s = cross3(d, [0, 0, 1]); const sl = Math.hypot(...s); s = s.map(v => v / sl);
    const w = cross3(s, d);
    const nu = 40, np = 12;
    for (let iu = 0; iu < nu; iu++) for (let ip = 0; ip < np; ip++) {
      const u = iu / (nu - 1), phi = TAU * ip / np;
      const nx = Math.cos(phi) * s[0] + Math.sin(phi) * w[0];
      const ny = Math.cos(phi) * s[1] + Math.sin(phi) * w[1];
      const nz = Math.cos(phi) * s[2] + Math.sin(phi) * w[2];
      P.push(base[0] + u * (tip[0] - base[0]) + nx * 0.022,
             base[1] + u * (tip[1] - base[1]) + ny * 0.022,
             base[2] + u * (tip[2] - base[2]) + nz * 0.022);
      N.push(nx, ny, nz);
    }
  }
  return { P: Float64Array.from(P), N: Float64Array.from(N) };
}

const B = band(), D = diamond(), PR = prongs();
const NB = B.P.length / 3, NPR = PR.P.length / 3, NG = D.P.length / 3;
const NRING = NB + NPR + NG;
const RING_P = new Float64Array(NRING * 3), RING_N = new Float64Array(NRING * 3);
RING_P.set(B.P, 0); RING_P.set(PR.P, NB * 3); RING_P.set(D.P, (NB + NPR) * 3);
RING_N.set(B.N, 0); RING_N.set(PR.N, NB * 3); RING_N.set(D.N, (NB + NPR) * 3);
const RING_PART = new Int32Array(NRING), RING_KIND = new Int32Array(NRING), GEM_F_ALL = new Int32Array(NRING);
for (let i = 0; i < NB; i++) { RING_PART[i] = 0; RING_KIND[i] = BAND; }
for (let i = 0; i < NPR; i++) { RING_PART[NB + i] = 1; RING_KIND[NB + i] = PRONG; }
for (let i = 0; i < NG; i++) { RING_PART[NB + NPR + i] = 10 + D.F[i]; RING_KIND[NB + NPR + i] = GEM; GEM_F_ALL[NB + NPR + i] = D.F[i]; }

// ---------- draw order / reveal ----------
const DRAW0 = 0.3, DRAW1 = 5.6, ORDER_MAX = 1.7;
const ORDER = new Float64Array(NRING);
for (let i = 0; i < NRING; i++) {
  const x = RING_P[i * 3], y = RING_P[i * 3 + 1];
  if (RING_KIND[i] === BAND) {
    let ang = Math.atan2(y, x) + Math.PI / 2;
    while (ang > Math.PI) ang -= TAU; while (ang < -Math.PI) ang += TAU;
    ORDER[i] = Math.abs(ang) / Math.PI;
  } else if (RING_KIND[i] === PRONG) {
    ORDER[i] = 1.0 + (y - R_BAND) / (TABLE_Y - R_BAND) * 0.25;
  } else {
    ORDER[i] = 1.25 + (y - CULET_Y) / (TABLE_Y - CULET_Y) * 0.45;
  }
}

// ---------- particle seeds ----------
const SPK_N = 2600, BURST_N = 700, HALO_N = 900, DUST_N = 520, STAR_N = 90;
const SPK = new Float64Array(SPK_N * 5), SPK_IDX = new Int32Array(SPK_N), SPK_BORN = new Float64Array(SPK_N);
{
  const r = mulberry32(13);
  for (let i = 0; i < SPK_N; i++) for (let j = 0; j < 5; j++) SPK[i * 5 + j] = r();
  for (let i = 0; i < SPK_N; i++) {
    SPK_IDX[i] = Math.floor(SPK[i * 5] * NRING);
    SPK_BORN[i] = DRAW0 + ORDER[SPK_IDX[i]] / ORDER_MAX * (DRAW1 - DRAW0);
  }
}
const BURSTR = new Float64Array(BURST_N * 3);
{ const r = mulberry32(14); for (let i = 0; i < BURST_N * 3; i++) BURSTR[i] = r(); }
const HALOR = new Float64Array(HALO_N * 2);
{ const r = mulberry32(15); for (let i = 0; i < HALO_N * 2; i++) HALOR[i] = r(); }
const DUSTR = new Float64Array(DUST_N * 4);
{ const r = mulberry32(5); for (let i = 0; i < DUST_N * 4; i++) DUSTR[i] = r(); }
const STARR = new Float64Array(STAR_N * 3);
{ const r = mulberry32(2); for (let i = 0; i < STAR_N * 3; i++) STARR[i] = r(); }

// ---------- camera (constants from look()) ----------
const EYE = [0.0, 0.85, 4.7], TARGET = [0, 0.22, 0];
const FWD = (() => { const f = sub3(TARGET, EYE), l = Math.hypot(...f); return f.map(v => v / l); })();
const RIGHT = (() => { const r = cross3(FWD, [0, 1, 0]), l = Math.hypot(...r); return r.map(v => v / l); })();
const UP = cross3(RIGHT, FWD);
const VIEW = FWD.map(v => -v);

function spin(t) { return TAU * Math.max(t - DRAW1 - 0.6, 0) / TURN; }
function flash(t) { return Math.exp(-Math.pow((t - DRAW1 - 0.15) / 0.18, 2)); }

// ---------- scene buffers ----------
const MAXN = NRING * 2 + DUST_N + STAR_N + SPK_N + BURST_N + HALO_N;
const aW = new Float64Array(MAXN * 3);      // world positions
const aS = new Float32Array(MAXN);          // shade
const aT = new Int16Array(MAXN);            // tag (color kind)
const aPP = new Int16Array(MAXN);           // part id (-1 particle, -2 hidden-in-reveal)

let INFO = { deg: 0, glints: 0 };

function scene(t) {
  const yaw = spin(t), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const head = (t - DRAW0) / (DRAW1 - DRAW0) * ORDER_MAX;
  let key = [0.0, 0.8, 0.6]; { const l = Math.hypot(...key); key = key.map(v => v / l); }
  let rim = [Math.cos(t * 0.9), 0.5, Math.sin(t * 0.9)]; { const l = Math.hypot(...rim); rim = rim.map(v => v / l); }
  let hk = [key[0] + VIEW[0], key[1] + VIEW[1], key[2] + VIEW[2]]; { const l = Math.hypot(...hk); hk = hk.map(v => v / l); }
  let hr = [rim[0] + VIEW[0], rim[1] + VIEW[1], rim[2] + VIEW[2]]; { const l = Math.hypot(...hr); hr = hr.map(v => v / l); }
  const fireT = Math.floor(t * 7);
  let n = 0, glints = 0;
  // ring body
  for (let i = 0; i < NRING; i++) {
    const px = RING_P[i * 3], py = RING_P[i * 3 + 1], pz = RING_P[i * 3 + 2];
    aW[n * 3] = cy * px + sy * pz; aW[n * 3 + 1] = py; aW[n * 3 + 2] = -sy * px + cy * pz;
    const nx0 = RING_N[i * 3], ny0 = RING_N[i * 3 + 1], nz0 = RING_N[i * 3 + 2];
    const nx = cy * nx0 + sy * nz0, ny = ny0, nz = -sy * nx0 + cy * nz0;
    const diff = Math.max(0, nx * key[0] + ny * key[1] + nz * key[2]);
    const spec = Math.pow(Math.max(0, nx * hk[0] + ny * hk[1] + nz * hk[2]), 30)
               + 0.9 * Math.pow(Math.max(0, nx * hr[0] + ny * hr[1] + nz * hr[2]), 24);
    const metal = RING_KIND[i] !== GEM;
    let shade = metal ? 0.5 + 0.35 * diff + 0.9 * spec : 0.8 + 0.2 * diff + 1.4 * spec;
    let kind = RING_KIND[i];
    if (!metal && spec > 0.18) {
      glints++;
      const fire = ((GEM_F_ALL[i] + fireT) % 4 + 4) % 4;
      kind = fire === 0 ? GLINT : fire === 1 ? FIRE_R : fire === 2 ? FIRE_B : FIRE_G;
    }
    if (metal && spec > 0.5) kind = GLINT;
    const k = smooth((head - ORDER[i]) / 0.06);
    const tip = Math.abs(head - ORDER[i]) < 0.035;
    aPP[n] = k < 0.96 ? -2 : RING_PART[i];
    if (k < 0.96) { shade = tip ? 1.2 : 0.0; kind = tip ? GLINT : DUST; }
    aS[n] = shade; aT[n] = kind;
    n++;
  }
  const ringCount = n; // NRING
  // floor reflection (uses pre-flash shade)
  for (let i = 0; i < ringCount; i++) {
    aW[n * 3] = aW[i * 3]; aW[n * 3 + 1] = 2 * FLOOR - aW[i * 3 + 1] - 0.06; aW[n * 3 + 2] = aW[i * 3 + 2];
    aS[n] = aPP[i] === -2 ? 0 : 0.22 * Math.min(Math.max(aS[i], 0), 1.2);
    aT[n] = REFL; aPP[n] = -1;
    n++;
  }
  // flash brightens the body (and everything via concatenated shade in the original)
  const fl = 1 + 0.8 * flash(t);
  for (let i = 0; i < ringCount; i++) aS[i] *= fl;
  // dust
  for (let i = 0; i < DUST_N; i++) {
    const d0 = DUSTR[i * 4], d1 = DUSTR[i * 4 + 1], d2 = DUSTR[i * 4 + 2], d3 = DUSTR[i * 4 + 3];
    const a = d0 * TAU + t * (0.3 + 0.5 * d1), r = 0.9 + 0.8 * d2;
    const y = ((d3 * 2.4 + t * 0.08) % 2.4) - 0.8;
    aW[n * 3] = Math.cos(a) * r; aW[n * 3 + 1] = y; aW[n * 3 + 2] = Math.sin(a) * r * 0.7;
    const tw = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * (2 + 3 * d1) + d0 * 40)), 4);
    aS[n] = tw * smooth((t - BUILD + 0.5) / 1.5);
    aT[n] = DUST; aPP[n] = -1; n++;
  }
  // stars
  for (let i = 0; i < STAR_N; i++) {
    aW[n * 3] = STARR[i * 3] * 10 - 5; aW[n * 3 + 1] = STARR[i * 3 + 1] * 6 - 1.5; aW[n * 3 + 2] = -6.0;
    aS[n] = 0.1 + 0.1 * Math.sin(t * 2 + STARR[i * 3 + 2] * TAU);
    aT[n] = STAR; aPP[n] = -1; n++;
  }
  // sparks
  for (let i = 0; i < SPK_N; i++) {
    const age = t - SPK_BORN[i], life = 0.9 + 0.9 * SPK[i * 5 + 1];
    const alive = age > 0 && age < life;
    const a = SPK[i * 5 + 2] * TAU;
    const vx = Math.cos(a) * (0.4 + 0.6 * SPK[i * 5 + 3]), vy = 0.5 + 0.9 * SPK[i * 5 + 4], vz = Math.sin(a) * (0.4 + 0.6 * SPK[i * 5 + 3]);
    const j = SPK_IDX[i];
    aW[n * 3] = RING_P[j * 3] + vx * age;                   // original (unrotated) ring position
    aW[n * 3 + 1] = RING_P[j * 3 + 1] + vy * age - 0.5 * 2.2 * age * age;
    aW[n * 3 + 2] = RING_P[j * 3 + 2] + vz * age;
    let glow = Math.pow(Math.min(1, Math.max(0, 1 - age / life)), 1.3) * (0.6 + 0.4 * Math.sin(age * 30 + a));
    if (!alive) glow = 0;
    aS[n] = glow;
    aT[n] = SPK[i * 5 + 3] > 0.7 ? GLINT : DUST; aPP[n] = -1; n++;
  }
  // burst
  {
    const k = t - DRAW1 - 0.1;
    if (k >= 0 && k <= 2.2) {
      const glow = Math.pow(Math.max(0, 1 - k / 2.2), 1.5);
      for (let i = 0; i < BURST_N; i++) {
        const a = BURSTR[i * 3] * TAU;
        const r = 0.85 + 2.4 * (1 - Math.exp(-k * 2.0)) * (0.97 + 0.06 * BURSTR[i * 3 + 1]);
        aW[n * 3] = Math.cos(a) * r; aW[n * 3 + 1] = 0.42 + Math.sin(a) * r; aW[n * 3 + 2] = (BURSTR[i * 3 + 2] - 0.5) * 0.05 - 0.4;
        aS[n] = glow;
        const b1 = BURSTR[i * 3 + 1];
        aT[n] = b1 < 0.25 ? FIRE_R : b1 < 0.45 ? FIRE_B : b1 < 0.6 ? FIRE_G : GLINT;
        aPP[n] = -1; n++;
      }
    }
  }
  // halos
  {
    const on = smooth((t - DRAW1 - 0.3) / 1.5);
    if (on > 0) {
      const half = HALO_N / 2;
      for (let i = 0; i < HALO_N; i++) {
        const ring = i < half ? 0 : 1, tilt = ring === 0 ? 0.55 : -0.55;
        const a = HALOR[i * 2] * TAU + t * (ring === 0 ? 0.9 : -0.7);
        const x = Math.cos(a) * 1.05, y = Math.sin(a) * 0.32, z = Math.sin(a) * 0.95;
        const c = Math.cos(tilt), s = Math.sin(tilt);
        aW[n * 3] = x * c - y * s; aW[n * 3 + 1] = x * s + y * c + 0.42; aW[n * 3 + 2] = z;
        let hd = (HALOR[i * 2] * 37 + t * 1.3) % 1.0; if (hd < 0) hd += 1;
        aS[n] = on * (0.15 + 0.85 * Math.max(0, 1 - hd * 3)) * (0.6 + 0.4 * Math.sin(t * 6 + HALOR[i * 2 + 1] * TAU));
        aT[n] = HALOR[i * 2 + 1] > 0.5 ? DUST : GLINT; aPP[n] = -1; n++;
      }
    }
  }
  INFO = { deg: (yaw * 180 / Math.PI) % 360, glints };
  return n;
}

// ---------- rasterize one frame into char/lum/tag grids (same as frame()) ----------
const CW = 6, CH = 9, FONT_PX = 10, W = 1080, H = 960;
const COLS = Math.floor(W / CW), ROWS = Math.floor(H / CH);   // 180 x 106
const ASPECT = (COLS * CW) / (ROWS * CH);
const FPROJ = 2.9;

const gPart = new Int16Array(ROWS * COLS);
const gDepth = new Float32Array(ROWS * COLS);
const gLum = new Float32Array(ROWS * COLS);
const gTag = new Int16Array(ROWS * COLS);
const gChar = new Uint16Array(ROWS * COLS);
const gBody = new Uint8Array(ROWS * COLS);
const gH = new Int32Array(ROWS * COLS);
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) gH[r * COLS + c] = (r * 7919 + c * 104729) % 9973;

function frame(t) {
  const n = scene(t);
  gPart.fill(-1); gDepth.fill(99); gLum.fill(0); gTag.fill(0); gChar.fill(0); gBody.fill(0);
  // project + depth test (painter far-to-near == per-cell nearest)
  const pIx = new Int32Array(n), pIy = new Int32Array(n);
  const pZ = new Float32Array(n), pS = new Float32Array(n), pT = new Int16Array(n), pP = new Int16Array(n);
  const pOk = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const rx = aW[i * 3] - EYE[0], ry = aW[i * 3 + 1] - EYE[1], rz = aW[i * 3 + 2] - EYE[2];
    const x = rx * RIGHT[0] + ry * RIGHT[1] + rz * RIGHT[2];
    const y = rx * UP[0] + ry * UP[1] + rz * UP[2];
    const z = rx * FWD[0] + ry * FWD[1] + rz * FWD[2];
    const zz = Math.max(z, 0.2);
    const sx = (0.5 + x / zz * FPROJ * 0.5) * COLS;
    const sy = (0.5 - y / zz * FPROJ * 0.5 * ASPECT) * ROWS;
    const ix = sx | 0, iy = sy | 0;
    const ok = ix >= 0 && ix < COLS && iy >= 0 && iy < ROWS && z > 0.2;
    pIx[i] = ix; pIy[i] = iy; pZ[i] = z; pS[i] = aS[i]; pT[i] = aT[i]; pP[i] = aPP[i]; pOk[i] = ok ? 1 : 0;
    if (ok && pP[i] >= 0) {
      const cell = iy * COLS + ix;
      if (z < gDepth[cell]) {
        gPart[cell] = pP[i]; gDepth[cell] = z; gLum[cell] = aS[i]; gTag[cell] = aT[i]; gBody[cell] = 1;
      }
    }
  }
  // outlines
  const gEdge = new Uint8Array(ROWS * COLS);
  const gGx = new Int16Array(ROWS * COLS), gGy = new Int16Array(ROWS * COLS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = r * COLS + c;
    if (!gBody[cell]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const rr = r + dy, cc = c + dx;
      const nb = (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) ? -1 : gPart[rr * COLS + cc];
      const nz = (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) ? 99 : gDepth[rr * COLS + cc];
      const out = (nb < 0) || (nb !== gPart[cell] && nz > gDepth[cell] + 0.02);
      if (out) {
        gGx[cell] += dx; gGy[cell] += dy;
        if (dx === 0 || dy === 0) gEdge[cell] = 1;
      }
    }
  }
  // chars for body cells
  let count = 0;
  const t4 = Math.floor(t * 4);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = r * COLS + c;
    if (!gBody[cell]) { gLum[cell] = 0; continue; }
    count++;
    const h = gH[cell];
    const level = Math.min(3, Math.max(0, Math.floor(gLum[cell] * 3.2)));
    const inside = FILL[level * 12 + ((h + ((t4 + h % 11) | 0)) % 12 + 12) % 12];
    let ch;
    if (gEdge[cell]) {
      const gx = gGx[cell], gy = gGy[cell], ax = Math.abs(gx), ay = Math.abs(gy);
      if (ax + ay === 0) ch = AT["+"];
      else if (ax > 2 * ay) ch = AT["|"];
      else if (ay > 2 * ax) ch = gy > 0 ? AT["_"] : AT["-"];
      else ch = gx * gy > 0 ? AT["/"] : AT["\\"];
    } else ch = inside;
    const sparkle = gTag[cell] === GLINT || gTag[cell] === FIRE_R || gTag[cell] === FIRE_B || gTag[cell] === FIRE_G;
    if (sparkle) ch = AT["*"];
    gChar[cell] = ch;
    gLum[cell] = gEdge[cell] ? Math.max(0.75, gLum[cell]) : Math.min(1, Math.max(0.3, gLum[cell]));
  }
  // particles / reflection / stars (only onto cells without body)
  for (let i = 0; i < n; i++) {
    if (!pOk[i] || pP[i] >= 0 || pS[i] <= 0.02) continue;
    const cell = pIy[i] * COLS + pIx[i];
    if (gBody[cell]) continue;
    if (pZ[i] >= gDepth[cell]) continue;   // nearest particle wins (painter order)
    gDepth[cell] = pZ[i];
    const fs = pS[i], ft = pT[i], fi = pIy[i], fj = pIx[i];
    let letter;
    if (ft === REFL) letter = FILL[Math.min(1, Math.max(0, Math.floor(fs * 6))) * 12 + (fi * 31 + fj) % 12];
    else if (ft === DUST) letter = fs > 0.7 ? AT["*"] : fs > 0.35 ? AT["+"] : AT["."];
    else if (ft === STAR) letter = AT["."];
    else letter = (fi + fj) % 3 === 0 ? AT["&"] : (fi + fj) % 3 === 1 ? AT["8"] : AT["%"];
    gChar[cell] = letter; gLum[cell] = Math.min(1, Math.max(0, fs)); gTag[cell] = ft;
  }
  // rays from the six brightest sparkles
  const scores = [];
  for (let cell = 0; cell < ROWS * COLS; cell++) {
    const sparkle = gBody[cell] && (gTag[cell] === GLINT || gTag[cell] === FIRE_R || gTag[cell] === FIRE_B || gTag[cell] === FIRE_G);
    if (sparkle) scores.push([gLum[cell] + (gH[cell] % 7) * 0.01, cell]);
  }
  scores.sort((a, b) => b[0] - a[0]);
  for (let q = 0; q < Math.min(6, scores.length); q++) {
    if (scores[q][0] <= 0) break;
    const cell = scores[q][1], cy = Math.floor(cell / COLS), cx = cell % COLS;
    const pulse = 0.5 + 0.5 * Math.sin(t * 7 + q * 1.7);
    const reach = Math.floor(5 + 9 * pulse);
    for (let dist = 1; dist <= reach; dist++) {
      const fade = 1 - dist / (reach + 1);
      const arms = [[0, 1, "-"], [0, -1, "-"], [1, 0, "|"], [-1, 0, "|"]];
      for (const [dy, dx, chs] of arms) {
        const yy = cy + dy * dist, xx = cx + dx * dist * 2;
        if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS) {
          const cc2 = yy * COLS + xx;
          if (gLum[cc2] < fade) { gChar[cc2] = AT[chs]; gLum[cc2] = fade; gTag[cc2] = GLINT; }
        }
      }
      if (dist <= Math.floor(reach / 2)) {
        const diag = [[1, 1, "\\"], [-1, -1, "\\"], [1, -1, "/"], [-1, 1, "/"]];
        for (const [dy, dx, chs] of diag) {
          const yy = cy + dy * dist, xx = cx + dx * dist;
          if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS) {
            const cc2 = yy * COLS + xx;
            if (gLum[cc2] < fade * 0.7) { gChar[cc2] = AT[chs]; gLum[cc2] = fade * 0.7; gTag[cc2] = GLINT; }
          }
        }
      }
    }
    gChar[cell] = AT["*"]; gLum[cell] = 1.0;
  }
  return count;
}

// ---------- colors ----------
const COLORS = [
  [214, 220, 232], [232, 236, 244], [226, 238, 255], [255, 255, 255], [255, 170, 200],
  [160, 210, 255], [255, 230, 160], [255, 214, 140], [150, 150, 165], [120, 120, 140],
];
const DIM = "rgb(110,104,120)", PINK = "rgb(255,122,182)", SIGNC = "rgb(120,112,128)";
const SIGN = "@jin_22ee · 2026";

// ---------- glyph atlas (one 6x9 tile per character, like glyphs()) ----------
const atlas = new Float32Array(NCHARS * CW * CH);
{
  const tc = document.createElement("canvas"); tc.width = CW; tc.height = CH;
  const tx = tc.getContext("2d", { willReadFrequently: true });
  tx.font = FONT_PX + "px consolas,menlo,dejavusansmono,couriernew,monospace";
  tx.textBaseline = "middle"; tx.textAlign = "center";
  for (let i = 0; i < NCHARS; i++) {
    tx.clearRect(0, 0, CW, CH);
    tx.fillStyle = "#fff";
    tx.fillText(CHARS[i], CW / 2, CH / 2 + 0.5);
    const d = tx.getImageData(0, 0, CW, CH).data;
    for (let p = 0; p < CW * CH; p++) atlas[i * CW * CH + p] = d[p * 4] / 255;
  }
}

// ---------- surfaces ----------
const SHAPE_W = COLS * CW, SHAPE_H = ROWS * CH;   // 1080 x 954
const shapeImg = new ImageData(SHAPE_W, SHAPE_H);
const trailImg = new ImageData(W, H);
const shapePx = shapeImg.data, trailPx = trailImg.data;
for (let i = 3; i < shapePx.length; i += 4) shapePx[i] = 255;
for (let i = 3; i < trailPx.length; i += 4) trailPx[i] = 255;

function compose() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = r * COLS + c;
    const ch = gChar[cell];
    let cr = 0, cg = 0, cb = 0, aOff = 0;
    if (ch !== 0) {
      const col = COLORS[Math.min(COLORS.length - 1, Math.max(0, gTag[cell]))];
      const lum = Math.min(1, Math.max(0, gLum[cell]));
      aOff = ch * CW * CH;
      cr = col[0] * lum; cg = col[1] * lum; cb = col[2] * lum;
    }
    for (let py = 0; py < CH; py++) {
      let o = ((r * CH + py) * SHAPE_W + c * CW) * 4;
      let ao = aOff + py * CW;
      for (let px = 0; px < CW; px++, o += 4, ao++) {
        const m = ch === 0 ? 0 : atlas[ao];
        shapePx[o] = m * cr; shapePx[o + 1] = m * cg; shapePx[o + 2] = m * cb;
      }
    }
  }
}

function resetTrail() { for (let i = 0; i < trailPx.length; i += 4) { trailPx[i] = 0; trailPx[i + 1] = 0; trailPx[i + 2] = 0; } }
resetTrail();

function blendTrail() {
  const FADE = 127 / 255;
  for (let i = 0; i < trailPx.length; i += 4) {
    trailPx[i] *= FADE; trailPx[i + 1] *= FADE; trailPx[i + 2] *= FADE;
  }
  // max-blend the shape into the top of the trail
  for (let i = 0; i < shapePx.length; i += 4) {
    if (shapePx[i] > trailPx[i]) trailPx[i] = shapePx[i];
    if (shapePx[i + 1] > trailPx[i + 1]) trailPx[i + 1] = shapePx[i + 1];
    if (shapePx[i + 2] > trailPx[i + 2]) trailPx[i + 2] = shapePx[i + 2];
  }
}

// ---------- screen / glow ----------
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const trailCanvas = document.createElement("canvas"); trailCanvas.width = W; trailCanvas.height = H;
const trailCtx = trailCanvas.getContext("2d");
const small4 = document.createElement("canvas"); small4.width = W / 4; small4.height = H / 4;
const s4ctx = small4.getContext("2d");
const small8 = document.createElement("canvas"); small8.width = W / 8; small8.height = H / 8;
const s8ctx = small8.getContext("2d");

function hud(info, t, count) {
  ctx.font = "17px consolas,menlo,dejavusansmono,couriernew,monospace";
  ctx.textBaseline = "alphabetic";
  // On-canvas signature and counters hidden at the site owner's request;
  // attribution remains in this file's header comment and web/README.md.
  ctx.fillStyle = PINK; ctx.textAlign = "right";
  ctx.fillText((Math.floor(t * 2) % 2 === 0 ? "●" : " ") + " t " + t.toFixed(2).padStart(5, "0") + "s", W - 64, 30 + 13);
  ctx.textAlign = "left";
}

function present(info, t, count) {
  trailCtx.putImageData(trailImg, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(trailCanvas, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  s4ctx.clearRect(0, 0, W / 4, H / 4);
  try { s4ctx.filter = "blur(1px)"; } catch (e) {}
  s4ctx.drawImage(trailCanvas, 0, 0, W / 4, H / 4);
  try { s4ctx.filter = "none"; } catch (e) {}
  ctx.globalAlpha = 0.75;
  ctx.drawImage(small4, 0, 0, W, H);
  s8ctx.clearRect(0, 0, W / 8, H / 8);
  try { s8ctx.filter = "blur(2px)"; } catch (e) {}
  s8ctx.drawImage(trailCanvas, 0, 0, W / 8, H / 8);
  try { s8ctx.filter = "none"; } catch (e) {}
  ctx.globalAlpha = 0.45;
  ctx.drawImage(small8, 0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  hud(info, t, count);
}

// ---------- main loop ----------
let t = 0, paused = false, last = 0;
function tick(ts) {
  requestAnimationFrame(tick);
  if (paused) return;
  if (last && ts - last < 30) return;
  const dt = last ? Math.min((ts - last) / 1000, 1 / 15) : 0;
  last = ts;
  t += dt;
  if (t > LOOP) { t = 0; resetTrail(); }
  const count = frame(t);
  compose();
  blendTrail();
  present(INFO, t, count);
}
requestAnimationFrame(tick);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { paused = !paused; e.preventDefault(); }
  else if (e.code === "KeyR") { t = 0; resetTrail(); }
  else if (e.code === "KeyS") {
    const a = document.createElement("a");
    a.download = "diamond_ring_" + Math.floor(Date.now() / 1000) + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }
});
