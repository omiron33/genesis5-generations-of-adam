# The Generations of Adam (Genesis 5)

A song and code-rendered lyric film of Genesis 5 in the Septuagint wording: the long line from Adam to Noe, generation after generation, with Enoch who walked with God and was not found.

Built with the Ark engine: https://github.com/omiron33/ark-video-studio

[Listen at TechnoChristianity](https://technochristianity.com/music) · [More films on YouTube](https://www.youtube.com/@technochristianity)

The film runs **4:38** at **1920 × 1080 / 60 fps**, rendered at the engine's ultra tier (64 sub-frames per frame). Every frame of its 13 shots is drawn in code on the GPU: a long valley with a line of standing stones, one for each generation, a rock-cut hall of clay lamps, a mud-brick house at night, Enoch's chalk ridge above the clouds and Lamech's field. Nothing in the picture is a photograph, a downloaded model or a generated image, and no person is shown.

Every sung word is part of the world. Names and lines are cut into the faces of the stones, into the rock of the hall, into the lintels and plaster of the house and pressed into the dust, and each word fills with lamplight at its measured onset. The chorus is a flame passed from lamp to lamp. Enoch's walk is a line of footprints made by no one seen, which does not stop when the ground ends.

## Source layout

- `film.json`: the 13 shots and their timings, cut on measured beats.
- `scenes/`: one module per shot (camera, light, which words are cut where).
- `lib/`: the worlds (`x-valley.js`, `x-hall.js`, `x-house.js`, `x-ridge.js`), the shared GLSL (`g-common.js`: thin-lens camera, sky, the clay lamp and its flame, inscriptions), the camera track (`cam.js`), the look (`look.js`) and the typography (`type.js`).
- `data/`: the aligned sung words and lines, and the measured musical timing.
- `docs/STORYBOARD.md`: what each shot is for and where its words live.
- `tools/`: timing (`analyze.py`, `vocals.py`, `timing.py`), test stills (`look.sh`) and a camera inspector.
- `intake/sung-lyrics.txt`: the sung lyric text.

## Rendering

The scenes render with the photoreal mode of the Ark engine (`photoreal/film.mjs`). Place the original 48 kHz stereo recording at `media/song.wav`, then from an engine checkout:

```sh
node photoreal/render.mjs stills --song ../genesis5-generations-of-adam --scene s01-adam --t 30 --samples 16
node photoreal/film.mjs --song ../genesis5-generations-of-adam
```

The scenes use the engine's motion kit (`/kit/motion.js`, `/kit/life.js`). A full ultra render is GPU intensive and takes about a day on one Apple M4 Pro.

## License

Source code is released under the [MIT License](LICENSE). The song recording and the finished film are separate media releases; the source-code license does not grant any rights to the recording, its lyrics as a recorded work, or the rendered film.
