interface ColorCardProps {
  name: string;
  hex: string;
  rgb?: string;
  description?: string;
}

function ColorCard({ name, hex, rgb, description }: ColorCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] overflow-hidden">
      <div
        className="h-40 w-full"
        style={{ backgroundColor: hex }}
      />
      <div className="p-6">
        <h3 className="text-[#0f172a] mb-2" style={{ fontWeight: 500 }}>{name}</h3>
        <p className="text-sm text-[#64748b] mb-1">{hex}</p>
        {rgb && <p className="text-sm text-[#94a3b8]">{rgb}</p>}
        {description && <p className="text-xs text-[#94a3b8] mt-3">{description}</p>}
      </div>
    </div>
  );
}

export function ColorPalette() {
  const colors = [
    {
      name: "Primary",
      hex: "#4f46e5",
      rgb: "RGB(79, 70, 229)",
      description: "Основной цвет бренда"
    },
    {
      name: "Secondary",
      hex: "#6366f1",
      rgb: "RGB(99, 102, 241)",
      description: "Дополнительный акцент"
    },
    {
      name: "Dark",
      hex: "#0f172a",
      rgb: "RGB(15, 23, 42)",
      description: "Текст и заголовки"
    },
    {
      name: "Light",
      hex: "#f8fafc",
      rgb: "RGB(248, 250, 252)",
      description: "Фон и карточки"
    },
    {
      name: "Accent",
      hex: "#10b981",
      rgb: "RGB(16, 185, 129)",
      description: "Успех и подтверждения"
    },
    {
      name: "Muted",
      hex: "#64748b",
      rgb: "RGB(100, 116, 139)",
      description: "Вторичный текст"
    }
  ];

  return (
    <div className="space-y-10">
      <h2 className="text-3xl tracking-tight text-[#0f172a]" style={{ fontWeight: 600 }}>Цветовая палитра</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {colors.map((color) => (
          <ColorCard key={color.hex} {...color} />
        ))}
      </div>
    </div>
  );
}
