// s07-doorway: "Death in the doorway, / death at the gate, / every cradle leaning / toward the same
// old wait... / death in the doorway, / death in the shade, / until one walked different / and the
// silence broke its chain"
// Night at a mud-brick house under a high moon. We come in through the courtyard gate (DEATH AT THE
// GATE burned into its lintel) toward the lit doorway, where a lamp burns on the floor beside an
// empty cradle that still rocks a little; the words are cut in the plaster of the room and burned
// into the door's lintel, and the lamp gutters in a gust. Then we turn: out through the gate a line
// of footprints leads away across the moonlit plain, one walker going his own way, and the last two
// lines are pressed into the dust beside his steps.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { houseFrag, STRIP, STRIP_RECT } from '/song/lib/x-house.js';
import { SKIES, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from - 0.5, 'Death in the doorway', 'death at the gate', 'every cradle leaning', 'toward the same old wait', 'death in the doorway', 'death in the shade', 'until one walked different', 'and the silence broke');
  const L = A.lines;
  const cam = track([
    { t: P.from, pos: [0.35, 1.62, -11.6], look: [0.0, 1.5, 0.0], fov: 44 },
    { t: L[1].start + 0.4, pos: [0.15, 1.6, -9.9], look: [0.0, 1.95, -8.0], fov: 46 },
    { t: L[2].start + 0.3, pos: [0.1, 1.6, -6.2], look: [0.0, 1.45, 2.0], fov: 44 },
    { t: L[3].start + 0.8, pos: [0.05, 1.55, -3.0], look: [-0.1, 1.3, 2.6], fov: 40 },
    { t: L[4].start + 0.4, pos: [0.25, 1.5, -1.45], look: [0.0, 0.3, -0.15], fov: 46 },
    { t: L[5].start + 0.5, pos: [0.5, 1.45, -1.7], look: [-1.9, 1.15, 0.0], fov: 46 },
    { t: L[6].start + 0.6, pos: [0.1, 1.55, -2.4], look: [0.2, 0.6, -11.5], fov: 44 },
    { t: L[7].start + 1.0, pos: [0.15, 1.6, -4.8], look: [0.2, 0.4, -16.0], fov: 44 },
    { t: P.to, pos: [0.2, 1.62, -5.8], look: [0.3, 0.6, -24.0], fov: 44 },
  ], { handheld: { amount: 1.0, seed: 51 }, aperture: 0.005 });
  const sky = SKIES.night;
  // which strip each line is cut into
  const where = [STRIP.door, STRIP.gate, STRIP.wall, STRIP.wall, STRIP.threshold, STRIP.shade, STRIP.walk, STRIP.chain];
  return {
    name: 's07-doorway', from: P.from, to: P.to,
    textSize: [4096, 4096],
    frag: houseFrag(),
    uniforms: { ...sky, uSunCol: [0.36, 0.45, 0.75], uSunDir: [-0.42, 0.58, -0.7], uMoonDir: [-0.42, 0.58, -0.7], uLampIn: 1, uGutter: 0, uCradle: 0, uPrints: 1, uAmbN: [0.025, 0.03, 0.055], uFocus: 3, uAperture: 0 },
    camera: cam,
    update(t, u) {
      // the lamp gutters on the second "death in the doorway" and steadies again
      u.uGutter.value = smooth(clamp01((t - L[4].start + 0.2) / 0.5)) * (1 - smooth(clamp01((t - L[5].end - 0.5) / 1.5)));
      u.uCradle.value = 0.06 * Math.sin(t * 2.1) * (0.6 + 0.4 * Math.sin(t * 0.37));
      const c = cam(t); u.uFocus.value = c.focus; u.uAperture.value = c.aperture;
    },
    drawText(ctx, t) {
      const rows = {};
      L.forEach((l, k) => { (rows[where[k]] ??= []).push({ words: l.words }); });
      for (const [k, lines] of Object.entries(rows)) {
        const y0 = (+k) * 512;
        const wall = +k === STRIP.wall;
        inscribe(ctx, t, lines, { x: 120, y: y0 + (lines.length > 1 ? 40 : 110), w: 4096 - 240, h: 420 }, { size: lines.length > 1 ? 180 : 300, leading: 1.15, font: wall ? 'italic' : 'line', valign: 'top' });
      }
    },
    post: () => grade({ exposure: 1.25, bloom: 0.18 }),
    finish: () => FINISH,
  };
};
