export function Buttons() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl tracking-tight text-[#0f172a]" style={{ fontWeight: 600 }}>Кнопки</h2>

      <div className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-12">
        <div className="space-y-12">
          {/* Primary Buttons */}
          <div className="space-y-6">
            <h3 className="text-sm tracking-wide text-[#64748b] uppercase" style={{ fontWeight: 500, letterSpacing: '0.1em' }}>Primary</h3>
            <div className="flex flex-wrap items-center gap-4">
              <button className="px-7 py-3.5 bg-[#4f46e5] text-white rounded-xl transition-all hover:bg-[#4338ca] hover:shadow-sm" style={{ fontWeight: 500 }}>
                Large Button
              </button>
              <button className="px-6 py-3 bg-[#4f46e5] text-white rounded-xl transition-all hover:bg-[#4338ca] hover:shadow-sm" style={{ fontWeight: 500 }}>
                Medium Button
              </button>
              <button className="px-5 py-2.5 bg-[#4f46e5] text-white rounded-xl transition-all hover:bg-[#4338ca] hover:shadow-sm text-sm" style={{ fontWeight: 500 }}>
                Small Button
              </button>
            </div>
          </div>

          {/* Secondary Buttons */}
          <div className="space-y-6">
            <h3 className="text-sm tracking-wide text-[#64748b] uppercase" style={{ fontWeight: 500, letterSpacing: '0.1em' }}>Secondary</h3>
            <div className="flex flex-wrap items-center gap-4">
              <button className="px-7 py-3.5 bg-white text-[#4f46e5] border border-[rgba(79,70,229,0.2)] rounded-xl transition-all hover:border-[rgba(79,70,229,0.4)] hover:bg-[#faf9fe]" style={{ fontWeight: 500 }}>
                Large Button
              </button>
              <button className="px-6 py-3 bg-white text-[#4f46e5] border border-[rgba(79,70,229,0.2)] rounded-xl transition-all hover:border-[rgba(79,70,229,0.4)] hover:bg-[#faf9fe]" style={{ fontWeight: 500 }}>
                Medium Button
              </button>
              <button className="px-5 py-2.5 bg-white text-[#4f46e5] border border-[rgba(79,70,229,0.2)] rounded-xl transition-all hover:border-[rgba(79,70,229,0.4)] hover:bg-[#faf9fe] text-sm" style={{ fontWeight: 500 }}>
                Small Button
              </button>
            </div>
          </div>

          {/* Ghost Buttons */}
          <div className="space-y-6">
            <h3 className="text-sm tracking-wide text-[#64748b] uppercase" style={{ fontWeight: 500, letterSpacing: '0.1em' }}>Ghost</h3>
            <div className="flex flex-wrap items-center gap-4">
              <button className="px-7 py-3.5 text-[#4f46e5] rounded-xl transition-all hover:bg-[#f8fafc]" style={{ fontWeight: 500 }}>
                Large Button
              </button>
              <button className="px-6 py-3 text-[#4f46e5] rounded-xl transition-all hover:bg-[#f8fafc]" style={{ fontWeight: 500 }}>
                Medium Button
              </button>
              <button className="px-5 py-2.5 text-[#4f46e5] rounded-xl transition-all hover:bg-[#f8fafc] text-sm" style={{ fontWeight: 500 }}>
                Small Button
              </button>
            </div>
          </div>

          {/* Disabled State */}
          <div className="space-y-6">
            <h3 className="text-sm tracking-wide text-[#64748b] uppercase" style={{ fontWeight: 500, letterSpacing: '0.1em' }}>Disabled</h3>
            <div className="flex flex-wrap items-center gap-4">
              <button disabled className="px-7 py-3.5 bg-[#f1f5f9] text-[#cbd5e1] rounded-xl cursor-not-allowed" style={{ fontWeight: 500 }}>
                Disabled Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
