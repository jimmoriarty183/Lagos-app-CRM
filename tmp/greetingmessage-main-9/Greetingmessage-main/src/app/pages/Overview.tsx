import { CodeBlock } from "../components/CodeBlock";
import { Logo } from "../components/Logo";

export default function Overview() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <div>
        {/* Logo showcase */}
        <div className="mb-12 flex justify-center">
          <Logo size={64} />
        </div>
        
        <h1
          className="text-5xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }}
        >
          Ordo Design System
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          A comprehensive design system for building consistent, enterprise-grade interfaces.
          Every component is crafted with precision, documented with clarity, and built for scale.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: "Components", value: "24+" },
          { label: "Design Tokens", value: "120+" },
          { label: "Version", value: "1.0" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-8 rounded-xl transition-all duration-300 cursor-pointer group"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <p
              className="text-sm mb-2"
              style={{ color: "var(--neutral-500)", letterSpacing: "0.05em" }}
            >
              {stat.label}
            </p>
            <p
              className="text-4xl transition-colors duration-300"
              style={{ color: "var(--neutral-900)", fontWeight: 600 }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Principles */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Design Principles
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div
            className="p-8 rounded-xl group transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #F5F5FF 0%, #FFFFFF 100%)",
              border: "1px solid var(--brand-200)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--glow-brand), var(--shadow-md)";
              e.currentTarget.style.borderColor = "var(--brand-300)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.borderColor = "var(--brand-200)";
            }}
          >
            <div
              className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-500) 100%)",
                boxShadow: "var(--glow-brand)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="4" y="4" width="8" height="8" fill="white" />
                <rect x="16" y="4" width="8" height="8" stroke="white" strokeWidth="2" />
                <rect x="4" y="16" width="8" height="8" stroke="white" strokeWidth="2" />
                <rect x="16" y="16" width="8" height="8" fill="white" />
              </svg>
            </div>
            <h3
              className="text-xl mb-3"
              style={{ color: "var(--neutral-900)", fontWeight: 600 }}
            >
              Systematic
            </h3>
            <p style={{ color: "var(--neutral-700)", lineHeight: "1.65" }}>
              Every decision is rooted in a clear system. From color tokens to spacing scales,
              consistency is built into the foundation.
            </p>
          </div>

          <div
            className="p-8 rounded-xl group transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #FAFBFC 0%, #FFFFFF 100%)",
              border: "1px solid var(--neutral-200)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--neutral-800) 0%, var(--neutral-700) 100%)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <h3
              className="text-xl mb-3"
              style={{ color: "var(--neutral-900)", fontWeight: 600 }}
            >
              Refined
            </h3>
            <p style={{ color: "var(--neutral-700)", lineHeight: "1.65" }}>
              Details matter. Precise typography, considered spacing, and thoughtful micro-interactions
              create a polished experience.
            </p>
          </div>

          <div
            className="p-8 rounded-xl group transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #FAFBFC 0%, #FFFFFF 100%)",
              border: "1px solid var(--neutral-200)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--neutral-800) 0%, var(--neutral-700) 100%)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3
              className="text-xl mb-3"
              style={{ color: "var(--neutral-900)", fontWeight: 600 }}
            >
              Clear
            </h3>
            <p style={{ color: "var(--neutral-700)", lineHeight: "1.65" }}>
              Clarity over cleverness. Visual hierarchy guides users naturally, and interfaces
              communicate with intention.
            </p>
          </div>

          <div
            className="p-8 rounded-xl group transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #FAFBFC 0%, #FFFFFF 100%)",
              border: "1px solid var(--neutral-200)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--neutral-800) 0%, var(--neutral-700) 100%)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </svg>
            </div>
            <h3
              className="text-xl mb-3"
              style={{ color: "var(--neutral-900)", fontWeight: 600 }}
            >
              Accessible
            </h3>
            <p style={{ color: "var(--neutral-700)", lineHeight: "1.65" }}>
              Designed for everyone. WCAG AA compliant colors, keyboard navigation, and screen
              reader support are built in.
            </p>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Getting Started
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <p className="mb-6" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
            Import design tokens and start building. All tokens are available as CSS variables
            for seamless integration.
          </p>
          <CodeBlock>
{`/* Import core tokens */
@import '@ordo/design-tokens/colors.css';
@import '@ordo/design-tokens/spacing.css';
@import '@ordo/design-tokens/typography.css';

/* Use in your styles */
.button-primary {
  background: var(--brand-600);
  color: #FFFFFF;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
}`}
          </CodeBlock>
        </div>
      </div>

      {/* Structure */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          System Structure
        </h2>
        <div className="space-y-4">
          {[
            { section: "Brand", pages: "Logo, Colors, Typography" },
            { section: "Foundation", pages: "Spacing, Layouts, Grids" },
            { section: "Components", pages: "Buttons, Forms, UI Elements" },
            { section: "Patterns", pages: "Navigation, Data Display" },
          ].map((item) => (
            <div
              key={item.section}
              className="p-6 rounded-xl flex items-center justify-between transition-all duration-200"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--neutral-200)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-300)";
                e.currentTarget.style.backgroundColor = "var(--brand-50)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--neutral-200)";
                e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              <div>
                <p
                  className="mb-1"
                  style={{ color: "var(--neutral-900)", fontWeight: 600 }}
                >
                  {item.section}
                </p>
                <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
                  {item.pages}
                </p>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--neutral-400)" }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}