// s05-chorus-spiral: the second chorus. "The generations of Adam / go on, go on, go on ... the line goes on"
// The round chamber at the end of the hall. Twelve lamps stand on the floor in a spiral, the first
// already burning; one after another, outward, each catches from the last. Round the spiral the
// chorus is cut into the floor in rings, and the camera, looking straight down, turns slowly as it
// sinks, so each line comes upright at the top of the frame as it is sung.
import lyrics from '/timing.js';
import { hallScene, SPIRAL_C } from '/song/lib/x-hall.js';
import { grade, FINISH, smooth } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
import { spring, handheld } from '/kit/motion.js';
export const kind = 'shader';

export default (P) => {
  const C = anchorAt(lyrics, P.from, 'The generations of Adam', 'go on, go on', 'The generations of Adam', 'and the dust keeps', 'In sons and daughters', 'the line goes on');
  const rect = [SPIRAL_C[0] - 3.2, SPIRAL_C[2] - 3.2, SPIRAL_C[0] + 3.2, SPIRAL_C[2] + 3.2], PX = 512;
  const size = [Math.round(6.4 * PX), Math.round(6.4 * PX)];
  const cx = 3.2 * PX, cy = 3.2 * PX;
  // each line on a ring at its own angle (clockwise from the top of the canvas = -z in the world)
  const place = C.lines.map((l, k) => ({ R: 1.85 * PX, a: k * 1.05 }));
  // lamp k catches at its time: the first burns already, the rest light through the chorus
  const catchT = Array.from({ length: 12 }, (_, k) => (k === 0 ? -1e9 : C.lines[0].start - 0.3 + k * ((C.lines[5].start + 1.5 - C.lines[0].start) / 11)));
  // the camera's turn: the line being sung comes to the top of the frame
  // looking straight down with a fixed up (the far side of the chamber at the top of the frame),
  // sinking slowly with a hand-held drift; the lines alternate between a band above the spiral and
  // a band below it, each upright to the frame, and a line's light goes out of its cut just before
  // the next line takes its band
  const cam = (t) => {
    const x = (t - P.from) / (P.to - P.from), k = 0.4 * x + 0.6 * smooth(x);
    const y = 3.1 - 0.3 * k;
    const h = handheld(t, { amount: 0.8, seed: 31 });
    const drift = [0.12 * Math.sin(t * 0.21), 0.1 * Math.sin(t * 0.17 + 1.0)];
    const pos = [SPIRAL_C[0] - 0.3 + h.pos[0] + drift[0], y + h.pos[1], SPIRAL_C[2] + h.pos[2] + 0.35 + drift[1]];
    const target = [SPIRAL_C[0] - 0.3 + drift[0] * 0.5, 0, SPIRAL_C[2] - 0.2 + drift[1] * 0.5];
    return { pos, target, fov: 84, roll: 0, focus: y, aperture: 0.003 };
  };
  return hallScene(P, {
    name: 's05-chorus-spiral', cam,
    spiral: (t) => catchT.map((c) => (t < c ? 0 : c < 0 ? 1 : 0.35 + 0.65 * spring(t, c, { freq: 1.5, damping: 0.55 }))),
    amb: [0.004, 0.0035, 0.0035],
    text: {
      mode: 1, rect, size,
      draw(ctx, t) {
        C.lines.forEach((l, k) => {
          const band = k % 2, nextSame = C.lines[k + 2];
          const out = nextSame ? 1 - smooth((t - (nextSame.start - 0.7)) / 0.55) : 1;
          // above the spiral: canvas y for z = centre - 1.75 m; below: centre + 1.75 m
          const yc = cy + (band ? 1.78 : -1.82) * PX;
          inscribe(ctx, t, [{ words: l.words }], { x: cx - 2.3 * PX, y: yc - 0.2 * PX, w: 4.6 * PX, h: 0.4 * PX }, { size: 150, fade: () => out });
        });
      },
    },
    post: () => grade({ exposure: 1.1, bloom: 0.22 }),
    finish: () => FINISH,
  });
};
