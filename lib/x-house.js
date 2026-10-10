// The house of man at night: a mud-brick house with a flat roof on poles, a walled courtyard and a
// wooden gate, under a high moon. Inside the doorway a clay lamp burns on the floor beside an empty
// cradle; its light spills over the threshold stone into the courtyard. Outside the gate a line of
// footprints leads away across the moonlit plain toward a far ridge. Words are cut or burned into
// the wood and plaster (a text atlas of strips, one per surface).
//
// Metres, y up. The house front is the plane z = 0, the room behind it (z > 0), the courtyard in
// front (z < 0) closed by a wall at z = -8 with the gate at x = 0; the plain runs on toward -z.
import { G_COMMON } from '/song/lib/g-common.js';
import { LIFE_GLSL } from '/kit/life.js';

export const LAMP_IN = [0.22, 0.0, 1.05];          // the lamp on the floor inside the door
export const CRADLE = [-0.55, 0.0, 1.55];
// text strips: 8 strips of 4096 x 512 in a 4096 x 4096 canvas
export const STRIP = { door: 0, gate: 1, wall: 2, threshold: 3, shade: 4, walk: 5, chain: 6 };
// each strip's surface rectangle in its own 2D coordinates (metres): [u0, v0, u1, v1]
export const STRIP_RECT = {
  door: [-0.74, 1.93, 0.74, 2.07],        // door lintel, front face (x, y)
  gate: [-0.95, 2.03, 0.95, 2.19],        // gate lintel, outer face (x, y)
  wall: [-1.25, 1.15, 1.25, 1.9],         // the room's back wall seen through the door (x, y)
  threshold: [-0.55, -0.42, 0.55, 0.0],   // threshold stone top (x, z)
  shade: [0.95, 0.9, 2.9, 1.45],        // front wall left of the door, in moon shadow (x, y)
  walk: [-1.4, 10.4, 1.6, 12.6],        // the ground outside the gate (x, z)
  chain: [-1.6, 14.6, 1.8, 17.2],       // further out (x, z)
};

const HOUSE = /* glsl */ `
uniform float uLampIn, uGutter;     // the inside lamp: brightness, and how hard it gutters
uniform float uCradle;              // the cradle's rock (radians)
uniform float uPrints;              // footprints visible (0..1)
uniform vec3 uAmbN;

// ---------------------------------------------------------------- shapes
float groundH(vec2 q) {
  float h = 0.02 * (fbm(q * 1.3, 3) - 0.5) + 0.004 * (vnoise(q * 14.0) - 0.5);
  // the plain beyond the courtyard rolls away to a far ridge
  float far = smoothstep(-20.0, -120.0, q.y);
  h += far * (4.0 * (fbm(q * 0.01, 4) - 0.5) + 30.0 * smoothstep(-250.0, -600.0, q.y) * fbm(q * 0.004 + 3.0, 4));
  return h;
}
float brickWall(vec3 p, vec3 c, vec3 hs) {
  vec3 q = p - c;
  float d = sdBox(q, hs - 0.07) - 0.07;
  // the top slumped and worn unevenly by rain
  float top = c.y + hs.y - 0.08 * fbm(p.xz * 1.5 + p.y, 3) - 0.05 * vnoise(p.xz * 6.0);
  d = smax(d, p.y - top, 0.06);
  if (d < 0.08) d += 0.018 * (fbm(p * 2.5, 4) - 0.5) + 0.004 * (fbm(p * 11.0, 3) - 0.5);
  return d;
}
float beam(vec3 p, vec3 a, vec3 b, float r) {
  float d = sdCapsule(p, a, b, r);
  if (d < 0.03) d += 0.003 * (vnoise(vec3(p.x * 3.0, p.y * 60.0, p.z * 60.0)) - 0.5);
  return d;
}
float cradleSD(vec3 p) {
  vec3 q = p - vec3(${'${CX}'}, 0.0, ${'${CZ}'});
  // rock about the x axis on curved runners
  float a = uCradle;
  q.yz = mat2(cos(a), -sin(a), sin(a), cos(a)) * (q.yz - vec2(0.42, 0.0)) + vec2(0.42, 0.0);
  float box = sdBox(q - vec3(0.0, 0.33, 0.0), vec3(0.28, 0.12, 0.46)) - 0.02;
  float hollow = sdBox(q - vec3(0.0, 0.42, 0.0), vec3(0.25, 0.14, 0.43)) - 0.01;
  float d = smax(box, -hollow, 0.01);
  // rockers
  float rk = abs(length(q.yz - vec2(0.9, 0.0)) - 0.88) - 0.022;
  rk = max(rk, abs(abs(q.x) - 0.24) - 0.022);
  rk = max(rk, q.y - 0.22);
  d = min(d, rk);
  return d;
}
// mat: 0 ground, 1 mud brick, 2 wood, 3 stone, 4 clay lamp, 5 cradle
float houseMap(vec3 p, out float mat) {
  mat = 0.0;
  float d = p.y - groundH(p.xz);
  // the house: front wall with the door cut, side walls, back wall, roof slab
  float h = brickWall(p, vec3(0.0, 1.35, 1.5), vec3(4.0, 1.35, 1.5));
  h = max(h, -sdBox(p - vec3(0.0, 1.3, 1.5), vec3(3.6, 1.3, 1.1)));       // hollow room
  h = max(h, -sdBox(p - vec3(0.0, 0.95, 0.2), vec3(0.5, 0.95, 0.6)));       // the doorway
  // little window high on the right
  h = max(h, -sdBox(p - vec3(2.3, 1.85, 0.2), vec3(0.22, 0.16, 0.6)));
  if (h < d) { d = h; mat = 1.0; }
  // the courtyard walls with the gate gap
  float cw = brickWall(p, vec3(0.0, 0.65, -8.0), vec3(4.25, 0.65, 0.22));
  cw = max(cw, -sdBox(p - vec3(0.0, 0.7, -8.0), vec3(0.72, 1.0, 0.5)));
  cw = min(cw, brickWall(p, vec3(-4.05, 0.65, -4.0), vec3(0.22, 0.65, 4.0)));
  cw = min(cw, brickWall(p, vec3(4.05, 0.65, -4.0), vec3(0.22, 0.65, 4.0)));
  if (cw < d) { d = cw; mat = 1.0; }
  // wood: door lintel, roof beams poking out, gate posts and lintel
  float w = sdBox(p - vec3(0.0, 2.0, 0.22), vec3(0.78, 0.075, 0.28)) - 0.01;
  for (int i = 0; i < 7; i++) { float x = -3.6 + 1.2 * float(i); w = min(w, beam(p, vec3(x, 2.62, -0.35), vec3(x, 2.66, 0.5), 0.085)); }
  w = min(w, beam(p, vec3(-0.82, 0.0, -8.0), vec3(-0.82, 2.25, -8.0), 0.1));
  w = min(w, beam(p, vec3(0.82, 0.0, -8.0), vec3(0.82, 2.25, -8.0), 0.1));
  w = min(w, sdBox(p - vec3(0.0, 2.11, -8.0), vec3(1.0, 0.08, 0.13)) - 0.012);
  if (w < d) { d = w; mat = 2.0; }
  // the threshold stone
  float st = sdBox(p - vec3(0.0, 0.03, -0.2), vec3(0.58, 0.04, 0.24)) - 0.015;
  if (st < 0.03) st += 0.004 * (fbm(p * 12.0, 3) - 0.5);
  if (st < d) { d = st; mat = 3.0; }
  // the lamp on the floor inside
  vec3 lq = p - vec3(${'${LX}'}, 0.0, ${'${LZ}'});
  lq = vec3(-lq.z, lq.y, lq.x);    // spout toward the door (-z)
  float ll = length(lq) < 0.2 ? lampSD(lq) : length(lq) - 0.1;
  if (ll < d) { d = ll; mat = 4.0; }
  float cr = cradleSD(p);
  if (cr < d) { d = cr; mat = 5.0; }
  return d;
}
vec3 houseNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0); float m;
  return normalize(vec3(houseMap(p + e.xyy, m) - houseMap(p - e.xyy, m), houseMap(p + e.yxy, m) - houseMap(p - e.yxy, m), houseMap(p + e.yyx, m) - houseMap(p - e.yyx, m)));
}
vec3 lampInWick() { return vec3(${'${LX}'}, 0.04, ${'${LZ}'} - 0.085); }
float lampInLight() { return uLampIn * (lifeFlicker(uTime, 3.3) - uGutter * 0.55 * (0.5 + 0.5 * lifeNoise(uTime * 5.0))); }

float houseShadow(vec3 p, vec3 l, float maxT) {
  float res = 1.0, t = 0.03;
  for (int i = 0; i < 36; i++) {
    float m; float h = houseMap(p + l * t, m);
    res = min(res, 12.0 * h / t);
    t += clamp(h, 0.03, 0.6);
    if (res < 0.01 || t > maxT) break;
  }
  return sat(res);
}
// text strip uv: strip k, local 2D point q, rect r
vec2 stripUV(float k, vec2 q, vec4 r) {
  vec2 u = (q - r.xy) / (r.zw - r.xy);
  if (any(lessThan(u, vec2(0.0))) || any(greaterThan(u, vec2(1.0)))) return vec2(-1.0);
  return vec2(u.x, (7.0 - k + u.y) / 8.0);
}
// footprints: alternate left and right, a stride apart, leading out of the gate toward -z
float footprint(vec2 q) {
  if (q.y > -8.4 || q.y < -70.0) return 0.0;
  float s = (-8.4 - q.y) / 0.72;
  float i = floor(s), f = fract(s);
  float side = mod(i, 2.0) < 1.0 ? -1.0 : 1.0;
  float wander = 0.25 * sin(q.y * 0.07) + 0.12 * sin(q.y * 0.21);
  vec2 c = vec2(0.42 + wander + side * 0.13, 0.0);
  vec2 d = vec2(q.x - c.x, (f - 0.5) * 0.72);
  d = mat2(0.98, -0.2 * side, 0.2 * side, 0.98) * d;
  float heel = length(d / vec2(0.05, 0.065) - vec2(0.0, -1.2));
  float ball = length(d / vec2(0.055, 0.08) - vec2(0.0, 0.6));
  return smoothstep(1.1, 0.7, min(heel, ball)) * uPrints;
}
`;

const SHADE = /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float t = 0.02, hit = -1.0, mat = 0.0;
  for (int i = 0; i < 220; i++) {
    vec3 p = ro + rd * t;
    float m; float d = houseMap(p, m);
    if (d < 0.0004 + 0.0006 * t) { hit = t; mat = m; break; }
    t += d * (t > 20.0 ? 0.6 : 0.85);
    if (t > 900.0) break;
  }
  vec3 col;
  float depth = hit < 0.0 ? 1e4 : hit;
  if (hit < 0.0) {
    col = skyColor(rd, 0.0);
  } else {
    vec3 p = ro + rd * hit, n = houseNormal(p);
    vec3 alb; vec3 emit = vec3(0.0);
    vec2 uv = vec2(-1.0); vec3 tx = vec3(1.0, 0.0, 0.0), ty = vec3(0.0, 1.0, 0.0);
    if (mat == 0.0) {
      alb = mix(vec3(0.30, 0.26, 0.21), vec3(0.42, 0.37, 0.30), fbm(p.xz * 2.0, 3));
      alb *= 0.85 + 0.15 * vnoise(p.xz * 25.0);
      float fp = footprint(p.xz);
      alb *= 1.0 - 0.6 * fp;
      if (p.z < -9.0) { uv = stripUV(5.0, vec2(p.x, -p.z), vec4(${'${WALK}'})); if (uv.x < 0.0) uv = stripUV(6.0, vec2(p.x, -p.z), vec4(${'${CHAIN}'})); tx = vec3(1.0, 0.0, 0.0); ty = vec3(0.0, 0.0, -1.0); }
    } else if (mat == 1.0) {
      // mud brick under a cracked plaster skin that has fallen away in places
      vec2 b = vec2(p.x + p.z, p.y) * vec2(2.5, 6.0);
      b.x += floor(b.y) * 0.5;
      vec2 bf = abs(fract(b) - 0.5);
      float mortar = smoothstep(0.42, 0.49, max(bf.x, bf.y * 1.1)) * 0.6;
      float plaster = smoothstep(0.3, 0.42, fbm(p * 1.1 + 7.0, 4));
      vec3 brick = mix(vec3(0.24, 0.18, 0.13), vec3(0.32, 0.24, 0.17), vnoise(floor(b) * 1.7)) * (1.0 - 0.3 * mortar);
      vec3 plast = mix(vec3(0.36, 0.30, 0.23), vec3(0.42, 0.36, 0.28), vnoise(p.xy * 8.0));
      plast *= 0.8 + 0.2 * fbm(p * 6.0, 3);
      // rain streaks and a darker damp foot
      plast *= 1.0 - 0.25 * smoothstep(0.6, 0.0, p.y) - 0.12 * smoothstep(0.55, 0.8, vnoise(vec2(p.x * 9.0 + p.z * 9.0, p.y * 0.7)));
      alb = mix(brick, plast, plaster);
      if (abs(p.z) < 0.03 && p.y > 0.5) uv = stripUV(4.0, vec2(-p.x, p.y), vec4(${'${SHADE_R}'})), tx = vec3(-1.0, 0.0, 0.0);
      if (p.z > 2.5 && p.z < 2.7) uv = stripUV(2.0, vec2(-p.x, p.y), vec4(${'${WALL}'})), tx = vec3(-1.0, 0.0, 0.0);
    } else if (mat == 2.0) {
      float grain = vnoise(vec3(p.x * 2.0, p.y * 45.0, p.z * 45.0)) + 0.5 * vnoise(vec3(p.x * 9.0, p.y * 120.0, p.z * 120.0));
      alb = mix(vec3(0.16, 0.10, 0.06), vec3(0.30, 0.20, 0.12), grain * 0.7);
      if (p.z < -0.04 && p.z > -0.08 && p.y > 1.9) uv = stripUV(0.0, vec2(-p.x, p.y), vec4(${'${DOOR}'})), tx = vec3(-1.0, 0.0, 0.0);
      if (p.z < -8.1 && p.y > 2.0) uv = stripUV(1.0, vec2(-p.x, p.y), vec4(${'${GATE}'})), tx = vec3(-1.0, 0.0, 0.0);
    } else if (mat == 3.0) {
      alb = mix(vec3(0.33, 0.31, 0.28), vec3(0.45, 0.42, 0.38), fbm(p * 6.0, 3));
      if (p.y > 0.06) { uv = stripUV(3.0, vec2(-p.x, p.z), vec4(${'${THRESH}'})); tx = vec3(-1.0, 0.0, 0.0); ty = vec3(0.0, 0.0, 1.0); }
    } else if (mat == 4.0) {
      alb = clayColor(p);
    } else {
      float grain = vnoise(vec3(p.x * 40.0, p.y * 40.0, p.z * 3.0));
      alb = mix(vec3(0.22, 0.14, 0.08), vec3(0.36, 0.24, 0.14), grain);
    }
    if (uv.x >= 0.0) {
      vec4 ins = inscription(uv, n, tx, ty, 2.4);
      alb *= 1.0 - 0.7 * ins.a;
      emit += ins.rgb;
    }
    // moonlight with shadow, sky, and the lamp inside with its flicker
    float sh = houseShadow(p + n * 0.01, uSunDir, 30.0);
    vec3 lit = uSunCol * sat(dot(n, uSunDir)) * sh + uAmbN * (0.5 + 0.5 * n.y);
    vec3 w = lampInWick() + vec3(0.0, 0.03, 0.0);
    vec3 dl = w - p; float r2 = dot(dl, dl);
    float lsh = houseShadow(p + n * 0.01, normalize(dl), sqrt(r2) - 0.05);
    lit += vec3(1.0, 0.5, 0.19) * 1.0 * lampInLight() * lsh * (0.25 + 0.75 * sat(dot(n, dl * inversesqrt(r2)))) / (r2 + 0.05);
    // the room inside is filled with the lamp's warm bounce
    lit += vec3(1.0, 0.55, 0.25) * 0.14 * lampInLight() * smoothstep(0.2, 0.6, p.z) * step(abs(p.x), 3.6);
    col = alb * lit + emit;
    // night air
    col = mix(col, uFogCol, 1.0 - exp(-hit * uFogDen));
  }
  col += flameLight(ro, rd, depth, lampInWick(), 1.0 - 0.35 * uGutter, 3.3) * uLampIn;
  // dust turning in the doorway's light
  col += lifeMotes(ro, rd, depth, vec3(0.2, 1.0, 0.2), vec3(1.2, 1.0, 1.2), 50, 0.0025, vec3(0.05, 0.0, -0.08), vec3(1.0, 0.72, 0.45) * 0.6, 5.0);
  return col;
}
`;

export function houseFrag(extra = '') {
  const v4 = (r) => r.map((x) => x.toFixed(3)).join(', ');
  const sub = (s) => s.replaceAll('${CX}', CRADLE[0].toFixed(3)).replaceAll('${CZ}', CRADLE[2].toFixed(3))
    .replaceAll('${LX}', LAMP_IN[0].toFixed(3)).replaceAll('${LZ}', LAMP_IN[2].toFixed(3))
    .replaceAll('${WALK}', v4(STRIP_RECT.walk)).replaceAll('${CHAIN}', v4(STRIP_RECT.chain)).replaceAll('${SHADE_R}', v4(STRIP_RECT.shade))
    .replaceAll('${WALL}', v4(STRIP_RECT.wall)).replaceAll('${DOOR}', v4(STRIP_RECT.door)).replaceAll('${GATE}', v4(STRIP_RECT.gate)).replaceAll('${THRESH}', v4(STRIP_RECT.threshold));
  const near = 'float houseNear(vec3 p) { vec3 d = p - vec3(0.4, 0.6, 0.6); return exp(-dot(d, d) * 0.6); }\n';
  return near + '#define LIFE_LIGHT(p) (0.1 + 3.0 * houseNear(p))\n' + LIFE_GLSL + G_COMMON + sub(HOUSE) + extra + sub(SHADE);
}
