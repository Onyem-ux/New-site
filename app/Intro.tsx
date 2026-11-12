"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

/* ──────────────────────────────────────────────────────────────
   Cinematic "fly through the O" intro. Plays on its own.

   1. The page loads with a blurred preview of the hero and a
      "Click on the seal" / "Tap on the seal" button.
   2. Pressing it starts a timed camera flight (scrolling is locked).
      The camera glides past "This is" and "The love Story", slowing to
      let each one be read, then drifts onto the "O" of "Of".
   3. The inside of the O is cut out to the exact shape of the letter
      (measured from your font). The camera dives in at a constant zoom
      rate, and the wall of frames is revealed only through the O, until
      the O is big enough that its opening fills the whole screen.
   4. Scrolling unlocks and the wall is the hero.
   ────────────────────────────────────────────────────────────── */

/* ---- Tuning knobs ------------------------------------------------ */
const D0 = 1000; // reference distance (scale = 1 at this distance)
const Z_THIS = 2400; // depth of "This is"
const Z_LOVE = 4200; // depth of "The love / Story"
const Z_O = 6200; // depth of "Of"

const CRUISE = 500; // camera speed between words (units per second). Lower = slower
const DWELL: [number, number, number][] = [
  // [camera position, width, how much to slow down (0–1)] : pauses to read each word
  [1500, 380, 0.62], // "This is"
  [3300, 380, 0.62], // "The love Story"
  [4850, 330, 0.55], // "Of"
];
const DIVE_START = 833; // distance from the O where the final dive begins
const DIVE_K = 0.5; // dive zoom rate (e-folds per second). Lower = slower dive
const SETTLE = 1.5; // seconds after the dive for the names to arrive

const SIDE_X = 0.36; // how far to the left/right the side text sits (× screen width)
const SIDE_PARALLAX = 0.4; // 1 = text flies outward fast, lower = stays nearer its side
const ROLL_DEG = 0.55; // gentle camera roll, in degrees (0 = none)
const DUST_COUNT = 48; // floating specks that sell the motion

// The two lines of text under the logo (each has its own font in the CSS)
const CTA_HEADLINE = "And so, our forever begins...";

/* ---- The wall -------------------------------------------------------
   A panelled wall, like classic wainscoting. Every panel is
   [x, y, width, height] in % of the screen ("wide" = desktop, "tall" = phone).
   Six panels hold a framed photo with its own slideshow:
   4 big + 2 small. The tall centre panel is left empty for the names.
   photo.wide / photo.tall = frame width as % of its panel.
   interval = how often that frame's slideshow changes (ms).            */
type Rect = [number, number, number, number];
type PhotoFrame = { size: "big" | "small"; wide: number; tall: number; interval: number };
type PanelDef = { wide: Rect; tall: Rect | null; photo?: PhotoFrame; centre?: boolean };

const PANELS: PanelDef[] = [
  // left side: two big frames up top, one small frame below
  { wide: [2, 4, 15.5, 52], tall: [4, 2, 44, 27], photo: { size: "big", wide: 82, tall: 74, interval: 4200 } },
  { wide: [19.5, 4, 15.5, 52], tall: [20, 77, 29, 20], photo: { size: "big", wide: 82, tall: 78, interval: 5600 } },
  { wide: [2, 65, 15.5, 24], tall: [2, 78, 16, 18], photo: { size: "small", wide: 50, tall: 80, interval: 6800 } },
  { wide: [19.5, 65, 15.5, 24], tall: null },
  // centre: the names live here
  { wide: [37, 4, 26, 85], tall: [8, 32, 84, 42], centre: true },
  // right side: two big frames up top, one small frame below
  { wide: [65, 4, 15.5, 52], tall: [52, 2, 44, 27], photo: { size: "big", wide: 82, tall: 74, interval: 4900 } },
  { wide: [82.5, 4, 15.5, 52], tall: [51, 77, 29, 20], photo: { size: "big", wide: 82, tall: 78, interval: 7400 } },
  { wide: [65, 65, 15.5, 24], tall: null },
  { wide: [82.5, 65, 15.5, 24], tall: [82, 78, 16, 18], photo: { size: "small", wide: 50, tall: 80, interval: 5200 } },
];

// The horizontal "chair rail" mouldings
const RAILS: { wide: Rect; tall: Rect }[] = [
  { wide: [0, 59.2, 37, 1.8], tall: [0, 29.8, 100, 1.2] },
  { wide: [63, 59.2, 37, 1.8], tall: [0, 75.2, 100, 1.2] },
];

const rectVars = (r: Rect | null, prefix: "w" | "t") =>
  r
    ? {
        [`--${prefix}x`]: `${r[0]}%`,
        [`--${prefix}y`]: `${r[1]}%`,
        [`--${prefix}w`]: `${r[2]}%`,
        [`--${prefix}h`]: `${r[3]}%`,
      }
    : {};

/* ---- Helpers ----------------------------------------------------- */
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

type Fx = { blur: number; opacity: number };

/** Blur + opacity for a layer at projection scale s.
 *  Far → hazy and faint, sharpening as it approaches. Middle → sharp.
 *  Very close → blurs and fades as it leaves the frame.               */
function depthFx(s: number): Fx {
  const blurFar = clamp((0.5 - s) / 0.3, 0, 1) * 7;
  const blurNear = clamp((s - 1.7) / 1.5, 0, 1) * 16;
  const fadeIn = smooth(0.06, 0.2, s);
  const fadeOut = 1 - smooth(3.2, 5.0, s);
  return { blur: Math.max(blurFar, blurNear), opacity: fadeIn * fadeOut };
}

/** The "O" never fades out (it must stay until the opening fills the screen)
 *  and its blur is eased off once it is huge.                           */
function ofFx(s: number): Fx {
  const f = depthFx(s);
  return { blur: f.blur * (1 - smooth(5, 9, s)), opacity: smooth(0.06, 0.2, s) };
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ---- Measuring the inside of the "O" ------------------------------
   Draws the letter to a canvas, finds the enclosed counter (the hole),
   and turns it into a mask image so the reveal matches the letter.    */
type Counter = { url: string; cw: number; ch: number; cx: number; cy: number }; // all in em

function buildCounter(family: string): Counter | null {
  const F = 480;
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return null;

  g.font = `${F}px ${family}`;
  const m = g.measureText("O");
  const pad = 24;
  const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2;
  const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2;
  if (w < 20 || h < 20 || w > 3000 || h > 3000) return null;

  canvas.width = w;
  canvas.height = h;
  g.font = `${F}px ${family}`;
  g.textBaseline = "alphabetic";
  g.textAlign = "left";
  g.fillStyle = "#000";
  const ox = pad + m.actualBoundingBoxLeft; // text origin x
  const oy = pad + m.actualBoundingBoxAscent; // baseline y
  g.fillText("O", ox, oy);

  const data = g.getImageData(0, 0, w, h).data;
  const isInk = (x: number, y: number) => data[(y * w + x) * 4 + 3] > 110;

  // Seed: the empty pixel nearest the middle of the letter
  const mx = Math.round(w / 2);
  const my = Math.round(h / 2);
  let sx = -1;
  let sy = -1;
  let best = Infinity;
  const R = Math.floor(Math.min(w, h) / 3);
  for (let y = my - R; y <= my + R; y++) {
    for (let x = mx - R; x <= mx + R; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h || isInk(x, y)) continue;
      const d = (x - mx) * (x - mx) + (y - my) * (y - my);
      if (d < best) {
        best = d;
        sx = x;
        sy = y;
      }
    }
  }

  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;

  // Fallback: a plain ellipse in the middle of the letter
  const fallback = (): Counter => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const cg = c.getContext("2d");
    if (cg) {
      cg.fillStyle = "#000";
      cg.beginPath();
      cg.ellipse(64, 64, 64, 64, 0, 0, Math.PI * 2);
      cg.fill();
    }
    return {
      url: c.toDataURL("image/png"),
      cw: (inkW * 0.42) / F,
      ch: (inkH * 0.5) / F,
      cx: (-m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2 / F,
      cy: (-m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 2 / F,
    };
  };

  if (sx < 0) return fallback();

  // Flood fill the empty region; if it reaches the edge, the O is open
  const seen = new Uint8Array(w * h);
  const stack: number[] = [sy * w + sx];
  seen[sy * w + sx] = 1;
  let minX = sx;
  let maxX = sx;
  let minY = sy;
  let maxY = sy;

  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % w;
    const y = (i / w) | 0;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return fallback();
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    const next = [i - 1, i + 1, i - w, i + w];
    for (const n of next) {
      if (seen[n]) continue;
      const nx = n % w;
      const ny = (n / w) | 0;
      if (isInk(nx, ny)) continue;
      seen[n] = 1;
      stack.push(n);
    }
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const mc = document.createElement("canvas");
  mc.width = bw;
  mc.height = bh;
  const mg = mc.getContext("2d");
  if (!mg) return fallback();
  const out = mg.createImageData(bw, bh);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (seen[(y + minY) * w + (x + minX)]) out.data[(y * bw + x) * 4 + 3] = 255;
    }
  }
  mg.putImageData(out, 0, 0);

  return {
    url: mc.toDataURL("image/png"),
    cw: bw / F,
    ch: bh / F,
    cx: ((minX + maxX + 1) / 2 - ox) / F,
    cy: ((minY + maxY + 1) / 2 - oy) / F,
  };
}

/* One frame's slideshow: crossfades through the photos at its own pace */
function Slideshow({ photos, start, interval }: { photos: string[]; start: number; interval: number }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setTick((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [photos.length, interval]);

  const current = (start + tick) % photos.length;

  return (
    <>
      {photos.map((src, k) => (
        <img
          key={`${src}-${k}`}
          src={src}
          alt=""
          draggable={false}
          className={`slide ${k === current ? "on" : ""}`}
        />
      ))}
    </>
  );
}

type Phase = "idle" | "playing" | "done";

type IntroProps = {
  photos?: string[]; // add as many as you like
  names?: [string, string, string]; // stacked top → bottom
  storyHref?: string; // where the text link under the names goes
  storyLabel?: string;
  scrollHref?: string; // where the "Scroll down" hint goes
  id?: string;
  onPhaseChange?: (phase: Phase) => void; // lets the page know when the intro is done
  onStart?: () => void; // called when the seal is clicked (e.g. to start the music)
};

export default function Intro({
  photos = ["/1.jpeg", "/2.jpeg", "/3.jpeg", "/4.jpeg", "/5.jpeg"],
  names = ["Lolia", "&", "Joshua"],
  storyHref = "#story",
  storyLabel = "Read our story",
  scrollHref = "#countdown",
  id = "home",
  onPhaseChange,
  onStart,
}: IntroProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState<string | null>(null);
  const controls = useRef<{ start: () => void; finish: () => void }>({ start: () => {}, finish: () => {} });

  /* Tell the page which phase we are in (used to show the nav) */
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const wallFxRef = useRef<HTMLDivElement>(null);
  const wallClipRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const thisRef = useRef<HTMLDivElement>(null);
  const loveRef = useRef<HTMLDivElement>(null);
  const loveTopRef = useRef<HTMLSpanElement>(null);
  const loveStoryRef = useRef<HTMLSpanElement>(null);
  const ofRef = useRef<HTMLDivElement>(null);
  const ofORef = useRef<HTMLSpanElement>(null);
  const ofBaseRef = useRef<HTMLSpanElement>(null);
  const dustRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /* "Story" is sized so it is exactly as wide as "The love" above it */
  useIsoLayoutEffect(() => {
    const top = loveTopRef.current;
    const story = loveStoryRef.current;
    if (!top || !story) return;

    const fit = () => {
      story.style.fontSize = "1em";
      const wTop = top.offsetWidth;
      const wStory = story.offsetWidth;
      if (wStory > 0 && wTop > 0) story.style.fontSize = `${(wTop / wStory).toFixed(3)}em`;
    };

    fit();
    document.fonts?.load("1em Calista").then(fit).catch(() => {});
    document.fonts?.ready.then(fit).catch(() => {});
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* "Click" on desktop, "Tap" on touch screens (this is the second line only) */
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setLabel(fine ? "Tap on the seal" : "Tap on the seal");
  }, []);

  /* The camera */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;

    let W = 0;
    let H = 0;
    let portrait = false;
    let u = 0;

    // The O's opening, in px at scale 1, and where its centre is inside the word "Of"
    let oX = 0;
    let oY = 0;
    let cwPx = 60;
    let chPx = 90;
    let maskUrl: string | null = null;
    let sHit = 20; // zoom level at which the opening covers the whole screen
    let counter: Counter | null = null;

    // The camera path (pre-computed so it can ease, dwell and dive)
    const DT = 1 / 60;
    let path: number[] = [0];
    let tCam = 1;
    let tTotal = 1 + SETTLE;

    let phaseNow: Phase = "idle";
    let startAt = 0;
    let raf = 0;
    let startTimer = 0;
    let maskReady = false;

    const dust = Array.from({ length: DUST_COUNT }, () => ({
      nx: Math.random() * 2 - 1,
      ny: Math.random() * 2 - 1,
      z: 200 + Math.random() * (Z_O - 400),
      size: 0.6 + Math.random() * 1.1,
    }));

    const setMask = (el: HTMLElement, prop: string, value: string) => {
      el.style.setProperty(prop, value);
      el.style.setProperty(`-webkit-${prop}`, value);
    };

    /* Camera speed at position C */
    const speedAt = (C: number) => {
      const dO = Z_O - C;
      if (dO <= DIVE_START) return DIVE_K * dO; // constant zoom rate
      let v = CRUISE * (0.14 + 0.86 * smooth(0, 500, C)); // gentle start
      for (const [c, w, depth] of DWELL) v *= 1 - depth * Math.exp(-(((C - c) / w) ** 2));
      return Math.max(v, 40);
    };

    const buildPath = () => {
      const cFinal = Z_O - D0 / sHit;
      const arr: number[] = [0];
      let C = 0;
      for (let i = 0; i < 60 * 120 && C < cFinal - 0.5; i++) {
        C += speedAt(C) * DT;
        arr.push(Math.min(C, cFinal));
      }
      arr[arr.length - 1] = cFinal;
      path = arr;
      tCam = (arr.length - 1) * DT;
      tTotal = tCam + SETTLE;
    };

    const cAt = (t: number) => {
      const f = clamp(t / DT, 0, path.length - 1);
      const i = Math.floor(f);
      if (i >= path.length - 1) return path[path.length - 1];
      return path[i] + (path[i + 1] - path[i]) * (f - i);
    };

    const measureOf = () => {
      const word = ofRef.current;
      const oEl = ofORef.current;
      const base = ofBaseRef.current;
      if (!word || !oEl || !base) return;

      const prevT = word.style.transform;
      const prevF = word.style.filter;
      word.style.transform = "none";
      word.style.filter = "none";
      const wr = word.getBoundingClientRect();
      const or = oEl.getBoundingClientRect();
      const br = base.getBoundingClientRect();
      word.style.transform = prevT;
      word.style.filter = prevF;

      const fs = parseFloat(getComputedStyle(word).fontSize);
      if (!counter) return;

      cwPx = counter.cw * fs;
      chPx = counter.ch * fs;
      oX = or.left + counter.cx * fs - (wr.left + wr.width / 2);
      oY = br.bottom + counter.cy * fs - (wr.top + wr.height / 2);
      maskUrl = counter.url;

      // Zoom needed for the opening to cover every corner of the screen
      sHit = 1.12 * Math.hypot(W / cwPx, H / chPx);
    };

    const rebuildCounter = () => {
      const word = ofRef.current;
      if (!word) return;
      counter = buildCounter(getComputedStyle(word).fontFamily);
      maskReady = false;
      measure();
    };

    const measure = () => {
      W = stage.clientWidth;
      H = stage.clientHeight;
      portrait = W / H <= 0.9; // keep in sync with the CSS media query
      u = portrait ? W * 1.7 : W;
      stage.style.setProperty("--u", `${u}px`);
      measureOf();
      buildPath();

      // Show the opening cinematic scene, not the completed hero.
      // Keep the final hero reserved for when the intro finishes.
      if (phaseNow === "idle") {
        renderAt(1.8);
      } else if (phaseNow === "done") {
        renderAt(tTotal);
      }
    };

    /** Place an element at world position (X, Y, Z) */
    const place = (
      el: HTMLElement | null,
      X: number,
      Y: number,
      Z: number,
      C: number,
      opts: {
        camX?: number;
        camY?: number;
        par?: number;
        blur?: boolean;
        size?: number;
        alpha?: number;
        fx?: (s: number) => Fx;
        minD?: number;
      } = {}
    ) => {
      if (!el) return;
      const d = Z - C;
      if (d < (opts.minD ?? 70)) {
        el.style.visibility = "hidden";
        return;
      }
      const s = D0 / d;
      const fx = (opts.fx ?? depthFx)(s);
      const opacity = fx.opacity * (opts.alpha ?? 1);
      if (opacity < 0.01) {
        el.style.visibility = "hidden";
        return;
      }
      const sp = Math.pow(s, opts.par ?? 1);
      const x = W / 2 + (X - (opts.camX ?? 0)) * sp;
      const y = H / 2 + (Y - (opts.camY ?? 0)) * sp;
      const k = s * (opts.size ?? 1);
      el.style.visibility = "visible";
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${k.toFixed(4)}) translate(-50%, -50%)`;
      el.style.filter = opts.blur === false || fx.blur < 0.2 ? "none" : `blur(${(fx.blur / k).toFixed(2)}px)`;
    };

    const renderAt = (t: number) => {
      const C = cAt(t);
      const gA = smooth(0, 1.8, t); // everything fades in at the start
      const dO = Math.max(1, Z_O - C);
      const sO = D0 / dO;
      const q = clamp(sO / sHit, 0, 1);

      // The camera drifts onto the centre of the O's opening
      const pan = smooth(3600, Z_O - 700, C);
      const camX = oX * pan;
      const camY = oY * pan;

      place(thisRef.current, SIDE_X * W, 0, Z_THIS, C, { par: SIDE_PARALLAX, alpha: gA });
      place(loveRef.current, -SIDE_X * W, 0, Z_LOVE, C, { par: SIDE_PARALLAX, alpha: gA });
      place(ofRef.current, 0, 0, Z_O, C, { camX, camY, alpha: gA, fx: ofFx, minD: 20 });
      if (ofRef.current && sO >= sHit * 1.05) ofRef.current.style.visibility = "hidden";

      dust.forEach((d0, i) =>
        place(dustRefs.current[i], d0.nx * W * 1.1, d0.ny * H * 1.1, d0.z, C, {
          blur: false,
          size: d0.size,
          alpha: 0.7 * gA,
        })
      );

      // The wall, visible only through the O's opening until it fills the screen
      const wallFx = wallFxRef.current;
      const clip = wallClipRef.current;
      const wall = wallRef.current;
      if (wallFx && clip && wall) {
        const fx = ofFx(sO);
        const b = fx.blur * (1 - smooth(0.6, 1, q));
        wallFx.style.visibility = "visible";
        wallFx.style.opacity = (smooth(0.4, 0.9, sO) * gA).toFixed(3);
        wallFx.style.filter = b > 0.2 ? `blur(${b.toFixed(2)}px)` : "none";

        if (sO >= sHit || !maskUrl) {
          setMask(clip, "mask-image", "none");
          maskReady = false;
        } else {
          if (!maskReady) {
            setMask(clip, "mask-image", `url(${maskUrl})`);
            maskReady = true;
          }
          const cx = W / 2 + (oX - camX) * sO;
          const cy = H / 2 + (oY - camY) * sO;
          const mw = cwPx * sO;
          const mh = chPx * sO;
          setMask(clip, "mask-size", `${mw.toFixed(1)}px ${mh.toFixed(1)}px`);
          setMask(clip, "mask-position", `${(cx - mw / 2).toFixed(1)}px ${(cy - mh / 2).toFixed(1)}px`);
        }

        // The wall starts small inside the O and grows to full size as we come through
        const g = clamp((Math.log(sO) - Math.log(1.2)) / (Math.log(sHit) - Math.log(1.2)), 0, 1);
        wall.style.transform = `scale(${(0.32 + 0.68 * smooth(0, 1, g)).toFixed(4)})`;
      }

      if (namesRef.current) {
        namesRef.current.style.opacity = smooth(tCam - 1.0, tCam + 1.2, t).toFixed(3);
      }

      // Cinematic touches: a slow camera roll and soft vignette that ease off at the end
      if (worldRef.current) {
        const roll = ROLL_DEG * Math.sin(t * 0.45) * smooth(0, 3, t) * (1 - smooth(0.55, 1, q));
        worldRef.current.style.transform = `rotate(${roll.toFixed(3)}deg)`;
      }
      if (vignetteRef.current) {
        vignetteRef.current.style.opacity = (gA * (1 - smooth(0.7, 1, q))).toFixed(3);
      }
    };

    const lock = () => {
      html.style.overflow = "hidden";
      window.scrollTo(0, 0);
    };
    const unlock = () => {
      html.style.overflow = "";
    };

    /* Before the intro: the opening scene, blurred and see-through, behind the button */
    const showPreview = () => {
      const world = worldRef.current;
      if (!world) return;
      world.style.transition = "none";
      world.style.filter = "blur(14px)";
      world.style.opacity = "0.55";
    };

    const finish = () => {
      if (phaseNow === "done") return;
      phaseNow = "done";
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
      const world = worldRef.current;
      if (world) {
        world.style.transition = "none";
        world.style.opacity = "1";
        world.style.filter = "none";
      }
      renderAt(tTotal);
      unlock();
      setPhase("done");
    };

    const start = () => {
      if (phaseNow !== "idle") return;

      // Start the music when the seal is clicked
      onStart?.();

      phaseNow = "playing";
      setPhase("playing");

      // Fade the blurred preview away, then begin the flight from an empty scene
      const world = worldRef.current;
      if (world) {
        world.style.transition = "opacity 0.6s ease, filter 0.6s ease";
        world.style.opacity = "0";
        world.style.filter = "none";
      }

      startTimer = window.setTimeout(() => {
        renderAt(0); // empty scene first, then reveal, so there's no flash
        if (world) {
          world.style.transition = "none";
          world.style.opacity = "1";
        }
        startAt = performance.now();
        const loop = (now: number) => {
          const t = (now - startAt) / 1000;
          renderAt(Math.min(t, tTotal));
          if (t >= tTotal) {
            finish();
            return;
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }, 650);
    };

    controls.current = { start, finish };

    measure();
    rebuildCounter();
    document.fonts?.load("1em Calista").then(rebuildCounter).catch(() => {});
    document.fonts?.ready.then(rebuildCounter).catch(() => {});
    window.addEventListener("resize", measure);

    if (reduceMotion) {
      phaseNow = "done";
      renderAt(tTotal);
      setPhase("done");
    } else {
      lock();
      showPreview();
    }

    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      unlock();
    };
  }, []);

  return (
    <section id={id} className={`intro intro--${phase}`} style={{ height: "100svh" }}>
      <div className="intro-stage" ref={stageRef}>
        <div className="world" ref={worldRef}>
          {/* 1. The wall of frames (the hero), seen through the O */}
          <div className="wall-fx" ref={wallFxRef}>
            <div className="wall-clip" ref={wallClipRef}>
              <div className="wall" ref={wallRef}>
                {/* chair rails */}
                {RAILS.map((r, i) => (
                  <div
                    key={`rail-${i}`}
                    className="rail"
                    style={{ ...rectVars(r.wide, "w"), ...rectVars(r.tall, "t") } as CSSProperties}
                  />
                ))}

                {/* moulded panels, some holding a framed photo */}
                {PANELS.map((panel, i) => {
                  const photoIndex = PANELS.slice(0, i).filter((x) => x.photo).length;
                  return (
                    <div
                      key={`panel-${i}`}
                      className={`panel ${panel.tall ? "" : "panel--wide-only"}`}
                      style={{ ...rectVars(panel.wide, "w"), ...rectVars(panel.tall, "t") } as CSSProperties}
                    >
                      {panel.photo && (
                        <div
                          className={`frame frame--${panel.photo.size}`}
                          style={
                            {
                              "--fw": `${panel.photo.wide}%`,
                              "--tfw": `${panel.photo.tall}%`,
                            } as CSSProperties
                          }
                        >
                          <div className="frame-photo">
                            <Slideshow
                              photos={photos}
                              start={(photoIndex * 2) % photos.length}
                              interval={panel.photo.interval}
                            />
                          </div>
                        </div>
                      )}

                      {/* "Scroll down" hint at the bottom of the centre frame (desktop only) */}
                      {panel.centre && (
                        <a href={scrollHref} className="scroll-hint" aria-label="Scroll down">
                          <span>Scroll down</span>
                          <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
                            <path
                              d="M7 1v16M1.5 11.5L7 17l5.5-5.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  );
                })}

                <div className="baseboard" />

                {/* names + link */}
                <div className="hero-center" ref={namesRef}>
                  <h1 className="names">
                    <span>{names[0]}</span>
                    <span className="amp">{names[1]}</span>
                    <span>{names[2]}</span>
                  </h1>
                  <Link href={storyHref} className="story-cta">
                    {storyLabel}
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Floating specks */}
          {Array.from({ length: DUST_COUNT }, (_, i) => (
            <span
              key={i}
              className="dust"
              aria-hidden="true"
              ref={(el) => {
                dustRefs.current[i] = el;
              }}
            />
          ))}

          {/* 3. Text that flies past */}
          <div className="layer txt-this" ref={thisRef}>
            <span>This is</span>
          </div>

          <div className="layer lockup" ref={loveRef}>
            <span className="lockup-top" ref={loveTopRef}>
              The love
            </span>
            <span className="lockup-story" ref={loveStoryRef}>
              Story
            </span>
          </div>

          <div className="layer txt-of" ref={ofRef}>
            <span ref={ofORef}>O</span>
            <span>f</span>
            <span className="baseline" ref={ofBaseRef} />
          </div>
        </div>

        <div className="vignette" ref={vignetteRef} aria-hidden="true" />

        {/* Start button: logo + two lines of text, each with its own font */}
        <button
          type="button"
          className={`cta ${label ? "ready" : ""} ${phase !== "idle" ? "is-go" : ""}`}
          onClick={() => controls.current.start()}
          aria-label={label ? `${CTA_HEADLINE} ${label}` : "View"}
        >
          <img src="/logo.png" alt="" className="cta-logo" draggable={false} />
          <span className="cta-label">
            <span className="cta-headline">{CTA_HEADLINE}</span>
            <span className="cta-action">{label ?? "\u00a0"}</span>
          </span>
        </button>

        <button
          type="button"
          className={`intro-skip ${phase === "playing" ? "on" : ""}`}
          onClick={() => controls.current.finish()}
        >
          Skip intro
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </section>
  );
}

const CSS = `
@font-face {
  font-family: "Calista";
  src: url("/Calista.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

.intro { position: relative; }

.intro-stage {
  position: relative;
  height: 100svh;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(255, 255, 255, 0.9), transparent 58%),
    #f4f0e9;
  --u: 100vw;
}

.intro--idle .intro-stage,
.intro--playing .intro-stage { touch-action: none; }

.world { position: absolute; inset: 0; }

/* Layers that get projected by the camera */
.layer {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 6;
  margin: 0;
  opacity: 0;
  visibility: hidden;
  transform-origin: 0 0;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

.layer span { display: inline-block; }

.txt-this,
.txt-of,
.lockup {
  font-family: "Calista", cursive;
  color: #2c2620;
}

.txt-this { font-size: calc(var(--u) * 0.095); line-height: 1; }
.txt-of { font-size: calc(var(--u) * 0.15); line-height: 1; }

.lockup {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-size: calc(var(--u) * 0.085);
  line-height: 0.85;
}

.lockup-story { color: #C0070A; }

.baseline { width: 0; height: 0; }

.dust {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 3;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(196, 140, 50, 0.9) 0%, rgba(196, 140, 50, 0.35) 45%, rgba(196, 140, 50, 0) 70%);
  opacity: 0;
  visibility: hidden;
  transform-origin: 0 0;
  pointer-events: none;
}

/* The wall (hero), cut to the shape of the O's opening while it grows */
.wall-fx {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  visibility: hidden;
}

.wall-clip {
  position: absolute;
  inset: 0;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.wall {
  position: absolute;
  inset: 0;
  transform-origin: 50% 50%;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(255, 255, 255, 0.9), transparent 58%),
    #f4f0e9;
}

/* ── The panelled wall ── */
.intro * { box-sizing: border-box; }

.panel,
.rail {
  position: absolute;
  left: var(--wx);
  top: var(--wy);
  width: var(--ww);
  height: var(--wh);
}

/* A raised moulding: light bead, soft shadow, and a second inner line */
.panel {
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 0 0 1px rgba(120, 105, 88, 0.22),
    1px 2px 4px rgba(80, 65, 50, 0.12),
    inset 0 0 0 1px rgba(120, 105, 88, 0.18),
    inset 2px 3px 5px rgba(80, 65, 50, 0.08);
}

.panel::after {
  content: "";
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(120, 105, 88, 0.16);
  pointer-events: none;
}

.rail {
  background: linear-gradient(#fcfaf6, #e9e3d8);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85),
    0 4px 6px rgba(80, 65, 50, 0.14),
    inset 0 -1px 0 rgba(120, 105, 88, 0.28);
}

.baseboard {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8%;
  background: linear-gradient(#f8f5ef, #ebe5da);
  border-top: 1px solid rgba(120, 105, 88, 0.25);
  box-shadow: 0 -4px 8px rgba(80, 65, 50, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.baseboard::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 22%;
  height: 1px;
  background: rgba(120, 105, 88, 0.22);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* Moulded white picture frames, each hanging in the middle of a panel */
.frame {
  --pad: clamp(5px, 0.7vw, 11px);
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--fw);
  max-height: 90%;
  transform: translate(-50%, -50%);
  background: linear-gradient(145deg, #fffdf9, #ede6da);
  border-radius: 1.5px;
  box-shadow:
    inset 0 1px 0 #fff,
    0 0 0 1px rgba(100, 85, 65, 0.24),
    0 12px 24px rgba(60, 45, 30, 0.22),
    0 2px 5px rgba(60, 45, 30, 0.18);
}

.frame--big { aspect-ratio: 0.68; }
.frame--small { aspect-ratio: 0.8; }

.frame::before {
  content: "";
  position: absolute;
  inset: calc(var(--pad) * 0.4);
  border: 1px solid rgba(100, 85, 65, 0.3);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.85);
  pointer-events: none;
}

.frame-photo {
  position: absolute;
  inset: var(--pad);
  overflow: hidden;
  background: #ded8cf;
  box-shadow: 0 0 0 1px rgba(60, 45, 30, 0.4);
}

.slide {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.1s ease;
}

.slide.on { opacity: 1; }

/* Couple's names + the story link, in the centre panel */
.hero-center {
  position: absolute;
  left: 50%;
  top: 46.5%;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(18px, 2.6vw, 38px);
  margin: 0;
  opacity: 0;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.names {
  margin: 0;
  font-family: "Calista", cursive;
  font-size: clamp(60px, 8.2vw, 140px);
  font-weight: 400;
  line-height: 0.95;
  text-align: center;
  color: #2c2620;
}

.names span { display: block; }
.names .amp { font-size: 0.6em; color: #C0070A; }

/* Text link with an arrow (no button shape) */
.story-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  color: #C0070A;
  text-decoration: none;
  background: none;
  border: 0;
  font: 500 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  pointer-events: none;
  transition: color 0.25s ease;
}

.story-cta svg { transition: transform 0.25s ease; }
.story-cta:hover { color: #9A0608; }
.story-cta:hover svg { transform: translateX(4px); }

/* Only clickable once the intro has finished */
.intro--done .story-cta { pointer-events: auto; }

/* "Scroll down" hint at the bottom of the centre frame */
.scroll-hint {
  position: absolute;
  left: 50%;
  bottom: clamp(14px, 2.4vh, 28px);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: translateX(-50%);
  color: #6a6258;
  text-decoration: none;
  font: 500 10px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s ease 0.4s, color 0.25s ease;
}

.intro--done .scroll-hint { opacity: 1; pointer-events: auto; }
.scroll-hint:hover { color: #C0070A; }
.scroll-hint svg { animation: scroll-nudge 1.8s ease-in-out infinite; }

@keyframes scroll-nudge {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(5px); opacity: 1; }
}

@media (max-aspect-ratio: 9/10) {
  .panel,
  .rail {
    left: var(--tx);
    top: var(--ty);
    width: var(--tw);
    height: var(--th);
  }
  .panel--wide-only { display: none; }
  .panel { border-width: 2px; }
  .panel::after { inset: 5px; }
  .frame { width: var(--tfw); }
  .baseboard { height: 2.6%; }
  .hero-center { top: 52.5%; gap: 16px; }
  .names { font-size: clamp(44px, 17vw, 96px); }
  .story-cta { padding: 4px 0; font-size: 11px; gap: 8px; }
  .story-cta svg { width: 15px; height: 15px; }
  .scroll-hint { display: none; }
}

/* Soft cinematic vignette while the camera flies */
.vignette {
  position: absolute;
  inset: 0;
  z-index: 7;
  opacity: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 50%, rgba(60, 40, 20, 0) 55%, rgba(60, 40, 20, 0.16) 100%);
}

/* ── Start button: logo above two lines of text ── */
.cta {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26px;
  padding: 24px;
  transform: translate(-50%, -50%);
  background: none;
  border: 0;
  cursor: pointer;
  color: #4a4038;
  transition: opacity 0.9s ease 0.35s;
}

.cta:focus-visible { outline: 2px solid #C0070A; outline-offset: 6px; border-radius: 12px; }

.cta-logo {
  display: block;
  width: clamp(84px, 11vw, 120px);
  height: auto;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  animation: cta-pulse 2.4s ease-in-out infinite;
}

@keyframes cta-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.06); opacity: 0.75; }
}

/* The text block under the logo (fades in once the label is ready) */
.cta-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.5s ease;
}

/* Top line: "And so, our forever begins..."  → change this font here */
.cta-headline {
  font-family: "Calista", cursive;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Bottom line: "Click on the seal" / "Tap on the seal"  → change this font here */
.cta-action {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.cta.ready .cta-label { opacity: 1; }

.cta.is-go { opacity: 0; pointer-events: none; }

/* Skip: bottom right, just left of the music button */
.intro-skip {
  position: absolute;
  right: 84px;
  bottom: 28px;
  z-index: 8;
  padding: 10px 18px;
  color: #4a4038;
  cursor: pointer;
  background: rgba(255, 254, 250, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font: 500 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s ease 1s;
}

.intro-skip.on { opacity: 1; pointer-events: auto; }
.intro-skip:hover { border-color: #C0070A; color: #C0070A; }

@media (max-width: 700px) {
  .intro-skip { right: 70px; bottom: 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .cta,
  .intro-skip { display: none; }
  .names { opacity: 1 !important; }
  .scroll-hint svg { animation: none; }
}
`;
