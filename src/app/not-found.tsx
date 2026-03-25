import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="surface-panel max-w-xl rounded-[36px] p-10 text-center">
        <p className="eyebrow">404</p>
        <h1 className="display-title mt-4 text-5xl font-semibold text-slate-950">页面不存在</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          这个路由还没有对应页面，或者资源编号不存在。你可以回到工作台继续查看应用、任务和模板配置。
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[#0066DD] px-5 py-3 text-sm font-semibold !text-white shadow-sm hover:bg-[#0055BB]"
        >
          返回工作台
        </Link>
      </div>
    </div>
  );
}
