"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Quip } from "@/lib/quips";
import type { VascoHandle } from "./vasco3d/scene";

const CHAR_MS = 40;

/** El Vasco comentarista: busto 3D que suelta frases del partido al tocarlo. */
export function VascoBubble({ quips }: { quips: Quip[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef<VascoHandle | null>(null);
  const [caption, setCaption] = useState("");
  const [idx, setIdx] = useState(0);
  const run = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let h: VascoHandle | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./vasco3d/scene").then(({ mountVasco }) => {
      if (cancelled || !canvasRef.current) return;
      h = mountVasco(canvasRef.current, { reduced, framing: "bust" });
      vRef.current = h;
    });
    return () => {
      cancelled = true;
      h?.destroy();
      vRef.current = null;
    };
  }, []);

  const say = useCallback((q: Quip) => {
    const id = ++run.current;
    const v = vRef.current;
    v?.gesture(q.gesture);
    v?.setTalking(true);
    let i = 0;
    setCaption("");
    const iv = window.setInterval(() => {
      if (run.current !== id) {
        window.clearInterval(iv);
        return;
      }
      i += 1;
      setCaption(q.text.slice(0, i));
      v?.pulse();
      if (i >= q.text.length) {
        window.clearInterval(iv);
        v?.setTalking(false);
      }
    }, CHAR_MS);
  }, []);

  // primera frase al aparecer en pantalla
  const started = useRef(false);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          window.setTimeout(() => say(quips[0]), 600);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [quips, say]);

  const next = () => {
    const n = (idx + 1) % quips.length;
    setIdx(n);
    say(quips[n]);
  };

  return (
    <div className="card relative overflow-hidden rounded-3xl">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon/15 blur-3xl" />
      <div className="grid grid-cols-[132px_1fr] items-stretch gap-3 p-3 sm:grid-cols-[160px_1fr]">
        <button
          type="button"
          onClick={next}
          aria-label="Escuchar otra frase del Vasco"
          className="relative h-[168px] overflow-hidden rounded-2xl border border-line bg-ink-3 sm:h-[200px]"
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
          <span className="font-display absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-neon px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-ink">
            El Vasco
          </span>
        </button>
        <div className="flex flex-col justify-between py-1 pr-1">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-neon">El Vasco opina</p>
            <p className="font-display mt-2 min-h-[72px] text-[15px] font-bold leading-snug sm:text-lg">
              {caption || "…"}
              <span className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] bg-neon align-baseline" />
            </p>
          </div>
          <button
            type="button"
            onClick={next}
            className="chip mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-neon/50 bg-neon/10 px-3 py-1.5 text-xs font-semibold text-neon"
          >
            Otra frase ({idx + 1}/{quips.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default VascoBubble;
