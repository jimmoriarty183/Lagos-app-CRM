export default function AdminLoading() {
  return (
    <div className="min-h-[100svh] bg-[#f6f8fb] px-3 py-4 text-slate-900 sm:px-4 xl:px-6 2xl:px-8">
      <div className="mx-auto max-w-[1760px]">
        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[20px] border border-white/70 bg-white/80 p-3 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-[14px] bg-slate-100" />
              ))}
            </div>
            <div className="mt-4 h-[300px] animate-pulse rounded-[16px] bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
