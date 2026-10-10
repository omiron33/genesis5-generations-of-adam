// s02-chorus-shelf: the first chorus. "The generations of Adam / go on, go on, go on ... In sons
// and daughters / the line goes on"
// Back in the hall of lamps. Adam's and Seth's lamps burn on the long shelf. From Seth's lamp a
// flame runs along the groove of oil cut in the shelf, lamp to lamp, and each lamp it reaches
// catches; above each new flame a line of the chorus is cut into the rock and fills with its light.
// The camera travels beside the running flame, a little ahead of it, the whole length of the shelf.
import { track } from '/song/lib/cam.js';
import lyrics from '/timing.js';
import { hallScene, lampX, wick } from '/song/lib/x-hall.js';
import { grade, FINISH, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
import { spring } from '/kit/motion.js';
export const kind = 'shader';

export default (P) => {
  const C = anchorAt(lyrics, P.from, 'The generations of Adam', 'go on, go on', 'The generations of Adam', 'and the dust keeps', 'In sons and daughters', 'the line goes on');
  // the front reaches lamp k + 2 as line k begins; then on to the last lamp
  const keysT = [P.from, ...C.lines.map((l) => l.start - 0.25), 64.5];
  const keysX = [lampX(1) + 0.05, ...C.lines.map((_, k) => lampX(k + 2)), lampX(9)];
  const front = (t) => {
    if (t <= keysT[0]) return keysX[0];
    for (let i = 0; i < keysT.length - 1; i++) if (t <= keysT[i + 1]) { const k = (t - keysT[i]) / (keysT[i + 1] - keysT[i]); return keysX[i] + (keysX[i + 1] - keysX[i]) * k; }
    return keysX[keysX.length - 1] + 0.3 * (t - keysT[keysT.length - 1]);
  };
  // when the front reaches each lamp's wick it catches
  const catchAt = (i) => { for (let t = P.from; t < P.to; t += 0.02) if (front(t) >= lampX(i)) return t; return 1e9; };
  const caught = Array.from({ length: 10 }, (_, i) => (i <= 1 ? -1e9 : catchAt(i)));
  const rect = [2.2, 1.12, 12.4, 2.32], PX = 1024;
  const size = [Math.round((rect[2] - rect[0]) * PX), Math.round((rect[3] - rect[1]) * PX)];
  const wx = (x) => (x - rect[0]) * PX, wy = (y) => (rect[3] - y) * PX;
  const keys = [];
  for (let t = P.from; t <= P.to + 0.01; t += (P.to - P.from) / 8) {
    const fx = front(t);
    keys.push({ t, pos: [fx + 0.25, 1.4 + 0.08 * Math.sin(t * 0.37), 2.45 - 0.12 * Math.sin(t * 0.21)], look: [fx - 0.4, 1.42, 0.0] });
  }
  const cam = track(keys, { handheld: { amount: 0.7, seed: 21, metres: 0.7 }, fov: 46, aperture: 0.006 });
  return hallScene(P, {
    name: 's02-chorus-shelf', cam, groove: 1,
    front,
    lit: (t) => caught.map((c) => (t < c ? 0 : c < 0 ? 1 : 0.4 + 0.6 * spring(t, c, { freq: 1.6, damping: 0.55 }))),
    amb: [0.006, 0.005, 0.005],
    text: {
      mode: 0, rect, size,
      draw(ctx, t) {
        C.lines.forEach((l, k) => {
          const cx = lampX(k + 2), y = k % 2 ? 1.36 : 1.62;
          inscribe(ctx, t, [{ words: l.words }], { x: wx(cx - 0.62), y: wy(y + 0.12), w: 1.24 * PX, h: 200 }, { size: 112 });
        });
      },
    },
    post: () => grade({ exposure: 1.05, bloom: 0.2 }),
    finish: () => FINISH,
  });
};
