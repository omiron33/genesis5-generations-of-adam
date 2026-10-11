// Enoch's ridge: a narrow chalk ridge climbing above a sea of cloud in the blue before dawn, a worn
// path along its crest. Footprints press into the pale dust one after another as we watch, with a
// small lift of dust at each step, though no one is seen walking: he walked with God. Lines are
// pressed into the dust beside the steps. Near the summit the steps stop beside a standing stone,
// and the cloud ahead parts into a tall doorway of light.
//
// Metres, y up; the path climbs toward +z.
import { G_COMMON } from '/song/lib/g-common.js';
import { LIFE_GLSL } from '/kit/life.js';

export const rx = (z) => 3 * Math.sin(z * 0.02) + 0.8 * Math.sin(z * 0.071);
export const crest = (z) => 0.12 * z + 0.6 * Math.sin(z * 0.05) - 0.03 * Math.max(0, z - 112) ** 2 * 0.08;
export const STEP = 0.36;                 // metres between prints (left, right, left...)
export const SUMMIT_STONE = (zs) => [rx(zs) - 1.5, crest(zs), zs + 0.6];

const RIDGE = /* glsl */ `
uniform float uWalkT0, uWalkZ0, uWalkRate, uWalkStop;   // first print time and z, prints per second, time the steps stop
uniform float uBandZ[8];          // where each pressed line lies along the path (its near edge, z)
uniform float uBands;
uniform float uDoor;              // the doorway of light in the cloud (0..1)
uniform float uStoneZ;            // the summit stone
uniform float uLift;              // dust rising off the last print

float rxf(float z) { return 3.0 * sin(z * 0.02) + 0.8 * sin(z * 0.071); }
float crestf(float z) { return 0.12 * z + 0.6 * sin(z * 0.05) - 0.0024 * pow(max(0.0, z - 112.0), 2.0); }
float ridgeH(vec2 q, bool detail) {
  float a = q.x - rxf(q.y);
  float c = crestf(q.y);
  float side = abs(a);
  // a rounded crest falling into steep flanks
  float h = c - 0.045 * side * side - 0.5 * max(side - 3.5, 0.0);
  float rock = fbm(q * 0.25, detail ? 5 : 3);
  h += (rock - 0.5) * 2.6 * smoothstep(1.1, 4.0, side);
  if (detail) { float r2 = fbm(q * 1.7, 4); h += (r2 - 0.5) * 0.35 * smoothstep(1.0, 2.2, side) + 0.25 * smoothstep(0.62, 0.8, r2) * smoothstep(1.2, 2.5, side); }
  // the path: worn flat along the crest
  h = mix(h, c - 0.02 * side * side, smoothstep(1.0, 0.45, side) * 0.85);
  if (detail) h += 0.012 * (vnoise(q * 9.0) - 0.5) + 0.004 * (vnoise(q * 30.0) - 0.5);
  return h;
}
const float CLOUD_Y_REL = -16.0;
float cloudTop(vec2 q) { return crestf(clamp(q.y, 0.0, 130.0)) * 0.35 + CLOUD_Y_REL + 2.5 * fbm(q * 0.02 + vec2(uTime * 0.01, 0.0), 4); }

// a footprint field: returns depth 0..1 of a print at q
float prints(vec2 q) {
  float a = q.x - rxf(q.y);
  float i = floor((q.y - uWalkZ0) / ${'${STEP}'});
  float best = 0.0;
  for (int k = 0; k < 2; k++) {
    float ii = i + float(k);
    if (ii < 0.0) continue;
    float t = uWalkT0 + ii / uWalkRate;
    if (t > uTime || t > uWalkStop + 0.05) continue;
    float side = mod(ii, 2.0) < 1.0 ? -1.0 : 1.0;
    vec2 c = vec2(side * 0.12 + 0.05 * sin(ii * 1.7), uWalkZ0 + (ii + 0.5) * ${'${STEP}'});
    vec2 d = vec2(a - c.x, q.y - c.y);
    d = mat2(0.98, -0.18 * side, 0.18 * side, 0.98) * d;
    float heel = length(d / vec2(0.048, 0.06) - vec2(0.0, -1.3));
    float ball = length(d / vec2(0.055, 0.08) - vec2(0.0, 0.55));
    float fresh = smoothstep(0.0, 0.08, uTime - t);
    best = max(best, smoothstep(1.1, 0.6, min(heel, ball)) * fresh);
  }
  return best;
}
float stoneSDr(vec3 p) {
  vec3 c = vec3(rxf(uStoneZ) - 1.5, crestf(uStoneZ) - 0.3, uStoneZ + 0.6);
  vec3 q = p - c;
  // turned to face down the path (toward -z), leaning a little
  float H = 2.4;
  float k = 1.0 - 0.18 * sat(q.y / H);
  vec3 b = vec3(q.x / k, q.y - H * 0.5, q.z);
  float d = sdBox(b, vec3(0.55, H * 0.5, 0.26) - 0.06) - 0.06;
  d = smax(d, q.y - (H - 0.25 * (q.x + 0.4)), 0.06);
  if (d < 0.1) d += (0.04 * (fbm(q * 2.8, 4) - 0.5) + 0.01 * (vnoise(q * 18.0) - 0.5)) * (1.0 - 0.85 * smoothstep(-0.18, -0.24, q.z) * smoothstep(0.48, 0.38, abs(q.x)));
  return d;
}
`;

const SHADE = /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float t = 0.05, hit = -1.0, mat = 0.0;
  for (int i = 0; i < 260; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - ridgeH(p.xz, false);
    float s = stoneSDr(p);
    if (s < 0.0005 * t + 0.0003) { hit = t; mat = 1.0; break; }
    if (h < 0.002 * t) {
      float lo = t - max(0.02, h * 0.4 + 0.03), hi = t;
      for (int k = 0; k < 6; k++) { float m = 0.5 * (lo + hi); vec3 q = ro + rd * m; if (q.y - ridgeH(q.xz, true) < 0.0) hi = m; else lo = m; }
      hit = hi; break;
    }
    t += min(s, max(0.01 + t * 0.003, h * 0.4));
    if (t > 1500.0 || p.y < -40.0) break;
  }
  // the cloud sea below
  float tc = -1.0;
  if (rd.y < 0.0) { tc = (ro.y - (crestf(clamp(ro.z, 0.0, 130.0)) * 0.35 + CLOUD_Y_REL)) / -rd.y; }
  vec3 col;
  float depth = hit < 0.0 ? 1e4 : hit;
  vec3 sky = skyColor(rd, 0.0);
  // the doorway of light opening in the cloud ahead, above the summit
  vec3 dd = normalize(vec3(0.0, 0.32, 1.0));
  vec3 right = normalize(cross(dd, vec3(0.0, 1.0, 0.0))), up = cross(right, dd);
  float dx = dot(rd, right), dy = dot(rd, up), df = dot(rd, dd);
  if (df > 0.0 && uDoor > 0.0) {
    vec2 a = vec2(dx, dy) / df;
    float w = 0.085 * uDoor, hgt = 0.26 * uDoor;
    float door = smoothstep(w, w * 0.7, abs(a.x)) * smoothstep(hgt, hgt * 0.85, abs(a.y + 0.02));
    float glow = exp(-length(a / vec2(w * 3.5 + 0.02, hgt * 2.0 + 0.02)));
    float rays = 0.5 + 0.5 * sin(atan(a.y, a.x) * 30.0 + fbm(a * 8.0, 3) * 4.0);
    // the doorway: bright, but with folds of cloud-light in it rather than a flat white slab
    float folds = 0.75 + 0.25 * fbm(vec2(a.x * 40.0, a.y * 9.0 - uTime * 0.2), 4);
    sky = mix(sky, vec3(1.45, 1.25, 0.98) * folds, door * 0.85);
    sky += vec3(1.1, 0.85, 0.6) * glow * uDoor * (0.8 + 0.2 * rays) * 0.32;
  }
  if (hit < 0.0 && tc < 0.0) col = sky;
  else if (hit < 0.0 || (tc > 0.0 && tc < hit)) {
    vec3 p = ro + rd * tc;
    float n = fbm(p.xz * 0.012 + vec2(uTime * 0.004, 0.0), 6);
    vec3 lit = mix(uSkyTop * 2.2 + uAmb * 2.0, uSkyHor * 1.25 + uSunCol * 0.25, smoothstep(0.3, 0.8, n));
    col = lit * (0.85 + 0.3 * n);
    col = mix(col, sky, 1.0 - exp(-tc * 0.0025));
    depth = tc;
  } else {
    vec3 p = ro + rd * hit;
    vec3 n; vec3 alb; vec3 emit = vec3(0.0);
    if (mat == 0.0) {
      float e = 0.01 + hit * 0.001;
      n = normalize(vec3(ridgeH(p.xz - vec2(e, 0.0), true) - ridgeH(p.xz + vec2(e, 0.0), true), 2.0 * e, ridgeH(p.xz - vec2(0.0, e), true) - ridgeH(p.xz + vec2(0.0, e), true)));
      float a = p.x - rxf(p.z);
      float path = smoothstep(1.0, 0.5, abs(a));
      alb = mix(vec3(0.42, 0.42, 0.40), vec3(0.62, 0.61, 0.57), fbm(p.xz * 0.6, 3));    // chalk and grey grass
      alb = mix(alb, vec3(0.30, 0.31, 0.27), smoothstep(0.55, 0.75, fbm(p.xz * 1.3 + 4.0, 3)) * (1.0 - path));
      alb = mix(alb, vec3(0.72, 0.70, 0.66), path * 0.7);
      float fp = prints(p.xz);
      alb *= 1.0 - 0.45 * fp;
      n = normalize(n + vec3(0.0, -0.6 * fp, 0.0));
      // lines pressed into the dust beside the path, a band each
      for (int k = 0; k < 8; k++) {
        if (float(k) >= uBands) break;
        float z0 = uBandZ[k];
        if (p.z < z0 || p.z > z0 + 2.4) continue;
        vec2 uv = vec2((1.35 - a) / 2.7, (float(${'${NB}'} - 1 - k) + (p.z - z0) / 2.4) / float(${'${NB}'}));
        if (uv.x > 0.0 && uv.x < 1.0) {
          vec4 ins = inscription(uv, n, vec3(-1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), 2.2);
          alb *= 1.0 - 0.6 * ins.a; emit += ins.rgb;
        }
      }
    } else {
      vec2 e = vec2(0.001, 0.0);
      n = normalize(vec3(stoneSDr(p + e.xyy) - stoneSDr(p - e.xyy), stoneSDr(p + e.yxy) - stoneSDr(p - e.yxy), stoneSDr(p + e.yyx) - stoneSDr(p - e.yyx)));
      alb = mix(vec3(0.3, 0.3, 0.29), vec3(0.46, 0.45, 0.42), fbm(p * 4.0, 4));
      vec3 c = vec3(rxf(uStoneZ) - 1.5, crestf(uStoneZ) - 0.3, uStoneZ + 0.6);
      vec3 q = p - c;
      if (q.z < -0.15 && abs(q.x) < 0.45) {
        // face toward -z: viewer looking +z, right = -x; the stone reads the canvas's two bottom rows
        vec2 uv = vec2((0.45 - q.x) / 0.9, (q.y - 0.4) / 1.8);
        if (uv.y > 0.0 && uv.y < 1.0) {
          vec4 ins = inscription(vec2(uv.x, uv.y * 2.0 / float(${'${NB}'})), n, vec3(-1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), 2.6);
          alb *= 1.0 - 0.6 * ins.a; emit += ins.rgb;
        }
      }
    }
    // dawn light: low and cold from ahead-left, a soft sky fill
    float sh = 1.0;
    { float tt = 0.05; for (int k = 0; k < 24; k++) { vec3 q = p + n * 0.01 + uSunDir * tt; float h = min(q.y - ridgeH(q.xz, false), stoneSDr(q)); sh = min(sh, 10.0 * h / tt); tt += clamp(h, 0.05, 3.0); if (sh < 0.01 || tt > 60.0) break; } sh = sat(sh); }
    vec3 lit = uSunCol * sat(dot(n, uSunDir)) * sh + uAmb * (0.55 + 0.45 * n.y);
    // the door's light falls on the summit
    lit += vec3(1.2, 0.95, 0.65) * uDoor * 0.5 * sat(dot(n, normalize(vec3(0.0, 0.4, -1.0)) * -1.0 + vec3(0.0, 0.3, 0.0)));
    col = alb * lit + emit;
    col = mix(col, uFogCol, 1.0 - exp(-hit * uFogDen));
  }
  // dust lifting from each fresh print, and from the last print when he is taken
  float i0 = floor((uTime - uWalkT0) * uWalkRate);
  for (int k = 0; k < 3; k++) {
    float ii = i0 - float(k);
    if (ii < 0.0) continue;
    float t0 = uWalkT0 + ii / uWalkRate;
    if (t0 > uWalkStop + 0.05) continue;
    float side = mod(ii, 2.0) < 1.0 ? -1.0 : 1.0;
    float z = uWalkZ0 + (ii + 0.5) * ${'${STEP}'};
    vec3 c = vec3(rxf(z) + side * 0.12, crestf(z) + 0.02, z);
    float age = uTime - t0;
    col += vec3(0.8, 0.8, 0.85) * 0.006 * lifeGlow(ro, rd, c + vec3(0.0, 0.04 + age * 0.05, 0.0), 0.06 + age * 0.08, depth) * exp(-age * 2.5);
  }
  if (uTime > uWalkStop) {
    // he is taken alive: his steps go on, prints of light climbing the air from the last footprint up
    // through the parted cloud into the doorway, one step after another at his walking pace
    float z = uWalkZ0 + (floor((uWalkStop - uWalkT0) * uWalkRate) + 0.5) * ${'${STEP}'};
    vec3 c0 = vec3(rxf(z), crestf(z) + 0.02, z);
    vec3 dir = normalize(vec3(0.0, 0.42, 1.0));
    float n = (uTime - uWalkStop) * uWalkRate;
    for (int k = 1; k < 40; k++) {
      float fk = float(k);
      if (fk > n) break;
      float side = mod(fk, 2.0) < 1.0 ? -1.0 : 1.0;
      float rise = fk * 0.36 * (1.0 + fk * 0.06);
      vec3 c = c0 + dir * rise + vec3(side * 0.12, 0.0, 0.0);
      float age = n - fk;
      float b = smoothstep(0.0, 0.3, age) * (0.55 + 0.45 * exp(-age * 0.8));
      col += vec3(1.0, 0.88, 0.65) * b * 1.3 * lifeGlow(ro, rd, c, 0.05, depth);
      col += vec3(1.0, 0.88, 0.65) * b * 0.9 * lifeGlow(ro, rd, c + dir * 0.1, 0.042, depth);
    }
  }
  if (uLift > 0.0) {
    float z = uWalkZ0 + (floor((uWalkStop - uWalkT0) * uWalkRate) + 0.5) * ${'${STEP}'};
    vec3 c = vec3(rxf(z), crestf(z) + 0.05, z);
    col += lifeMotes(ro, rd, depth, c + vec3(0.0, 0.9 + uLift * 1.5, 0.0), vec3(0.5, 1.0, 0.5), 60, 0.003, vec3(0.0, 0.5, 0.0), vec3(1.0, 0.9, 0.75) * 1.5 * uLift, 9.0);
  }
  return col;
}
`;

export const NB = 8;   // canvas rows: 6 pressed lines, then the stone (2 rows)
export function ridgeFrag(extra = '') {
  const sub = (s) => s.replaceAll('${STEP}', STEP.toFixed(3)).replaceAll('${NB}', String(NB));
  return LIFE_GLSL + G_COMMON + sub(RIDGE) + extra + sub(SHADE);
}
