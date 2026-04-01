import { Bell, Search, Settings, User, Home, BarChart, Users, FileText } from "lucide-react";

const CodeBlock = ({ children }: { children: string }) => (
  <div
    className="mt-3 p-4 rounded-lg font-mono text-sm overflow-x-auto"
    style={{
      backgroundColor: "var(--neutral-900)",
      color: "var(--neutral-100)",
    }}
  >
    <pre>{children}</pre>
  </div>
);

export default function LayoutPage() {
  return (
    <div className="space-y-20">
      {/* Header */}
      <div>
        <h1
          className="text-5xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }}
        >
          Layout Patterns
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Common layout structures and navigation patterns for building consistent application
          interfaces. These patterns solve recurring design problems.
        </p>
      </div>

      {/* Grid System */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Grid System
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          A 12-column responsive grid with 4px base spacing.
        </p>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="space-y-4 mb-6">
            {/* Full width */}
            <div className="grid grid-cols-12 gap-4">
              <div
                className="col-span-12 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                12 columns
              </div>
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-12 gap-4">
              <div
                className="col-span-6 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                6 columns
              </div>
              <div
                className="col-span-6 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                6 columns
              </div>
            </div>

            {/* Three columns */}
            <div className="grid grid-cols-12 gap-4">
              <div
                className="col-span-4 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                4 columns
              </div>
              <div
                className="col-span-4 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                4 columns
              </div>
              <div
                className="col-span-4 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                4 columns
              </div>
            </div>

            {/* Asymmetric */}
            <div className="grid grid-cols-12 gap-4">
              <div
                className="col-span-8 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                8 columns
              </div>
              <div
                className="col-span-4 p-4 rounded-lg text-center"
                style={{ backgroundColor: "var(--brand-100)", color: "var(--brand-700)" }}
              >
                4 columns
              </div>
            </div>
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`/* 12-column grid with 16px gap */
.grid-container {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}

/* Responsive columns */
.col-12 { grid-column: span 12; }
.col-6 { grid-column: span 6; }
.col-4 { grid-column: span 4; }
.col-3 { grid-column: span 3; }`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Sidebar Layout */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Sidebar Navigation
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Standard layout with fixed sidebar and scrollable content area.
        </p>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div
            className="h-96 rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--neutral-200)" }}
          >
            <div className="flex h-full">
              {/* Sidebar */}
              <div
                className="w-64 p-6"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRight: "1px solid var(--neutral-200)",
                }}
              >
                <div className="mb-8">
                  <div
                    className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center"
                    style={{ backgroundColor: "var(--brand-600)" }}
                  >
                    <span className="text-white text-sm font-semibold">O</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
                    Ordo
                  </p>
                </div>
                <nav className="space-y-1">
                  {[
                    { icon: Home, label: "Dashboard" },
                    { icon: BarChart, label: "Analytics" },
                    { icon: Users, label: "Team" },
                    { icon: FileText, label: "Projects" },
                    { icon: Settings, label: "Settings" },
                  ].map((item, idx) => (
                    <button
                      key={item.label}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left"
                      style={{
                        backgroundColor: idx === 0 ? "var(--neutral-100)" : "transparent",
                        color: idx === 0 ? "var(--neutral-900)" : "var(--neutral-600)",
                        fontWeight: idx === 0 ? 500 : 400,
                      }}
                    >
                      <item.icon className="w-5 h-5" strokeWidth={2} />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-8" style={{ backgroundColor: "var(--neutral-50)" }}>
                <div
                  className="h-12 rounded-lg mb-4"
                  style={{ backgroundColor: "var(--neutral-200)" }}
                />
                <div
                  className="h-32 rounded-lg mb-4"
                  style={{ backgroundColor: "var(--neutral-200)" }}
                />
                <div
                  className="h-24 rounded-lg"
                  style={{ backgroundColor: "var(--neutral-200)" }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 256px;
  position: fixed;
  height: 100vh;
  background-color: #FFFFFF;
  border-right: 1px solid var(--neutral-200);
}

.main-content {
  margin-left: 256px;
  flex: 1;
  padding: var(--space-8);
  background-color: var(--neutral-50);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Top Navigation */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Top Navigation
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Horizontal navigation bar with actions and user menu.
        </p>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--neutral-200)" }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                backgroundColor: "#FFFFFF",
                borderBottom: "1px solid var(--neutral-200)",
              }}
            >
              <div className="flex items-center gap-8">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--brand-600)" }}
                >
                  <span className="text-white text-sm font-semibold">O</span>
                </div>
                <nav className="flex gap-6">
                  {["Dashboard", "Projects", "Team", "Reports"].map((item, idx) => (
                    <button
                      key={item}
                      className="text-sm"
                      style={{
                        color: idx === 0 ? "var(--neutral-900)" : "var(--neutral-600)",
                        fontWeight: idx === 0 ? 500 : 400,
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--neutral-100)" }}
                >
                  <Search className="w-5 h-5" style={{ color: "var(--neutral-600)" }} strokeWidth={2} />
                </button>
                <button
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--neutral-100)" }}
                >
                  <Bell className="w-5 h-5" style={{ color: "var(--neutral-600)" }} strokeWidth={2} />
                </button>
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--brand-600)" }}
                >
                  <User className="w-5 h-5" color="#FFFFFF" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8" style={{ backgroundColor: "var(--neutral-50)", minHeight: "300px" }}>
              <div
                className="h-12 rounded-lg mb-4"
                style={{ backgroundColor: "var(--neutral-200)" }}
              />
              <div className="grid grid-cols-3 gap-4">
                <div
                  className="h-32 rounded-lg"
                  style={{ backgroundColor: "var(--neutral-200)" }}
                />
                <div
                  className="h-32 rounded-lg"
                  style={{ backgroundColor: "var(--neutral-200)" }}
                />
                <div
                  className="h-32 rounded-lg"
                  style={{ backgroundColor: "var(--neutral-200)" }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.header {
  position: sticky;
  top: 0;
  height: 64px;
  background-color: #FFFFFF;
  border-bottom: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  z-index: 100;
}

.nav-links {
  display: flex;
  gap: var(--space-6);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Content Containers
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Maximum widths for optimal reading and layout.
        </p>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="space-y-6">
            <div>
              <p className="text-sm mb-3" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
                Reading Width (prose)
              </p>
              <div
                className="max-w-3xl p-6 rounded-lg mx-auto"
                style={{ backgroundColor: "var(--brand-50)", border: "1px solid var(--brand-200)" }}
              >
                <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
                  max-width: 768px (48rem) — Optimal for long-form content and readability
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
                Standard Content
              </p>
              <div
                className="max-w-6xl p-6 rounded-lg mx-auto"
                style={{ backgroundColor: "var(--neutral-100)", border: "1px solid var(--neutral-200)" }}
              >
                <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
                  max-width: 1200px (75rem) — For application content with sidebars and grids
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
                Full Width
              </p>
              <div
                className="p-6 rounded-lg"
                style={{ backgroundColor: "var(--neutral-100)", border: "1px solid var(--neutral-200)" }}
              >
                <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
                  No max-width — For dashboards and data-heavy interfaces
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`/* Prose/Reading content */
.container-prose {
  max-width: 768px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* Standard application content */
.container-standard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-8);
}

/* Full width with padding */
.container-full {
  padding: 0 var(--space-12);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Spacing Patterns */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Vertical Spacing
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Common vertical rhythm patterns for page layouts.
        </p>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2" style={{ color: "var(--neutral-600)" }}>
                Section Gap (80px)
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-full h-2 rounded"
                  style={{ backgroundColor: "var(--brand-200)" }}
                />
                <div className="text-sm font-mono whitespace-nowrap" style={{ color: "var(--neutral-500)" }}>
                  80px
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm mb-2" style={{ color: "var(--neutral-600)" }}>
                Subsection Gap (48px)
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-2/3 h-2 rounded"
                  style={{ backgroundColor: "var(--brand-300)" }}
                />
                <div className="text-sm font-mono whitespace-nowrap" style={{ color: "var(--neutral-500)" }}>
                  48px
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm mb-2" style={{ color: "var(--neutral-600)" }}>
                Element Gap (24px)
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-1/3 h-2 rounded"
                  style={{ backgroundColor: "var(--brand-400)" }}
                />
                <div className="text-sm font-mono whitespace-nowrap" style={{ color: "var(--neutral-500)" }}>
                  24px
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="text-sm mb-4" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
              Usage Guidelines
            </p>
            <ul className="space-y-2 text-sm" style={{ color: "var(--neutral-600)" }}>
              <li>• Use 80px (var(--space-20) equivalent) between major page sections</li>
              <li>• Use 48px (var(--space-12)) between subsections</li>
              <li>• Use 24px (var(--space-6)) between related elements</li>
              <li>• Use 16px (var(--space-4)) for tight groupings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div
        className="p-8 rounded-xl"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--neutral-200)",
        }}
      >
        <h3
          className="text-2xl mb-6"
          style={{ color: "var(--neutral-900)", fontWeight: 600 }}
        >
          Layout Best Practices
        </h3>
        <div className="space-y-6">
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Consistent navigation placement
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Keep primary navigation in the same place across all pages. Users should never
              have to hunt for navigation.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Respect reading width
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Lines of text shouldn't exceed 80 characters. Use max-width containers to maintain
              comfortable reading lengths.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Generous spacing
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              White space is not wasted space. It creates breathing room and improves
              comprehension. Don't be afraid of empty space.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
