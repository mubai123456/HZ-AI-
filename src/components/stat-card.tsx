export function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="card group hover:shadow-md transition-shadow duration-200">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-[34px] font-bold text-gray-900 mt-2 tracking-tight leading-none">
        {value}
      </p>
      <p className="text-[12px] text-gray-500 mt-2">{trend}</p>
    </div>
  );
}
