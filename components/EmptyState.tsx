export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card rise flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden>
        <defs>
          <radialGradient id="g" cx="35%" cy="30%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#8b98a8" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="44" fill="url(#g)" opacity="0.9" />
        <g fill="#05080c" opacity="0.9">
          <polygon points="60,36 73,46 68,61 52,61 47,46" />
          <polygon points="60,18 72,27 68,36 52,36 48,27" opacity="0.5" />
          <polygon points="88,44 98,56 92,70 80,66 78,52" opacity="0.6" />
          <polygon points="32,44 42,52 40,66 28,70 22,56" opacity="0.6" />
          <polygon points="48,80 60,74 72,80 70,94 50,94" opacity="0.7" />
        </g>
        <circle cx="60" cy="60" r="44" fill="none" stroke="#4dff9a" strokeOpacity="0.5" strokeWidth="1.5" />
        <ellipse cx="60" cy="108" rx="26" ry="4" fill="#4dff9a" opacity="0.2" />
      </svg>
      <h3 className="font-display mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-2">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
