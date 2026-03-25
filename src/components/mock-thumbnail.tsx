export function MockThumbnail({ label }: { label: string }) {
  return (
    <div className="fine-grid flex aspect-square items-end rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4">
      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
        {label}
      </span>
    </div>
  );
}
