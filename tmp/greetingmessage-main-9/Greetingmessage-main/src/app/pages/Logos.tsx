import { Download } from "lucide-react";
import { CodeBlock } from "../components/CodeBlock";
import { Logo } from "../components/Logo";
import { LogoIcon } from "../components/LogoIcon";

export default function Logos() {
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
          Logo
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Our logo features a modular square grid pattern representing structure, organization, 
          and systematic approach. Use it consistently across all touchpoints to maintain brand 
          recognition and trust.
        </p>
      </div>

      {/* Primary Logo */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Primary Logo
        </h2>
        <p
          className="text-base mb-8"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          This is our main logo. Use it on light backgrounds whenever possible.
          The brand color has been carefully calibrated to convey premium, enterprise-grade quality.
        </p>

        <div
          className="p-16 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <Logo size={48} />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--neutral-500)" }}>
              Brand Color
            </p>
            <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
              #5B5BB3
            </p>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--neutral-500)" }}>
              Tone
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-900)" }}>
              Muted, Premium
            </p>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--neutral-500)" }}>
              Usage
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-900)" }}>
              Light backgrounds
            </p>
          </div>
        </div>
      </div>

      {/* Logo Sizes */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Size Variations
        </h2>
        <p
          className="text-base mb-8"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          The logo scales beautifully across different contexts. Choose the appropriate size
          based on your use case.
        </p>

        <div className="space-y-6">
          {/* Large - 64px */}
          <div
            className="p-12 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Large
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-500)" }}>
                  64px • Hero sections, landing pages
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center py-8">
              <Logo size={64} />
            </div>
          </div>

          {/* Medium - 48px */}
          <div
            className="p-12 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Medium
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-500)" }}>
                  48px • Navigation bars, headers
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center py-6">
              <Logo size={48} />
            </div>
          </div>

          {/* Standard - 32px */}
          <div
            className="p-12 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Standard
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-500)" }}>
                  32px • Sidebar navigation, cards
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center py-4">
              <Logo size={32} />
            </div>
          </div>

          {/* Small - 24px */}
          <div
            className="p-12 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Small
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-500)" }}>
                  24px • Compact UI, mobile views
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center py-3">
              <Logo size={24} />
            </div>
          </div>

          {/* Icon - 16px */}
          <div
            className="p-12 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                  Icon / Favicon
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-500)" }}>
                  16px • Browser tabs, notifications
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center py-2">
              <LogoIcon size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Color Usage */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Logo Colors
        </h2>
        <p
          className="text-base mb-8"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          The logo color is intentionally muted to convey sophistication and premium quality.
          This is not a vibrant consumer brand—it's a professional B2B SaaS platform.
        </p>

        <div className="grid grid-cols-2 gap-8">
          {/* Primary Brand */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <div className="flex items-center justify-center mb-8 py-8">
              <Logo size={48} />
            </div>
            <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
              <p className="text-sm mb-4" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                Primary Brand Color
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
                    Hex
                  </p>
                  <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
                    #5B5BB3
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
                    RGB
                  </p>
                  <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
                    91, 91, 179
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--neutral-500)" }}>
                    CSS Variable
                  </p>
                  <p className="text-sm font-mono" style={{ color: "var(--neutral-900)" }}>
                    var(--brand-600)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* On Dark */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#0F1117",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div className="flex items-center justify-center mb-8 py-8">
              <div style={{ color: "#FFFFFF" }}>
                <Logo size={48} color="#FFFFFF" />
              </div>
            </div>
            <div className="pt-6" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <p className="text-sm mb-4" style={{ color: "#FFFFFF", fontWeight: 500 }}>
                Logo on Dark Backgrounds
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    Hex
                  </p>
                  <p className="text-sm font-mono" style={{ color: "#FFFFFF" }}>
                    #FFFFFF
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    Usage
                  </p>
                  <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                    Dark UI themes, code blocks
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Usage Guidelines
        </h2>

        <div className="grid grid-cols-2 gap-8">
          {/* Do's */}
          <div>
            <div
              className="px-4 py-2 rounded-lg inline-block mb-4"
              style={{ backgroundColor: "rgba(14, 169, 113, 0.1)" }}
            >
              <p className="text-sm" style={{ color: "#0EA971", fontWeight: 500 }}>
                ✓ Do
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#0EA971" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Use the logo on clean, uncluttered backgrounds
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#0EA971" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Maintain minimum clear space around the logo
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#0EA971" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Scale proportionally to maintain aspect ratio
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#0EA971" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Use white version on dark backgrounds (#0F1117 or darker)
                </p>
              </li>
            </ul>
          </div>

          {/* Don'ts */}
          <div>
            <div
              className="px-4 py-2 rounded-lg inline-block mb-4"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
            >
              <p className="text-sm" style={{ color: "#DC2626", fontWeight: 500 }}>
                ✗ Don't
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#DC2626" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Don't alter the logo color or add gradients
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#DC2626" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Don't stretch, skew, or rotate the logo
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#DC2626" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Don't place the logo on busy or low-contrast backgrounds
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg" style={{ color: "#DC2626" }}>•</span>
                <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                  Don't add effects like drop shadows or outlines
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Implementation */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Developer Implementation
        </h2>
        <p
          className="text-base mb-6"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Import and use the Logo component across your application. The muted purple (#5B5BB3) 
          automatically applies for a premium, enterprise-grade aesthetic.
        </p>

        <CodeBlock>
{`import { Logo } from "./components/Logo";

// Default size (32px) with brand color
<Logo />

// Custom sizes
<Logo size={24} />  // Small
<Logo size={48} />  // Medium  
<Logo size={64} />  // Large

// White version for dark backgrounds
<Logo size={48} color="#FFFFFF" />

// The brand color is intentionally muted:
// Primary: #5B5BB3 (var(--brand-600))
// This conveys sophistication and premium quality
// suitable for B2B SaaS platforms`}
        </CodeBlock>
      </div>

      {/* Favicon */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Favicon
        </h2>
        <p
          className="text-base mb-8"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          For favicons, use the icon-only version without text. The 16px icon maintains perfect 
          readability even at small sizes in browser tabs and notifications.
        </p>

        <div
          className="p-12 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex items-center gap-12">
            <div className="flex-1">
              <p className="text-sm mb-6" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                Browser Tab Preview
              </p>
              <div 
                className="inline-flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: "var(--neutral-100)",
                  border: "1px solid var(--neutral-200)",
                }}
              >
                <LogoIcon size={16} />
                <span className="text-sm" style={{ color: "var(--neutral-700)" }}>
                  Ordo CRM • Dashboard
                </span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-sm mb-4" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
                Usage Examples
              </p>
              <CodeBlock>
{`import { LogoIcon } from "./components/LogoIcon";

// Favicon (icon only, no text)
<LogoIcon size={16} />

// Notifications, avatars
<LogoIcon size={24} />
<LogoIcon size={32} />`}
              </CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}