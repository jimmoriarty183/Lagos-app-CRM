import { CodeBlock } from "../components/CodeBlock";

const TypeExample = ({
  tag,
  size,
  weight,
  lineHeight,
  letterSpacing,
  usage,
  example,
}: {
  tag: string;
  size: string;
  weight: string;
  lineHeight: string;
  letterSpacing: string;
  usage: string;
  example: string;
}) => (
  <div
    className="p-8 rounded-xl"
    style={{
      backgroundColor: "#FFFFFF",
      border: "1px solid var(--neutral-200)",
    }}
  >
    <div className="mb-6">
      <p
        style={{
          fontSize: size,
          fontWeight: weight,
          lineHeight,
          letterSpacing,
          color: "var(--neutral-900)",
        }}
      >
        {example}
      </p>
    </div>
    <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
            Tag
          </p>
          <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
            {tag}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
            Size
          </p>
          <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
            {size}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
            Weight
          </p>
          <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
            {weight}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
            Line Height
          </p>
          <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
            {lineHeight}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
            Tracking
          </p>
          <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
            {letterSpacing}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
            Usage
          </p>
          <p className="text-sm" style={{ color: "var(--neutral-700)" }}>
            {usage}
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default function Typography() {
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
          Typography
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Geist is our typeface—designed by Vercel for interfaces. We use a limited weight
          palette (Regular, Medium, Semibold) and a precise type scale for clear hierarchy.
        </p>
      </div>

      {/* Font Stack */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Font Stack
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <p className="text-6xl mb-6" style={{ fontWeight: 600, color: "var(--neutral-900)" }}>
            Geist
          </p>
          <p className="mb-6" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
            Geist is a modern geometric sans-serif designed specifically for digital interfaces.
            Its clean lines and perfect spacing make it ideal for both display and reading text.
          </p>
          <CodeBlock>
{`font-family: 'Geist', -apple-system, BlinkMacSystemFont, 
  'Segoe UI', sans-serif;
  
/* For code blocks */
font-family: 'Geist Mono', 'SF Mono', Monaco, 
  'Cascadia Code', monospace;`}
          </CodeBlock>
        </div>
      </div>

      {/* Type Scale */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Type Scale
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          A carefully balanced scale from display to small text. Negative tracking on larger
          sizes creates optical harmony.
        </p>
        <div className="space-y-6">
          <TypeExample
            tag="<h1>"
            size="2.25rem (36px)"
            weight="600"
            lineHeight="1.2"
            letterSpacing="-0.02em"
            usage="Page titles, hero headings"
            example="Page Heading"
          />

          <TypeExample
            tag="<h2>"
            size="1.875rem (30px)"
            weight="600"
            lineHeight="1.3"
            letterSpacing="-0.015em"
            usage="Section titles"
            example="Section Heading"
          />

          <TypeExample
            tag="<h3>"
            size="1.5rem (24px)"
            weight="600"
            lineHeight="1.4"
            letterSpacing="-0.01em"
            usage="Subsection titles"
            example="Subsection Heading"
          />

          <TypeExample
            tag="<h4>"
            size="1.25rem (20px)"
            weight="500"
            lineHeight="1.5"
            letterSpacing="0"
            usage="Card titles, smaller headings"
            example="Card Heading"
          />

          <TypeExample
            tag="<p>"
            size="1rem (16px)"
            weight="400"
            lineHeight="1.65"
            letterSpacing="0"
            usage="Body text, descriptions"
            example="This is body text used for paragraphs and longer content. It maintains excellent readability with generous line-height."
          />

          <TypeExample
            tag="<small>"
            size="0.875rem (14px)"
            weight="400"
            lineHeight="1.5"
            letterSpacing="0"
            usage="Captions, helper text, metadata"
            example="This is small text for supporting information and metadata."
          />

          <TypeExample
            tag="<label>"
            size="0.875rem (14px)"
            weight="500"
            lineHeight="1.5"
            letterSpacing="0"
            usage="Form labels, UI labels"
            example="Form Label"
          />
        </div>
      </div>

      {/* Font Weights */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Font Weights
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          We use only three weights. This restraint creates clear hierarchy without feeling heavy.
        </p>
        <div className="grid grid-cols-3 gap-6">
          <div
            className="p-8 rounded-xl text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-4xl mb-4" style={{ fontWeight: 400, color: "var(--neutral-900)" }}>
              Aa
            </p>
            <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Regular
            </p>
            <p className="text-sm mb-3 font-mono" style={{ color: "var(--neutral-600)" }}>
              400
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
              Body text, descriptions
            </p>
          </div>

          <div
            className="p-8 rounded-xl text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-4xl mb-4" style={{ fontWeight: 500, color: "var(--neutral-900)" }}>
              Aa
            </p>
            <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Medium
            </p>
            <p className="text-sm mb-3 font-mono" style={{ color: "var(--neutral-600)" }}>
              500
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
              Labels, buttons, emphasis
            </p>
          </div>

          <div
            className="p-8 rounded-xl text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-4xl mb-4" style={{ fontWeight: 600, color: "var(--neutral-900)" }}>
              Aa
            </p>
            <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Semibold
            </p>
            <p className="text-sm mb-3 font-mono" style={{ color: "var(--neutral-600)" }}>
              600
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
              Headings, strong emphasis
            </p>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
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
          Usage Guidelines
        </h3>
        <div className="space-y-6">
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Use negative tracking on large text
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Headings 24px and larger should use -0.01em to -0.025em tracking. This creates
              optical balance and a more refined appearance.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Generous line-height for readability
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Body text uses 1.65 line-height. Headings use tighter leading (1.2-1.4) for
              visual impact while maintaining readability.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Limit weight variations
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Never use Bold (700) or Black (800+). These weights are too heavy for our refined
              aesthetic. Semibold (600) is the maximum weight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}