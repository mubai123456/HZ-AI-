import Link from "next/link";

export interface AppCardHorizontalProps {
  app: {
    code: string;
    name: string;
    coverPoster?: string | null;
  };
  runCount: number;
}

const BG_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-emerald-500",
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function AppCardHorizontal({ app, runCount }: AppCardHorizontalProps) {
  const bgColor = getColorForName(app.name);

  return (
    <Link
      href={`/apps/${encodeURIComponent(app.code)}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
    >
      {/* Cover or fallback initial */}
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
        {app.coverPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.coverPoster}
            alt={app.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${bgColor} flex items-center justify-center`}>
            <span className="text-white font-bold text-lg">{getInitial(app.name)}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-[var(--label-primary)] truncate block">{app.name}</span>
      </div>

      {/* Run count badge */}
      <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex flex-col items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm leading-none tabular-nums">{runCount}</span>
        <span className="text-white/80 text-[10px] leading-none mt-0.5">次</span>
      </div>
    </Link>
  );
}
