import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { getResolvedSiteSettings } from "@/lib/settings";
import { getCurrentSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }

  const siteSettings = await getResolvedSiteSettings();

  return (
    <div className="app-shell flex min-h-screen">
      <section className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-primary)] to-blue-50 dark:to-blue-950/30" />
        <div className="absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-200/40 via-indigo-200/30 to-transparent blur-3xl dark:from-blue-400/20 dark:via-indigo-400/15" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-gradient-to-tl from-purple-200/30 via-pink-100/20 to-transparent blur-3xl dark:from-purple-400/15 dark:via-pink-300/10" />

        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <div className="mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0066DD] to-indigo-600 shadow-lg shadow-blue-500/25">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--label-tertiary)]">
              {siteSettings.siteName}
            </p>
          </div>

          <h1 className="text-large-title font-bold leading-tight text-[var(--label-primary)]">
            把内部 AI 能力
            <br />
            变成真正可用的工作台。
          </h1>

          <p className="mt-6 max-w-md text-body leading-relaxed text-[var(--label-secondary)]">
            这是一个可复制的模板化入口。先把核心应用、任务状态和结果查看跑通，再把这套方式固化成标准工作流。
          </p>

          <div className="mt-12 space-y-5">
            {[
              {
                title: "统一入口",
                desc: "所有内部成员从一个工作台进入 AI 能力",
                icon: (
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
              },
              {
                title: "统一任务流",
                desc: "任务状态、日志和结果查看保持一致体验",
                icon: (
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                title: "统一模板",
                desc: "后续新应用按配置接入，不再重复整页开发",
                icon: (
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
              },
            ].map(({ title, desc, icon }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-[var(--bg-elevated)] shadow-md dark:border-white/10">
                  {icon}
                </div>
                <div>
                  <p className="text-headline font-semibold text-[var(--label-primary)]">{title}</p>
                  <p className="mt-0.5 text-subhead text-[var(--label-tertiary)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-[var(--bg-primary)] px-8 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0066DD] to-indigo-600 shadow-lg shadow-blue-500/25">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-title-2 font-semibold text-[var(--label-primary)]">{siteSettings.siteName}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-title-1 font-semibold text-[var(--label-primary)]">登录</h2>
            <p className="mt-2 text-body text-[var(--label-tertiary)]">输入账号信息以访问工作台</p>
          </div>

          <LoginForm />

          <div className="mt-8 rounded-xl border border-black/5 bg-[var(--bg-secondary)] p-4 dark:border-white/10">
            <p className="text-center text-footnote text-[var(--label-tertiary)]">
              演示账号：
              <span className="font-medium text-[var(--label-secondary)]"> admin / admin123 </span>
              <br />
              <span className="text-[var(--label-quaternary)]">其他账号：ops.a / ops123，design.c / design123</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
