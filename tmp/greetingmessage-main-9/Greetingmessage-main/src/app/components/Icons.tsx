import { Home, Settings, User, Bell, Search, Menu, X, ChevronRight, Check, AlertCircle } from 'lucide-react';

export function Icons() {
  const icons = [
    { Icon: Home, name: 'Home' },
    { Icon: Settings, name: 'Settings' },
    { Icon: User, name: 'User' },
    { Icon: Bell, name: 'Bell' },
    { Icon: Search, name: 'Search' },
    { Icon: Menu, name: 'Menu' },
    { Icon: X, name: 'Close' },
    { Icon: ChevronRight, name: 'Chevron' },
    { Icon: Check, name: 'Check' },
    { Icon: AlertCircle, name: 'Alert' },
  ];

  return (
    <div className="space-y-10">
      <h2 className="text-3xl tracking-tight text-[#0f172a]" style={{ fontWeight: 600 }}>Иконки</h2>

      <div className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {icons.map(({ Icon, name }) => (
            <div key={name} className="flex flex-col items-center gap-4 p-6 rounded-xl hover:bg-[#f8fafc] transition-colors">
              <div className="w-14 h-14 bg-[#4f46e5] rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-[#64748b]" style={{ fontWeight: 500 }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
