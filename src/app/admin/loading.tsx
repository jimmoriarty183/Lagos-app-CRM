export default function AdminLoading() {
  return (
    <div className="min-h-[100svh] bg-[#f6f8fb] px-4 py-6 text-slate-900 sm:px-6 xl:px-8 2xl:px-10">
      <div className="mx-auto max-w-[1760px]">
        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
            <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-[20px] bg-slate-100" />
              ))}
            </div>
            <div className="mt-6 h-[320px] animate-pulse rounded-[24px] bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
