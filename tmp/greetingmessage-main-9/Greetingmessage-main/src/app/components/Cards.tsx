import { Zap, Shield, Layers } from 'lucide-react';

export function Cards() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl tracking-tight text-[#0f172a]" style={{ fontWeight: 600 }}>Карточки</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Basic Card */}
        <div className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-8 space-y-5">
          <div className="w-12 h-12 bg-[#4f46e5] rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl text-[#0f172a]" style={{ fontWeight: 500 }}>Быстрый старт</h3>
          <p className="text-[#64748b] leading-relaxed">
            Начните работу с Ordo за несколько минут
          </p>
          <button className="text-[#4f46e5] transition-colors hover:text-[#4338ca]" style={{ fontWeight: 500 }}>
            Узнать больше →
          </button>
        </div>

        {/* Hover Card */}
        <div className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-8 space-y-5 hover:border-[rgba(79,70,229,0.2)] transition-all cursor-pointer">
          <div className="w-12 h-12 bg-[#6366f1] rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl text-[#0f172a]" style={{ fontWeight: 500 }}>Безопасность</h3>
          <p className="text-[#64748b] leading-relaxed">
            Надежная защита ваших данных
          </p>
          <button className="text-[#4f46e5] transition-colors hover:text-[#4338ca]" style={{ fontWeight: 500 }}>
            Узнать больше →
          </button>
        </div>

        {/* Featured Card */}
        <div className="bg-gradient-to-br from-[#4f46e5] to-[#6366f1] rounded-2xl p-8 space-y-5 text-white">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Layers className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl" style={{ fontWeight: 500 }}>Модульность</h3>
          <p className="text-white/80 leading-relaxed">
            Гибкая система компонентов
          </p>
          <button className="text-white transition-opacity hover:opacity-80" style={{ fontWeight: 500 }}>
            Узнать больше →
          </button>
        </div>
      </div>
    </div>
  );
}
