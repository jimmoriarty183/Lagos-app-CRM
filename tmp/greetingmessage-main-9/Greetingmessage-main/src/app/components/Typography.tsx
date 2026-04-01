export function Typography() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl tracking-tight text-[#0f172a]" style={{ fontWeight: 600 }}>Типографика</h2>

      <div className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-12 space-y-12">
        <div className="space-y-6">
          <h3 className="text-sm tracking-wide text-[#64748b] uppercase" style={{ fontWeight: 500, letterSpacing: '0.1em' }}>Заголовки</h3>
          <div className="space-y-8">
            <div className="border-b border-[rgba(15,23,42,0.04)] pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">H1 / Semibold / 48px</p>
              <h1 className="text-5xl text-[#0f172a]" style={{ fontWeight: 600 }}>Заголовок первого уровня</h1>
            </div>
            <div className="border-b border-[rgba(15,23,42,0.04)] pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">H2 / Semibold / 36px</p>
              <h2 className="text-4xl text-[#0f172a]" style={{ fontWeight: 600 }}>Заголовок второго уровня</h2>
            </div>
            <div className="border-b border-[rgba(15,23,42,0.04)] pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">H3 / Semibold / 24px</p>
              <h3 className="text-2xl text-[#0f172a]" style={{ fontWeight: 600 }}>Заголовок третьего уровня</h3>
            </div>
            <div className="border-b border-[rgba(15,23,42,0.04)] pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">H4 / Medium / 20px</p>
              <h4 className="text-xl text-[#0f172a]" style={{ fontWeight: 500 }}>Заголовок четвертого уровня</h4>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm tracking-wide text-[#64748b] uppercase" style={{ fontWeight: 500, letterSpacing: '0.1em' }}>Текст</h3>
          <div className="space-y-8">
            <div className="border-b border-[rgba(15,23,42,0.04)] pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">Body Large / Regular / 18px</p>
              <p className="text-lg text-[#0f172a] leading-relaxed">Большой основной текст для важных параграфов и описаний</p>
            </div>
            <div className="border-b border-[rgba(15,23,42,0.04)] pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">Body / Regular / 16px</p>
              <p className="text-base text-[#0f172a] leading-relaxed">Стандартный текст для основного контента и параграфов</p>
            </div>
            <div className="border-b border-[rgba(15,23,42,0.04)] pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">Body Small / Regular / 14px</p>
              <p className="text-sm text-[#64748b] leading-relaxed">Маленький текст для дополнительной информации</p>
            </div>
            <div className="pb-8">
              <p className="text-xs text-[#94a3b8] mb-3">Caption / Regular / 12px</p>
              <p className="text-xs text-[#94a3b8]">Подписи и вспомогательный текст</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
