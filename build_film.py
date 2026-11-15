"""
build_film.py - joins the six Flow clips into one cinematic, scroll-ready film.

Run:  python build_film.py
Needs: numpy, opencv-python, imageio-ffmpeg (bundles a modern ffmpeg 7.x)

What it does
  * Act 1 (clips 1-4, white studio):  turn -> close-up -> walk back + sit -> desk + typing
  * Act 2 (clips 5-6, dark office):    walk left -> face camera -> wave
  * Hides the dissolve that Veo baked into clip 3 with a motion dip-through-black
  * Removes the big "Veo" logo that appears in clip 4 with a slow cinematic push-in
    (the logo lives only in the bottom 17% of the frame, the push-in crops it out)
  * Masks the small corner "Veo" mark in every other clip
  * Joins clip 5 -> clip 6 at their matching frame (they converge at frame 156)
  * Grades every frame the same way: true-black background, gentle S-curve, soft vignette
  * Renders a 1920x1080 master, then web versions with dense keyframes for instant seeking
"""
import os, subprocess, sys, json, shutil
import numpy as np
import cv2
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(ROOT, "clips")
WORK = os.path.join(ROOT, "_work")
MEDIA = os.path.join(ROOT, "site", "media")
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 24
SW, SH = 1280, 720          # source size
OW, OH = 1920, 1080         # master size

# ---------------------------------------------------------------- frames
def extract(n):
    d = os.path.join(WORK, f"clip{n}")
    if not os.path.isdir(d) or not os.listdir(d):
        os.makedirs(d, exist_ok=True)
        subprocess.run([FF, "-v", "error", "-y", "-i", os.path.join(CLIPS, f"clip{n}.mp4"),
                        os.path.join(d, "f%03d.png")], check=True)
    return d

_cache = {}
def frame(clip, idx):
    """1-based frame index, float32 BGR 0..1, small Veo mark removed."""
    key = (clip, idx)
    if key in _cache:
        return _cache[key]
    im = cv2.imread(os.path.join(WORK, f"clip{clip}", f"f{idx:03d}.png"))
    if im is None:
        raise FileNotFoundError(f"clip{clip} frame {idx}")
    im = remove_corner_mark(im)
    out = im.astype(np.float32) / 255.0
    if len(_cache) > 64:
        _cache.clear()
    _cache[key] = out
    return out

_corner_mask = None
def remove_corner_mark(im):
    """The small 'Veo' text sits at x 1243-1279, y 680-719 over near-black. Inpaint that box."""
    global _corner_mask
    if _corner_mask is None:
        m = np.zeros((SH, SW), np.uint8)
        m[672:720, 1232:1280] = 255
        _corner_mask = m
    return cv2.inpaint(im, _corner_mask, 6, cv2.INPAINT_TELEA)

# ---------------------------------------------------------------- edit list
# Each item produces output frames. "zoom" is (scale, cx, cy) in source pixels, the
# point that lands in the centre of the output. Crossfades overlap the previous item.
def smooth(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)

def ease_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3

def ease_in(t):
    t = min(max(t, 0.0), 1.0)
    return t ** 3

FULL = (1.0, SW / 2, SH / 2)
# Logo-free framing for clip 4: keep y 0..600 (logo starts at y=612), x centred on him.
CROP_H = 600.0
CROP = (SH / CROP_H, 640.0, CROP_H / 2)

def lerp_view(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

timeline = []   # list of dicts: layers=[(clip, idx, alpha)], view, fade, blur

def add(layers, view=FULL, fade=1.0, blur=0.0, tag=""):
    timeline.append(dict(layers=layers, view=view, fade=fade, blur=blur, tag=tag))

def build_edl():
    # ---- A: clip 1, turns to camera (frames 1..190)
    for i in range(1, 185):
        add([(1, i, 1.0)], tag="c1")
    # ---- A->B crossfade 6 frames (clip1 185..190 with clip2 1..6)
    for k in range(6):
        a = (k + 1) / 7
        add([(1, 185 + k, 1 - a), (2, 1 + k, a)], tag="c1>c2")
    # ---- B: clip 2 close-up
    for i in range(7, 163):
        add([(2, i, 1.0)], tag="c2")
    # ---- B->C crossfade 4 (clip2 163..166 with clip3 1..4)
    for k in range(4):
        a = (k + 1) / 5
        add([(2, 163 + k, 1 - a), (3, 1 + k, a)], tag="c2>c3")
    # ---- C: clip 3 close-up frames 5..13, dip OUT with push-in + blur
    n = 9
    for k in range(n):
        t = (k + 1) / n
        add([(3, 5 + k, 1.0)], view=(1.0 + 0.10 * ease_in(t), SW / 2, 230),
            fade=1 - ease_in(t) * 1.0, blur=6 * ease_in(t), tag="dip1-out")
    add([], fade=0.0, tag="black")
    add([], fade=0.0, tag="black")
    # ---- D: clip 3 wide (after Veo's dissolve) frames 45..166, dip IN with pull-back
    ramp_start = 112                      # clip3 frame where the slow push-in starts
    for j, i in enumerate(range(45, 161)):
        t_in = j / 14
        add([(3, i, 1.0)], view=(1.12 - 0.12 * ease_out(j / 22), SW / 2, SH / 2),
            fade=ease_out(t_in), blur=5 * (1 - ease_out(t_in)),
            tag="ramp" if i >= ramp_start else "c3wide")
    # ---- D->E crossfade 6 (clip3 161..166 with clip4 1..6)
    for k in range(6):
        a = (k + 1) / 7
        add([(3, 161 + k, 1 - a), (4, 1 + k, a)], tag="ramp")
    # ---- E: clip 4, desk slides in, typing, camera pushes in (logo cropped away)
    e_end = 166
    out_len = 14                           # dip-out length at the end of clip 4
    for i in range(7, e_end + 1):
        k_from_end = e_end - i             # 0 at last frame
        view, fade, blur = CROP, 1.0, 0.0
        if k_from_end < out_len:
            t = (out_len - k_from_end) / out_len
            view = (CROP[0] * (1 + 0.14 * ease_in(t)), CROP[1], CROP[2] + 20 * ease_in(t))
            fade = 1 - ease_in(t)
            blur = 7 * ease_in(t)
        add([(4, i, 1.0)], view=view, fade=fade, blur=blur, tag="c4")
    # slow cinematic push-in FULL -> CROP across every "ramp" frame (ends before the logo shows)
    ramp = [it for it in timeline if it["tag"] == "ramp"]
    for n, it in enumerate(ramp):
        it["view"] = lerp_view(FULL, CROP, smooth((n + 1) / len(ramp)))
        it["tag"] = "push-in"
    for _ in range(3):
        add([], fade=0.0, tag="black")
    # ---- G: clip 5, dark office, dip IN with pull-back
    for i in range(1, 149):
        j = i - 1
        fade = ease_out(j / 16)
        view = (1.14 - 0.14 * ease_out(j / 30), SW / 2, SH / 2)
        blur = 6 * (1 - ease_out(j / 16))
        add([(5, i, 1.0)], view=view, fade=fade, blur=blur, tag="c5")
    # ---- G->H crossfade at the matching frames (clip5 149..156 ~ clip6 149..156)
    for k in range(8):
        a = (k + 1) / 9
        add([(5, 149 + k, 1 - a), (6, 149 + k, a)], tag="c5>c6")
    # ---- H: clip 6 wave
    for i in range(157, 193):
        add([(6, i, 1.0)], tag="c6")

# ---------------------------------------------------------------- grading
def make_vignette():
    y, x = np.mgrid[0:OH, 0:OW].astype(np.float32)
    nx = (x / OW - 0.5) * 2
    ny = (y / OH - 0.45) * 2
    r = np.sqrt((nx * 0.85) ** 2 + (ny * 1.0) ** 2)
    v = 1 - 0.38 * np.clip((r - 0.55) / 0.75, 0, 1) ** 1.6
    # extra bottom fade so floors melt into the black page
    bottom = 1 - 0.55 * np.clip((y / OH - 0.86) / 0.14, 0, 1) ** 1.5
    return (v * bottom)[..., None]

VIG = None
def grade(im):
    bp = 0.038                                   # crush the grey haze to true black
    im = np.clip((im - bp) / (1 - bp), 0, 1)
    s = im * im * (3 - 2 * im)                   # gentle S-curve
    im = im * 0.84 + s * 0.16
    # warm the highlights slightly toward the amber rim light, keep shadows neutral
    lum = im.mean(axis=2, keepdims=True)
    warm = np.clip((lum - 0.35) / 0.65, 0, 1) * 0.035
    im[..., 2] += warm[..., 0]                   # R
    im[..., 0] -= warm[..., 0] * 0.6             # B
    im *= VIG
    return np.clip(im, 0, 1)

# ---------------------------------------------------------------- render
def view_matrix(view):
    s, cx, cy = view
    k = (OW / SW) * s                    # source -> output scale
    return np.float32([[k, 0, OW / 2 - k * cx], [0, k, OH / 2 - k * cy]])

def clamp_view(view):
    """Keep the view inside the source so no empty border is ever shown."""
    s, cx, cy = view
    s = max(s, 1.0)
    hw, hh = SW / (2 * s), SH / (2 * s)
    cx = min(max(cx, hw), SW - hw)
    cy = min(max(cy, hh), SH - hh)
    return (s, cx, cy)

def render(item):
    if not item["layers"] or item["fade"] <= 0:
        return np.zeros((OH, OW, 3), np.float32)
    src = None
    for clip, idx, a in item["layers"]:
        f = frame(clip, idx)
        src = f * a if src is None else src + f * a
    M = view_matrix(clamp_view(item["view"]))
    out = cv2.warpAffine(src, M, (OW, OH), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    if item["blur"] > 0.3:
        out = cv2.GaussianBlur(out, (0, 0), item["blur"])
    out = grade(out)
    return out * item["fade"]

def encode_master(path):
    cmd = [FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}",
           "-r", str(FPS), "-i", "-",
           "-vf", "hqdn3d=1.2:1.2:2.4:2.4,cas=0.45",
           "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-tune", "film",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n, item in enumerate(timeline):
        p.stdin.write((render(item) * 255 + 0.5).astype(np.uint8).tobytes())
        if n % 48 == 0:
            print(f"  frame {n}/{len(timeline)}  ({item['tag']})", flush=True)
    p.stdin.close()
    if p.wait() != 0:
        sys.exit("master encode failed")

def web_versions(master):
    os.makedirs(MEDIA, exist_ok=True)
    jobs = [
        ("film.mp4", "scale=1920:-2:flags=lanczos", "21", "4"),
        ("film_mobile.mp4", "scale=1280:-2:flags=lanczos", "23", "2"),   # phones seek slower: denser keyframes
    ]
    for name, vf, crf, g in jobs:
        subprocess.run([FF, "-v", "error", "-y", "-i", master, "-vf", vf,
                        "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-tune", "film",
                        "-g", g, "-keyint_min", g, "-bf", "0", "-sc_threshold", "0",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
                        os.path.join(MEDIA, name)], check=True)
    subprocess.run([FF, "-v", "error", "-y", "-ss", "0", "-i", master, "-frames:v", "1",
                    "-vf", "scale=1600:-2", "-q:v", "3", os.path.join(MEDIA, "poster.jpg")], check=True)

if __name__ == "__main__":
    os.makedirs(WORK, exist_ok=True)
    for n in range(1, 7):
        extract(n)
    VIG = make_vignette()
    build_edl()
    print(f"timeline: {len(timeline)} frames = {len(timeline) / FPS:.2f}s")
    # write the timeline map (which source frame lands at which film second) for the site timing
    with open(os.path.join(ROOT, "_work", "timeline.json"), "w") as fh:
        json.dump([{"t": round(n / FPS, 3), "tag": it["tag"],
                    "src": [list(l[:2]) for l in it["layers"]]} for n, it in enumerate(timeline)], fh)
    master = os.path.join(ROOT, "film_master.mp4")
    encode_master(master)
    if "--no-web" not in sys.argv:
        web_versions(master)
    print("done")
