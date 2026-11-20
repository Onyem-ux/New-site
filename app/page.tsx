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
const EVENT_TITLE = "Praise & Reks: The Wedding";

const STORY_IMAGE = "/3.jpeg";
const REGISTRY_IMAGE = "/4.jpeg";
const LOCATION_IMAGE = "/2.jpeg";
const RSVP_IMAGE = "/1.jpeg";

// Where RSVPs are sent (POST, JSON). Leave empty and they only log to the console.
const RSVP_ENDPOINT = "";

// Replace with your real venues
const VENUES = {
  church: { name: "Church Name", address: "Church street address, Abuja, Nigeria" },
  reception: { name: "Reception Venue", address: "Reception street address, Abuja, Nigeria" },
};

// Gallery: 7 frames. Add /6.jpeg and /7.jpeg to /public. Edit each note to tell the story.
const GALLERY = [
  { src: "/1.jpeg", alt: "Couple photograph one", note: "The day we stopped pretending we were just friends." },
  { src: "/2.jpeg", alt: "Couple photograph two", note: "Laughing at something nobody else understood." },
  { src: "/3.jpeg", alt: "Couple photograph three", note: "Golden hour, and I knew." },
  { src: "/4.jpeg", alt: "Couple photograph four", note: "Our first trip. We got lost, and it was perfect." },
  { src: "/5.jpeg", alt: "Couple photograph five", note: "Prayers answered, one quiet yes at a time." },
  { src: "/6.jpeg", alt: "Couple photograph six", note: "Home is wherever you are standing next to me." },
  { src: "/7.jpeg", alt: "Couple photograph seven", note: "And so it begins..." },
];

const COLOURS = [
  { name: "Dusty Lavender", hex: "#B7A6C8", text: "#3b2d4a", texture: "/dusty-lavender-satin.svg" },
  { name: "Ivory White", hex: "#FBF8EE", text: "#6b5a3a", texture: "/ivory-satin.svg" },
  { name: "Antique Gold", hex: "#B08D57", text: "#fffaf0", texture: "/antique-gold-satin.svg" },
];

const EVENTS = [
  { time: "1:00 PM", title: "Arrival Time", note: "Please arrive early, get comfortable and take your seats." },
  { time: "2:00 PM", title: "Church Wedding", note: "Join us as we exchange our vows and begin this new chapter." },
  { time: "4:00 PM", title: "Reception", note: "Dinner, celebration, heartfelt toasts and dancing." },
];

const USE_STANDALONE_PAGES = false;

// Listed in page order
const NAV_ITEMS = [
  { id: "home", label: "Home", route: "/" },
  { id: "countdown", label: "Countdown", route: "/countdown" },
  { id: "location", label: "Location", route: "/location" },
  { id: "events", label: "Events", route: "/events" },
  { id: "colour", label: "Colour", route: "/colour" },
  { id: "rsvp", label: "RSVP", route: "/rsvp" },
  { id: "story", label: "Our Story", route: "/story" },
  { id: "registry", label: "Registry", route: "/registry" },
  { id: "gallery", label: "Gallery", route: "/gallery" },
];

const sectionHref = (id: string) => {
  const item = NAV_ITEMS.find((n) => n.id === id);
  return USE_STANDALONE_PAGES && item ? item.route : `#${id}`;
};

const COUNTDOWN_TILTS = [-8, 6, -5, 8, -7];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
const WEDDING_DAY_LABEL = `${WEEKDAYS[WEDDING_DATE.getDay()]}, ${ordinal(WEDDING_DATE.getDate())} ${MONTHS[WEDDING_DATE.getMonth()]}, ${WEDDING_DATE.getFullYear()}`;
const WEDDING_TIME_LABEL = (() => {
  const h = WEDDING_DATE.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(WEDDING_DATE.getMinutes()).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
})();

type TimeLeft = { weeks: number; days: number; hours: number; minutes: number; seconds: number };

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
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

// Confetti shooting up from both bottom corners
function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = (canvas.width = window.innerWidth);
  const h = (canvas.height = window.innerHeight);
  const colors = ["#111111", "#777777", "#B7A6C8", "#FBF8EE", "#B08D57", "#E2C98F"];
  const parts: { x: number; y: number; vx: number; vy: number; s: number; r: number; vr: number; c: string }[] = [];
  const burst = (x: number, angle: number) => {
    for (let i = 0; i < 90; i++) {
      const a = angle + (Math.random() - 0.5) * 0.8;
      const sp = 14 + Math.random() * 18;
      parts.push({
        x, y: h + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  };
  burst(0, -Math.PI / 3);
  burst(w, (-2 * Math.PI) / 3);
  const start = performance.now();
  const frame = (t: number) => {
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    parts.forEach((p) => {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.38;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (p.y < h + 30) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    });
    if (alive && t - start < 6000) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  };
  requestAnimationFrame(frame);
}

function ArrowIcon() {
  return (
    <svg className="arrow-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  // Music
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingBeforeHide = useRef(false);

  const startMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

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

  const [hoveredUnit, setHoveredUnit] = useState<number | null>(null);
  const countdownRef = useRef<HTMLDivElement>(null);

  const onCountdownMove = (e: React.MouseEvent) => {
    const wrap = countdownRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    wrap.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    wrap.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  // Confetti whenever the countdown scrolls into view
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const lastConfetti = useRef(0);

  useEffect(() => {
    const el = document.getElementById("countdown");
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const now = Date.now();
        if (entry.isIntersecting && now - lastConfetti.current > 6000 && confettiRef.current) {
          lastConfetti.current = now;
          fireConfetti(confettiRef.current);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Fade-in-from-bottom for every element in every section
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sel = [
      ".section-eyebrow", ".section-title", ".section-lead", ".countdown-date", ".countdown-row",
      ".loc-card", ".pill-row", ".tl-item", ".swatch", ".dress-card", ".rsvp-form",
      ".feature-content > *", ".directory-image", ".directory-body", ".bento-item", ".footer-inner > *",
    ].join(",");
    const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
    els.forEach((el) => {
      const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((c) => els.includes(c as HTMLElement)) : [el];
      el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 6) * 0.09}s`);
      el.classList.add("reveal");
    });
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Add to calendar
  const [calOpen, setCalOpen] = useState(false);
  const calTimes = () => {
    const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    return { start: f(WEDDING_DATE), end: f(new Date(WEDDING_DATE.getTime() + 6 * 3600 * 1000)) };
  };
  const addToGoogle = () => {
    const { start, end } = calTimes();
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(EVENT_TITLE)}&dates=${start}/${end}&location=${encodeURIComponent(VENUES.church.address)}`;
    window.open(url, "_blank", "noopener");
    setCalOpen(false);
  };
  const downloadIcs = () => {
    const { start, end } = calTimes();
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
      `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${EVENT_TITLE}`, `LOCATION:${VENUES.church.address}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "wedding.ics";
    a.click();
    setCalOpen(false);
  };

  // RSVP
  const [rsvp, setRsvp] = useState({ first: "", last: "", email: "", interest: "", note: "" });
  const [rsvpStatus, setRsvpStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [flippedStoryCard, setFlippedStoryCard] = useState<number | null>(null);

  const submitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRsvpStatus("sending");
    try {
      if (RSVP_ENDPOINT) {
        const r = await fetch(RSVP_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rsvp),
        });
        if (!r.ok) throw new Error("failed");
      } else {
        console.log("RSVP", rsvp);
      }
      setRsvpStatus("sent");
    } catch {
      setRsvpStatus("error");
    }
  };

  const setField = (k: keyof typeof rsvp) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setRsvp((r) => ({ ...r, [k]: e.target.value }));

  // Nav
  const [introPhase, setIntroPhase] = useState<"idle" | "playing" | "done">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navBottom, setNavBottom] = useState(32);
  const [inView, setInView] = useState("home");

  useEffect(() => {
    const updateNavPosition = () => {
      let current = "home";
      NAV_ITEMS.forEach(({ id }) => {
        if (id === "home") return;
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.5) current = id;
      });
      setInView(current);

      const footer = document.querySelector(".site-footer");
      if (!footer) return;
      const defaultBottom = window.innerWidth >= 1025 ? 32 : 20;
      const distanceFromFooter = window.innerHeight - footer.getBoundingClientRect().top + defaultBottom;
      setNavBottom(Math.max(defaultBottom, distanceFromFooter));
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
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Carattere&display=swap" />
      <audio ref={audioRef} src="/looking_for_god.mp3" loop preload="auto" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
      <canvas ref={confettiRef} className="confetti-canvas" aria-hidden="true" />

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
                    className={inView === item.id ? "active" : ""}
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

          <button type="button" className="nav-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="nav-list">
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

      <button type="button" className="music-toggle" onClick={toggleMusic} aria-label={isPlaying ? "Pause music" : "Play music"} aria-pressed={isPlaying}>
        {isPlaying ? (
          <span className="music-bars" aria-hidden="true">
            <span /><span /><span />
          </span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Hero */}
      <div id="home" className="hero">
        <Intro
          names={["Praise", "&", "Reks"]}
          photos={photos.map((p) => p.src)}
          tagline="We'd love you to be a part of our day."
          location="Abuja, Nigeria"
          onPhaseChange={setIntroPhase}
          onStart={startMusic}
        />
      </div>

      {/* Countdown */}
      <section id="countdown" className="section section--dark">
        <div className="section-inner">
          <p className="section-eyebrow section-eyebrow--light">The Big Day</p>
          <h2 className="section-title">Counting Down</h2>
          <p className="section-lead">Until we say I do.</p>
          <div className="countdown-date-wrap">
            <span className="countdown-date">{WEDDING_DAY_LABEL}</span>
          </div>
          <div className="countdown-wrap" ref={countdownRef} onMouseMove={onCountdownMove} onMouseLeave={() => setHoveredUnit(null)}>
            <ul className="countdown-list" aria-label="Time remaining until the wedding">
              {countdownUnits.map((unit, i) => (
                <li className="countdown-row" key={unit.label} onMouseEnter={() => setHoveredUnit(i)}>
                  <span className="countdown-num">{pad(unit.value)}</span>
                  <span className="countdown-label">{unit.label}</span>
                </li>
              ))}
            </ul>

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

      {/* Location */}
      <section id="location" className="section section--cream">
        <div className="section-inner section-inner--mid">
          <p className="section-eyebrow">Save the Date</p>
          <h2 className="section-title">This Day</h2>
          <p className="section-lead">Everything you need to find your way to us.</p>

          <div className="loc-grid">
            <div className="loc-card loc-date">
              <img src={LOCATION_IMAGE} alt="" className="loc-date-bg" loading="lazy" />
              <div className="loc-date-wash" aria-hidden="true" />
              <div className="loc-date-body">
                <span className="loc-weekday">{WEEKDAYS[WEDDING_DATE.getDay()]}</span>
                <span className="loc-day">{pad(WEDDING_DATE.getDate())}</span>
                <span className="loc-month">{MONTHS[WEDDING_DATE.getMonth()]} {WEDDING_DATE.getFullYear()}</span>
                <span className="loc-time">{WEDDING_TIME_LABEL} · Abuja, Nigeria</span>

                <div className="cal">
                  <button type="button" className="btn btn--dark" onClick={() => setCalOpen((o) => !o)} aria-expanded={calOpen}>
                    Add to calendar
                  </button>
                  {calOpen && (
                    <div className="cal-menu">
                      <button type="button" onClick={addToGoogle}>Google Calendar</button>
                      <button type="button" onClick={downloadIcs}>Apple / Outlook (.ics)</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="loc-card loc-venue">
              <p className="loc-venue-eyebrow"><PinIcon /> Venue &amp; Location</p>
              <div className="loc-venue-block">
                <h3>Church</h3>
                <p><strong>{VENUES.church.name}</strong><br />{VENUES.church.address}</p>
                <a className="btn btn--venue" href={mapsUrl(VENUES.church.address)} target="_blank" rel="noopener noreferrer">Church directions</a>
              </div>
              <div className="loc-venue-rule" aria-hidden="true" />
              <div className="loc-venue-block">
                <h3>Reception</h3>
                <p><strong>{VENUES.reception.name}</strong><br />{VENUES.reception.address}</p>
                <a className="btn btn--venue" href={mapsUrl(VENUES.reception.address)} target="_blank" rel="noopener noreferrer">Reception directions</a>
              </div>
            </div>
          </div>

          <div className="pill-row">
            <Link href={sectionHref("story")} className="pill">
              <img src={STORY_IMAGE} alt="" />
              <span>Our story</span>
              <ArrowIcon />
            </Link>
            <Link href={sectionHref("rsvp")} className="pill">
              <img src={RSVP_IMAGE} alt="" />
              <span>RSVP</span>
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Order of events */}
      <section id="events" className="section section--sand">
        <div className="section-inner section-inner--narrow">
          <p className="section-eyebrow">The Day</p>
          <h2 className="section-title">Order of Events</h2>
          <p className="section-lead">A gentle outline of how our day will unfold.</p>
          <div className="timeline">
            {EVENTS.map((ev, i) => (
              <div className="tl-item" key={ev.title}>
                <div className="tl-time-wrap">
                  <span className="tl-time">{ev.time}</span>
                </div>
                <span className="tl-dot" aria-hidden="true" />
                <div className="tl-info">
                  <span className="tl-index">0{i + 1}</span>
                  <h3>{ev.title}</h3>
                  <p>{ev.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Colour of the day */}
      <section id="colour" className="section section--cream">
        <div className="section-inner section-inner--mid">
          <p className="section-eyebrow">Dress Code</p>
          <h2 className="section-title">Colour of the Day</h2>
          <p className="section-lead">Wear your best in our palette and help us paint the day.</p>

          <div className="swatches">
            {COLOURS.map((c) => (
              <article className="swatch" key={c.name} style={{ backgroundColor: c.hex, color: c.text }}>
                <img className="swatch-texture" src={c.texture} alt="" loading="lazy" />
                <div className="swatch-label">
                  <strong>{c.name}</strong>
                  <span>{c.hex.toUpperCase()}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="dress-pill">
            <span className="dress-eyebrow">Dress code</span>
            <p>Evening casual corporate summer fit.</p>
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section id="rsvp" className="section section--sand">
        <div className="section-inner section-inner--narrow">
          <p className="section-eyebrow">Kindly Respond</p>
          <h2 className="section-title">RSVP</h2>
          <p className="section-lead">Let us know if you&apos;ll be joining us. We can&apos;t wait to celebrate with you.</p>

          {rsvpStatus === "sent" ? (
            <div className="rsvp-form rsvp-thanks">
              <h3>Thank you, {rsvp.first}!</h3>
              <p>We&apos;ve received your response.</p>
            </div>
          ) : (
            <form className="rsvp-form" onSubmit={submitRsvp}>
              <div className="field-row">
                <label>
                  <span>First name</span>
                  <input required value={rsvp.first} onChange={setField("first")} autoComplete="given-name" />
                </label>
                <label>
                  <span>Last name</span>
                  <input required value={rsvp.last} onChange={setField("last")} autoComplete="family-name" />
                </label>
              </div>
              <label>
                <span>Email</span>
                <input required type="email" value={rsvp.email} onChange={setField("email")} autoComplete="email" />
              </label>
              <fieldset className="interest-fieldset">
                <legend>Interest</legend>
                <div className="interest-options" role="radiogroup" aria-label="Will you be joining us?">
                  <label className={`interest-option ${rsvp.interest === "Yes, I'll be there" ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="interest"
                      value="Yes, I'll be there"
                      checked={rsvp.interest === "Yes, I'll be there"}
                      onChange={setField("interest")}
                      required
                    />
                    <span>Yes, I&apos;ll be there</span>
                  </label>
                  <label className={`interest-option ${rsvp.interest === "Sorry, I can't make it" ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="interest"
                      value="Sorry, I can't make it"
                      checked={rsvp.interest === "Sorry, I can't make it"}
                      onChange={setField("interest")}
                    />
                    <span>Sorry, I can&apos;t make it</span>
                  </label>
                </div>
              </fieldset>
              <label>
                <span>Note (optional)</span>
                <textarea rows={4} value={rsvp.note} onChange={setField("note")} placeholder="A message for the couple, dietary needs, anything we should know" />
              </label>
              {rsvpStatus === "error" && <p className="rsvp-error">Something went wrong. Please try again.</p>}
              <button type="submit" className="btn btn--submit" disabled={rsvpStatus === "sending"}>
                {rsvpStatus === "sending" ? "Sending..." : "Send RSVP"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Our Story */}
      <section id="story" className="section section--cream story-section">
        <div className="section-inner section-inner--wide">
          <p className="section-eyebrow">The chapters</p>
          <h2 className="section-title">Our Story</h2>
          <p className="section-lead">A collection of little moments that became our favourite story. Tap or hover over each frame to turn the page.</p>
          <div className="story-bento">
            {GALLERY.map((item, i) => (
              <button
                type="button"
                className={`story-card story-card-${i + 1} ${flippedStoryCard === i ? "is-flipped" : ""}`}
                key={`story-${item.src}`}
                onPointerEnter={(e) => { if (e.pointerType === "mouse") setFlippedStoryCard(i); }}
                onPointerLeave={(e) => { if (e.pointerType === "mouse") setFlippedStoryCard((c) => (c === i ? null : c)); }}
                onClick={(e) => {
                  const isMouse = (e.nativeEvent as PointerEvent).pointerType === "mouse";
                  // mouse: card is already open from hover, so keep it open. Touch/keyboard: toggle.
                  setFlippedStoryCard((c) => (isMouse ? i : c === i ? null : i));
                }}
                aria-label={`${flippedStoryCard === i ? "Show photo" : "Read story"}: ${item.note}`}
                aria-pressed={flippedStoryCard === i}
              >
                <span className="story-card-inner">
                  <span className="story-card-face story-card-front">
                    <img src={item.src} alt={item.alt} loading="lazy" />
                    <span className="story-card-hint">Turn the page ↗</span>
                  </span>
                  <span className="story-card-face story-card-back">
                    <span className="story-card-number">Chapter 0{i + 1}</span>
                    <span className="story-card-copy">{item.note}</span>
                    <span className="story-card-hint">Tap to return</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Registry */}
      <section id="registry" className="section section--cream">
        <div className="section-inner">
          <div className="directory">
            <div className="directory-image">
              <img src={REGISTRY_IMAGE} alt="Praise and Reks" loading="lazy" />
            </div>
            <div className="directory-body">
              <p className="section-eyebrow">With Gratitude</p>
              <h3>Registry</h3>
              <p>
                Your presence is the greatest gift. If you wish to give something more, you will
                find our honeymoon fund, home essentials and cash gift options on our registry page.
              </p>
              <Link href={sectionHref("registry")} className="btn">Visit the registry</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery: 7-frame bento */}
      <section id="gallery" className="section section--sand">
        <div className="section-inner section-inner--wide">
          <p className="section-eyebrow">Memories</p>
          <h2 className="section-title">Our Gallery</h2>
          <p className="section-lead">This is how far God has brought us.</p>
          <div className="bento">
            {GALLERY.map((g, i) => (
              <figure className={`bento-item bento-${i + 1}`} key={g.src}>
                <img src={g.src} alt={g.alt} loading="lazy" />
                <figcaption>{g.note}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <p className="footer-journey">And the journey begins...</p>
          <p className="footer-names">Praise &amp; Reks</p>
          <p className="footer-date">{WEDDING_LABEL} <i>•</i> Abuja, Nigeria</p>

          <button type="button" className="footer-top-btn" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5l-7 7 1.4 1.4L11 8.8V20h2V8.8l4.6 4.6L19 12z" fill="currentColor" />
            </svg>
          </button>

          <div className="footer-rule" aria-hidden="true" />

          <div className="footer-bottom">
            <p>
              Built with love by Onyem <span className="footer-heart">❤️</span>
              {" · "}WhatsApp:{" "}
              <a href="https://wa.me/2348113343015" target="_blank" rel="noopener noreferrer">+234 811 334 3015</a>
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

        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; }
        body {
          background: #f4f0e9;
          color: #28231f;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        html { scroll-behavior: smooth; }

        .page { position: relative; overflow-x: clip; }
        .hero { position: relative; }

        /* Fade in from bottom */
        .reveal {
          opacity: 0;
          translate: 0 36px;
          transition: opacity 0.9s ease var(--d, 0s), translate 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) var(--d, 0s);
        }
        .reveal.is-in { opacity: 1; translate: 0 0; }

        .confetti-canvas {
          position: fixed;
          inset: 0;
          z-index: 60;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        /* ── Nav ── */
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
          border-radius: 32px;
          box-shadow: 0 8px 28px rgba(40, 31, 23, 0.14), 0 1px 3px rgba(40, 31, 23, 0.06);
          transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .side-nav.is-open .nav-panel { width: min(250px, calc(100vw - 28px)); }
        .nav-list-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .side-nav.is-open .nav-list-wrap { grid-template-rows: 1fr; }
        .nav-list {
          min-height: 0;
          margin: 0;
          padding: 0;
          overflow: hidden;
          list-style: none;
          visibility: hidden;
          transition: visibility 0s linear 0.45s;
        }
        .side-nav.is-open .nav-list { visibility: visible; transition-delay: 0s; }
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
        .nav-list a::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: transparent;
          transition: background 0.3s ease;
        }
        .nav-list a:hover { color: #111111; }
        .nav-list a.active { color: #111111; }
        .nav-list a.active::before { background: rgba(0, 0, 0, 0.1); }
        .nav-list a:focus-visible, .nav-toggle:focus-visible { outline: 2px solid #111111; outline-offset: -2px; }

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
          color: #111111;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 18px 26px 26px 18px;
          transition: background 0.3s ease, color 0.3s ease, margin 0.3s ease;
        }
        .side-nav.is-open .nav-toggle { padding-left: 18px; border-top-color: rgba(0, 0, 0, 0.07); }
        .side-nav.is-open .nav-toggle-icon { margin-right: 8px; color: #7a7a7a; background: transparent; }

        @media (min-width: 1025px) {
          .side-nav { top: auto; bottom: 32px; right: auto; left: 50%; transform: translateX(-50%); }
          .side-nav.is-hidden { transform: translate(-50%, 160%); }
          .nav-panel, .side-nav.is-open .nav-panel { width: auto; border-radius: 999px; }
          .nav-toggle { display: none; }
          .nav-list-wrap { display: block; }
          .nav-list {
            display: flex;
            align-items: stretch;
            height: 70px;
            padding: 0 14px;
            overflow: visible;
            visibility: visible;
          }
          .nav-list li:first-child { margin-top: 0; }
          .nav-list li:last-child { margin-bottom: 0; }
          .nav-list a {
            display: flex;
            align-items: center;
            height: 100%;
            padding: 0 17px;
            font-size: 13px;
            white-space: nowrap;
          }
          .nav-list a::before {
            top: 0;
            bottom: 17px;
            left: 10px;
            right: 10px;
            border-radius: 0 0 20px 20px;
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
          color: #111111;
          cursor: pointer;
          background: rgba(255, 254, 250, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 50%;
          box-shadow: 0 8px 22px rgba(40, 31, 23, 0.18);
        }
        .music-bars { display: flex; align-items: flex-end; gap: 3px; height: 16px; }
        .music-bars span {
          width: 3px;
          height: 4px;
          background: currentColor;
          border-radius: 1px;
          animation: music-bar 1s ease-in-out infinite;
        }
        .music-bars span:nth-child(2) { animation-delay: 0.25s; }
        .music-bars span:nth-child(3) { animation-delay: 0.5s; }
        @keyframes music-bar { 0%, 100% { height: 4px; } 50% { height: 16px; } }

        .text-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          color: #111111;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-decoration: none;
          transition: color 0.25s ease;
        }
        .text-link .arrow-icon { flex: none; transition: transform 0.25s ease; }
        .text-link:hover { color: #9A0608; }
        .text-link:hover .arrow-icon { transform: translateX(4px); }
        .text-link--light { color: #f4f0e9; }
        .text-link--light:hover { color: #777777; }

        /* ── Sections ── */
        .section { padding: clamp(72px, 10vw, 120px) 24px; }
        .section--dark { background: #111111; color: #f4f0e9; }
        .section--cream { background: #f4f0e9; }
        .section--sand { background: #ebe5da; }

        .section-inner { width: min(100%, 960px); margin: 0 auto; }
        .section-inner--mid { width: min(100%, 1040px); }
        .section-inner--narrow { width: min(100%, 760px); }
        .section-inner--wide { width: min(100%, 1080px); }

        .section-eyebrow {
          margin: 0 0 14px;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #111111;
        }
        .section-eyebrow--light { color: #777777; }

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
        .section--dark .section-lead { color: #cfc6b8; margin-bottom: 28px; }

        /* Buttons */
        .btn {
          display: inline-block;
          padding: 13px 32px;
          background: #111111;
          border: 1px solid #111111;
          border-radius: 999px;
          color: #fffefa;
          font-family: inherit;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-decoration: none;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
        }
        .btn:hover { background: #9A0608; border-color: #9A0608; }
        .btn--dark { background: #050505; border-color: #050505; }
        .btn--dark:hover { background: #111111; border-color: #111111; }
        .btn--ghost { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.25); }
        .btn--ghost:hover { background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.4); }
        .btn--rose { background: #777777; border-color: #777777; color: #3a0303; }
        .btn--rose:hover { background: #f59a9c; border-color: #f59a9c; }
        .btn--submit { width: 100%; padding: 16px; }
        .btn--submit:disabled { opacity: 0.6; cursor: wait; }
        .btn--venue {
          background: #6b6b6b;
          border-color: #6b6b6b;
          color: #fff;
        }
        .btn--venue:hover {
          background: #ffffff;
          border-color: #ffffff;
          color: #111;
        }

        /* Countdown */
        .countdown-date-wrap { display: flex; justify-content: center; margin-bottom: 48px; }
        .countdown-date {
          padding: 12px 34px;
          border-radius: 999px;
          font-family: "Calista", cursive;
          font-size: clamp(22px, 1.5vw, 32px);
          color: #ececec;
          text-align: center;
        }
        .countdown-wrap { position: relative; width: min(100%, 1080px); margin: 0 auto; }
        .countdown-list { width: 100%; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
        .countdown-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 18px 0;
          border-bottom: 1px solid rgba(244, 240, 233, 0.18);
          cursor: default;
        }
        .countdown-row:first-child { border-top: 1px solid rgba(244, 240, 233, 0.18); }
        .countdown-num {
          font-family: Calista;
          font-size: clamp(52px, 10vw, 88px);
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .countdown-label { font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: #777777; }
        .countdown-previews { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
        .countdown-preview {
          position: absolute;
          left: var(--mx, 50%);
          top: var(--my, 50%);
          width: clamp(140px, 16vw, 210px);
          aspect-ratio: 4 / 5;
          object-fit: cover;
          border: 6px solid #fffefa;
          border-bottom-width: 22px;
          border-radius: 14px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
          opacity: 0;
          transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(0.85);
          transition: left 0.15s ease-out, top 0.15s ease-out, opacity 0.25s ease,
            transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
        }
        .countdown-preview.is-visible { opacity: 1; transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1); }
        @media (hover: none) { .countdown-previews { display: none; } }

        /* Location */
        .loc-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 24px; align-items: stretch; }
        .loc-card { border-radius: 36px; overflow: hidden; position: relative; }
        .loc-date { min-height: 480px; background: #fffefa; box-shadow: 0 14px 34px rgba(40, 31, 23, 0.1); }
        .loc-date-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); opacity: 0.35; }
        .loc-date-wash {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 40%, rgba(255, 254, 250, 0.92) 25%, rgba(244, 240, 233, 0.55) 100%);
        }
        .loc-date-body {
          position: relative;
          z-index: 1;
          height: 100%;
          min-height: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          text-align: center;
        }
        .loc-weekday { font-size: 12px; letter-spacing: 0.32em; text-transform: uppercase; color: #111111; }
        .loc-day { font-family: "Calista", cursive; font-size: clamp(100px, 14vw, 170px); line-height: 1; color: #111111; }
        .loc-month { font-family: Georgia, serif; font-size: 22px; font-style: italic; color: #111111; }
        .loc-time { margin: 10px 0 30px; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #6a585d; }
        .cal { position: relative; }
        .cal-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          min-width: 230px;
          padding: 8px;
          background: #fffefa;
          border-radius: 20px;
          box-shadow: 0 14px 34px rgba(40, 31, 23, 0.2);
        }
        .cal-menu button {
          display: block;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: 0;
          border-radius: 14px;
          font-family: inherit;
          font-size: 14px;
          color: #28231f;
          text-align: left;
          cursor: pointer;
        }
        .cal-menu button:hover { background: rgba(0, 0, 0, 0.08); color: #111111; }

        .loc-venue {
          padding: clamp(28px, 4vw, 44px);
          background: linear-gradient(160deg, #111111 0%, #050505 100%);
          color: #f4f0e9;
          box-shadow: 0 14px 34px rgba(40, 31, 23, 0.22);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .loc-venue-eyebrow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 0 24px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #777777;
        }
        .loc-venue-block {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .loc-venue-block h3 { margin: 0 0 10px; font-family: "Calista", cursive; font-size: 40px; font-weight: 400; }
        .loc-venue-block p { margin: 0 0 18px; line-height: 1.7; color: #d8d0c4; }
        .loc-venue-block strong { color: #f4f0e9; }
        .loc-venue-block .btn { display: inline-block; text-align: center; font-size: 11px; }
        .loc-venue-rule { height: 1px; width: 60%; margin: 28px auto; background: rgba(244, 240, 233, 0.15); }

        .pill-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 44px; }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 8px 24px 8px 8px;
          background: #fffefa;
          border: 1px solid rgba(40, 35, 31, 0.1);
          border-radius: 999px;
          box-shadow: 0 8px 22px rgba(40, 31, 23, 0.08);
          color: #28231f;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.25s ease, box-shadow 0.25s ease, color 0.25s ease;
        }
        .pill img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; }
        .pill .arrow-icon { color: #111111; transition: transform 0.25s ease; }
        .pill:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(40, 31, 23, 0.14); color: #111111; }
        .pill:hover .arrow-icon { transform: translateX(4px); }

        /* Timeline – time right-aligned against the divider, details left-aligned beside it */
        .timeline { position: relative; width: min(100%, 900px); margin: 54px auto 0; }
        .timeline::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 35%;
          width: 1px;
          background: linear-gradient(to bottom, transparent, #777 8%, #777 92%, transparent);
        }
        .tl-item {
          position: relative;
          display: grid;
          grid-template-columns: 35% 1fr;
          align-items: center;
          min-height: 150px;
          margin: 0;
        }
        .tl-time-wrap {
          grid-column: 1;
          padding: 26px 28px 26px 0;
          text-align: right;
        }
        .tl-time {
          font-family: "Calista", cursive;
          font-size: clamp(18px, 2vw, 24px);
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #111;
        }
        .tl-info {
          grid-column: 2;
          padding: 26px 0 26px 28px;
          text-align: left;
        }
        .tl-index {
          display: block;
          margin-bottom: 4px;
          color: #888;
          font-size: 10px;
          letter-spacing: 0.22em;
        }
        .tl-info h3 {
          margin: 0 0 8px;
          font-family: "Calista", cursive;
          font-size: clamp(30px, 3vw, 42px);
          font-weight: 400;
          color: #111;
        }
        .tl-info p {
          margin: 0;
          color: #686868;
          font-size: 14px;
          line-height: 1.7;
        }
        .tl-dot {
          position: absolute;
          top: 50%;
          left: 35%;
          width: 14px;
          height: 14px;
          transform: translate(-50%, -50%);
          background: #eeece7;
          border: 1px solid #111;
          border-radius: 50%;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        .tl-dot::after {
          content: "";
          position: absolute;
          inset: 3px;
          background: #111;
          border-radius: 50%;
        }
        .tl-item:hover .tl-dot {
          transform: translate(-50%, -50%) scale(1.25);
          box-shadow: 0 0 0 7px rgba(0, 0, 0, 0.08), 0 0 0 14px rgba(0, 0, 0, 0.035);
          animation: event-dot-pulse 1.2s ease-in-out infinite;
        }
        @keyframes event-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.08), 0 0 0 11px rgba(0, 0, 0, 0.025); }
          50% { box-shadow: 0 0 0 9px rgba(0, 0, 0, 0.12), 0 0 0 18px rgba(0, 0, 0, 0.04); }
        }

        /* Colour of the day – fixed overlapping */
        .swatches {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(16px, 2.5vw, 28px);
          align-items: stretch;
        }
        .swatch {
          position: relative;
          max-width: none;
          aspect-ratio: 1.42 / 1;
          border-radius: 24px;
          overflow: hidden;
          isolation: isolate;
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(40, 35, 31, 0.1);
        }
        .swatch:nth-child(2) { margin-top: 0; }
        .swatch-texture {
          position: absolute;
          inset: 0;
          z-index: -1;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.92;
          mix-blend-mode: multiply;
        }
        .swatch-label {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 0 8px;
          text-align: center;
          text-shadow: 0 1px 12px rgba(0, 0, 0, 0.18);
        }
        .swatch-label strong {
          font-family: "Calista", cursive;
          font-size: clamp(20px, 2.8vw, 30px);
          font-weight: 400;
        }
        .swatch-label span {
          font-size: 11px;
          letter-spacing: 0.2em;
          opacity: 0.8;
        }
        .dress-pill {
          width: fit-content;
          max-width: 100%;
          margin: 52px auto 0;
          padding: 14px 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 12px 18px;
          border: 1px solid rgba(0, 0, 0, 0.16);
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }
        .dress-pill .dress-eyebrow {
          font-size: 10px;
          letter-spacing: 0.16em;
          font-weight: 600;
          text-transform: uppercase;
          color: #222;
        }
        .dress-pill p {
          margin: 0;
          color: #222;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        /* Dress code pill hover */
        .dress-pill {
          cursor: default;
          transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
            background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .dress-pill .dress-eyebrow,
        .dress-pill p { transition: color 0.35s ease; }
        .dress-pill:hover {
          transform: translateY(-4px) scale(1.03);
          background: #111;
          border-color: #111;
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.22);
        }
        .dress-pill:hover .dress-eyebrow { color: #b8b0a2; }
        .dress-pill:hover p { color: #fff; }

        /* RSVP */
        .rsvp-form {
          display: grid;
          gap: 18px;
          padding: clamp(24px, 5vw, 44px);
          background: #fffefa;
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 36px;
          box-shadow: 0 14px 34px rgba(40, 31, 23, 0.1);
        }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .rsvp-form label { display: grid; gap: 8px; }
        .rsvp-form label span { font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #111111; }
        .rsvp-form input, .rsvp-form select, .rsvp-form textarea {
          width: 100%;
          padding: 15px 20px;
          background: #f9f6f0;
          border: 1px solid rgba(40, 35, 31, 0.15);
          border-radius: 20px;
          color: #28231f;
          font-family: inherit;
          font-size: 15px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .rsvp-form textarea { resize: vertical; border-radius: 24px; }
        .rsvp-form input:focus, .rsvp-form select:focus, .rsvp-form textarea:focus {
          outline: none;
          border-color: #111111;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.12);
        }
        .rsvp-error { margin: 0; color: #111111; font-size: 14px; }
        .rsvp-thanks { text-align: center; }
        .rsvp-thanks h3 { margin: 0; font-family: "Calista", cursive; font-size: 44px; font-weight: 400; color: #111111; }
        .rsvp-thanks p { margin: 0; color: #6a585d; }

        /* Interest radio options */
        .interest-fieldset {
          border: 0;
          margin: 0;
          padding: 0;
        }
        .interest-fieldset legend {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #111111;
          margin-bottom: 10px;
          padding: 0;
        }
        .interest-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .interest-option {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 16px 18px;
          background: #f9f6f0;
          border: 1px solid rgba(40, 35, 31, 0.15);
          border-radius: 20px;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          text-align: center;
        }
        .interest-option input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          margin: 0;
          padding: 0;
        }
        .interest-option span {
          font-size: 14px !important;
          font-weight: 500 !important;
          letter-spacing: 0.02em !important;
          text-transform: none !important;
          color: #28231f !important;
        }
        .interest-option:hover {
          border-color: rgba(0, 0, 0, 0.3);
        }
        .interest-option.is-selected {
          background: #111;
          border-color: #111;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }
        .interest-option.is-selected span {
          color: #fffefa !important;
        }
        .interest-option:focus-within {
          outline: 2px solid #111;
          outline-offset: 2px;
        }

        /* Our Story – cinematic flip */
        .story-section { padding-block: clamp(84px, 10vw, 132px); }
        .story-bento {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          grid-auto-rows: clamp(230px, 24vw, 330px);
          gap: 18px;
          perspective: 1600px;
        }
        .story-card {
          grid-column: span 4;
          position: relative;
          z-index: 1;
          display: block;
          min-width: 0;
          width: 100%;
          height: 100%;
          padding: 0;
          border: 0;
          border-radius: 24px;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          perspective: 1400px;
        }
        .story-card.is-flipped { z-index: 2; }
        .story-card-1, .story-card-5 { grid-column: span 5; grid-row: span 2; }
        .story-card-2, .story-card-4, .story-card-6, .story-card-3, .story-card-7 { grid-column: span 7; }

        .story-card-inner {
          position: absolute;
          inset: 0;
          display: block;
          transform-style: preserve-3d;
          transform: rotateY(0deg) scale(1);
          /* CLOSING: slow and soft */
          transition: transform 1.7s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .story-card.is-flipped .story-card-inner {
          transform: rotateY(180deg) scale(1.04);
          /* OPENING: quick and decisive */
          transition: transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .story-card-face {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          border-radius: 24px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.13);
          transition: box-shadow 1.7s ease;
        }
        .story-card.is-flipped .story-card-face {
          box-shadow: 0 34px 70px rgba(0, 0, 0, 0.38);
          transition-duration: 0.95s;
        }

        .story-card-front img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 1.7s ease, filter 1.7s ease;
        }
        .story-card.is-flipped .story-card-front img {
          transform: scale(1.12);
          filter: brightness(0.7);
          transition-duration: 0.95s;
        }
        .story-card-front::after {
          content: "";
          position: absolute;
          inset: 35% 0 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
        }
        .story-card-hint {
          position: relative;
          z-index: 1;
          padding: 22px;
          color: #fff;
          font: 500 11px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .story-card-back {
          align-items: flex-start;
          justify-content: center;
          padding: clamp(24px, 3vw, 42px);
          background: #111;
          color: #f8f7f3;
          transform: rotateY(180deg);
        }
        .story-card-number {
          margin-bottom: 18px;
          color: #aaa;
          font: 600 10px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .story-card-copy {
          font: 400 clamp(19px, 2vw, 27px)/1.45 Georgia, serif;
        }
        .story-card-back .story-card-hint {
          padding: 26px 0 0;
          color: #aaa;
        }

        /* Light sweep across the back, like a film glint */
        .story-card-back::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.16) 50%, transparent 62%);
          transform: translateX(-100%);
          transition: transform 1.2s ease;
        }
        .story-card.is-flipped .story-card-back::before {
          transform: translateX(100%);
          transition: transform 1.4s ease 0.3s;
        }

        /* Back text fades up in sequence, and leaves quickly on close */
        .story-card-back > * {
          opacity: 0;
          translate: 0 14px;
          transition: opacity 0.35s ease, translate 0.35s ease;
        }
        .story-card.is-flipped .story-card-back > * {
          opacity: 1;
          translate: 0 0;
          transition: opacity 0.8s ease var(--s, 0s),
            translate 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) var(--s, 0s);
        }
        .story-card.is-flipped .story-card-back > :nth-child(1) { --s: 0.45s; }
        .story-card.is-flipped .story-card-back > :nth-child(2) { --s: 0.6s; }
        .story-card.is-flipped .story-card-back > :nth-child(3) { --s: 0.8s; }

        .story-card:focus-visible {
          outline: 3px solid #777;
          outline-offset: 5px;
        }

        /* Gallery bento */
        .bento {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-auto-rows: clamp(300px, 36vw, 480px);
          gap: 17px;
        }
        .bento-item {
          position: relative;
          margin: 0;
          overflow: hidden;
          background: #ded8cf;
          border-radius: 36px;
          box-shadow: 0 14px 30px rgba(40, 31, 23, 0.16);
        }
        .bento-1, .bento-2, .bento-3 { grid-column: span 4; }
        .bento-4 { grid-column: span 5; }
        .bento-5 { grid-column: span 7; }
        .bento-6 { grid-column: span 7; }
        .bento-7 { grid-column: span 5; }
        .bento-item img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s ease;
        }
        .bento-item:hover img { transform: scale(1.06); }
        .bento-item figcaption {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 54px 22px 20px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.88), rgba(0, 0, 0, 0));
          color: #fbf8ee;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: clamp(12px, 1.1vw, 15px);
          font-weight: 500;
          line-height: 1.5;
          opacity: 0;
          translate: 0 16px;
          transition: opacity 0.5s ease, translate 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bento-item:hover figcaption { opacity: 1; translate: 0 0; }
        @media (hover: none) { .bento-item figcaption { opacity: 1; translate: 0 0; } }

        /* Registry */
        .directory {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          overflow: hidden;
          background: #fffefa;
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 36px;
          box-shadow: 0 12px 28px rgba(40, 31, 23, 0.08);
        }
        .directory-image { min-height: 380px; overflow: hidden; background: #7a7a7a; }
        .directory-image img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
        .directory:hover .directory-image img { transform: scale(1.04); }
        .directory-body { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: clamp(28px, 5vw, 56px); }
        .directory-body .section-eyebrow { text-align: left; margin-bottom: 10px; }
        .directory-body h3 { margin: 0 0 14px; font-family: "Calista", cursive; font-size: clamp(44px, 5vw, 64px); font-weight: 400; line-height: 1.05; }
        .directory-body p { margin: 0 0 28px; line-height: 1.7; color: #6a6258; }
        .directory-body p.section-eyebrow { color: #111111; margin: 0 0 10px; }

        /* Footer – ensure contrast */
        .site-footer {
          position: relative;
          padding: 88px 24px 36px;
          background: #080808;
          color: #d4cfc7;
          text-align: center;
        }
        .footer-inner {
          width: min(100%, 1000px);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .footer-journey {
          margin: 0 0 36px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: clamp(16px, 2vw, 12px);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #cfc6b8;
        }
        .footer-names {
          margin: 0;
          font-family: "Calista", cursive;
          font-size: clamp(44px, 7vw, 76px);
          line-height: 1.1;
          color: #e8e4dc;
        }
        .footer-date {
          margin: 14px 0 0;
          font-size: 13px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #cfc6b8;
        }
        .footer-date i {
          margin: 0 10px;
          font-style: normal;
          color: #999;
        }
        .footer-top-btn {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          margin: 36px 0 0;
          padding: 0;
          color: #cfc6b8;
          background: rgba(255, 255, 255, 0.08);
          border: 0;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.25s ease, transform 0.25s ease, color 0.25s ease;
        }
        .footer-top-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          transform: translateY(-3px);
          color: #fff;
        }
        .footer-rule {
          width: 100%;
          height: 1px;
          margin: 48px 0 24px;
          background: linear-gradient(90deg, transparent 0%, #777 50%, transparent 100%);
        }
        .footer-bottom {
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px 24px;
          font-size: 11px;
          color: #cfc6b8;
        }
        .footer-bottom p { margin: 0; font-weight: 600; }
        .footer-bottom a {
          color: #e0d9ce;
          text-decoration: underline;
        }
        .footer-heart { color: inherit; }
        .footer-hashtag {
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.2em;
          color: #b8a99e;
        }

        /* Updated monochrome overrides */
        .section--dark { background: #080808; color: #f7f5f0; }
        .section--cream { background: #f8f7f3; }
        .section--sand { background: #eeece7; }
        .loc-venue { background: linear-gradient(155deg, #171717, #050505); }
        .btn, .btn--rose, .btn--dark { background: #111; border-color: #111; color: #fff; }
        .btn:hover, .btn--rose:hover, .btn--dark:hover { background: #333; border-color: #333; }
        .btn--venue { background: #6b6b6b; border-color: #6b6b6b; color: #fff; }
        .btn--venue:hover { background: #fff; border-color: #fff; color: #111; }
        .music-toggle { color: #111; }
        .nav-list a:hover, .nav-list a.active, .nav-toggle-icon { color: #111; }
        .nav-list a.active::before, .nav-toggle-icon { background: rgba(0, 0, 0, 0.08); }
        .nav-list a:focus-visible, .nav-toggle:focus-visible { outline-color: #111; }
        .loc-day, .loc-month, .rsvp-thanks h3 { color: #111; }
        .loc-venue-eyebrow { color: #d0d0d0; }
        .pill .arrow-icon, .pill:hover { color: #111; }
        .rsvp-form label span, .rsvp-error { color: #111; }
        .rsvp-form input:focus, .rsvp-form select:focus, .rsvp-form textarea:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 900px) {
          .loc-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 700px) {
          .music-toggle { right: 12px; bottom: 12px; }
          .section { padding-inline: 20px; }

          .bento { grid-template-columns: 1fr; grid-auto-rows: 420px; gap: 14px; }
          .bento-item { grid-column: 1 / -1 !important; }

          .directory { grid-template-columns: 1fr; }
          .directory-image { min-height: 260px; }
          .field-row { grid-template-columns: 1fr; }
          .interest-options { grid-template-columns: 1fr; }

          .timeline::before { left: 12px; }
          .tl-dot { left: 12px; }
          .tl-item { grid-template-columns: 1fr; min-height: 128px; }
          .tl-time-wrap {
            grid-column: 1 / -1;
            padding: 18px 0 4px 42px;
            text-align: left;
          }
          .tl-info {
            grid-column: 1 / -1;
            padding: 0 0 20px 42px;
            text-align: left;
          }
          .tl-time { font-size: 16px; }

          .swatches { gap: 12px; }
          .swatch { aspect-ratio: 0.9 / 1; border-radius: 18px; }
          .swatch-label { bottom: 12px; }
          .swatch-label strong { font-size: clamp(14px, 3.3vw, 18px); }
          .swatch-label span { font-size: 9px; letter-spacing: 0.08em; }
          .dress-pill { border-radius: 24px; padding: 14px 20px; text-align: center; }

          .story-bento {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-auto-rows: 230px;
            gap: 12px;
          }
          .story-card,
          .story-card-1,
          .story-card-2,
          .story-card-3,
          .story-card-4,
          .story-card-5,
          .story-card-6,
          .story-card-7 {
            grid-column: span 1;
            grid-row: span 1;
          }
          .story-card-1, .story-card-4 { grid-column: span 2; }
          .story-card-back { padding: 18px; }
          .story-card-copy { font-size: 17px; }
          .story-card-hint { padding: 15px; font-size: 9px; }

          .site-footer { padding-top: 64px; }
        }

        @media (min-width: 701px) and (max-width: 1000px) {
          .story-card,
          .story-card-1,
          .story-card-2,
          .story-card-3,
          .story-card-4,
          .story-card-5,
          .story-card-6,
          .story-card-7 {
            grid-column: span 6;
            grid-row: span 1;
          }
          .story-card-1, .story-card-4 { grid-row: span 2; }
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .music-bars span { animation: none; height: 10px; }
          .story-card-inner, .story-card.is-flipped .story-card-inner,
          .story-card-face, .story-card-front img,
          .story-card-back::before, .story-card-back > *,
          .tl-dot { transition: none; }
          .tl-item:hover .tl-dot { animation: none; }
        }
      `}</style>
    </main>
  );
}
