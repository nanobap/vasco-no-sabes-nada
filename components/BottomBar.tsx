"use client";

import Link from "next/link";

interface Props {
  onHome: () => void;
  onShare: () => void;
  onVasco: () => void;
}

export function BottomBar({ onHome, onShare, onVasco }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
      <nav
        aria-label="Acciones"
        className="pointer-events-auto grid w-full max-w-md grid-cols-4 items-center rounded-[22px] border border-line-2 bg-ink-2/85 p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      >
        <Item label="Agenda" onClick={onHome}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
        </Item>
        <Link
          href="/tablas/"
          className="chip flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-fg-2 hover:text-fg"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h10" />
            <circle cx="19" cy="18" r="2" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Tablas</span>
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="chip mx-0.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-neon py-2 text-ink shadow-[0_8px_24px_-8px_rgba(77,255,154,0.9)]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
        </button>
        <Item label="Vasco" onClick={onVasco}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </Item>
      </nav>
    </div>
  );
}

function Item({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-fg-2 hover:text-fg"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </button>
  );
}
