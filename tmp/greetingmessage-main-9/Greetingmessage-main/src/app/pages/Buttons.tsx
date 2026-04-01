import { ArrowRight, Download } from "lucide-react";
import { CodeBlock } from "../components/CodeBlock";
import { TRANSITIONS, FOCUS_STYLES } from "../utils/constants";

export default function Buttons() {
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
          Buttons
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Buttons are primary interaction points. Use them sparingly and with clear hierarchy.
          Every button should have an obvious purpose.
        </p>
      </div>

      {/* Primary */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Primary
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          For the main action on a page. Use only one primary button per section.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              className="px-6 py-3 rounded-lg transition-all"
              style={{
                backgroundColor: "var(--brand-600)",
                color: "#FFFFFF",
                fontWeight: 500,
              }}
            >
              Continue
            </button>
            <button
              className="px-6 py-3 rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: "var(--brand-600)",
                color: "#FFFFFF",
                fontWeight: 500,
              }}
            >
              Get Started
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              className="px-6 py-3 rounded-lg cursor-not-allowed"
              style={{
                backgroundColor: "var(--neutral-200)",
                color: "var(--neutral-500)",
                fontWeight: 500,
              }}
              disabled
            >
              Disabled
            </button>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="text-sm mb-3" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
              Specifications
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Background</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>var(--brand-600)</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Text Color</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>#FFFFFF</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Padding</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>12px 24px</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Border Radius</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>10px</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Font Weight</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>500</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Hover</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>var(--brand-700)</p>
              </div>
            </div>
            <CodeBlock>
{`.btn-primary {
  background-color: var(--brand-600);
  color: #FFFFFF;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
  font-weight: var(--font-weight-medium);
  transition: background-color 150ms;
}

.btn-primary:hover {
  background-color: var(--brand-700);
}

.btn-primary:disabled {
  background-color: var(--neutral-200);
  color: var(--neutral-500);
  cursor: not-allowed;
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Secondary */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Secondary
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          For secondary actions that support the primary action.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              className="px-6 py-3 rounded-lg transition-all"
              style={{
                backgroundColor: "var(--neutral-100)",
                color: "var(--neutral-900)",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              className="px-6 py-3 rounded-lg transition-all"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--neutral-200)",
                color: "var(--neutral-900)",
                fontWeight: 500,
              }}
            >
              Back
            </button>
            <button
              className="px-6 py-3 rounded-lg cursor-not-allowed"
              style={{
                backgroundColor: "var(--neutral-100)",
                color: "var(--neutral-400)",
                fontWeight: 500,
              }}
              disabled
            >
              Disabled
            </button>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.btn-secondary {
  background-color: var(--neutral-100);
  color: var(--neutral-900);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
  font-weight: var(--font-weight-medium);
}

.btn-secondary:hover {
  background-color: var(--neutral-200);
}

.btn-secondary-outline {
  background-color: transparent;
  border: 1px solid var(--neutral-200);
  color: var(--neutral-900);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Ghost */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Ghost
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Minimal buttons for tertiary actions and navigation.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              className="px-6 py-3 rounded-lg transition-all"
              style={{
                backgroundColor: "transparent",
                color: "var(--neutral-700)",
                fontWeight: 500,
              }}
            >
              Learn More
            </button>
            <button
              className="px-6 py-3 rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: "transparent",
                color: "var(--brand-600)",
                fontWeight: 500,
              }}
            >
              View Details
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              className="px-6 py-3 rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: "transparent",
                color: "var(--neutral-700)",
                fontWeight: 500,
              }}
            >
              <Download className="w-4 h-4" strokeWidth={2} />
              Download
            </button>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.btn-ghost {
  background-color: transparent;
  color: var(--neutral-700);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
  font-weight: var(--font-weight-medium);
}

.btn-ghost:hover {
  background-color: var(--neutral-100);
}

.btn-ghost-brand {
  color: var(--brand-600);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Destructive */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Destructive
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          For dangerous or irreversible actions. Use with caution.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              className="px-6 py-3 rounded-lg transition-all"
              style={{
                backgroundColor: "var(--error-500)",
                color: "#FFFFFF",
                fontWeight: 500,
              }}
            >
              Delete Account
            </button>
            <button
              className="px-6 py-3 rounded-lg transition-all"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--error-500)",
                color: "var(--error-500)",
                fontWeight: 500,
              }}
            >
              Remove
            </button>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.btn-destructive {
  background-color: var(--error-500);
  color: #FFFFFF;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
  font-weight: var(--font-weight-medium);
}

.btn-destructive:hover {
  background-color: #D13535;
}

.btn-destructive-outline {
  background-color: transparent;
  border: 1px solid var(--error-500);
  color: var(--error-500);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Sizes
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Three sizes for different contexts. Default (medium) should be used in most cases.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <button
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--brand-600)",
                color: "#FFFFFF",
                fontWeight: 500,
              }}
            >
              Small Button
            </button>
            <button
              className="px-6 py-3 rounded-lg"
              style={{
                backgroundColor: "var(--brand-600)",
                color: "#FFFFFF",
                fontWeight: 500,
              }}
            >
              Medium Button
            </button>
            <button
              className="px-8 py-4 rounded-lg text-lg"
              style={{
                backgroundColor: "var(--brand-600)",
                color: "#FFFFFF",
                fontWeight: 500,
              }}
            >
              Large Button
            </button>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.btn-small {
  padding: var(--space-2) var(--space-4);
  font-size: 0.875rem;
}

.btn-medium {
  padding: var(--space-3) var(--space-6);
  font-size: 1rem;
}

.btn-large {
  padding: var(--space-4) var(--space-8);
  font-size: 1.125rem;
}`}
            </CodeBlock>
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
          Best Practices
        </h3>
        <div className="space-y-6">
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              One primary button per section
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Multiple primary buttons create confusion. If everything is important, nothing is.
              Use secondary or ghost buttons for additional actions.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Clear, action-oriented labels
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Use specific verbs. "Create Project" is better than "Submit". Avoid generic labels
              like "Click Here" or "OK".
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Consider button placement
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Primary actions go on the right in forms and dialogs. This follows natural reading
              flow and user expectations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}