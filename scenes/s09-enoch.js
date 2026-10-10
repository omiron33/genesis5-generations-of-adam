// s09-enoch: "Enoch walked with God, / and he pleased Him in the path. / No darkness took him down, /
// no grave laid claim to his breath. / He walked with God, / and God took him. / And heaven opened
// like a door / for a man who stayed so near."
// Enoch's ridge before dawn, above a sea of cloud. Footprints press into the chalk dust of the path,
// one step after another, with no one seen making them; we follow a few paces behind, and each line
// is pressed into the dust beside the steps as it is sung. On "and God took him" the steps stop, the
// dust of the last print lifts into the air, and as we come up to it the cloud ahead parts into a
// tall doorway of light over a standing stone that bears his name and the last two lines.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { ridgeFrag, rx, crest, STEP, NB } from '/song/lib/x-ridge.js';
import { SKIES, skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Enoch walked with God', 'and he pleased Him', 'No darkness took', 'no grave laid claim', 'He walked with God', 'and God took him', 'And heaven opened', 'for a man who stayed');
  const L = A.lines;
  const RATE = 1.75, Z0 = 92, T0 = P.from - 1.2, STOP = L[5].start + 0.35;
  const printZ = (t) => Z0 + Math.min((t - T0), STOP - T0) * RATE * STEP;   // where the newest print is
  const lastZ = printZ(STOP);
  const stoneZ = lastZ + 1.6;
  const bandZ = L.slice(0, 6).map((l) => printZ(l.start) + 1.2);
  const at = (z, dy = 1.5, dx = 0) => [rx(z) + dx, crest(z) + dy, z];
  const keys = [];
  for (let t = P.from; t < STOP; t += 1.6) keys.push({ t, pos: at(printZ(t) - 3.6, 1.45, 0.25 * Math.sin(t * 0.4)), look: at(printZ(t) + 2.6, 0.1) });
  keys.push({ t: STOP + 1.4, pos: at(lastZ - 2.6, 1.5, 0.1), look: at(lastZ + 0.8, 0.3) });
  keys.push({ t: L[6].start + 0.8, pos: at(lastZ - 2.1, 1.45, 0.25), look: at(stoneZ + 6, 4.0, -0.8) });
  keys.push({ t: P.to, pos: at(lastZ - 1.6, 1.4, 0.35), look: at(stoneZ + 10, 6.5, -1.0) });
  const cam = track(keys, { handheld: { amount: 1.0, seed: 61 }, fov: 46, aperture: 0.004 });
  const rows = 720, W = 1024;
  return {
    name: 's09-enoch', from: P.from, to: P.to,
    textSize: [W, rows * NB],
    frag: ridgeFrag(),
    uniforms: {
      ...skyMix('predawn', 'sunrise', 0.15), uSunDir: [-0.25, -0.04, 1.0], uSunCol: [0.75, 0.52, 0.42], uMoon: 0, uAmb: [0.11, 0.13, 0.19],
      uWalkT0: T0, uWalkZ0: Z0, uWalkRate: RATE, uWalkStop: STOP, uBandZ: [...bandZ, 0, 0], uBands: 6, uDoor: 0, uStoneZ: stoneZ, uLift: 0,
      uFocus: 4, uAperture: 0,
    },
    camera: cam,
    update(t, u) {
      u.uDoor.value = smooth(clamp01((t - (L[6].start - 0.3)) / 3.0));
      u.uLift.value = t < STOP ? 0 : Math.exp(-(t - STOP) / 2.5) * smooth(clamp01((t - STOP) / 0.4));
      const k = smooth(clamp01((t - STOP) / 8));
      u.uSkyHor.value.set(0.2 + 0.25 * k, 0.2 + 0.18 * k, 0.28 + 0.06 * k);
      const c = cam(t); u.uFocus.value = c.focus; u.uAperture.value = c.aperture;
    },
    drawText(ctx, t) {
      L.slice(0, 6).forEach((l, k) => inscribe(ctx, t, [{ words: l.words }], { x: 50, y: k * rows + 230, w: W - 100, h: 300 }, { size: 170, font: 'italic' }));
      // the stone: rows 6 and 7 (the canvas's last 1440 px), drawn squeezed so it reads at the face's 1:2
      ctx.save(); ctx.translate(0, 6 * rows); ctx.scale(1, (2 * rows) / (W * 2));
      inscribe(ctx, t, [{ words: [{ ...L[0].words[0], w: 'ENOCH' }] }], { x: 70, y: 150, w: W - 140, h: 300 }, { size: 210, font: 'caps', tracking: 0.08 });
      inscribe(ctx, t, [{ words: L[6].words }, { words: L[7].words }].flatMap((l) => [l]).map((l) => l), { x: 80, y: 520, w: W - 160, h: 1400 }, { size: 96, leading: 1.4 });
      ctx.restore();
    },
    post: () => grade({ exposure: 1.2, bloom: 0.2 }),
    finish: () => FINISH,
  };
};
