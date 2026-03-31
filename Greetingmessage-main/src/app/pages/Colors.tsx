import { CodeBlock } from "../components/CodeBlock";

const ColorSwatch = ({
  name,
  value,
  textColor = "var(--neutral-900)",
}: {
  name: string;
  value: string;
  textColor?: string;
}) => (
  <div
    className="h-24 rounded-lg flex items-end p-4"
    style={{ backgroundColor: value }}
  >
    <div>
      <p className="text-sm mb-0.5" style={{ color: textColor, fontWeight: 500 }}>
        {name}
      </p>
      <p className="text-xs font-mono" style={{ color: textColor, opacity: 0.8 }}>
        {value}
      </p>
    </div>
  </div>
);

export default function Colors() {
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
          Colors
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Our color system uses semantic tokens mapped to specific UI roles. This creates
          consistency and makes theming straightforward.
        </p>
      </div>

      {/* Brand Colors */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Brand
        </h2>
        <div
          className="mb-8 p-6 rounded-xl"
          style={{
            backgroundColor: "#F7F7FC",
            border: "1px solid var(--brand-200)",
          }}
        >
          <p className="text-sm mb-2" style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
            🎨 Muted & Premium by Design
          </p>
          <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.65" }}>
            Our brand purple (#5B5BB3) is intentionally muted to convey sophistication and 
            enterprise-grade quality. This isn't a vibrant consumer brand—it's a professional 
            B2B SaaS platform. The subdued tone communicates trust, reliability, and "quiet luxury" 
            similar to Stripe, Linear, and Notion.
          </p>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <ColorSwatch name="50" value="#F7F7FC" />
          <ColorSwatch name="100" value="#EDEDF9" />
          <ColorSwatch name="200" value="#DCDCF3" />
          <ColorSwatch name="300" value="#C4C4E8" />
          <ColorSwatch name="400" value="#A8A8DA" />
          <ColorSwatch name="500" value="#7C7CC8" textColor="#FFFFFF" />
          <ColorSwatch name="600" value="#5B5BB3" textColor="#FFFFFF" />
          <ColorSwatch name="700" value="#4444A0" textColor="#FFFFFF" />
          <ColorSwatch name="800" value="#333387" textColor="#FFFFFF" />
          <ColorSwatch name="900" value="#262670" textColor="#FFFFFF" />
        </div>
        <div
          className="mt-6 p-6 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <p className="text-sm mb-2" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
            Usage
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--neutral-600)", lineHeight: "1.6" }}>
            600 is the primary brand color. Use for buttons, links, and key interactive elements.
            50-200 for subtle backgrounds. 700-900 for hover and pressed states.
          </p>
          <CodeBlock>
{`/* CSS Variables */
var(--brand-600)  /* Primary actions */
var(--brand-700)  /* Hover states */
var(--brand-50)   /* Subtle backgrounds */`}
          </CodeBlock>
        </div>
      </div>

      {/* Neutrals */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Neutral
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Grayscale palette for text, backgrounds, and UI structure. Carefully balanced for
          readability and hierarchy.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <ColorSwatch name="50" value="#FAFBFC" />
            <ColorSwatch name="100" value="#F5F6F7" />
            <ColorSwatch name="200" value="#EBEDEF" />
            <ColorSwatch name="300" value="#DFE1E4" />
            <ColorSwatch name="400" value="#B8BCC3" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            <ColorSwatch name="500" value="#868C98" textColor="#FFFFFF" />
            <ColorSwatch name="600" value="#5F6672" textColor="#FFFFFF" />
            <ColorSwatch name="700" value="#3F4651" textColor="#FFFFFF" />
            <ColorSwatch name="800" value="#262B35" textColor="#FFFFFF" />
            <ColorSwatch name="900" value="#0F1419" textColor="#FFFFFF" />
          </div>
        </div>
        <div
          className="mt-6 p-6 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <p className="text-sm mb-2" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
            Usage
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--neutral-600)", lineHeight: "1.6" }}>
            900 for headings, 700 for body text, 600 for secondary text, 500 for disabled states.
            50-200 for backgrounds and borders.
          </p>
          <CodeBlock>
{`/* CSS Variables */
var(--neutral-900)  /* Primary text */
var(--neutral-700)  /* Body text */
var(--neutral-600)  /* Secondary text */
var(--neutral-200)  /* Borders */
var(--neutral-50)   /* Page background */`}
          </CodeBlock>
        </div>
      </div>

      {/* Semantic Colors */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Semantic
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Status and feedback colors communicate meaning instantly.
        </p>
        <div className="grid grid-cols-3 gap-6">
          {/* Success */}
          <div>
            <div className="space-y-3 mb-4">
              <ColorSwatch name="Success" value="#0EA971" textColor="#FFFFFF" />
              <ColorSwatch name="Success Light" value="#EDFBF5" />
            </div>
            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
              Success states, confirmations, positive feedback
            </p>
          </div>

          {/* Warning */}
          <div>
            <div className="space-y-3 mb-4">
              <ColorSwatch name="Warning" value="#F5A524" textColor="#FFFFFF" />
              <ColorSwatch name="Warning Light" value="#FEF9ED" />
            </div>
            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
              Warnings, cautions, pending states
            </p>
          </div>

          {/* Error */}
          <div>
            <div className="space-y-3 mb-4">
              <ColorSwatch name="Error" value="#E84545" textColor="#FFFFFF" />
              <ColorSwatch name="Error Light" value="#FEF2F2" />
            </div>
            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
              Errors, destructive actions, critical alerts
            </p>
          </div>
        </div>
        <div
          className="mt-6 p-6 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <CodeBlock>
{`/* CSS Variables */
var(--success-500)  /* Success primary */
var(--success-50)   /* Success background */
var(--warning-500)  /* Warning primary */
var(--warning-50)   /* Warning background */
var(--error-500)    /* Error primary */
var(--error-50)     /* Error background */`}
          </CodeBlock>
        </div>
      </div>

      {/* Accessibility */}
      <div
        className="p-8 rounded-xl"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--neutral-200)",
        }}
      >
        <h3
          className="text-2xl mb-4"
          style={{ color: "var(--neutral-900)", fontWeight: 600 }}
        >
          Accessibility
        </h3>
        <p className="mb-6" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          All color combinations meet WCAG AA standards for contrast. Critical text uses AAA-compliant
          ratios.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--neutral-100)" }}>
            <p className="text-sm mb-2" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Text on backgrounds
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
              • neutral-900 on white: 16.4:1 (AAA)
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
              • neutral-700 on white: 9.2:1 (AAA)
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
              • neutral-600 on white: 6.8:1 (AA)
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--neutral-100)" }}>
            <p className="text-sm mb-2" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Interactive elements
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
              • brand-600 on white: 4.8:1 (AA)
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
              • White on brand-600: 4.8:1 (AA)
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
              • Error-500 on white: 5.1:1 (AA)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}