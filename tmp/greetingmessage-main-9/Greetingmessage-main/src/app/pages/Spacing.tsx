import { CodeBlock } from "../components/CodeBlock";

export default function Spacing() {
  const spacingValues = [
    { token: "--space-1", value: "4px", usage: "Tight spacing, icon gaps" },
    { token: "--space-2", value: "8px", usage: "Inner component padding" },
    { token: "--space-3", value: "12px", usage: "Small gaps between items" },
    { token: "--space-4", value: "16px", usage: "Default component spacing" },
    { token: "--space-5", value: "20px", usage: "Medium gaps" },
    { token: "--space-6", value: "24px", usage: "Section spacing" },
    { token: "--space-8", value: "32px", usage: "Large section gaps" },
    { token: "--space-10", value: "40px", usage: "Major sections" },
    { token: "--space-12", value: "48px", usage: "Page-level spacing" },
    { token: "--space-16", value: "64px", usage: "Extra large gaps" },
  ];

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
          Spacing
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          A 4px base unit creates consistent rhythm throughout the interface. Everything snaps
          to this grid for predictable, harmonious layouts.
        </p>
      </div>

      {/* Principle */}
      <div
        className="p-8 rounded-xl"
        style={{
          backgroundColor: "var(--brand-50)",
          border: "1px solid var(--brand-200)",
        }}
      >
        <h3
          className="text-2xl mb-4"
          style={{ color: "var(--neutral-900)", fontWeight: 600 }}
        >
          The 4px Grid
        </h3>
        <p className="mb-6" style={{ color: "var(--neutral-700)", lineHeight: "1.65" }}>
          All spacing values are multiples of 4px. This creates visual rhythm and makes layouts
          feel intentional. Designers and developers share the same language.
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-lg" style={{ backgroundColor: "#FFFFFF" }}>
            <p className="text-sm mb-2" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Why 4px?
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
              4px is divisible by 2, works well at any screen density, and provides enough
              granularity for precise layouts without overwhelming choice.
            </p>
          </div>
          <div className="p-6 rounded-lg" style={{ backgroundColor: "#FFFFFF" }}>
            <p className="text-sm mb-2" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Consistency
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
              Using the same spacing scale across all components creates predictable patterns
              and reduces decision fatigue.
            </p>
          </div>
        </div>
      </div>

      {/* Spacing Scale */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Spacing Scale
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Ten values cover 99% of spacing needs. Use CSS variables for implementation.
        </p>
        <div className="space-y-3">
          {spacingValues.map((space) => (
            <div
              key={space.token}
              className="p-6 rounded-xl flex items-center gap-8"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--neutral-200)",
              }}
            >
              <div className="w-32">
                <p className="text-sm font-mono mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  {space.value}
                </p>
                <p className="text-xs font-mono" style={{ color: "var(--neutral-500)" }}>
                  {space.token}
                </p>
              </div>
              <div
                className="h-12 rounded"
                style={{
                  width: space.value,
                  backgroundColor: "var(--brand-600)",
                  minWidth: space.value,
                }}
              />
              <p className="flex-1 text-sm" style={{ color: "var(--neutral-700)" }}>
                {space.usage}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Examples */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Usage Examples
        </h2>
        <div className="space-y-6">
          {/* Button Example */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-6" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              BUTTON SPACING
            </p>
            <div className="flex items-start gap-12">
              <div>
                <button
                  className="px-6 py-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--brand-600)",
                    color: "#FFFFFF",
                    fontWeight: 500,
                  }}
                >
                  Button
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm mb-3" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Padding
                </p>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-700)" }}>
                  • Horizontal: var(--space-6) — 24px
                </p>
                <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
                  • Vertical: var(--space-3) — 12px
                </p>
              </div>
            </div>
            <CodeBlock>
{`.button {
  padding: var(--space-3) var(--space-6);
}`}
            </CodeBlock>
          </div>

          {/* Card Example */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-6" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              CARD SPACING
            </p>
            <div className="flex items-start gap-12">
              <div
                className="w-64 p-6 rounded-xl"
                style={{
                  border: "1px solid var(--neutral-200)",
                }}
              >
                <h4 className="mb-3" style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
                  Card Title
                </h4>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Card content with proper spacing and hierarchy.
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm mb-3" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Structure
                </p>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-700)" }}>
                  • Padding: var(--space-6) — 24px
                </p>
                <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
                  • Title gap: var(--space-3) — 12px
                </p>
              </div>
            </div>
            <CodeBlock>
{`.card {
  padding: var(--space-6);
}

.card-title {
  margin-bottom: var(--space-3);
}`}
            </CodeBlock>
          </div>

          {/* Form Example */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-6" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              FORM SPACING
            </p>
            <div className="flex items-start gap-12">
              <div className="w-64 space-y-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-lg"
                    style={{
                      border: "1px solid var(--neutral-200)",
                      color: "var(--neutral-900)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg"
                    style={{
                      border: "1px solid var(--neutral-200)",
                      color: "var(--neutral-900)",
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm mb-3" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Structure
                </p>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-700)" }}>
                  • Field gap: var(--space-4) — 16px
                </p>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-700)" }}>
                  • Label gap: var(--space-2) — 8px
                </p>
                <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
                  • Input padding: var(--space-4) — 16px
                </p>
              </div>
            </div>
            <CodeBlock>
{`.form-group {
  margin-bottom: var(--space-4);
}

label {
  margin-bottom: var(--space-2);
}

input {
  padding: var(--space-3) var(--space-4);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Guidelines */}
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
          Guidelines
        </h3>
        <div className="space-y-6">
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Use the scale, don't improvise
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Always pick from the defined scale. Never use arbitrary values like 15px or 23px.
              If you need a spacing value that doesn't exist, discuss with the team first.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Pair spacing with hierarchy
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Related elements should be closer together. Use larger spacing to separate
              different sections or concepts. Spacing communicates relationships.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Be consistent across similar components
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              All buttons should use the same padding. All cards should use the same internal
              spacing. Consistency reduces cognitive load.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}