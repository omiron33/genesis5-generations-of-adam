// s08-chorus-niches: the third chorus, after the doorway of death. "The generations of Adam / go on
// ... In sons and daughters / the line goes on"
// We walk down the hall of lamps. All ten lamps on the shelf to the left are burning now; on the
// right the front wall has six arched niches, dark. As we come to each niche its lamp catches, and
// the line of the chorus cut into the lintel above it fills with light. The walk turns toward each
// niche as we pass it, and on into the dark end of the hall.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { hallScene, NICHE_X } from '/song/lib/x-hall.js';
import { grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
import { spring } from '/kit/motion.js';
export const kind = 'shader';

export default (P) => {
  const C = anchorAt(lyrics, P.from, 'The generations of Adam', 'go on, go on', 'The generations of Adam', 'and the dust keeps', 'In sons and daughters', 'the line goes on');
  const rect = [0.0, 1.86, 12.6, 2.3], PX = 1024;
  const size = [Math.round((rect[2] - rect[0]) * PX), Math.round((rect[3] - rect[1]) * PX)];
  // canvas x runs from the right end (x = 12.6) to the left (x = 0) as you face the front wall
  const wx = (x) => (rect[2] - x) * PX;
  const catchT = C.lines.map((l) => l.start - 0.15);
  const keys = [{ t: P.from, pos: [-1.2, 1.55, 1.45], look: [NICHE_X(0) + 0.4, 1.7, 3.2] }];
  C.lines.forEach((l, j) => {
    keys.push({ t: l.start + 0.6, pos: [NICHE_X(j) - 1.15, 1.56, 1.25], look: [NICHE_X(j) + 0.15, 1.82, 3.2] });
  });
  keys.push({ t: P.to, pos: [NICHE_X(5) - 0.2, 1.5, 1.0], look: [NICHE_X(5) + 0.5, 1.9, 3.2] });
  const cam = track(keys, { handheld: { amount: 0.9, seed: 41, metres: 0.8 }, fov: 50, aperture: 0.006 });
  return hallScene(P, {
    name: 's08-chorus-niches', cam,
    lit: () => new Array(10).fill(0.8),
    spiral: () => new Array(12).fill(0.9),
    niche: (t) => catchT.map((c) => (t < c ? 0 : 0.35 + 0.65 * spring(t, c, { freq: 1.5, damping: 0.55 }))),
    amb: [0.004, 0.0035, 0.0035],
    text: {
      mode: 2, rect, size,
      draw(ctx, t) { C.lines.forEach((l, j) => inscribe(ctx, t, [{ words: l.words }], { x: wx(NICHE_X(j) + 0.85), y: 40, w: 1.7 * PX, h: 380 }, { size: 150 })); },
    },
    post: () => grade({ exposure: 1.1, bloom: 0.2 }),
    finish: () => FINISH,
  });
};
