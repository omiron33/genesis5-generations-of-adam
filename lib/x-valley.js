// The valley of names: a long dry valley east of the garden with a dirt road running up it, and a
// line of standing stones beside the road, one for each generation from Adam to Noe. Each stone has
// its name and its lines cut into a dressed face, and a clay lamp burning on a flat rock at its
// foot. Grass moves in gusts that travel up the valley, dust turns in the lamplight, cloud crosses
// the sky, stars turn at night. Time of day, which stones carry words, and which lamps are lit are
// set per shot by uniforms.
//
// Scene coordinates are metres, y up. The road runs up the valley toward +z; the stones stand on its
// +x side (the left as you walk up it), facing back down the road toward the walker.
import { G_COMMON } from '/song/lib/g-common.js';
import { LIFE_GLSL } from '/kit/life.js';

export const STONE_Z0 = 24, STONE_DZ = 18, STONES = 10;
export const NAMES = ['ADAM', 'SETH', 'ENOS', 'CAINAN', 'MALELEEL', 'JARED', 'ENOCH', 'MATHUSALA', 'LAMECH', 'NOE'];
export const roadX = (z) => 2.2 * Math.sin(z * 0.031) + 1.0 * Math.sin(z * 0.077 + 1.3);
// terrain height at (x, z), the JS twin of the shader's (low octaves only: for placing cameras)
const hh = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
export function groundY(x, z) {
  const d = x - roadX(z);
  return 9 * smooth(6, 40, Math.abs(d)) + 30 * smooth(40, 140, Math.abs(d)) + 0.8 * Math.sin(x * 0.021 + 1.0) * Math.sin(z * 0.017) - 0.06 * (1 - smooth(1.2, 2.4, Math.abs(d)));
}
function smooth(a, b, x) { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }
function vn(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = (f) => f * f * f * (f * (f * 6 - 15) + 10);
  const h2 = (a, b) => { let p3 = [(a * 0.1031) % 1, (b * 0.1031) % 1, (a * 0.1031) % 1].map((v) => (v + 1) % 1); const d = p3[0] * (p3[1] + 33.33) + p3[1] * (p3[2] + 33.33) + p3[2] * (p3[0] + 33.33); p3 = p3.map((v) => v + d); return ((p3[0] + p3[1]) * p3[2]) % 1; };
  const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), e = h2(ix + 1, iz + 1);
  return a + (b - a) * u(fx) + (c - a) * u(fz) + (a - b - c + e) * u(fx) * u(fz);
}
// a stone's frame: base position, face normal (xz), height
export function stone(i) {
  const z = STONE_Z0 + STONE_DZ * i;
  const x = roadX(z) + 2.6 + 0.3 * Math.sin(i * 2.1);
  const nx = -0.75, nz = -0.66, l = Math.hypot(nx, nz);
  const H = 2.35 + 0.35 * ((i * 0.37) % 1);
  return { x, z, y: groundY(x, z), n: [nx / l, 0, nz / l], H, face: [x + (nx / l) * 0.27, groundY(x, z) + 1.3, z + (nz / l) * 0.27] };
}
// the wick of the lamp at stone i (world, approximate), for the camera to look at
export function lampWick(i) {
  const s = stone(i), r = [-0.66 / Math.hypot(0.66, 0.75), 0, 0.75 / Math.hypot(0.66, 0.75)];
  const lx = 0.10 + 0.085 * Math.cos(2.4), lz = 0.62 + 0.085 * Math.sin(2.4);
  return [s.x + r[0] * lx + s.n[0] * lz, s.y + 0.16, s.z + r[2] * lx + s.n[2] * lz];
}

export const VALLEY_GLSL = /* glsl */ `
uniform float uSlot[10];      // which column of the text canvas stone i's face reads (-1: none)
uniform float uLamp[10];      // how brightly stone i's lamp burns (0: unlit)
uniform float uSpin, uWind, uGrass, uExposureSky;
uniform vec4 uLedge;          // ledge: x, z, yaw, text column (-1: no ledge)
uniform vec4 uGroundRect;     // ground text: x0, z0, x1, z1 in world (read from the far end down)
uniform float uGroundSlot;    // its text column (-1: none)
uniform float uCols;          // columns in the text canvas
uniform float uInk;           // brightness of the light in the cut words (daylight needs more)
uniform float uHomes;         // homes with lamplit doors and smoke on the far slopes (0..1)
uniform float uField;         // Lamech's field across the road from his stone (0..1)
uniform vec2 uPray;           // stone index and strength: its lamp's smoke rises tall and lit, a prayer going up
uniform float uToil;          // Lamech's toil: sweat drops darkening the dust and breath mist by the plough (0..1)
uniform float uGreen;         // the field turning: thorns give way to green shoots in the furrows (0..1)
uniform float uWalkers[9];    // three lamps at the heads of three paths (x, y, z each); y < -50: none
uniform float uGlows[72];
uniform float uFronts[9];     // flames running along grooves from Noe's lamp to his sons' lamps     // small lamps along the three paths (x, y, z each); y < -50: none


float roadX(float z) { return 2.2 * sin(z * 0.031) + 1.0 * sin(z * 0.077 + 1.3); }
float terrainLo(vec2 q) {
  float d = abs(q.x - roadX(q.y));
  float h = 9.0 * smoothstep(6.0, 40.0, d) + 30.0 * smoothstep(40.0, 140.0, d);
  h += 0.8 * sin(q.x * 0.021 + 1.0) * sin(q.y * 0.017);
  if (d > 3.0) { float r = 1.0 - abs(fbm(q * 0.018, 4) * 2.0 - 1.0); h += (0.6 * (fbm(q * 0.07, 3) - 0.5) + 7.0 * r * r) * smoothstep(3.0, 30.0, d); }
  // far mountains closing the valley
  float md = d + max(0.0, q.y - 400.0) * 0.5;
  if (md > 180.0) h += 180.0 * smoothstep(180.0, 700.0, md) * (0.6 + 0.6 * fbm(q * 0.004, 4));
  h -= 0.06 * (1.0 - smoothstep(1.2, 2.4, d));          // the road, worn a little lower
  return h;
}
float terrain(vec2 q) {
  float d = abs(q.x - roadX(q.y));
  float h = terrainLo(q);
  h += 0.12 * (fbm(q * 0.6, 4) - 0.5) * smoothstep(1.5, 3.5, d);
  h += 0.018 * (vnoise(q * 7.0) - 0.5);
  // Lamech's ploughed field: furrows across the road from his stone
  if (uField > 0.0) {
    float fx = q.x - roadX(q.y);
    float inF = smoothstep(-3.2, -4.2, fx) * smoothstep(-19.0, -17.5, fx) * smoothstep(150.0, 153.0, q.y) * smoothstep(188.0, 185.0, q.y);
    float fur = sin(q.x * 9.0 + 0.6 * sin(q.y * 0.3)) ;
    h += inF * uField * (0.045 * fur + 0.02 * (fbm(q * 3.0, 3) - 0.5));
  }
  // ruts along the road
  float rx = q.x - roadX(q.y);
  h -= 0.025 * exp(-pow((abs(rx) - 0.65) / 0.14, 2.0)) * (1.0 - smoothstep(1.4, 2.2, abs(rx)));
  return h;
}
vec3 terrainN(vec2 q, float t) {
  float e = 0.01 + t * 0.0015;
  return normalize(vec3(terrain(q - vec2(e, 0.0)) - terrain(q + vec2(e, 0.0)), 2.0 * e, terrain(q - vec2(0.0, e)) - terrain(q + vec2(0.0, e))));
}

// ---------------------------------------------------------------- the stones
vec3 stoneBase(int i) {
  float z = ${'${Z0}'} + ${'${DZ}'} * float(i);
  float x = roadX(z) + 2.6 + 0.3 * sin(float(i) * 2.1);
  return vec3(x, 0.8 * sin(x * 0.021 + 1.0) * sin(z * 0.017), z);
}
float stoneH(int i) { return 2.35 + 0.35 * fract(float(i) * 0.37); }
const vec3 SN = normalize(vec3(-0.75, 0.0, -0.66));          // face normal
const vec3 ST = normalize(vec3(-0.66, 0.0, 0.75));           // face right (cross(-n, up))
vec3 toStone(vec3 p, int i) {
  vec3 d = p - stoneBase(i);
  vec3 q = vec3(dot(d, ST), d.y, dot(d, SN));
  float lean = 0.03 + 0.03 * sin(float(i) * 1.7);          // a little settled back after the years
  q.yz = mat2(cos(lean), -sin(lean), sin(lean), cos(lean)) * q.yz;
  return q;
}
float stoneSD(vec3 q, float H, float seed, out float face) {
  // a quarried menhir: tapered, a little bent, corners broken off on a few planes, a slanted broken
  // top, weathered skin; the front face dressed flat where the words are cut
  float y = sat(q.y / H);
  float k = 1.0 - 0.2 * y;
  vec3 b = vec3(q.x / k + 0.05 * sin(q.y * 1.3 + seed), q.y - H * 0.5, q.z / mix(1.0, 0.85, y));
  float d = sdBox(b, vec3(0.56, H * 0.5, 0.26) - 0.05) - 0.05;
  d *= k;
  for (int i = 0; i < 5; i++) {
    float fi = float(i) + seed * 3.1;
    vec3 h = hash33(vec3(fi, seed, 1.7)) - 0.5;
    vec3 n = normalize(vec3(sign(h.x) * (0.6 + 0.4 * abs(h.x)), h.y * 0.25, -(0.35 + abs(h.z))));
    float off = 0.5 + 0.12 * hash11(fi * 7.3);
    vec3 c = vec3(0.0, H * (0.15 + 0.7 * hash11(fi * 3.7)), 0.0);
    d = smax(d, dot(q - c, n) - off, 0.04);
  }
  float top = H - 0.32 * (q.x * (0.6 + 0.5 * hash11(seed)) + 0.25) * (0.5 + 0.5 * hash11(seed + 1.0)) + 0.1 * (vnoise(vec2(q.x * 4.0 + seed, q.z * 4.0)) - 0.5);
  d = smax(d, q.y - top, 0.06);
  face = smoothstep(0.17, 0.24, q.z) * smoothstep(0.5, 0.4, abs(q.x)) * smoothstep(0.2, 0.4, q.y) * smoothstep(top - 0.05, top - 0.25, q.y);
  if (d < 0.12) {
    float r = fbm(q * 2.7 + seed, 4) - 0.5;
    float rr = vnoise(q * 19.0 + seed) - 0.5;
    float pit = smoothstep(0.62, 0.8, vnoise(q * 9.0 + seed * 2.0));
    d += (0.05 * r + 0.012 * rr + 0.012 * pit) * (1.0 - 0.88 * face);
    d += 0.002 * rr * face;
  }
  return d;
}
// the flat rock the lamp stands on, in the stone's frame
float rockSD(vec3 q) {
  vec3 r = q - vec3(0.18, 0.04, 0.62);
  float d = sdEllipsoid(r, vec3(0.24, 0.12, 0.19));
  d = smax(d, r.y - 0.075, 0.03);
  if (d < 0.05) d += 0.012 * (fbm(q * 9.0, 3) - 0.5);
  return d;
}
const vec3 LAMP_AT = vec3(0.10, 0.115, 0.62);                 // lamp base on the rock (stone frame)
const float LAMP_YAW = 2.4;                                   // spout turned toward the road
vec3 toLamp(vec3 q) {
  vec3 l = q - LAMP_AT;
  float c = cos(LAMP_YAW), s = sin(LAMP_YAW);
  return vec3(c * l.x + s * l.z, l.y, -s * l.x + c * l.z);
}
vec3 wickWorld(int i) {
  vec3 w = LAMP_WICK;
  float c = cos(LAMP_YAW), s = sin(LAMP_YAW);
  vec3 l = vec3(c * w.x - s * w.z, w.y, s * w.x + c * w.z) + LAMP_AT;
  float lean = 0.03 + 0.03 * sin(float(i) * 1.7);
  l.yz = mat2(cos(-lean), -sin(-lean), sin(-lean), cos(-lean)) * l.yz;
  return stoneBase(i) + ST * l.x + vec3(0.0, l.y, 0.0) + SN * l.z;
}

// nearest stones to p: the index range worth testing
void stoneRange(float z, out int a, out int b) {
  int c = int(floor((z - ${'${Z0}'}) / ${'${DZ}'} + 0.5));
  a = clamp(c - 1, 0, 9); b = clamp(c + 1, 0, 9);
}

// mat: 1 stone, 2 rock, 3 lamp
float objects(vec3 p, out float mat, out int which, out float face) {
  float d = 1e5; mat = 0.0; which = -1; face = 0.0;
  int a, b; stoneRange(p.z, a, b);
  for (int i = a; i <= b; i++) {
    vec3 q = toStone(p, i);
    float bound = length(max(abs(q - vec3(0.1, 1.4, 0.3)) - vec3(0.9, 1.6, 0.75), 0.0));
    if (bound > 0.3) { d = min(d, bound); continue; }
    float f;
    float s = stoneSD(q, stoneH(i), float(i) * 7.3, f);
    if (s < d) { d = s; mat = 1.0; which = i; face = f; }
    float r = rockSD(q);
    if (r < d) { d = r; mat = 2.0; which = i; }
    vec3 lq = toLamp(q);
    if (length(lq) < 0.15) {
      float l = lampSD(lq);
      if (l < d) { d = l; mat = 3.0; which = i; }
    } else d = min(d, length(lq) - 0.1);
  }
  // the inscribed ledge: a broad boulder with one dressed, sloping face
  if (uLedge.w >= 0.0) {
    vec3 c = vec3(uLedge.x, 0.8 * sin(uLedge.x * 0.021 + 1.0) * sin(uLedge.y * 0.017), uLedge.y);
    vec3 q = p - c;
    float cy = cos(uLedge.z), sy = sin(uLedge.z);
    q = vec3(cy * q.x + sy * q.z, q.y, -sy * q.x + cy * q.z);
    float bd = length(max(abs(q - vec3(0.0, 0.6, 0.0)) - vec3(1.8, 1.0, 1.4), 0.0));
    if (bd < 0.3) {
      float l = sdEllipsoid(q - vec3(0.0, 0.1, 0.3), vec3(1.7, 1.15, 1.2) * (0.85 + 0.3 * vec3(vnoise(q.yz * 1.3 + 2.0), vnoise(q.xz * 1.1 + 5.0), vnoise(q.xy * 1.2 + 8.0))));
      l = smax(l, dot(q - vec3(0.0, 0.55, -0.35), normalize(vec3(0.0, 0.55, -1.0))), 0.08);     // the dressed face, leaning back
      // broken planes on the back and ends
      l = smax(l, dot(q - vec3(1.2, 0.5, 0.4), normalize(vec3(1.0, 0.35, 0.3))), 0.06);
      l = smax(l, dot(q - vec3(-1.25, 0.5, 0.3), normalize(vec3(-1.0, 0.25, 0.4))), 0.06);
      l = smax(l, dot(q - vec3(0.2, 0.95, 0.5), normalize(vec3(0.15, 1.0, 0.6))), 0.08);
      float fq = smoothstep(0.06, 0.0, abs(dot(q - vec3(0.0, 0.55, -0.35), normalize(vec3(0.0, 0.55, -1.0)))));
      l += (0.11 * (fbm(q * 1.6, 4) - 0.5) + 0.025 * (fbm(q * 6.0, 3) - 0.5) + 0.006 * (vnoise(q * 25.0) - 0.5)) * (1.0 - 0.9 * fq);
      if (l < d) { d = l; mat = 4.0; face = fq; }
    } else d = min(d, bd);
  }
  // houses on the far slope: thick mud walls, flat roofs
  if (uHomes > 0.0 && p.x < roadX(p.z) - 15.0) {
    for (int k = 0; k < 7; k++) {
      float z = 70.0 + 16.0 * float(k) + 6.0 * sin(float(k) * 2.3);
      float x = roadX(z) - 26.0 - 22.0 * hash11(float(k) * 3.7);
      vec3 c = vec3(x, terrainLo(vec2(x, z)) - 0.2, z);
      vec3 q = p - c;
      if (dot(q, q) > 100.0) continue;
      float hb = sdBox(q - vec3(0.0, 1.3, 0.0), vec3(2.2, 1.3, 1.7) - 0.08) - 0.08;
      hb += 0.03 * (fbm(q * 1.5, 3) - 0.5);
      hb = max(hb, -sdBox(q - vec3(0.4, 0.85, 1.7), vec3(0.42, 0.85, 0.5)));    // the doorway
      if (hb < d) { d = hb; mat = 5.0; which = k; }
    }
  }
  // the plough left at the end of a furrow
  if (uField > 0.0) {
    vec3 c = vec3(roadX(170.0) - 6.0, 0.8 * sin((roadX(170.0) - 6.0) * 0.021 + 1.0) * sin(170.0 * 0.017), 170.0);
    vec3 q = p - c;
    if (dot(q, q) < 9.0) {
      float w = sdCapsule(q, vec3(-0.2, 0.05, -0.6), vec3(0.1, 0.55, 1.9), 0.055);          // the beam, resting on the ground
      w = min(w, sdCapsule(q, vec3(-0.25, 0.02, -0.75), vec3(-0.3, 0.95, -1.25), 0.04));   // the handle
      w = min(w, sdRoundCone(q, vec3(-0.25, 0.02, -0.75), vec3(-0.12, 0.02, -0.2), 0.05, 0.02)); // the share
      w += 0.004 * (vnoise(vec3(q.x * 40.0, q.y * 40.0, q.z * 3.0)) - 0.5);
      if (w < d) { d = w; mat = 6.0; }
    } else d = min(d, sqrt(dot(q, q)) - 2.2);
  }
  return d;
}
vec3 objNormal(vec3 p) {
  vec2 e = vec2(0.0012, 0.0); float m, f; int w;
  return normalize(vec3(objects(p + e.xyy, m, w, f) - objects(p - e.xyy, m, w, f), objects(p + e.yxy, m, w, f) - objects(p - e.yxy, m, w, f), objects(p + e.yyx, m, w, f) - objects(p - e.yyx, m, w, f)));
}

// ---------------------------------------------------------------- grass
// Dry valley grass as a thin volume over the ground: blades on a jittered grid, each leaning and
// bending in the gusts (the tip lagging the root), thinning on the road. Returns coverage and colour.
vec4 grassAt(vec3 p, float ground, float roadD) {
  float hgt = 0.26 + 0.12 * vnoise(p.xz * 0.7);
  float y = (p.y - ground) / hgt;
  if (y < 0.0 || y > 1.0) return vec4(0.0);
  float dens = smoothstep(1.0, 2.3, roadD) * uGrass;
  if (dens <= 0.0) return vec4(0.0);
  vec2 sway = lifeSway(vec3(p.x, 0.0, p.z), y, vec2(0.25, 1.0), 0.09 * uWind).xz;
  vec2 g = (p.xz - sway) / 0.045;
  vec2 id = floor(g), f = fract(g);
  float cov = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = id + vec2(i, j);
    vec2 h = hash22(c);
    vec2 lean = (hash22(c + 7.7) - 0.5) * 0.9 * y * y;
    vec2 o = vec2(i, j) + h + lean - f;
    float w = 0.13 * (1.0 - y) * (0.6 + 0.6 * hash12(c + 3.3));
    float alive = step(hash12(c + 1.1), dens * (0.55 + 0.45 * vnoise(c * 0.13)));
    float hb = 0.55 + 0.45 * hash12(c + 9.1);
    cov = max(cov, alive * step(y, hb) * smoothstep(w, w * 0.4, length(o)));
  }
  vec3 col = mix(vec3(0.20, 0.17, 0.08), vec3(0.62, 0.52, 0.30), y) * (0.75 + 0.5 * vnoise(p.xz * 3.0));
  return vec4(col, cov);
}

// ---------------------------------------------------------------- light
float shadowRay(vec3 p, vec3 l) {
  float res = 1.0, t = 0.05;
  for (int i = 0; i < 28; i++) {
    vec3 q = p + l * t;
    float m, f; int w;
    // the shadow marches the smooth terrain, which can sit a little above the detailed ground the
    // point is on; allow for that near the start so the ground doesn't shadow itself in blotches
    float h = q.y - terrainLo(q.xz) + 0.16 * exp(-t * 0.8);
    if (t < 12.0) h = min(h, objects(q, m, w, f));
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.05, 4.0);
    if (res < 0.01 || t > 150.0 || q.y > 270.0) break;
  }
  return sat(res);
}
// the warm light of the lit lamps near p (with their flicker)
vec3 lampLight(vec3 p, vec3 n, out float near) {
  vec3 acc = vec3(0.0); near = 0.0;
  int a, b; stoneRange(p.z, a, b);
  for (int i = a; i <= b; i++) {
    if (uLamp[i] <= 0.0) continue;
    vec3 w = wickWorld(i) + vec3(0.0, 0.025, 0.0);
    vec3 d = w - p; float r2 = dot(d, d);
    float fl = lifeFlicker(uTime, float(i) * 3.7 + 1.0);
    float k = uLamp[i] * fl / (r2 + 0.02);
    acc += vec3(1.0, 0.52, 0.2) * 0.32 * k * (0.25 + 0.75 * sat(dot(n, d * inversesqrt(r2))));
    near = max(near, uLamp[i] * exp(-r2 * 1.2));
  }
  return acc;
}
`;

// the rest of the valley's shader: needs lampNear before LIFE_GLSL is included
const LAMP_NEAR = /* glsl */ `
uniform float uLampN[10];
float lampNear(vec3 p) {
  float n = 0.0;
  for (int i = 0; i < 10; i++) {
    if (uLampN[i] <= 0.0) continue;
    float z = ${'${Z0}'} + ${'${DZ}'} * float(i);
    if (abs(p.z - z) > 5.0) continue;
    float x = 2.2 * sin(z * 0.031) + 1.0 * sin(z * 0.077 + 1.3) + 2.6 + 0.3 * sin(float(i) * 2.1);
    vec2 d = p.xz - vec2(x - 0.3, z - 0.3);
    n = max(n, uLampN[i] * exp(-dot(d, d) * 1.4 - max(p.y - 0.2, 0.0) * 1.2));
  }
  return n;
}
`;

const SHADE = /* glsl */ `
vec3 atmosphere(vec3 col, vec3 ro, vec3 rd, float t) {
  float fog = 1.0 - exp(-t * uFogDen * (0.35 + 0.65 * exp(-max(ro.y, 0.0) * 0.05)));
  vec3 fc = uFogCol + uSunCol * 0.25 * pow(max(dot(rd, uSunDir), 0.0), 6.0);
  return mix(col, fc, fog);
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  // march: terrain heightfield and the stones
  float t = 0.05, hitT = -1.0, mat = 0.0, face = 0.0; int which = -1;
  for (int i = 0; i < 320; i++) {
    vec3 p = ro + rd * t;
    float ht = p.y - terrainLo(p.xz);
    float m, f; int w;
    float o = objects(p, m, w, f);
    if (o < 0.0004 * t + 0.0003) { hitT = t; mat = m; which = w; face = f; break; }
    if (ht < 0.002 * t) {
      // refine against the detailed terrain
      float lo = t - max(0.02, ht * 0.4 + 0.02), hi = t;
      for (int k = 0; k < 6; k++) { float mid = 0.5 * (lo + hi); vec3 q = ro + rd * mid; if (q.y - terrain(q.xz) < 0.0) hi = mid; else lo = mid; }
      hitT = hi; mat = 0.0; break;
    }
    t += min(o, max(0.012 + t * 0.004, ht * (t < 30.0 ? 0.45 : 0.32)));
    if (t > 2500.0 || (p.y > 270.0 && rd.y >= 0.0)) break;
  }
  if (hitT < 0.0) { vec3 pe = ro + rd * t; if (pe.y < terrainLo(pe.xz) + 8.0 && t < 2500.0) { hitT = t; mat = 0.0; } }
  float spin = uSpin;
  vec3 col;
  float depth = hitT < 0.0 ? 1e4 : hitT;
  if (hitT < 0.0) {
    col = skyColor(rd, spin) * uExposureSky;
  } else {
    vec3 p = ro + rd * hitT;
    vec3 n, alb; float rough = 1.0;
    vec3 emit = vec3(0.0);
    if (mat == 0.0) {
      n = terrainN(p.xz, hitT);
      float rd2 = abs(p.x - roadX(p.z));
      float dirt = 1.0 - smoothstep(1.3, 2.4, rd2);
      float gp = fbm(p.xz * 0.15, 3);
      vec3 grassC = mix(vec3(0.20, 0.18, 0.10), vec3(0.36, 0.31, 0.19), fbm(p.xz * 0.8, 3));
      grassC = mix(grassC, vec3(0.16, 0.18, 0.09), smoothstep(0.45, 0.7, gp) * 0.7);
      vec3 dirtC = mix(vec3(0.36, 0.30, 0.22), vec3(0.50, 0.43, 0.32), vnoise(p.xz * 6.0));
      float pebble = smoothstep(0.6, 0.72, fbm(p.xz * 11.0, 3)) * dirt;
      alb = mix(grassC, dirtC, dirt) * (1.0 - 0.3 * pebble);
      alb = mix(alb, vec3(0.22, 0.2, 0.18), smoothstep(0.55, 0.85, 1.0 - n.y));   // bare rock on steep slopes
      if (uField > 0.0) {
        float fx = p.x - roadX(p.z);
        float inF = smoothstep(-3.2, -4.2, fx) * smoothstep(-19.0, -17.5, fx) * smoothstep(150.0, 153.0, p.z) * smoothstep(188.0, 185.0, p.z);
        vec3 soil = mix(vec3(0.17, 0.12, 0.08), vec3(0.26, 0.19, 0.13), fbm(p.xz * 2.0, 3));
        // thorns and thistle crowding the field: dark spiny clumps
        float th = smoothstep(0.62, 0.72, fbm(p.xz * 1.6 + 9.0, 4));
        soil = mix(soil, vec3(0.07, 0.06, 0.04), th * 0.85 * (1.0 - uGreen));
        // the ache lifted: young green in the furrows, spreading out from the plough
        float rowsG = smoothstep(0.55, 1.0, sin(p.x * 9.0 + 0.6 * sin(p.z * 0.3))) * smoothstep(0.35, 0.65, fbm(p.xz * 1.7 + 3.0, 4));
        float spread = smoothstep(uGreen * 26.0, uGreen * 26.0 - 6.0, length(p.xz - vec2(roadX(170.0) - 6.0, 170.0)));
        soil = mix(soil, mix(vec3(0.12, 0.24, 0.06), vec3(0.22, 0.38, 0.1), vnoise(p.xz * 20.0)), rowsG * spread * uGreen * (0.6 + 0.4 * vnoise(p.xz * 7.0)));
        alb = mix(alb, soil, inF * uField);
        if (uToil > 0.0) {
          // drops of sweat fallen by the plough's grip, each darkening the dust where it lands
          vec2 g = vec2(roadX(170.0) - 6.0 - 0.3, 170.0 - 1.4);
          for (int k = 0; k < 14; k++) {
            float fk = float(k);
            vec2 c = g + (hash22(vec2(fk, 3.0)) - 0.5) * vec2(0.8, 0.9);
            float tk = 211.9 + fk * 0.85;
            float wet = smoothstep(tk, tk + 0.15, uTime) * uToil;
            alb *= 1.0 - 0.55 * wet * smoothstep(0.03, 0.012, length(p.xz - c));
          }
        }
      }
      if (uGroundSlot >= 0.0) {
        vec2 uv = vec2((p.x - uGroundRect.x) / (uGroundRect.z - uGroundRect.x), (p.z - uGroundRect.y) / (uGroundRect.w - uGroundRect.y));
        if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)))) {
          vec4 ins = inscription(vec2((uGroundSlot + uv.x) / uCols, uv.y), n, vec3(sign(uGroundRect.z - uGroundRect.x), 0.0, 0.0), vec3(0.0, 0.0, sign(uGroundRect.w - uGroundRect.y)), 2.6 * uInk);
          alb *= 1.0 - 0.6 * ins.a; emit += ins.rgb;
        }
      }
    } else if (mat == 1.0) {
      n = objNormal(p);
      vec3 q = toStone(p, which);
      float g = fbm(q * 4.0 + float(which), 4);
      alb = mix(vec3(0.15, 0.14, 0.13), vec3(0.36, 0.34, 0.30), g);
      alb *= 0.75 + 0.5 * fbm(q * 14.0, 3);
      // lichen: pale grey-green rosettes and a few orange ones, never on the dressed face
      float li = smoothstep(0.58, 0.72, fbm(q * 6.0 + 11.0, 4)) * (1.0 - face);
      alb = mix(alb, vec3(0.42, 0.44, 0.33), li * 0.8);
      alb = mix(alb, vec3(0.45, 0.25, 0.07), smoothstep(0.75, 0.82, vnoise(q.xy * 9.0 + 3.0)) * (1.0 - face) * 0.7);
      // rain streaks down from the top
      alb *= 1.0 - 0.18 * smoothstep(0.6, 0.9, vnoise(vec2(q.x * 14.0, q.y * 0.8)));
      alb *= 0.9 + 0.1 * face;
      // the words cut into the face
      float slot = uSlot[which];
      if (slot >= 0.0 && face > 0.2) {
        vec2 uv = vec2((slot + q.x / 0.9 + 0.5) / uCols, (q.y - 0.36) / 1.8);
        if (abs(q.x) < 0.45) {
          vec4 ins = inscription(uv, n, ST, vec3(0.0, 1.0, 0.0), 2.4 * uInk);
          alb *= 1.0 - 0.75 * ins.a;
          emit += ins.rgb;
        }
      }
    } else if (mat == 2.0) {
      n = objNormal(p);
      alb = mix(vec3(0.16, 0.15, 0.13), vec3(0.27, 0.25, 0.21), fbm(p * 7.0, 3));
    } else if (mat == 4.0) {
      n = objNormal(p);
      alb = mix(vec3(0.12, 0.115, 0.105), vec3(0.27, 0.25, 0.22), fbm(p * 3.0, 4));
      alb *= 0.7 + 0.6 * fbm(p * 13.0, 3);
      alb = mix(alb, vec3(0.42, 0.44, 0.33), smoothstep(0.6, 0.75, fbm(p * 5.0 + 3.0, 4)) * (1.0 - face) * 0.7);
      if (face > 0.3) {
        vec3 c = vec3(uLedge.x, 0.8 * sin(uLedge.x * 0.021 + 1.0) * sin(uLedge.y * 0.017), uLedge.y);
        vec3 q = p - c; float cy = cos(uLedge.z), sy = sin(uLedge.z);
        q = vec3(cy * q.x + sy * q.z, q.y, -sy * q.x + cy * q.z);
        // face frame: across = -x (viewer looks +z local), up the slope
        vec2 uv = vec2(((1.3 - q.x) / 2.6 + uLedge.w) / uCols, (q.y - 0.05) / 1.05);
        if (abs(q.x) < 1.3 && uv.y > 0.0 && uv.y < 1.0) {
          vec3 tx = vec3(-cy, 0.0, sy) ;
          vec4 ins = inscription(uv, n, tx, vec3(0.0, 1.0, 0.0), 3.2 * uInk);
          alb *= 1.0 - 0.6 * ins.a; emit += ins.rgb;
        }
      }
    } else if (mat == 5.0) {
      n = objNormal(p);
      alb = mix(vec3(0.33, 0.27, 0.2), vec3(0.42, 0.35, 0.27), fbm(p * 2.0, 3));
    } else if (mat == 6.0) {
      n = objNormal(p);
      alb = mix(vec3(0.16, 0.1, 0.06), vec3(0.3, 0.2, 0.12), vnoise(vec3(p.x * 30.0, p.y * 30.0, p.z * 4.0)));
      // the grip worn dark and smooth by hands
      alb *= 1.0 - 0.45 * smoothstep(0.6, 0.85, p.y - (0.8 * sin((roadX(170.0) - 6.0) * 0.021 + 1.0) * sin(170.0 * 0.017)));
    } else {
      vec3 q = toLamp(toStone(p, which));
      n = objNormal(p);
      alb = clayColor(q);
      // soot round the wick, oil gleam in the bowl
      alb *= 1.0 - 0.8 * smoothstep(0.03, 0.0, length(q - LAMP_WICK));
    }
    // light: sun or moon (with soft shadow), sky, lamps
#ifdef NO_SHADOW
    float sh = 1.0;
#else
    float sh = shadowRay(p + n * 0.02, uSunDir);
#endif
    float dif = sat(dot(n, uSunDir));
    vec3 lit = uSunCol * dif * sh;
    float ao = 1.0;
    if (mat >= 1.0) { float m2, f2; int w2; ao = 0.0; for (int k = 1; k <= 4; k++) { float hk = 0.06 * float(k); ao += (hk - objects(p + n * hk, m2, w2, f2)) / hk; } ao = sat(1.0 - 0.25 * ao); }
    lit += uAmb * (0.55 + 0.45 * n.y) * ao + (uSkyHor * 0.3 + uSkyTop * 1.5) * sat(n.y * 0.5 + 0.6) * ao;
    float near;
    lit += lampLight(p, n, near);
    col = alb * lit + emit;
    // grass over the ground near the camera
#ifndef NO_GRASS
    if (mat == 0.0 && hitT < 18.0 && rd.y < -0.06 && ro.y - terrainLo(ro.xz) < 6.0 && uGrass > 0.0) {
      float rd2 = abs(p.x - roadX(p.z));
      // step back up the ray through the grass layer
      float tg = hitT - 0.4 / max(-rd.y, 0.05);
      tg = max(tg, 0.05);
      float tr = 1.0; vec3 gacc = vec3(0.0);
      float steps = 14.0, dt = (hitT - tg) / steps;
      for (int k = 0; k < 14; k++) {
        vec3 q = ro + rd * (tg + dt * (float(k) + 0.5));
        float gy = terrain(q.xz);
        vec4 gr = grassAt(q, gy, abs(q.x - roadX(q.z)));
        if (gr.a > 0.0) {
          float yk = sat((q.y - gy) / 0.3);
          float ndl = 0.5 + 0.5 * sat(dot(normalize(vec3(uSunDir.x, 0.6, uSunDir.z)), uSunDir));
          float gn; vec3 gl = lampLight(q, normalize(vec3(0.0, 1.0, 0.0) - rd * 0.5), gn);
          vec3 c = gr.rgb * (uSunCol * ndl * (0.3 + 0.7 * yk) * sh + uAmb * (0.4 + 0.6 * yk) + gl);
          // back-lit blades glow against a low sun
          c += gr.rgb * uSunCol * 0.8 * pow(sat(dot(rd, uSunDir)), 4.0) * yk;
          gacc += tr * gr.a * c; tr *= 1.0 - gr.a;
          if (tr < 0.03) break;
        }
      }
      col = gacc + tr * col;
    }
#endif
    col = atmosphere(col, ro, rd, hitT);
  }
  // the lamp flames, and dust turning in their light
  for (int i = 0; i < 10; i++) {
    if (uLamp[i] <= 0.0) continue;
    vec3 w = wickWorld(i);
    if (dot(w - ro, rd) < 0.0) continue;
    float dist = length(w - ro);
    if (dist < 25.0) col += uLamp[i] * flameLight(ro, rd, depth, w, 1.0, float(i) * 3.7 + 1.0);
    else col += uLamp[i] * vec3(1.0, 0.5, 0.18) * 0.5 * lifeGlow(ro, rd, w + vec3(0.0, 0.02, 0.0), 0.012 + dist * 0.0006, depth);
  }
  if (uHomes > 0.0) {
    for (int k = 0; k < 7; k++) {
      float z = 70.0 + 16.0 * float(k) + 6.0 * sin(float(k) * 2.3);
      float x = roadX(z) - 26.0 - 22.0 * hash11(float(k) * 3.7);
      vec3 c = vec3(x + 0.4, terrainLo(vec2(x, z)) + 0.5, z + 1.75);
      col += uHomes * vec3(1.0, 0.5, 0.18) * 2.0 * lifeFlicker(uTime, float(k)) * lifeGlow(ro, rd, c, 0.35, depth);
      // lamp smoke rising from the roof, leaning with the wind
      vec3 sc = vec3(x - 0.8, terrainLo(vec2(x, z)) + 2.8, z);
      vec3 oc = sc - ro; float tc = dot(oc, rd);
      if (tc > 0.0 && tc < depth) {
        vec3 hp = ro + rd * tc; vec3 rel = hp - sc;
        float hh = rel.y; if (hh > 0.0 && hh < 14.0) {
          float w = 0.25 + hh * 0.12;
          float dx = rel.x - hh * hh * 0.02 - 0.6 * sin(hh * 0.4 - uTime * 0.5);
          float dens = exp(-dx * dx / (w * w)) * smoothstep(14.0, 4.0, hh) * (0.5 + 0.5 * fbm(vec2(dx * 2.0, hh * 0.7 - uTime * 0.6), 4));
          col = mix(col, uFogCol * 1.4 + uSunCol * 0.04, dens * 0.35 * uHomes);
        }
      }
    }
  }
  for (int k = 0; k < 3; k++) {
    vec3 w = vec3(uWalkers[k * 3], uWalkers[k * 3 + 1], uWalkers[k * 3 + 2]);
    if (w.y < -50.0) continue;
    float dist = length(w - ro);
    col += flameLight(ro, rd, depth, w, 2.2, 40.0 + float(k)) * 1.0 + vec3(1.0, 0.5, 0.18) * 0.6 * lifeGlow(ro, rd, w + vec3(0.0, 0.03, 0.0), 0.02 + dist * 0.0012, depth);
  }
  if (uPray.y > 0.0) {
    vec3 sc = wickWorld(int(uPray.x)) + vec3(0.0, 0.08, 0.0);
    vec3 oc = sc - ro; float tc = dot(oc, rd);
    if (tc > 0.0 && tc < depth + 0.5) {
      vec3 hp = ro + rd * tc; vec3 rel = hp - sc;
      float hh = rel.y;
      if (hh > 0.0 && hh < 9.0) {
        float w = 0.03 + hh * 0.05;
        float dx = rel.x + rel.z * 0.0 - 0.15 * sin(hh * 1.3 - uTime * 0.8) * hh * 0.3;
        float dens = exp(-dx * dx / (w * w)) * smoothstep(9.0, 2.0, hh) * smoothstep(0.0, 0.3, hh) * (0.55 + 0.45 * fbm(vec2(dx * 6.0, hh * 1.4 - uTime * 0.9), 4));
        float lit = exp(-hh * 0.35);
        col += uPray.y * dens * (vec3(1.0, 0.62, 0.32) * 0.5 * lit + uSkyHor * 0.25);
      }
    }
  }
  for (int k = 0; k < 3; k++) {
    vec3 f = vec3(uFronts[k * 3], uFronts[k * 3 + 1], uFronts[k * 3 + 2]);
    if (f.y < -50.0) continue;
    col += flameLight(ro, rd, depth, f, 2.6, 60.0 + float(k)) + 0.4 * lifeEmbers(ro, rd, depth, f, 0.03, 0.25, 6, vec3(0.0), 0.0015, float(k));
  }
  if (uToil > 0.0) {
    // his breath, a little mist in the cold dawn air over the plough, coming in tired, uneven breaths
    vec3 bc = vec3(roadX(170.0) - 6.0 - 0.35, 0.8 * sin((roadX(170.0) - 6.0) * 0.021 + 1.0) * sin(170.0 * 0.017) + 1.35, 170.0 - 1.6);
    float ph = fract((uTime - 211.0) / 2.6 + 0.08 * sin(uTime * 1.3));
    float puff = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.12, 0.9, ph));
    vec3 oc = bc + vec3(0.25, 0.1, 0.15) * ph - ro; float tc = dot(oc, rd);
    if (tc > 0.0 && tc < depth) {
      float h2 = max(dot(oc, oc) - tc * tc, 0.0);
      float w = 0.08 + 0.25 * ph;
      col = mix(col, vec3(0.75, 0.75, 0.8) * (uAmb * 3.0 + uSunCol * 0.4), uToil * puff * 0.28 * exp(-h2 / (w * w)) * (0.6 + 0.4 * vnoise(rd.xy * 400.0 + uTime)));
    }
  }
  for (int k = 0; k < 24; k++) {
    vec3 w = vec3(uGlows[k * 3], uGlows[k * 3 + 1], uGlows[k * 3 + 2]);
    if (w.y < -50.0) continue;
    float dist = length(w - ro);
    col += vec3(1.0, 0.55, 0.2) * 0.8 * lifeFlicker(uTime, float(k) * 1.3) * lifeGlow(ro, rd, w, 0.02 + dist * 0.0014, depth);
  }
#ifndef NO_MOTES
  col += lifeMotes(ro, rd, depth, ro + rd * 3.5 + vec3(0.0, 0.0, 0.0), vec3(3.0, 1.5, 3.0), 60, 0.0035, vec3(0.12, 0.02, 0.05), vec3(1.0, 0.78, 0.5) * 0.35, 3.0);
#endif
  return col;
}
`;

export function valleyFrag({ extra = '' } = {}) {
  const sub = (s) => s.replaceAll('${Z0}', STONE_Z0.toFixed(1)).replaceAll('${DZ}', STONE_DZ.toFixed(1));
  return sub(LAMP_NEAR) + '#define LIFE_LIGHT(p) (0.15 + 4.0 * lampNear(p))\n' + LIFE_GLSL + G_COMMON + sub(VALLEY_GLSL) + extra + SHADE;
}

// ---------------------------------------------------------------- a valley shot
// valleyScene(P, { name, cam, sky(t) -> sky uniforms, slots: { stoneIndex: column }, lamps(t) ->
//   [10 brightnesses], words(ctx, t, col) draws stone column col's inscription, wind, grass,
//   spin(t), post(t), extra (GLSL), uniforms, update(t, u) })
export function valleyScene(P, o) {
  const slots = new Array(10).fill(-1);
  for (const [i, c] of Object.entries(o.slots ?? {})) slots[+i] = c;
  const lampsAt = (t) => { const l = o.lamps ? o.lamps(t) : new Array(10).fill(1); return l; };
  const sky0 = o.sky(P.from);
  return {
    name: o.name, from: P.from, to: P.to,
    textSize: [1024 * (o.cols ?? 4), 2048],
    frag: valleyFrag({ extra: (P.dbg ?? '').split(',').filter(Boolean).map((d) => `#define ${d}\n`).join('') + (o.extra ?? '') }),
    uniforms: {
      ...sky0, uSlot: slots, uLamp: lampsAt(P.from), uLampN: lampsAt(P.from), uSpin: 0, uWind: o.wind ?? 1, uGrass: o.grass ?? 1,
      uFocus: 5, uAperture: 0, uLedge: new Float32Array([0, 0, 0, -1]), uGroundRect: new Float32Array([0, 0, 1, 1]), uGroundSlot: -1, uCols: o.cols ?? 4, uInk: o.ink ?? 1, uHomes: 0, uField: 0, uGreen: 0, uToil: 0, uPray: [0, 0], uFronts: new Array(9).fill(-100), uWalkers: new Array(9).fill(-100), uGlows: new Array(72).fill(-100), ...(o.uniforms ?? {}),
    },
    camera: o.cam,
    update(t, u) {
      const s = o.sky(t);
      for (const [k, v] of Object.entries(s)) { if (!u[k]) continue; if (Array.isArray(v)) u[k].value.set(...v); else u[k].value = v; }
      const l = lampsAt(t);
      for (let i = 0; i < 10; i++) { u.uLamp.value[i] = l[i]; u.uLampN.value[i] = l[i]; }
      u.uSpin.value = o.spin ? o.spin(t) : 0;
      const c = o.cam(t);
      u.uFocus.value = c.focus ?? 5; u.uAperture.value = c.aperture ?? 0;
      o.update?.(t, u);
    },
    drawText(ctx, t, lyrics) {
      const cols = new Set(Object.values(o.slots ?? {})); for (const c of o.extraCols ?? []) cols.add(c);
      for (const col of cols) {
        ctx.save();
        ctx.beginPath(); ctx.rect(col * 1024, 0, 1024, 2048); ctx.clip();
        o.words?.(ctx, t, col, { x: col * 1024, y: 0, w: 1024, h: 2048 });
        ctx.restore();
      }
    },
    post: o.post,
    finish: o.finish,
  };
}

// Draw into text column `col` for a surface w x h metres (the ledge face is 2.6 x 1.05, a ground
// rect its own size): draw(ctx, box) gets an undistorted box 1024 px wide and in proportion.
export function surface(ctx, col, wM, hM, draw) {
  const bw = 1024, bh = 1024 * hM / wM;
  ctx.save();
  ctx.translate(col * 1024, 0);
  ctx.scale(1, 2048 / bh);
  draw(ctx, { x: 0, y: 0, w: bw, h: bh });
  ctx.restore();
}
export const LEDGE_W = 2.6, LEDGE_H = 1.05;
