"use client";

import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Intro from "./Intro";

const photos = [
  { src: "/1.jpeg", alt: "Couple photograph one", offset: -2, rotation: -13, drop: 18 },
  { src: "/2.jpeg", alt: "Couple photograph two", offset: -1, rotation: -7, drop: 2 },
  { src: "/3.jpeg", alt: "Couple photograph three", offset: 0, rotation: 2, drop: 24 },
  { src: "/4.jpeg", alt: "Couple photograph four", offset: 1, rotation: 8, drop: 5 },
  { src: "/5.jpeg", alt: "Couple photograph five", offset: 2, rotation: 14, drop: 20 },
];

// Change this to your real wedding date and time
const WEDDING_DATE = new Date("2027-06-12T14:00:00");

// Images for the new sections. Swap these for your own files in /public
const STORY_IMAGE = "/3.jpeg"; // wide, landscape image works best
const REGISTRY_IMAGE = "/4.jpeg";
const GALLERY_VIDEO = "/wedding-video.mp4"; // portrait video (9:16 works best)

// ── Standalone pages ──────────────────────────────────────────────
// Each section has an in-page anchor (#id) and a future page route.
// Once you've built app/story/page.tsx, app/gallery/page.tsx, etc.,
// flip this to true and every link below switches from #anchor to /route.
const USE_STANDALONE_PAGES = false;

const NAV_ITEMS = [
  { id: "home", label: "Home", route: "/" },
  { id: "countdown", label: "Countdown", route: "/countdown" },
  { id: "story", label: "Our Story", route: "/story" },
  { id: "gallery", label: "Gallery", route: "/gallery" },
  { id: "invitation", label: "Invitation", route: "/invitation" },
  { id: "registry", label: "Registry", route: "/registry" },
];

const sectionHref = (id: string) => {
  const item = NAV_ITEMS.find((n) => n.id === id);
  return USE_STANDALONE_PAGES && item ? item.route : `#${id}`;
};

// Footer links, in display order
const FOOTER_IDS = ["invitation", "story", "gallery", "registry"];

// Slight tilt for the bento video + 6 photo frames
const BENTO_VIDEO_TILT = 0;
const BENTO_TILTS = [0, -0.5, 0.5, -0.5, 0, 0];

// Slight tilt for each countdown hover image (one per unit)
const COUNTDOWN_TILTS = [-8, 6, -5, 8, -7];

// Footer date text, built by hand to avoid server/browser formatting mismatches
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatWeddingLabel(d: Date) {
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}. ${h12}:${mins} ${h >= 12 ? "PM" : "AM"}.`;
}

const WEDDING_LABEL = formatWeddingLabel(WEDDING_DATE);

type TimeLeft = {
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, WEDDING_DATE.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);

  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

// Material "arrow_forward" icon
function ArrowIcon() {
  return (
    <svg className="arrow-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  // Music
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingBeforeHide = useRef(false);

  // Called when the intro circle is clicked
  const startMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  // Pause the music when the page is hidden (tab switch, minimize, app
  // backgrounded) and resume it when the visitor comes back, but only if
  // it was playing before they left.
  useEffect(() => {
    const handleVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        wasPlayingBeforeHide.current = !audio.paused;
        audio.pause();
      } else if (wasPlayingBeforeHide.current) {
        audio.play().catch(() => {});
        wasPlayingBeforeHide.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Countdown
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const countdownUnits = [
    { label: "Weeks", value: timeLeft?.weeks ?? 0 },
    { label: "Days", value: timeLeft?.days ?? 0 },
    { label: "Hours", value: timeLeft?.hours ?? 0 },
    { label: "Minutes", value: timeLeft?.minutes ?? 0 },
    { label: "Seconds", value: timeLeft?.seconds ?? 0 },
  ];

  // Countdown hover: which row is hovered, and where the cursor is
  const [hoveredUnit, setHoveredUnit] = useState<number | null>(null);
  const countdownRef = useRef<HTMLDivElement>(null);

  const onCountdownMove = (e: React.MouseEvent) => {
    const wrap = countdownRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    wrap.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    wrap.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  // Intro phase: the nav stays hidden until the intro is done
  const [introPhase, setIntroPhase] = useState<"idle" | "playing" | "done">("idle");

  // Mobile / tablet menu open state
  const [menuOpen, setMenuOpen] = useState(false);
  const [navBottom, setNavBottom] = useState(32);

  // Which section is currently in view (Home stays the active nav item;
  // the section in view only gets its label dimmed to 50% of the accent colour)
  const [inView, setInView] = useState("home");

  // Stacking sections: each ".stack" section pins to the top and the next one
  // slides over it. A section taller than the screen pins with its BOTTOM edge
  // at the bottom of the screen (negative top), so none of its content is hidden.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".stack"));

    const update = () => {
      const vh = window.innerHeight;
      els.forEach((el) => {
        el.style.top = `${Math.min(0, vh - el.offsetHeight)}px`;
      });
    };

    update();

    const ro = new ResizeObserver(update);
    els.forEach((el) => ro.observe(el));
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const updateNavPosition = () => {
      // Sections are pinned/stacked, so an IntersectionObserver can't tell which
      // one is on top. The current section is the last one whose top edge has
      // reached the middle of the screen.
      let current = "home";
      NAV_ITEMS.forEach(({ id }) => {
        if (id === "home") return;
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.5) current = id;
      });
      setInView(current);

      const registry = document.getElementById("registry");

      if (!registry) return;

      const registryRect = registry.getBoundingClientRect();

      // Default distance from the bottom of the viewport
      const defaultBottom = window.innerWidth >= 1025 ? 32 : 20;

      // Keep the navbar above the bottom edge of the Registry section
      const distanceFromRegistry = window.innerHeight - registryRect.bottom + defaultBottom;

      setNavBottom(Math.max(defaultBottom, distanceFromRegistry));
    };

    updateNavPosition();

    window.addEventListener("scroll", updateNavPosition, { passive: true });
    window.addEventListener("resize", updateNavPosition);

    return () => {
      window.removeEventListener("scroll", updateNavPosition);
      window.removeEventListener("resize", updateNavPosition);
    };
  }, []);

  return (
    <main className="page">
      <audio ref={audioRef} src="/looking_for_god.mp3" loop preload="auto" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />

      {/* Nav: pill on desktop, collapsible menu on tablet + mobile.
          Hidden during the intro, slides in once the hero is fully loaded. */}
      <nav
        className={`side-nav ${introPhase === "done" ? "" : "is-hidden"} ${menuOpen ? "is-open" : ""}`}
        aria-label="Page sections"
        style={{ bottom: `${navBottom}px` }}
      >
        <div className="nav-panel">
          <div className="nav-list-wrap">
            <ul className="nav-list" id="nav-list">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <Link
                    href={sectionHref(item.id)}
                    className={item.id === "home" ? "active" : inView === item.id ? "in-view" : ""}
                    aria-label={item.label}
                    aria-current={inView === item.id ? "true" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="nav-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="nav-list"
          >
            <span className="nav-toggle-label">{menuOpen ? "Close menu" : "See menu"}</span>
            <span className="nav-toggle-icon" aria-hidden="true">
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M4 4l12 12M16 4L4 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="22" height="16" viewBox="0 0 22 16">
                  <path d="M1 2h20M1 8h20M1 14h20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </nav>

      {/* Music toggle */}
      <button
        type="button"
        className="music-toggle"
        onClick={toggleMusic}
        aria-label={isPlaying ? "Pause music" : "Play music"}
        aria-pressed={isPlaying}
      >
        {isPlaying ? (
          <span className="music-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Intro + hero (id="home"). Pinned so the next sections scroll over it. */}
      <div className="hero-fixed">
        <Intro
          names={["Praise", "&", "Reks"]}
          photos={photos.map((p) => p.src)}
          storyHref={sectionHref("story")}
          onPhaseChange={setIntroPhase}
          onStart={startMusic}
        />
      </div>

      {/* Countdown */}
      <section id="countdown" className="section section--dark stack">
        <div className="section-inner">
          <h2 className="section-title">Counting Down</h2>
          <p className="section-lead">Until we say I do.</p>
          <div
            className="countdown-wrap"
            ref={countdownRef}
            onMouseMove={onCountdownMove}
            onMouseLeave={() => setHoveredUnit(null)}
          >
            <ul className="countdown-list" aria-label="Time remaining until the wedding">
              {countdownUnits.map((unit, i) => (
                <li
                  className="countdown-row"
                  key={unit.label}
                  onMouseEnter={() => setHoveredUnit(i)}
                >
                  <span className="countdown-num">{pad(unit.value)}</span>
                  <span className="countdown-label">{unit.label}</span>
                </li>
              ))}
            </ul>

            {/* Hover images: one per row, follows the cursor */}
            <div className="countdown-previews" aria-hidden="true">
              {countdownUnits.map((unit, i) => (
                <img
                  key={unit.label}
                  src={photos[i % photos.length].src}
                  alt=""
                  className={`countdown-preview ${hoveredUnit === i ? "is-visible" : ""}`}
                  style={{ "--tilt": `${COUNTDOWN_TILTS[i % COUNTDOWN_TILTS.length]}deg` } as CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Story: full-width image with text at bottom right */}
      <section id="story" className="feature stack">
        <img className="feature-image" src={STORY_IMAGE} alt="Lolia and Joshua together" loading="lazy" />
        <div className="feature-vignette" aria-hidden="true" />
        <div className="feature-content">
          <h2>Our Story</h2>
          <p>
            From a first hello to forever. Take a walk through the moments that brought us here.
          </p>
          <Link href={sectionHref("story")} className="text-link text-link--light">
            Read our story
            <ArrowIcon />
          </Link>
        </div>
      </section>

      {/* Gallery: bento grid */}
      <section id="gallery" className="section section--sand stack">
        <div className="section-inner">
          <h2 className="section-title">Our Gallery</h2>
          <p className="section-lead">This is how far God has brought us.</p>
          <div className="bento">
            <div
              className="bento-video"
              style={{ "--tilt": `${BENTO_VIDEO_TILT}deg` } as CSSProperties}
            >
              <video
                src={GALLERY_VIDEO}
                poster={photos[0].src}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
            {[...photos, ...photos].slice(0, 6).map((photo, i) => (
              <figure
                className="bento-photo"
                key={i}
                style={{ "--tilt": `${BENTO_TILTS[i % BENTO_TILTS.length]}deg` } as CSSProperties}
              >
                <img src={photo.src} alt={photo.alt} loading="lazy" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Registry: directory to the registry page */}
      <section id="registry" className="section section--sand section--divider">
        <div className="section-inner">
          <div className="directory">
            <div className="directory-image">
              <img src={REGISTRY_IMAGE} alt="Lolia and Joshua" loading="lazy" />
            </div>
            <div className="directory-body">
              <h3>Registry</h3>
              <p>
                Your presence is the greatest gift. If you wish to give something more, you will
                find our honeymoon fund, home essentials and cash gift options on our registry page.
              </p>
              <Link href={sectionHref("registry")} className="btn">
                Visit the registry
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo" aria-label="PR Fusion">
                <span>PR</span>
                <small>Fusion</small>
              </div>
              <p className="footer-tagline">
                Praise &amp; Reks. {WEDDING_LABEL}
                <br />
                And so it begins...
              </p>
            </div>

            <nav className="footer-nav" aria-label="Footer">
              {FOOTER_IDS.map((id) => {
                const item = NAV_ITEMS.find((n) => n.id === id);
                if (!item) return null;
                return (
                  <Link key={id} href={sectionHref(id)}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="footer-rule" aria-hidden="true" />

          <div className="footer-bottom">
            <p>
              Built with <span className="footer-heart">♥</span> by Onyem. WhatsApp:{" "}
              <a href="https://wa.me/2348113343015" target="_blank" rel="noopener noreferrer">
                +234 811 334 3015
              </a>
            </p>
            <span className="footer-hashtag">#PRFUSION</span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @font-face {
          font-family: "Calista";
          src: url("/Calista.ttf") format("truetype");
          font-style: normal;
          font-weight: 400;
          font-display: swap;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
        }

        body {
          background: #f4f0e9;
          color: #28231f;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        /* Hero stays pinned; everything after it slides over the top */
        .hero-fixed {
          position: sticky;
          top: 0;
          z-index: 0;
        }

        /* Stacking sections: each one pins to the top (the exact offset is set
           in JS, so tall sections pin by their bottom edge) and the next one
           slides over it. Registry and the footer are NOT pinned, so the
           footer scrolls into view normally. */
        .stack {
          position: sticky;
          top: 0;
        }

        #countdown { z-index: 1; }
        #story { z-index: 2; }
        #gallery { z-index: 3; }

        #registry,
        .site-footer {
          position: relative;
        }
        #registry { z-index: 4; }
        .site-footer { z-index: 5; }

        /* ── Nav ──
          Base styles = tablet + mobile (collapsible "See menu" pill / open card).
          Desktop (1025px and up) turns it into a horizontal pill below.      */
        .side-nav {
          position: fixed;
          z-index: 12;
          bottom: 20px;
          top: auto;
          left: 50%;
          right: auto;
          transform: translateX(-50%);
          transition: transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s, opacity 0.9s ease 0.2s;
        }

        /* Hidden while the intro plays, slides down into place afterwards */
        .side-nav.is-hidden {
          transform: translate(-50%, 160%);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .nav-panel {
          width: 172px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.97);
          border-radius: 26px;
          box-shadow: 0 8px 28px rgba(40, 31, 23, 0.14), 0 1px 3px rgba(40, 31, 23, 0.06);
          transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .side-nav.is-open .nav-panel {
          width: min(250px, calc(100vw - 28px));
        }

        /* The list expands/collapses with the menu */
        .nav-list-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .side-nav.is-open .nav-list-wrap {
          grid-template-rows: 1fr;
        }

        .nav-list {
          min-height: 0;
          margin: 0;
          padding: 0;
          overflow: hidden;
          list-style: none;
          visibility: hidden;
          transition: visibility 0s linear 0.45s;
        }

        .side-nav.is-open .nav-list {
          visibility: visible;
          transition-delay: 0s;
        }

        .nav-list li:first-child { margin-top: 12px; }
        .nav-list li:last-child { margin-bottom: 12px; }

        .nav-list a {
          position: relative;
          isolation: isolate;
          display: block;
          padding: 11px 18px;
          color: #5a5a5a;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.3;
          transition: color 0.25s ease;
        }

        /* The highlight band sits behind the text */
        .nav-list a::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: transparent;
          transition: background 0.3s ease;
        }

        .nav-list a:hover { color: #C0070A; }

        /* Home is always the active item */
        .nav-list a.active { color: #C0070A; }
        .nav-list a.active::before { background: rgba(192, 7, 10, 0.1); }

        /* The section currently in view: text at 50% of the accent colour */
        .nav-list a.in-view { color: rgba(192, 7, 10, 0.5); }
        .nav-list a.in-view:hover { color: #C0070A; }

        .nav-list a:focus-visible,
        .nav-toggle:focus-visible {
          outline: 2px solid #C0070A;
          outline-offset: -2px;
        }

        /* See menu / Close menu */
        .nav-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 52px;
          padding: 0 0 0 20px;
          color: #5a5a5a;
          cursor: pointer;
          background: none;
          border: 0;
          border-top: 1px solid transparent;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          line-height: 1;
          transition: border-color 0.3s ease, padding 0.3s ease;
        }

        .nav-toggle-icon {
          display: grid;
          place-items: center;
          width: 54px;
          height: 44px;
          margin-right: 4px;
          color: #C0070A;
          background: rgba(192, 7, 10, 0.1);
          border-radius: 14px 22px 22px 14px;
          transition: background 0.3s ease, color 0.3s ease, margin 0.3s ease;
        }

        .side-nav.is-open .nav-toggle {
          padding-left: 18px;
          border-top-color: rgba(0, 0, 0, 0.07);
        }

        .side-nav.is-open .nav-toggle-icon {
          margin-right: 8px;
          color: #7a7a7a;
          background: transparent;
        }

        /* ── Desktop: horizontal pill ── */
        @media (min-width: 1025px) {
          .side-nav {
            top: auto;
            bottom: 32px;
            right: auto;
            left: 50%;
            transform: translateX(-50%);
          }

          .side-nav.is-hidden {
            transform: translate(-50%, 160%);
          }

          .nav-panel,
          .side-nav.is-open .nav-panel {
            width: auto;
            border-radius: 999px;
          }

          .nav-toggle { display: none; }

          .nav-list-wrap { display: block; }

          .nav-list {
            display: flex;
            align-items: stretch;
            height: 70px;
            padding: 0 26px;
            overflow: visible;
            visibility: visible;
          }

          .nav-list li:first-child { margin-top: 0; }
          .nav-list li:last-child { margin-bottom: 0; }

          .nav-list a {
            display: flex;
            align-items: center;
            height: 100%;
            padding: 0 28px;
            font-size: 14px;
          }

          /* Active tab hangs from the top edge with rounded bottom corners */
          .nav-list a::before {
            top: 0;
            bottom: 17px;
            left: 21px;
            right: 21px;
            border-radius: 0 0 16px 16px;
          }
        }

        /* ── Music toggle ── */
        .music-toggle {
          position: fixed;
          z-index: 50;
          right: 20px;
          bottom: 20px;
          width: 46px;
          height: 46px;
          padding: 0;
          display: grid;
          place-items: center;
          color: #C0070A;
          cursor: pointer;
          background: rgba(255, 254, 250, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 50%;
          box-shadow: 0 8px 22px rgba(40, 31, 23, 0.18);
        }

        .music-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 16px;
        }

        .music-bars span {
          width: 3px;
          height: 4px;
          background: currentColor;
          border-radius: 1px;
          animation: music-bar 1s ease-in-out infinite;
        }
        .music-bars span:nth-child(2) { animation-delay: 0.25s; }
        .music-bars span:nth-child(3) { animation-delay: 0.5s; }

        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }

        /* "Read our story" style link with arrow icon */
        .text-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          color: #C0070A;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-decoration: none;
          transition: color 0.25s ease;
        }

        .text-link .arrow-icon {
          flex: none;
          transition: transform 0.25s ease;
        }

        .text-link:hover { color: #9A0608; }
        .text-link:hover .arrow-icon { transform: translateX(4px); }

        .text-link--light { color: #f4f0e9; }
        .text-link--light:hover { color: #F0787B; }

        /* ── Sections ── */
        .section {
          padding: clamp(72px, 10vw, 120px) 24px;
        }

        .section--dark {
          background: #550303;
          color: #f4f0e9;
        }
        .section--cream { background: #f4f0e9; }
        .section--sand { background: #ebe5da; }

        /* Line between Gallery and Registry */
        .section--divider {
          border-top: 1px solid rgba(40, 35, 31, 0.18);
        }

        .section-inner {
          width: min(100%, 960px);
          margin: 0 auto;
        }

        .section-title {
          margin: 0 0 20px;
          text-align: center;
          font-family: "Calista", cursive;
          font-size: clamp(48px, 7vw, 84px);
          font-weight: 400;
          line-height: 1.05;
        }

        .section-lead {
          max-width: 560px;
          margin: 0 auto 48px;
          text-align: center;
          line-height: 1.7;
          color: #6a585d;
        }

        .section--dark .section-lead { color: #cfc6b8; }

        /* Countdown: stacked vertically */
        .countdown-wrap {
          position: relative;
          width: min(100%, 1080px);
          margin: 0 auto;
        }

        .countdown-list {
          width: 100%;
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
        }

        .countdown-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 18px 0;
          border-bottom: 1px solid rgba(244, 240, 233, 0.18);
          cursor: default;
        }

        .countdown-row:first-child {
          border-top: 1px solid rgba(244, 240, 233, 0.18);
        }

        .countdown-num {
          font-family: Calista;
          font-size: clamp(52px, 10vw, 88px);
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .countdown-label {
          font-size: 13px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #F0787B;
        }

        /* Countdown hover images: follow the cursor, slightly tilted */
        .countdown-previews {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
        }

        .countdown-preview {
          position: absolute;
          left: var(--mx, 50%);
          top: var(--my, 50%);
          width: clamp(140px, 16vw, 210px);
          aspect-ratio: 4 / 5;
          object-fit: cover;
          border: 6px solid #fffefa;
          border-bottom-width: 22px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
          opacity: 0;
          transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(0.85);
          transition:
            left 0.15s ease-out,
            top 0.15s ease-out,
            opacity 0.25s ease,
            transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
        }

        .countdown-preview.is-visible {
          opacity: 1;
          transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1);
        }

        @media (hover: none) {
          .countdown-previews { display: none; }
        }

        /* Our Story: full-width image with bottom-right vignette */
        .feature {
          position: relative;
          min-height: clamp(480px, 85svh, 820px);
          overflow: hidden;
          background: #000;
        }

        .feature-image {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .feature-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 90% 100% at 100% 100%,
            rgba(0, 0, 0, 0.96) 0%,
            rgba(0, 0, 0, 0.86) 38%,
            rgba(0, 0, 0, 0.5) 64%,
            rgba(0, 0, 0, 0) 90%
          );
        }

        .feature-content {
          position: absolute;
          z-index: 2;
          right: clamp(120px, 14vw, 200px); /* clears the side nav */
          bottom: clamp(32px, 6vw, 72px);
          width: min(420px, calc(100% - 48px));
          color: #f4f0e9;
        }

        .feature-content h2 {
          margin: 0 0 14px;
          font-family: "Calista", cursive;
          font-size: clamp(48px, 6vw, 80px);
          font-weight: 400;
          line-height: 1.05;
        }

        .feature-content p {
          margin: 0;
          line-height: 1.7;
          color: #d8d0c4;
        }

        /* Gallery: bento grid (portrait video on the left, 6 photo frames) */
        .bento {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 16px;
        }

        .bento-video {
          grid-column: 1;
          grid-row: 1 / span 2;
          overflow: hidden;
          background: #1a1a1a;
          border-radius: 4px;
          box-shadow: 0 10px 24px rgba(40, 31, 23, 0.14);
          transform: rotate(var(--tilt, 0deg));
        }

        .bento-video video {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bento-photo {
          margin: 0;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #ded8cf;
          border-radius: 4px;
          box-shadow: 0 10px 24px rgba(40, 31, 23, 0.14);
          transform: rotate(var(--tilt, 0deg));
        }

        .bento-photo img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .bento-photo:hover img { transform: scale(1.05); }

        /* Invitation */
        .invite-card {
          position: relative;
          width: min(100%, 640px);
          margin: 0 auto;
          padding: clamp(32px, 6vw, 56px);
          text-align: center;
          background: #fffefa;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 18px 40px rgba(40, 31, 23, 0.12);
          animation: invite-pulse 3s ease-in-out infinite;
        }

        .invite-card::before {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(192, 7, 10, 0.35);
          pointer-events: none;
        }

        @keyframes invite-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 18px 40px rgba(40, 31, 23, 0.12), 0 0 0 0 rgba(192, 7, 10, 0.3);
          }
          50% {
            transform: scale(1.025);
            box-shadow: 0 24px 50px rgba(40, 31, 23, 0.18), 0 0 0 16px rgba(192, 7, 10, 0);
          }
        }

        .invite-lead { margin-bottom: 32px; }

        .invite-details {
          margin: 0 0 36px;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 18px;
        }

        .invite-details li {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .invite-details span {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #C0070A;
        }

        .invite-details strong {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 20px;
          font-weight: 400;
        }

        /* Registry directory */
        .directory {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          overflow: hidden;
          background: #fffefa;
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 6px;
          box-shadow: 0 12px 28px rgba(40, 31, 23, 0.08);
        }

        .directory-image {
          min-height: 380px;
          overflow: hidden;
          background: #7a7a7a;
        }

        .directory-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .directory:hover .directory-image img { transform: scale(1.04); }

        .directory-body {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          padding: clamp(28px, 5vw, 56px);
        }

        .directory-body h3 {
          margin: 0 0 14px;
          font-family: "Calista", cursive;
          font-size: clamp(44px, 5vw, 64px);
          font-weight: 400;
          line-height: 1.05;
        }

        .directory-body p {
          margin: 0 0 28px;
          line-height: 1.7;
          color: #6a6258;
        }

        .btn {
          display: inline-block;
          padding: 13px 32px;
          background: #C0070A;
          border: 1px solid #C0070A;
          border-radius: 999px;
          color: #fffefa;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-decoration: none;
          text-transform: uppercase;
          transition: background 0.25s ease, color 0.25s ease;
        }

        .btn:hover {
          background: #9A0608;
          border-color: #9A0608;
        }

        /* ── Footer ── */
        .site-footer {
          padding: 72px 24px 36px;
          background: #550303; /* same as the Countdown section */
          color: #d4cfc7;
        }

        .footer-inner {
          width: min(100%, 1100px);
          margin: 0 auto;
        }

        .footer-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 40px;
        }

        .footer-logo {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          color: #f0ece4;
          line-height: 1;
        }

        .footer-logo span {
          font-family: "Calista", cursive;
          font-size: 46px;
        }

        .footer-logo small {
          margin-top: 2px;
          font-size: 8px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #9a948a;
        }

        .footer-tagline {
          margin: 28px 0 0;
          font-family: "calista";
          text-transform: sentence-case;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.06em;
          line-height: 1.6;
          color: #c9c3ba;
        }

        .footer-nav {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .footer-nav a {
          color: #d0ccc6;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-decoration: none;
          text-transform: uppercase;
          transition: color 0.25s ease;
        }

        .footer-nav a:hover { color: #F0787B; }

        .footer-rule {
          height: 1px;
          margin: 72px 0 28px;
          background: linear-gradient(90deg, transparent 0%, #d60d06 50%, transparent 100%);
        }

        .footer-bottom {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          color: #cfc6b8; /* lightened for the red background */
        }

        .footer-bottom p {
          margin: 0;
          font-weight: 600;
        }

        .footer-bottom a {
          color: #bdb7ae;
          text-decoration: underline;
        }

        .footer-heart { color: #8b1a33; }

        .footer-hashtag {
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.2em;
          color: #a89a93; /* lightened for the red background */
        }

        @media (max-width: 700px) {
          .music-toggle {
            right: 12px;
            bottom: 12px;
          }

          .section { padding-inline: 40px; }

          /* Story: vignette rises from the bottom so the text stays readable */
          .feature-vignette {
            background: linear-gradient(
              to top,
              rgba(0, 0, 0, 0.94) 0%,
              rgba(0, 0, 0, 0.7) 40%,
              rgba(0, 0, 0, 0) 80%
            );
          }

          .feature-content {
            left: 24px;
            right: 56px; /* clears the slim mobile nav */
            width: auto;
          }

          /* Gallery: video on top, photos in 2 columns */
          .bento {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .bento-video {
            grid-column: 1 / -1;
            grid-row: auto;
            aspect-ratio: 4 / 5;
          }

          .directory { grid-template-columns: 1fr; }
          .directory-image { min-height: 260px; }

          .footer-top {
            flex-direction: column;
            gap: 32px;
          }

          .footer-rule { margin-top: 48px; }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          .music-bars span {
            animation: none;
            height: 10px;
          }

          .invite-card {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
