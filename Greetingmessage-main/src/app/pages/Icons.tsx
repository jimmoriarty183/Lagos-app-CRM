import { useState } from "react";
import {
  Search,
  Settings,
  User,
  Home,
  FileText,
  Mail,
  Calendar,
  Bell,
  Heart,
  Star,
  Plus,
  Minus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Info as InfoIcon,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import { CodeBlock } from "../components/CodeBlock";

const IconGrid = ({ icons, label }: { icons: any[]; label: string }) => {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
        {label}
      </p>
      <div className="grid grid-cols-6 gap-4">
        {icons.map(({ Icon, name }) => (
          <div
            key={name}
            className="p-4 rounded-lg flex flex-col items-center gap-2 cursor-pointer transition-all duration-200"
            style={{
              border: "1px solid var(--neutral-200)",
              backgroundColor: hoveredIcon === name ? "var(--brand-50)" : "transparent",
              transform: hoveredIcon === name ? "translateY(-2px)" : "translateY(0)",
            }}
            onMouseEnter={() => setHoveredIcon(name)}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <Icon
              className="w-5 h-5 transition-all duration-200"
              style={{
                color: hoveredIcon === name ? "var(--brand-600)" : "var(--neutral-700)",
              }}
              strokeWidth={2}
            />
            <span
              className="text-xs text-center transition-colors duration-200"
              style={{
                color: hoveredIcon === name ? "var(--brand-600)" : "var(--neutral-600)",
                fontWeight: hoveredIcon === name ? 500 : 400,
              }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Icons() {
  const commonIcons = [
    { Icon: Search, name: "Search" },
    { Icon: Settings, name: "Settings" },
    { Icon: User, name: "User" },
    { Icon: Bell, name: "Bell" },
    { Icon: Mail, name: "Mail" },
    { Icon: Calendar, name: "Calendar" },
  ];

  const fileIcons = [
    { Icon: FileText, name: "File" },
    { Icon: Download, name: "Download" },
    { Icon: Zap, name: "Zap" },
    { Icon: Activity, name: "Activity" },
  ];

  const actionIcons = [
    { Icon: Plus, name: "Plus" },
    { Icon: Minus, name: "Minus" },
    { Icon: X, name: "Close" },
    { Icon: Check, name: "Check" },
    { Icon: CheckCircle2, name: "CheckCircle2" },
    { Icon: AlertTriangle, name: "AlertTriangle" },
  ];

  const navigationIcons = [
    { Icon: ChevronRight, name: "Right" },
    { Icon: ChevronLeft, name: "Left" },
    { Icon: ChevronDown, name: "Down" },
    { Icon: ChevronUp, name: "Up" },
    { Icon: ArrowRight, name: "Arrow R" },
    { Icon: ArrowLeft, name: "Arrow L" },
  ];

  const statusIcons = [
    { Icon: CheckCircle2, name: "Success" },
    { Icon: AlertCircle, name: "Error" },
    { Icon: InfoIcon, name: "Info" },
    { Icon: Heart, name: "Heart" },
    { Icon: Star, name: "Star" },
  ];

  const analyticsIcons = [
    { Icon: Home, name: "Home" },
    { Icon: BarChart3, name: "Chart" },
    { Icon: TrendingUp, name: "Trending" },
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
          Icons
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          We use Lucide Icons—a clean, consistent icon library with 1000+ icons. All icons are
          designed on a 24px grid with 2px stroke weight. Hover to see the interactive states.
        </p>
      </div>

      {/* Principles */}
      <div
        className="p-8 rounded-xl"
        style={{
          backgroundColor: "var(--brand-50)",
          border: "1px solid var(--brand-200)",
        }}
      >
        <h3
          className="text-2xl mb-6"
          style={{ color: "var(--neutral-900)", fontWeight: 600 }}
        >
          Icon Principles
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Consistent sizing
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
              Use 16px for inline icons, 20px for buttons, 24px for standalone icons. Never
              use arbitrary sizes.
            </p>
          </div>
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Semantic meaning
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
              Icons should reinforce text, not replace it. Always include accessible labels
              for screen readers.
            </p>
          </div>
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Interactive feedback
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
              Icons should change color on hover to indicate interactivity. Use brand-600
              for active states.
            </p>
          </div>
          <div>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Align with text
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
              When pairing with text, icons should be vertically centered and have consistent
              spacing (8px or 12px gap).
            </p>
          </div>
        </div>
      </div>

      {/* Common Icons */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Common Icons
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <IconGrid icons={commonIcons} label="Frequently Used" />
        </div>
      </div>

      {/* Action Icons */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Actions
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <IconGrid icons={actionIcons} label="User Actions" />
        </div>
      </div>

      {/* File Icons */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Files & Content
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <IconGrid icons={fileIcons} label="File Operations" />
        </div>
      </div>

      {/* Navigation Icons */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Navigation
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <IconGrid icons={navigationIcons} label="Directional" />
        </div>
      </div>

      {/* Status Icons */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Status & Feedback
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <IconGrid icons={statusIcons} label="Status Indicators" />
        </div>
      </div>

      {/* Analytics Icons */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Analytics & UI
        </h2>
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <IconGrid icons={analyticsIcons} label="Interface Elements" />
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
          Icon Sizes
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Standard sizes for different contexts.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex items-center gap-8 mb-8">
            <div className="text-center">
              <Settings className="w-4 h-4 mx-auto mb-2" style={{ color: "var(--neutral-700)" }} strokeWidth={2} />
              <p className="text-xs" style={{ color: "var(--neutral-600)" }}>16px</p>
              <p className="text-xs" style={{ color: "var(--neutral-500)" }}>Inline</p>
            </div>
            <div className="text-center">
              <Settings className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--neutral-700)" }} strokeWidth={2} />
              <p className="text-xs" style={{ color: "var(--neutral-600)" }}>20px</p>
              <p className="text-xs" style={{ color: "var(--neutral-500)" }}>Buttons</p>
            </div>
            <div className="text-center">
              <Settings className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--neutral-700)" }} strokeWidth={2} />
              <p className="text-xs" style={{ color: "var(--neutral-600)" }}>24px</p>
              <p className="text-xs" style={{ color: "var(--neutral-500)" }}>Standard</p>
            </div>
            <div className="text-center">
              <Settings className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--neutral-700)" }} strokeWidth={2} />
              <p className="text-xs" style={{ color: "var(--neutral-600)" }}>32px</p>
              <p className="text-xs" style={{ color: "var(--neutral-500)" }}>Large</p>
            </div>
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--neutral-700)" }} strokeWidth={2} />
              <p className="text-xs" style={{ color: "var(--neutral-600)" }}>48px</p>
              <p className="text-xs" style={{ color: "var(--neutral-500)" }}>Hero</p>
            </div>
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`import { Settings } from "lucide-react";

// Inline with text (16px)
<Settings className="w-4 h-4" strokeWidth={2} />

// In buttons (20px)
<Settings className="w-5 h-5" strokeWidth={2} />

// Standalone (24px)
<Settings className="w-6 h-6" strokeWidth={2} />

// Large emphasis (32px)
<Settings className="w-8 h-8" strokeWidth={2} />

// Hero sections (48px)
<Settings className="w-12 h-12" strokeWidth={2} />`}
            </CodeBlock>
          </div>
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
          {/* Button with icon */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Buttons with Icons
            </p>
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                className="px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200"
                style={{
                  backgroundColor: "var(--brand-600)",
                  color: "#FFFFFF",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Plus className="w-5 h-5" strokeWidth={2} />
                Create New
              </button>
              <button
                className="px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200"
                style={{
                  backgroundColor: "var(--neutral-100)",
                  color: "var(--neutral-900)",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--neutral-200)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--neutral-100)";
                }}
              >
                <Download className="w-5 h-5" strokeWidth={2} />
                Download
              </button>
              <button
                className="px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 group"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--neutral-700)",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--neutral-100)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Learn More
                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2} />
              </button>
            </div>
            <CodeBlock>
{`<button className="group">
  <Plus className="w-5 h-5" strokeWidth={2} />
  Create New
</button>

/* Animated arrow on hover */
<button className="group">
  Learn More
  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
</button>`}
            </CodeBlock>
          </div>

          {/* Input with icon */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Input with Icon
            </p>
            <div className="max-w-md mb-6">
              <div className="relative">
                <Search
                  className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: "var(--neutral-500)" }}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-12 pr-4 py-2.5 rounded-lg transition-all duration-200 focus:border-brand-600"
                  style={{
                    border: "1px solid var(--neutral-200)",
                    color: "var(--neutral-900)",
                  }}
                />
              </div>
            </div>
            <CodeBlock>
{`<div className="relative">
  <Search className="w-5 h-5 absolute left-4 top-1/2" />
  <input className="pl-12 focus:border-brand-600" />
</div>`}
            </CodeBlock>
          </div>

          {/* Icon-only button */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Icon-Only Buttons
            </p>
            <div className="flex gap-3 mb-6">
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-brand-50 group"
                style={{
                  backgroundColor: "var(--neutral-100)",
                  color: "var(--neutral-700)",
                }}
                aria-label="Edit"
              >
                <Edit className="w-5 h-5 transition-colors duration-200 group-hover:text-brand-600" strokeWidth={2} />
              </button>
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-error-50 group"
                style={{
                  backgroundColor: "var(--neutral-100)",
                  color: "var(--neutral-700)",
                }}
                aria-label="Delete"
              >
                <Trash2 className="w-5 h-5 transition-colors duration-200 group-hover:text-error-500" strokeWidth={2} />
              </button>
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-brand-50 group"
                style={{
                  backgroundColor: "var(--neutral-100)",
                  color: "var(--neutral-700)",
                }}
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 transition-all duration-200 group-hover:text-brand-600 group-hover:rotate-45" strokeWidth={2} />
              </button>
            </div>
            <CodeBlock>
{`/* Hover color change */
<button className="group" aria-label="Edit">
  <Edit className="group-hover:text-brand-600 transition-colors" />
</button>

/* Hover with rotation */
<button className="group" aria-label="Settings">
  <Settings className="group-hover:rotate-45 transition-all" />
</button>`}
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
              Always add hover states for interactive icons
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Use color transitions (neutral → brand-600) and subtle animations to indicate
              interactivity. This provides clear feedback to users.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Include aria-label for icon-only buttons
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Screen readers need text alternatives. Use aria-label or sr-only text for buttons
              that only contain icons.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Match icon color to context
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Use neutral-700 for default states, brand-600 for primary actions, error-500 for
              destructive actions. Icons inherit hierarchy from color.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}