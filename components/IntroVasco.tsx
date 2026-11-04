"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GestureName, VascoHandle } from "./vasco3d/scene";

interface Line {
  text: string;
  gesture: GestureName;
  /** Pausa después de la línea (ms). */
  pause?: number;
}

const SCRIPT: Line[] = [
  { text: "Hola amigos, soy el Vasco.", gesture: "wave", pause: 450 },
  { text: "Y no sé nada.", gesture: "shrug", pause: 700 },
  { text: "Pero nada, nada.", gesture: "shake", pause: 500 },
  { text: "Por eso ahora tenemos esta agenda.", gesture: "point", pause: 900 },
];

const QUIPS: Line[] = [
  { text: "¿Hoy jugaba Peñarol? ¿No? Ah.", gesture: "think" },
  { text: "¿La Champions no era los domingos?", gesture: "shrug" },
  { text: "Yo iba a decir lo mismo que la agenda.", gesture: "nod" },
  { text: "Decime la hora que yo pongo la cara.", gesture: "cheer" },
  { text: "¿Fase de liga? Yo pensé que era un grupo de WhatsApp.", gesture: "shake" },
  { text: "A mí no me preguntes, para eso está la web.", gesture: "point" },
];

const CHAR_MS = 46;
const EXIT_MS = 650;

export function IntroVasco({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vascoRef = useRef<VascoHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [caption, setCaption] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [voice, setVoice] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hint, setHint] = useState(true);
  const runId = useRef(0);
  const pinned = useRef(false);
  const doneRef = useRef(false);
  const reduced = useRef(false);
  const voiceRef = useRef(false);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  // --- escena 3D ---
  useEffect(() => {
    let handle: VascoHandle | null = null;
    let cancelled = false;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./vasco3d/scene").then(({ mountVasco }) => {
      if (cancelled || !canvasRef.current) return;
      handle = mountVasco(canvasRef.current, {
        reduced: reduced.current,
        onReady: () => setReady(true),
      });
      vascoRef.current = handle;
    });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      handle?.destroy();
      vascoRef.current = null;
      window.speechSynthesis?.cancel();
      document.body.style.overflow = prev;
    };
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    runId.current += 1;
    window.speechSynthesis?.cancel();
    setExiting(true);
    window.setTimeout(onDone, EXIT_MS);
  }, [onDone]);

  /** Dice una línea: gesto + boca + subtítulo tipeado (+ voz si está activada). */
  const say = useCallback((line: Line, id: number): Promise<void> => {
    return new Promise((resolve) => {
      const v = vascoRef.current;
      v?.gesture(line.gesture);
      v?.setTalking(true);
      setSpeaking(true);
      setCaption("");
      let i = 0;
      let iv = 0;
      const stop = () => {
        window.clearInterval(iv);
        v?.setTalking(false);
        setSpeaking(false);
      };
      const typeTo = (n: number) => {
        if (n <= i) return;
        i = n;
        setCaption(line.text.slice(0, i));
        v?.pulse();
      };
      const perChar = reduced.current ? 10 : CHAR_MS;
      iv = window.setInterval(() => {
        if (runId.current !== id) {
          stop();
          resolve();
          return;
        }
        typeTo(i + 1);
        if (i >= line.text.length) {
          stop();
          window.setTimeout(resolve, line.pause ?? 400);
        }
      }, perChar);

      if (voiceRef.current && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(line.text);
        const voices = window.speechSynthesis.getVoices();
        const es =
          voices.find((x) => /es[-_](UY|AR)/i.test(x.lang)) ??
          voices.find((x) => /^es/i.test(x.lang)) ??
          null;
        if (es) u.voice = es;
        u.lang = es?.lang ?? "es-AR";
        u.rate = 1;
        u.pitch = 0.95;
        u.onboundary = (e) => {
          if (runId.current !== id) return;
          if (typeof e.charIndex === "number") typeTo(Math.min(line.text.length, e.charIndex + (e.charLength ?? 1)));
          v?.pulse();
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    });
  }, []);

  const runScript = useCallback(
    async (lines: Line[], autoClose: boolean) => {
      const id = ++runId.current;
      for (const line of lines) {
        if (runId.current !== id) return;
        await say(line, id);
      }
      if (runId.current !== id) return;
      setFinished(true);
      if (autoClose && !pinned.current) {
        window.setTimeout(() => {
          if (runId.current === id && !pinned.current) finish();
        }, 1400);
      }
    },
    [say, finish],
  );

  // Arranca el guion cuando el personaje terminó de entrar
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => runScript(SCRIPT, true), 350);
    return () => window.clearTimeout(t);
  }, [ready, runScript]);

  // Interacción: tocar al Vasco → frase suelta; arrastrar → girarlo
  const quipIdx = useRef(0);
  const poke = () => {
    pinned.current = true;
    setHint(false);
    const q = QUIPS[quipIdx.current % QUIPS.length];
    quipIdx.current += 1;
    runScript([q], false);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    vascoRef.current?.look(nx, ny * 0.8);
    if (drag.current) {
      const dx = e.clientX - drag.current.x;
      if (Math.abs(dx) > 3) {
        drag.current.moved = true;
        vascoRef.current?.spin(dx / r.width);
        drag.current.x = e.clientX;
      }
    }
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, moved: false };
  };
  const onPointerUp = () => {
    if (drag.current && !drag.current.moved) poke();
    drag.current = null;
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    voiceRef.current = next;
    if (next) {
      // El gesto del usuario habilita el audio en móvil: repetimos el guion con voz.
      pinned.current = true;
      window.speechSynthesis?.getVoices();
      runScript(SCRIPT, false);
    } else {
      window.speechSynthesis?.cancel();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Intro: el Vasco presenta la agenda"
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-ink"
      style={{
        animation: exiting ? `intro-out ${EXIT_MS}ms cubic-bezier(.7,0,.3,1) forwards` : undefined,
      }}
    >
      {/* Fondo: cancha neón en perspectiva */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_115%,rgba(77,255,154,0.22),transparent_60%)]" />
        <div
          className="absolute inset-x-[-50%] bottom-[-5%] h-[55%] opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(77,255,154,0.35) 0 1px, transparent 1px 70px), repeating-linear-gradient(0deg, rgba(77,255,154,0.35) 0 1px, transparent 1px 70px)",
            transform: "perspective(500px) rotateX(72deg)",
            transformOrigin: "50% 100%",
            animation: "grid-scroll 5s linear infinite",
          }}
        />
        <div className="absolute left-1/2 top-[38%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon/10 blur-3xl" />
      </div>

      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)]">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-neon">
          Vasco, no sabés nada
        </span>
        <button
          type="button"
          onClick={finish}
          className="rounded-full border border-line-2 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-fg-2 backdrop-blur hover:text-fg"
        >
          Saltar →
        </button>
      </div>

      {/* Escena */}
      <div
        className="relative z-[5] mx-auto w-full max-w-md flex-1 touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onPointerLeave={() => {
          drag.current = null;
          vascoRef.current?.look(0, 0);
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" aria-label="El Vasco en 3D" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display animate-pulse text-xs uppercase tracking-[0.3em] text-muted">
              Llamando al Vasco…
            </span>
          </div>
        )}
        {ready && hint && (
          <span
            className={`pointer-events-none absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-semibold backdrop-blur transition ${
              finished ? "border-neon/60 bg-neon/15 text-neon" : "border-line bg-ink/70 text-fg-2"
            }`}
            style={finished ? { animation: "pulse-neon 1.8s infinite" } : undefined}
          >
            <span aria-hidden>👆</span> Tocá al Vasco para escuchar sus frases típicas
          </span>
        )}
      </div>

      {/* Subtítulos + acciones */}
      <div className="relative z-10 mx-auto w-full max-w-md px-5 pb-[max(env(safe-area-inset-bottom),18px)]">
        <div className="min-h-[88px] text-center">
          {caption && (
            <p
              className="font-display inline-block rounded-2xl bg-black/60 px-4 py-2 text-[20px] font-bold leading-snug text-fg backdrop-blur-sm sm:text-2xl"
              aria-live="polite"
            >
              {caption}
              <span
                className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[2px] bg-neon align-baseline"
                style={{ animation: speaking ? "none" : "blink 1s steps(2) infinite" }}
              />
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voice}
            className={`chip inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold ${
              voice ? "border-neon/60 bg-neon/15 text-neon" : "border-line-2 bg-white/5 text-fg-2 hover:text-fg"
            }`}
          >
            {voice ? "🔊 Con voz" : "🔇 Ponele voz"}
          </button>
          <button
            type="button"
            onClick={finish}
            className={`chip font-display inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest text-ink ${
              finished ? "bg-neon shadow-[0_10px_30px_-10px_rgba(77,255,154,0.9)]" : "bg-neon/80"
            }`}
          >
            Ver la agenda →
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes intro-out {
          to {
            opacity: 0;
            transform: scale(1.06);
            filter: blur(6px);
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
              0 70px,
              0 70px;
          }
        }
      `}</style>
    </div>
  );
}

export default IntroVasco;
