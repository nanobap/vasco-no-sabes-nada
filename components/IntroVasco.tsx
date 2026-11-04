"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "@/lib/site";

const LINES = [
  "Hola amigos, soy el Vasco…",
  "…y no sé nada.",
  "Por eso ahora tenemos esta agenda.",
];

const CHAR_MS = 42;
const LINE_PAUSE_MS = 520;
const EXIT_MS = 700;

type Phase = "enter" | "talk" | "exit";

/**
 * Intro de entrada: tarjeta 3D con la cara del Vasco que gira, flota y sigue
 * el dedo/mouse, con subtítulos tipeados. Al terminar se abre la agenda.
 */
export function IntroVasco({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [lineIdx, setLineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const doneRef = useRef(false);
  const reduced = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase("exit");
    window.setTimeout(onDone, EXIT_MS);
  }, [onDone]);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setPhase("talk"), reduced.current ? 50 : 900);
    return () => window.clearTimeout(t);
  }, []);

  // Tipeo de subtítulos
  useEffect(() => {
    if (phase !== "talk") return;
    const line = LINES[lineIdx];
    if (!line) {
      const t = window.setTimeout(finish, 900);
      return () => window.clearTimeout(t);
    }
    let i = 0;
    setTyped("");
    const iv = window.setInterval(() => {
      i += 1;
      setTyped(line.slice(0, i));
      if (i >= line.length) {
        window.clearInterval(iv);
        window.setTimeout(() => setLineIdx((n) => n + 1), LINE_PAUSE_MS);
      }
    }, reduced.current ? 8 : CHAR_MS);
    return () => window.clearInterval(iv);
  }, [phase, lineIdx, finish]);

  // Bloquear scroll del fondo
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 18, y: px * 22 });
  };

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(LINES.join(" "));
    const voices = window.speechSynthesis.getVoices();
    const es = voices.find((v) => /es[-_](UY|AR)/i.test(v.lang)) ?? voices.find((v) => v.lang.startsWith("es"));
    if (es) u.voice = es;
    u.lang = es?.lang ?? "es-AR";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const talking = phase === "talk" && typed.length < (LINES[lineIdx]?.length ?? 0);

  return (
    <div
      role="dialog"
      aria-label="Intro: el Vasco presenta la agenda"
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-ink"
      style={{
        animation: phase === "exit" ? `intro-out ${EXIT_MS}ms cubic-bezier(.7,0,.3,1) forwards` : undefined,
      }}
    >
      {/* fondo: cancha */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_110%,rgba(77,255,154,0.22),transparent_60%)]" />
        <div
          className="absolute inset-x-[-40%] bottom-[-10%] h-[60%] opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(77,255,154,0.25) 0 1px, transparent 1px 80px), repeating-linear-gradient(0deg, rgba(77,255,154,0.25) 0 1px, transparent 1px 80px)",
            transform: "perspective(600px) rotateX(70deg)",
            transformOrigin: "50% 100%",
            animation: "grid-scroll 6s linear infinite",
          }}
        />
        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: "url(data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27><filter id=%27n%27><feTurbulence baseFrequency=%270.8%27 numOctaves=%272%27/></filter><rect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/></svg>)" }} />
      </div>

      <button
        type="button"
        onClick={finish}
        className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] z-10 rounded-full border border-line-2 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-fg-2 backdrop-blur hover:text-fg"
      >
        Saltar →
      </button>

      {/* escena 3D */}
      <div className="relative" style={{ perspective: "1100px" }}>
        <div
          className="relative"
          style={{
            transformStyle: "preserve-3d",
            animation:
              phase === "enter"
                ? "intro-card-in 1s cubic-bezier(.2,.8,.2,1) both"
                : "intro-float 5s ease-in-out infinite",
          }}
        >
          <div
            className="relative h-[300px] w-[200px] rounded-[28px] sm:h-[360px] sm:w-[240px]"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: "transform 160ms ease-out",
              transformStyle: "preserve-3d",
            }}
          >
            {/* sombra proyectada */}
            <div
              className="absolute inset-x-6 -bottom-10 h-10 rounded-[50%] bg-black/70 blur-xl"
              style={{ transform: "translateZ(-80px)" }}
            />
            {/* marco neón */}
            <div
              className="absolute -inset-[2px] rounded-[30px]"
              style={{
                background:
                  "conic-gradient(from 180deg, #4dff9a, #0b1f16 30%, #4dff9a 50%, #b8ff3b 60%, #0b1f16 80%, #4dff9a)",
                filter: "blur(0.3px)",
                animation: "spin-slow 8s linear infinite",
              }}
            />
            <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-ink-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset("/vasco.jpg")}
                alt="El Vasco"
                className="h-full w-full object-cover"
                style={{
                  filter: "contrast(1.08) saturate(1.05)",
                  transform: talking ? "translateY(1px) scale(1.01)" : "none",
                  transition: "transform 120ms",
                }}
                draggable={false}
              />
              {/* brillo holográfico */}
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 45%, rgba(77,255,154,0.25) 50%, transparent 65%)",
                  backgroundSize: "250% 250%",
                  animation: "shimmer 3.2s linear infinite",
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/90 to-transparent" />
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="font-display inline-block rounded-full bg-neon px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-ink">
                  El Vasco
                </span>
              </div>
            </div>
            {/* etiquetas flotantes en profundidad */}
            <span
              className="font-display absolute -left-8 top-8 rotate-[-10deg] rounded-lg border border-neon/40 bg-ink/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neon backdrop-blur"
              style={{ transform: "translateZ(60px) rotate(-10deg)" }}
            >
              ¿?
            </span>
            <span
              className="font-display absolute -right-10 bottom-16 rounded-lg border border-line-2 bg-ink/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-fg-2 backdrop-blur"
              style={{ transform: "translateZ(90px) rotate(8deg)" }}
            >
              no sé nada
            </span>
          </div>
        </div>
      </div>

      {/* subtítulos */}
      <div className="relative mt-12 min-h-[84px] w-full max-w-sm px-6 text-center sm:max-w-md">
        <p
          className="font-display text-[20px] font-bold leading-snug text-fg sm:text-2xl"
          aria-live="polite"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
        >
          <span className="rounded-md bg-black/55 box-decoration-clone px-2 py-1">
            {typed}
            <span
              className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[3px] bg-neon align-baseline"
              style={{ animation: talking ? "none" : "blink 1s steps(2) infinite" }}
            />
          </span>
        </p>
      </div>

      <div className="relative mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={speak}
          className="chip inline-flex items-center gap-2 rounded-full border border-line-2 bg-white/5 px-4 py-2 text-xs font-semibold text-fg-2 hover:text-fg"
        >
          🔊 Escuchar al Vasco
        </button>
        <button
          type="button"
          onClick={finish}
          className="chip font-display inline-flex items-center gap-2 rounded-full bg-neon px-5 py-2 text-xs font-black uppercase tracking-widest text-ink"
        >
          Ver la agenda
        </button>
      </div>

      <style jsx global>{`
        @keyframes intro-card-in {
          0% {
            opacity: 0;
            transform: translateZ(-600px) rotateY(-110deg) rotateX(12deg) scale(0.6);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateZ(0) rotateY(0) rotateX(0) scale(1);
          }
        }
        @keyframes intro-float {
          0%,
          100% {
            transform: translateY(0) rotateY(-6deg) rotateX(2deg);
          }
          50% {
            transform: translateY(-10px) rotateY(6deg) rotateX(-2deg);
          }
        }
        @keyframes intro-out {
          to {
            opacity: 0;
            transform: scale(1.15);
            filter: blur(8px);
          }
        }
        @keyframes spin-slow {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
        @keyframes grid-scroll {
          to {
            background-position:
              0 80px,
              0 80px;
          }
        }
      `}</style>
    </div>
  );
}
