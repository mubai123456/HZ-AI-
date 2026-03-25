import { PageTemplate } from "@/components/page-template";
import { getSecretStatusItems } from "@/lib/settings";

export default async function SecretStatusPage() {
  const items = await getSecretStatusItems();

  return (
    <PageTemplate
      eyebrow="密钥状态"
      title="密钥状态"
      description="敏感密钥继续由环境变量优先管理，这个页面只负责透明展示状态，不提供明文编辑。"
      contentClassName="mx-auto max-w-5xl space-y-6"
    >
      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.envKey} className="rounded-[24px] border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.configured
                    ? "bg-emerald-50 text-emerald-700"
                    : item.required
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {item.configured ? "已配置" : item.required ? "未配置" : "可选"}
              </span>
            </div>

            <div className="mt-4 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">来源</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{item.source.toUpperCase()}</p>
            </div>

            <div className="mt-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">当前值</p>
              <p className="mt-1 text-sm font-mono text-slate-700">{item.maskedValue}</p>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-400">
              需要修改时，请更新部署环境变量，然后重启应用或重新部署。
            </p>
          </div>
        ))}
      </section>
    </PageTemplate>
  );
}
