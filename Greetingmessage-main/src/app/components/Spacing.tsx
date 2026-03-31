export function Spacing() {
  const spacings = [
    { size: '4px', name: 'XS', pixels: '4px' },
    { size: '8px', name: 'SM', pixels: '8px' },
    { size: '12px', name: 'MD', pixels: '12px' },
    { size: '16px', name: 'LG', pixels: '16px' },
    { size: '24px', name: 'XL', pixels: '24px' },
    { size: '32px', name: '2XL', pixels: '32px' },
    { size: '48px', name: '3XL', pixels: '48px' },
    { size: '64px', name: '4XL', pixels: '64px' },
  ];

  return (
    <div className="space-y-10">
      <h2 className="text-3xl tracking-tight text-[#0f172a]" style={{ fontWeight: 600 }}>Отступы и интервалы</h2>

      <div className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-12">
        <div className="space-y-6">
          {spacings.map(({ size, name, pixels }) => (
            <div key={name} className="flex items-center gap-8">
              <div className="w-24 text-sm text-[#0f172a]" style={{ fontWeight: 500 }}>{name}</div>
              <div className="w-28 text-sm text-[#94a3b8]">{pixels}</div>
              <div
                className="h-10 bg-[#4f46e5] rounded-lg"
                style={{ width: size }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
