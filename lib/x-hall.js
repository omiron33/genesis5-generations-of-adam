// The hall of lamps: a long chamber cut into soft rock, its walls still showing the chisel. Along
// the back wall runs a stone shelf with ten clay lamps, one for each generation, joined by a groove
// of oil cut in the shelf; the words are cut into the wall above. The far end opens into a round
// chamber where lamps stand on the floor in a spiral, and the front wall has arched niches. Lamps
// are lit per shot (uLit), a flame can run along the oil groove from lamp to lamp (uFront), dust
// turns in the lamplight and thin smoke rises off the wicks.
//
// Metres, y up. Back wall z = 0 (the room is z > 0), floor y = 0, the hall runs along +x.
import { G_COMMON } from '/song/lib/g-common.js';
import { LIFE_GLSL } from '/kit/life.js';

export const SHELF_Y = 0.95;
export const lampX = (i) => 0.5 + 1.25 * i;
export const LAMP_Z = 0.2;
export const wick = (i) => [lampX(i), SHELF_Y + 0.04, LAMP_Z + 0.085];   // spout turned to +z
export const NICHE_X = (j) => 1.0 + 2.2 * j;
export const nicheWick = (j) => [NICHE_X(j), 1.25 + 0.04, 3.33 - 0.085];
export const SPIRAL_C = [16.6, 0, 1.6];
export const spiral = (k) => { const th = 1.2 + k * 0.9; const r = 0.22 + 0.11 * th; return [SPIRAL_C[0] + r * Math.cos(th), 0, SPIRAL_C[2] + r * Math.sin(th)]; };

const HALL = /* glsl */ `
uniform float uLit[10];        // shelf lamps
uniform float uNiche[6];       // niche lamps
uniform float uSpiral[12];     // floor lamps
uniform float uFront;          // x of the flame running along the oil groove (-10: none)
uniform float uGroove;         // 1 while the groove holds oil and burns behind the front
uniform vec4 uTxRect;          // text placement: x0, y0, x1, y1 (wall) or x0, z0, x1, z1 (floor)
uniform float uTxMode;         // 0 back wall, 1 floor, 2 front wall
uniform float uDawn;           // daylight through the far doorway (0..1)
uniform vec3 uAmbH;

float lampXf(float i) { return 0.5 + 1.25 * i; }
float rockSkin(vec3 p) {
  // chisel: short parallel gouges in rows, over a lumpy cut face
  // adze scallops: shallow overlapping hollows in rough rows, over a lumpy cut face
  vec2 w = vec2(p.x + p.z, p.y);
  float sc = vnoise(vec2(w.x * 7.0, w.y * 15.0 + 0.8 * vnoise(w * 3.0)));
  float sc2 = vnoise(vec2(w.x * 13.0 + 5.0, w.y * 27.0));
  return 0.032 * (fbm(p * 2.3, 4) - 0.5) - 0.007 * smoothstep(0.35, 0.8, sc) - 0.003 * sc2;
}
float roomSD(vec3 p) {
  // the empty space: the hall (a box with a low vault) joined to a round domed chamber at the far end;
  // the rock is everything else
  float ceil = 2.55 + 0.35 * sat(1.0 - pow((p.z - 1.6) / 1.6, 2.0));
  float hall = max(max(-p.z, p.z - 3.2), max(-p.y, p.y - ceil));
  hall = max(hall, max(-(p.x + 2.0), p.x - 14.2));
  vec2 c = p.xz - vec2(16.6, 1.6);
  float ch = max(length(c) - 3.4, max(-p.y, p.y - (3.4 - 0.08 * dot(c, c))));
  return -smin(hall, ch, 0.3);
}
float shelfSD(vec3 p) {
  vec3 q = p - vec3(5.6, SHELF_Y - 0.06, 0.2);
  float d = sdBox(q, vec3(6.6, 0.06, 0.22)) - 0.01;
  // the oil groove along the front of the top
  d = smax(d, -sdBox(p - vec3(5.6, SHELF_Y, 0.34), vec3(6.4, 0.012, 0.011)), 0.004);
  return d;
}
vec3 toShelfLamp(vec3 p, out int which) {
  float i = clamp(floor((p.x - 0.5) / 1.25 + 0.5), 0.0, 9.0);
  which = int(i);
  vec3 q = p - vec3(lampXf(i), SHELF_Y, LAMP_Z);
  return vec3(q.z, q.y, -q.x);     // the spout (local +x) turned toward the room (+z)
}
float nicheSD(vec3 p) {
  // arched niches cut into the front wall (z = 3.2)
  float j = clamp(floor((p.x - 1.0) / 2.2 + 0.5), 0.0, 5.0);
  vec3 q = p - vec3(1.0 + 2.2 * j, 1.25, 3.2);
  float box = sdBox(q - vec3(0.0, 0.25, 0.0), vec3(0.28, 0.25, 0.28));
  float arch = length(q.xy - vec2(0.0, 0.5)) - 0.28;
  arch = max(arch, abs(q.z) - 0.28);
  return min(box, arch);
}
// mat: 0 rock, 1 shelf, 2 lamp
float hallMap(vec3 p, out float mat, out int which) {
  mat = 0.0; which = -1;
  float d = roomSD(p);
  d = smax(d, -nicheSD(p), 0.02);
  if (d < 0.08) d += rockSkin(p);
  float s = shelfSD(p);
  if (s < 0.06) s += 0.004 * (fbm(p * 11.0, 3) - 0.5) - 0.012 * smoothstep(0.55, 0.8, vnoise(p.xy * 9.0)) * smoothstep(0.3, 0.42, p.z);
  if (s < d) { d = s; mat = 1.0; }
  int w; vec3 lq = toShelfLamp(p, w);
  float lr = length(lq - vec3(0.02, 0.03, 0.0));
  float l = lr < 0.2 ? lampSD(lq) : lr - 0.09;
  if (l < d) { d = l; mat = 2.0; which = w; }
  // niche lamps
  float j = clamp(floor((p.x - 1.0) / 2.2 + 0.5), 0.0, 5.0);
  vec3 nq = p - vec3(1.0 + 2.2 * j, 1.25, 3.33);
  nq = vec3(nq.z * -1.0, nq.y, -nq.x);        // spout toward -z (into the hall)
  float nl = length(nq) < 0.2 ? lampSD(nq) : length(nq) - 0.11;
  if (nl < d) { d = nl; mat = 2.0; which = 10 + int(j); }
  // floor lamps in the spiral
  for (int k = 0; k < 12; k++) {
    float th = 1.2 + float(k) * 0.9, r = 0.22 + 0.11 * th;
    vec3 sq = p - vec3(16.6 + r * cos(th), 0.0, 1.6 + r * sin(th));
    if (dot(sq, sq) > 0.04) continue;
    float a = -th - 1.5707963;
    sq.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * sq.xz;
    float fl = lampSD(sq);
    if (fl < d) { d = fl; mat = 2.0; which = 20 + k; }
  }
  return d;
}
vec3 hallNormal(vec3 p) {
  vec2 e = vec2(0.0008, 0.0); float m; int w;
  return normalize(vec3(hallMap(p + e.xyy, m, w) - hallMap(p - e.xyy, m, w), hallMap(p + e.yxy, m, w) - hallMap(p - e.yxy, m, w), hallMap(p + e.yyx, m, w) - hallMap(p - e.yyx, m, w)));
}
vec3 shelfWick(int i) { return vec3(lampXf(float(i)), SHELF_Y + 0.04, LAMP_Z + 0.085); }
vec3 nicheWick(int j) { return vec3(1.0 + 2.2 * float(j), 1.25 + 0.04, 3.33 - 0.085); }
vec3 spiralWick(int k) {
  float th = 1.2 + float(k) * 0.9, r = 0.22 + 0.11 * th;
  vec3 c = vec3(16.6 + r * cos(th), 0.04, 1.6 + r * sin(th));
  return c + vec3(-sin(th), 0.0, -cos(th)) * 0.085;
}
// the light of every burning flame at p
vec3 flameLit(vec3 p, vec3 n) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    if (uLit[i] <= 0.0) continue;
    vec3 d = shelfWick(i) + vec3(0.0, 0.03, 0.0) - p; float r2 = dot(d, d);
    float fl = lifeFlicker(uTime, float(i) * 2.3 + 0.7);
    acc += uLit[i] * fl * (0.25 + 0.75 * sat(dot(n, d * inversesqrt(r2)))) / (r2 + 0.06);
  }
  for (int j = 0; j < 6; j++) {
    if (uNiche[j] <= 0.0) continue;
    vec3 d = nicheWick(j) + vec3(0.0, 0.03, 0.0) - p; float r2 = dot(d, d);
    float fl = lifeFlicker(uTime, float(j) * 4.1 + 9.0);
    acc += uNiche[j] * fl * (0.25 + 0.75 * sat(dot(n, d * inversesqrt(r2)))) / (r2 + 0.06);
  }
  for (int k = 0; k < 12; k++) {
    if (uSpiral[k] <= 0.0) continue;
    vec3 d = spiralWick(k) + vec3(0.0, 0.03, 0.0) - p; float r2 = dot(d, d);
    float fl = lifeFlicker(uTime, float(k) * 1.9 + 21.0);
    acc += uSpiral[k] * fl * (0.25 + 0.75 * sat(dot(n, d * inversesqrt(r2)))) / (r2 + 0.06);
  }
  // the burning groove
  if (uGroove > 0.0 && uFront > -1.0) {
    float x = clamp(p.x, -0.6, uFront);
    vec3 d = vec3(x, SHELF_Y + 0.02, 0.34) - p; float r2 = dot(d, d);
    float burn = smoothstep(uFront - 3.0, uFront, x);
    acc += uGroove * burn * 0.5 * (0.3 + 0.7 * sat(dot(n, d * inversesqrt(r2)))) / (r2 + 0.02);
  }
  return acc * vec3(1.0, 0.5, 0.19) * 0.32;
}
float hallLightNear(vec3 p) {
  float n = 0.0;
  for (int i = 0; i < 10; i++) { if (uLit[i] > 0.0) { vec3 d = shelfWick(i) - p; n += uLit[i] * exp(-dot(d, d) * 2.0); } }
  for (int j = 0; j < 6; j++) { if (uNiche[j] > 0.0) { vec3 d = nicheWick(j) - p; n += uNiche[j] * exp(-dot(d, d) * 2.0); } }
  return n;
}
`;

const SHADE = /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float t = 0.01, hit = -1.0, mat = 0.0; int which = -1;
  for (int i = 0; i < 200; i++) {
    vec3 p = ro + rd * t;
    float m; int w;
    float d = hallMap(p, m, w);
    if (d < 0.0002 + 0.0004 * t) { hit = t; mat = m; which = w; break; }
    t += d * 0.8;
    if (t > 40.0) break;
  }
  vec3 col = vec3(0.0);
  float depth = hit < 0.0 ? 40.0 : hit;
  if (hit > 0.0) {
    vec3 p = ro + rd * hit, n = hallNormal(p);
    vec3 alb; vec3 emit = vec3(0.0);
    if (mat == 0.0) {
      float g = fbm(p * 1.7, 4);
      alb = mix(vec3(0.26, 0.21, 0.16), vec3(0.42, 0.35, 0.27), g);
      alb *= 0.8 + 0.2 * vnoise(p.xy * 30.0 + p.z * 13.0);
      // soot above where the lamps have burned for generations
      float soot = 0.0;
      if (p.z < 0.1) soot = smoothstep(1.0, 1.6, p.y) * smoothstep(2.6, 1.6, p.y) * exp(-pow((fract((p.x - 0.5) / 1.25 + 0.5) - 0.5) * 2.0, 2.0) * 3.0) * step(p.x, 12.0);
      alb *= 1.0 - 0.55 * soot;
      // the spiral groove cut in the chamber floor, joining the floor lamps
      if (p.y < 0.03) {
        vec2 c = p.xz - vec2(16.6, 1.6);
        float th0 = atan(c.y, c.x); if (th0 < 0.0) th0 += 6.2831853;
        float rr = length(c), gd = 1e3;
        for (int n = 0; n < 3; n++) { float th = th0 + 6.2831853 * float(n); if (th < 1.2 || th > 11.1) continue; gd = min(gd, abs(rr - (0.22 + 0.11 * th))); }
        float gr = smoothstep(0.014, 0.006, gd);
        alb = mix(alb, vec3(0.04, 0.03, 0.02), gr);
        n = normalize(n + vec3(0.0, -0.4 * gr, 0.0));
      }
      // the words cut into the rock
      vec2 uv = vec2(-1.0);
      if (uTxMode < 0.5 && p.z < 0.12) uv = vec2((p.x - uTxRect.x) / (uTxRect.z - uTxRect.x), (p.y - uTxRect.y) / (uTxRect.w - uTxRect.y));
      else if (uTxMode > 1.5 && p.z > 3.08) uv = vec2((uTxRect.z - p.x) / (uTxRect.z - uTxRect.x), (p.y - uTxRect.y) / (uTxRect.w - uTxRect.y));
      else if (uTxMode > 0.5 && uTxMode < 1.5 && p.y < 0.05) uv = vec2((p.x - uTxRect.x) / (uTxRect.z - uTxRect.x), (uTxRect.w - p.z) / (uTxRect.w - uTxRect.y));
      if (uv.x >= 0.0) {
        vec3 tx = uTxMode > 1.5 ? vec3(-1.0, 0.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 ty = uTxMode > 0.5 && uTxMode < 1.5 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0);
        vec4 ins = inscription(uv, n, tx, ty, 2.6);
        alb *= 1.0 - 0.7 * ins.a;
        emit += ins.rgb;
      }
    } else if (mat == 1.0) {
      alb = mix(vec3(0.30, 0.25, 0.19), vec3(0.45, 0.38, 0.29), fbm(p * 5.0, 3));
      // oil darkens the groove and gleams
      float gr = smoothstep(0.02, 0.0, abs(p.z - 0.34)) * step(p.y, SHELF_Y + 0.002);
      alb = mix(alb, vec3(0.05, 0.035, 0.02), gr * 0.9);
      if (uGroove > 0.0 && gr > 0.0) {
        float burnt = smoothstep(uFront - 2.4, uFront - 0.2, p.x);
        float ahead = step(uFront, p.x);
        emit += gr * (1.0 - ahead) * burnt * vec3(1.0, 0.4, 0.1) * 2.0 * lifeFlicker(uTime + p.x * 3.0, 4.0);
      }
    } else {
      vec3 q; int w;
      if (which < 10) q = toShelfLamp(p, w); else q = vec3(0.0);
      alb = clayColor(p * 0.9);
    }
    vec3 lit = flameLit(p, n) + uAmbH * (0.4 + 0.6 * n.y);
    // daylight from the chamber's doorway at the far end
    lit += uDawn * vec3(1.6, 1.15, 0.8) * sat(dot(n, normalize(vec3(1.0, 0.4, 0.2)))) * smoothstep(8.0, 19.0, p.x) * 0.35;
    // contact shadow / AO
    float ao = 0.0; float m2; int w2;
    for (int k = 1; k <= 3; k++) { float hk = 0.05 * float(k); ao += (hk - hallMap(p + n * hk, m2, w2)) / hk; }
    ao = sat(1.0 - 0.3 * ao);
    col = alb * lit * ao + emit;
  }
  // flames
  for (int i = 0; i < 10; i++) if (uLit[i] > 0.0) col += flameLight(ro, rd, depth, shelfWick(i), 0.5 + 0.5 * uLit[i], float(i) * 2.3 + 0.7) * min(uLit[i], 1.0);
  for (int j = 0; j < 6; j++) if (uNiche[j] > 0.0) col += flameLight(ro, rd, depth, nicheWick(j), 1.0, float(j) * 4.1 + 9.0) * min(uNiche[j], 1.0);
  for (int k = 0; k < 12; k++) if (uSpiral[k] > 0.0) col += flameLight(ro, rd, depth, spiralWick(k), 1.0, float(k) * 1.9 + 21.0) * min(uSpiral[k], 1.0);
  // the running flame front on the groove: a travelling tongue of fire
  if (uGroove > 0.0 && uFront > -1.0) {
    // a travelling sheet of flame: tall at the front, low and ragged behind it where the oil is burning out
    for (int k = 0; k < 9; k++) {
      float x = uFront - float(k) * 0.028 - 0.01 * hash11(float(k));
      float sz = 1.5 * exp(-float(k) * 0.2);
      col += uGroove * 0.6 * flameLight(ro, rd, depth, vec3(x, SHELF_Y + 0.002, 0.34), sz, 30.0 + float(k) * 1.7);
    }
    col += uGroove * lifeEmbers(ro, rd, depth, vec3(uFront - 0.1, SHELF_Y + 0.01, 0.34), 0.05, 0.25, 10, vec3(0.02, 0.0, 0.0), 0.0016, 2.0);
  }
#ifdef HALL_EXTRA
  col += hallExtra(ro, rd, depth);
#endif
  // dust in the lamplight
  col += lifeMotes(ro, rd, depth, ro + rd * 2.0, vec3(1.6, 0.9, 1.6), 50, 0.0022, vec3(0.03, 0.015, 0.01), vec3(1.0, 0.7, 0.45) * 0.5, 7.0);
  // smoky air: a little in-scatter of the lamplight
  col += vec3(1.0, 0.5, 0.2) * 0.004 * hallLightNear(ro + rd * min(depth, 2.0)) * min(depth, 4.0);
  return col;
}
`;

export function hallFrag(extra = '') {
  return '#define LIFE_LIGHT(p) (0.2 + 3.0 * hallLightNear(p))\nfloat hallLightNear(vec3 p);\n' + LIFE_GLSL + G_COMMON + 'const float SHELF_Y = 0.95;\nconst float LAMP_Z = 0.2;\n' + HALL + extra + SHADE;
}

// hallScene(P, { name, cam, lit(t) -> [10], niche(t) -> [6], spiral(t) -> [12], front(t), groove,
//   text: { mode, rect: [x0, y0, x1, y1], size: [w, h], draw(ctx, t, lyrics) }, dawn(t), post, finish })
export function hallScene(P, o) {
  const z = (n) => new Array(n).fill(0);
  const tx = o.text ?? { mode: 0, rect: [0, 0, 1, 1], size: [16, 16], draw: () => {} };
  return {
    name: o.name, from: P.from, to: P.to,
    textSize: tx.size,
    frag: hallFrag((P.dbg ?? '').split(',').filter(Boolean).map((d) => `#define ${d}\n`).join('') + (o.extra ?? '')),
    uniforms: {
      uLit: z(10), uNiche: z(6), uSpiral: z(12), uFront: -10, uGroove: o.groove ?? 0,
      uTxRect: new Float32Array(tx.rect), uTxMode: tx.mode, uDawn: 0, uAmbH: o.amb ?? [0.004, 0.004, 0.006], uFocus: 1, uAperture: 0,
    },
    camera: o.cam,
    update(t, u) {
      const put = (k, f, n) => { if (!f) return; const v = f(t); for (let i = 0; i < n; i++) u[k].value[i] = v[i] ?? 0; };
      put('uLit', o.lit, 10); put('uNiche', o.niche, 6); put('uSpiral', o.spiral, 12);
      u.uFront.value = o.front ? o.front(t) : -10;
      u.uDawn.value = o.dawn ? o.dawn(t) : 0;
      const c = o.cam(t); u.uFocus.value = c.focus ?? 1; u.uAperture.value = c.aperture ?? 0;
      o.update?.(t, u);
    },
    drawText(ctx, t, lyrics) { tx.draw(ctx, t, lyrics); },
    post: o.post, finish: o.finish,
  };
}
