import { buildSchemaMismatchUserMessage } from "@/lib/prisma-runtime-diagnostics";

export function SchemaMigrationRequired({
  scope,
}: {
  scope: string;
}) {
  return (
    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 text-slate-800">
      <p className="text-sm font-semibold text-amber-700">需要先同步数据库结构</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{scope} 暂时不可用</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {buildSchemaMismatchUserMessage(scope)}
      </p>
      <div className="mt-4 rounded-[18px] border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
        推荐顺序：先执行 <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">prisma migrate deploy</code>
        ，再重新触发 Vercel 部署。
      </div>
    </div>
  );
}
