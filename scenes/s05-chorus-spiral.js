// s05-chorus-spiral: the second chorus. "The generations of Adam / go on, go on, go on ... the line goes on"
// The round chamber at the end of the hall. Twelve lamps stand on the floor in a spiral, the first
// already burning; one after another, outward, each catches from the last. Round the spiral the
// chorus is cut into the floor in rings, and the camera, looking straight down, turns slowly as it
// sinks, so each line comes upright at the top of the frame as it is sung.
import lyrics from '/timing.js';
import { hallScene, SPIRAL_C } from '/song/lib/x-hall.js';
import { grade, FINISH, smooth } from '/song/lib/look.js';
import { arcText, anchorAt } from '/song/lib/type.js';
import { spring, handheld } from '/kit/motion.js';
export const kind = 'shader';

export default (P) => {
  const C = anchorAt(lyrics, P.from, 'The generations of Adam', 'go on, go on', 'The generations of Adam', 'and the dust keeps', 'In sons and daughters', 'the line goes on');
  const rect = [SPIRAL_C[0] - 3.2, SPIRAL_C[2] - 3.2, SPIRAL_C[0] + 3.2, SPIRAL_C[2] + 3.2], PX = 512;
  const size = [Math.round(6.4 * PX), Math.round(6.4 * PX)];
  const cx = 3.2 * PX, cy = 3.2 * PX;
  // each line on a ring at its own angle (clockwise from the top of the canvas = -z in the world)
  const place = C.lines.map((l, k) => ({ R: (k % 2 ? 1.98 : 1.68) * PX, a: k * 1.05 }));
  // lamp k catches at its time: the first burns already, the rest light through the chorus
  const catchT = Array.from({ length: 12 }, (_, k) => (k === 0 ? -1e9 : C.lines[0].start - 0.3 + k * ((C.lines[5].start + 1.5 - C.lines[0].start) / 11)));
  // the camera's turn: the line being sung comes to the top of the frame
  const yawAt = (t) => {
    let a = place[0].a - 0.4 + 0.4 * smooth((t - P.from) / 1.5);
    for (let k = 1; k < 6; k++) a += (place[k].a - place[k - 1].a) * smooth((t - (C.lines[k].start - 2.3)) / 2.2);
    return a + 0.03 * (t - P.from);
  };
  const cam = (t) => {
    const x = (t - P.from) / (P.to - P.from), k = 0.4 * x + 0.6 * smooth(x);
    const y = 3.0 - 0.6 * k;
    const yaw = yawAt(t);
    const h = handheld(t, { amount: 0.6, seed: 31 });
    // looking down; "up" on screen points to the canvas angle yaw (canvas up is world -z)
    const up = [Math.sin(yaw), 0, -Math.cos(yaw)];
    const pos = [SPIRAL_C[0] + h.pos[0] - up[0] * 0.35, y + h.pos[1], SPIRAL_C[2] + h.pos[2] - up[2] * 0.35];
    const target = [SPIRAL_C[0] + up[0] * 0.25, 0, SPIRAL_C[2] + up[2] * 0.25];
    // roll so that screen-up follows `up`: the engine's up vector is (sin roll, cos roll, 0); looking
    // down, approximate with a target nudged along `up` and a roll from yaw
    return { pos, target, fov: 76, roll: 0, focus: y, aperture: 0.003 };
  };
  return hallScene(P, {
    name: 's05-chorus-spiral', cam,
    spiral: (t) => catchT.map((c) => (t < c ? 0 : c < 0 ? 1 : 0.35 + 0.65 * spring(t, c, { freq: 1.5, damping: 0.55 }))),
    amb: [0.004, 0.0035, 0.0035],
    text: {
      mode: 1, rect, size,
      draw(ctx, t) { C.lines.forEach((l, k) => arcText(ctx, t, l.words, cx, cy, place[k].R, place[k].a, { size: 116 })); },
    },
    post: () => grade({ exposure: 1.1, bloom: 0.22 }),
    finish: () => FINISH,
  });
};
