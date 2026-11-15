"""Make the voice-over of the Skyliner demo video with Underdog Woof (an on-device text-to-speech model).

SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
The audio this script writes is SI-generated speech (Underdog Woof, voice Juno). Credit required by its license: "Underdog Woof".

    python3 submission/demo/build/make_vo.py [--woof ~/underdog-woof] [--voice juno]

One WAV per sentence (assets/vo/NN.wav, 24 kHz mono) and assets/vo/timing.json with the real length of each sentence, so the
scenes in index.html are timed to the voice and not the other way round. The words live in script.json (one place).
Needs numpy and the Underdog Woof folder (weights file woof_int8.npz). Nothing is sent over the network.
"""
from __future__ import annotations

import argparse
import json
import sys
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets" / "vo"

ap = argparse.ArgumentParser()
ap.add_argument("--woof", default=str(Path.home() / "underdog-woof"), help="folder with underdog_woof/ and woof_int8.npz")
ap.add_argument("--voice", default="juno", choices=["mira", "juno"])
ap.add_argument("--seed", type=int, default=0)
a = ap.parse_args()

sys.path.insert(0, a.woof)
from underdog_woof import Woof

lines = json.loads((HERE / "script.json").read_text())["lines"]
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)
prev = {}
try:  # a sentence that did not change since the last run is not drawn again (it takes about 40 s of CPU per sentence)
    old = json.loads((OUT / "timing.json").read_text())
    if old.get("voice") == a.voice and old.get("seed") == a.seed:
        prev = {t["n"]: t["say"] for t in old["lines"]}
except (OSError, ValueError):
    pass

import numpy as np

LEAD, TAIL = 0.10, 0.18  # seconds of silence kept at the ends: the model adds about 0.35 s before and 0.4 s after every sentence


def read(f: Path):
    with wave.open(str(f)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).copy(), w.getframerate()


def write(f: Path, x, sr: int) -> None:
    with wave.open(str(f), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(x.astype(np.int16).tobytes())


tts = None
timing = []
for i, ln in enumerate(lines, 1):
    raw = RAW / f"{i:02d}.wav"
    if raw.exists() and prev.get(i) == ln["say"]:
        print(f"{i:02d} reused")
    else:
        if tts is None:
            tts = Woof(voice=a.voice)
        tts.save(str(raw), tts(ln["say"], seed=a.seed))
    x, sr = read(raw)
    loud = np.where(np.abs(x) > 0.01 * 32768)[0]
    lo, hi = max(0, int(loud[0] - LEAD * sr)), min(len(x), int(loud[-1] + TAIL * sr))
    write(OUT / f"{i:02d}.wav", x[lo:hi], sr)
    dur = (hi - lo) / sr
    timing.append({"n": i, "scene": ln["scene"], "say": ln["say"], "caption": ln.get("caption", ln["say"]), "seconds": round(dur, 3)})
    print(f"{i:02d} {dur:5.2f} s  {ln['say']}")
# the video timeline: a short lead-in, a short gap between sentences, and a hold on the last card; the video must stay under 30 s
LEAD0, GAP, MAX_TOTAL, HOLD = 0.35, 0.15, 29.5, 1.4  # the video ends HOLD seconds after the last word (an end card), but never later than MAX_TOTAL
t = LEAD0
for tm in timing:
    tm["start"] = round(t, 3)
    t += tm["seconds"] + GAP
speech_end = timing[-1]["start"] + timing[-1]["seconds"]
TOTAL = min(MAX_TOTAL, round(speech_end + HOLD, 1))
assert TOTAL <= 30.0 and speech_end < TOTAL, f"the speech ends at {speech_end:.2f} s; the video is {TOTAL} s and must stay under 30 s"
meta = {"voice": a.voice, "seed": a.seed, "total": TOTAL, "speech_end": round(speech_end, 3), "lines": timing}
(OUT / "timing.json").write_text(json.dumps(meta, indent=1))
(OUT / "timing.js").write_text("/* Timing of the voice-over (written by build/make_vo.py). SI-generated. */\nwindow.VO_TIMING = " + json.dumps(meta) + ";\n")
sr0 = read(OUT / "01.wav")[1]
full = np.zeros(int(TOTAL * sr0), dtype=np.int16)  # one track as long as the video, silence where nobody speaks
for tm in timing:
    x, _ = read(OUT / f"{tm['n']:02d}.wav")
    i0 = int(tm["start"] * sr0)
    full[i0:i0 + len(x)] = x
write(OUT / "vo-full.wav", full, sr0)
print(f"speech {sum(t['seconds'] for t in timing):.2f} s, ends at {speech_end:.2f} s of {TOTAL} s; wrote vo-full.wav, timing.json, timing.js")
