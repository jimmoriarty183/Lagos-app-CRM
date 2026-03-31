import { CodeBlock } from "../components/CodeBlock";
import { CheckCircle2, Info, AlertCircle, X, Bell } from "lucide-react";

export default function Components() {
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
          UI Elements
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Essential interface components for building consistent user experiences. Each element
          follows our design principles and accessibility standards.
        </p>
      </div>

      {/* Cards */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Cards
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Containers for grouping related content and actions.
        </p>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Basic Card */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--neutral-200)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <h4 className="mb-3" style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
                Basic Card
              </h4>
              <p className="text-sm mb-4" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                Clean and simple card with title and description. Perfect for content grouping.
              </p>
              <button
                className="text-sm"
                style={{ color: "var(--brand-600)", fontWeight: 500 }}
              >
                Learn more →
              </button>
            </div>

            {/* Elevated Card */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--neutral-200)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <h4 className="mb-3" style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
                Elevated Card
              </h4>
              <p className="text-sm mb-4" style={{ color: "var(--neutral-700)", lineHeight: "1.6" }}>
                Stronger shadow creates visual hierarchy. Use for important content.
              </p>
              <button
                className="text-sm"
                style={{ color: "var(--brand-600)", fontWeight: 500 }}
              >
                View details →
              </button>
            </div>
          </div>

          {/* Specs */}
          <div
            className="p-8 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
              Card Specifications
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Padding</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>24px</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Border Radius</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>12px</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Border</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>1px neutral-200</p>
              </div>
            </div>
            <CodeBlock>
{`.card {
  padding: var(--space-6);
  border: 1px solid var(--neutral-200);
  border-radius: 12px;
  background-color: #FFFFFF;
}

.card-elevated {
  box-shadow: var(--shadow-md);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--neutral-900);
  margin-bottom: var(--space-3);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Alerts
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Contextual feedback messages for different scenarios.
        </p>
        <div className="space-y-4">
          {/* Success */}
          <div
            className="p-4 rounded-lg flex items-start gap-3"
            style={{
              backgroundColor: "var(--success-50)",
              border: "1px solid #0EA971",
            }}
          >
            <CheckCircle2
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: "#0EA971" }}
              strokeWidth={2}
            />
            <div className="flex-1">
              <p className="text-sm mb-1" style={{ color: "#0EA971", fontWeight: 500 }}>
                Success
              </p>
              <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.5" }}>
                Your changes have been saved successfully.
              </p>
            </div>
            <button className="flex-shrink-0" style={{ color: "#0EA971" }}>
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Info */}
          <div
            className="p-4 rounded-lg flex items-start gap-3"
            style={{
              backgroundColor: "var(--brand-50)",
              border: "1px solid var(--brand-600)",
            }}
          >
            <Info
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: "var(--brand-600)" }}
              strokeWidth={2}
            />
            <div className="flex-1">
              <p className="text-sm mb-1" style={{ color: "var(--brand-600)", fontWeight: 500 }}>
                Information
              </p>
              <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.5" }}>
                A new version is available. Update to get the latest features.
              </p>
            </div>
            <button className="flex-shrink-0" style={{ color: "var(--brand-600)" }}>
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Warning */}
          <div
            className="p-4 rounded-lg flex items-start gap-3"
            style={{
              backgroundColor: "var(--warning-50)",
              border: "1px solid #F5A524",
            }}
          >
            <AlertCircle
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: "#F5A524" }}
              strokeWidth={2}
            />
            <div className="flex-1">
              <p className="text-sm mb-1" style={{ color: "#F5A524", fontWeight: 500 }}>
                Warning
              </p>
              <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.5" }}>
                Your session will expire in 5 minutes. Please save your work.
              </p>
            </div>
            <button className="flex-shrink-0" style={{ color: "#F5A524" }}>
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Error */}
          <div
            className="p-4 rounded-lg flex items-start gap-3"
            style={{
              backgroundColor: "var(--error-50)",
              border: "1px solid var(--error-500)",
            }}
          >
            <AlertCircle
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: "var(--error-500)" }}
              strokeWidth={2}
            />
            <div className="flex-1">
              <p className="text-sm mb-1" style={{ color: "var(--error-500)", fontWeight: 500 }}>
                Error
              </p>
              <p className="text-sm" style={{ color: "var(--neutral-700)", lineHeight: "1.5" }}>
                Unable to process your request. Please try again.
              </p>
            </div>
            <button className="flex-shrink-0" style={{ color: "var(--error-500)" }}>
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div
          className="mt-6 p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <CodeBlock>
{`.alert {
  padding: 16px;
  border-radius: var(--radius);
  border: 1px solid;
  display: flex;
  align-items: start;
  gap: 12px;
}

.alert-success {
  background-color: var(--success-50);
  border-color: var(--success-500);
  color: var(--success-500);
}

.alert-error {
  background-color: var(--error-50);
  border-color: var(--error-500);
  color: var(--error-500);
}

.alert-warning {
  background-color: var(--warning-50);
  border-color: var(--warning-500);
  color: var(--warning-500);
}`}
          </CodeBlock>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Badges
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Small labels for status, categories, or counts.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex flex-wrap gap-3 mb-8">
            <span
              className="px-3 py-1 rounded-md text-sm"
              style={{
                backgroundColor: "var(--neutral-100)",
                color: "var(--neutral-700)",
                fontWeight: 500,
              }}
            >
              Default
            </span>
            <span
              className="px-3 py-1 rounded-md text-sm"
              style={{
                backgroundColor: "var(--brand-50)",
                color: "var(--brand-700)",
                fontWeight: 500,
              }}
            >
              Primary
            </span>
            <span
              className="px-3 py-1 rounded-md text-sm"
              style={{
                backgroundColor: "var(--success-50)",
                color: "#0EA971",
                fontWeight: 500,
              }}
            >
              Success
            </span>
            <span
              className="px-3 py-1 rounded-md text-sm"
              style={{
                backgroundColor: "var(--warning-50)",
                color: "#C68400",
                fontWeight: 500,
              }}
            >
              Warning
            </span>
            <span
              className="px-3 py-1 rounded-md text-sm"
              style={{
                backgroundColor: "var(--error-50)",
                color: "var(--error-500)",
                fontWeight: 500,
              }}
            >
              Error
            </span>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.badge {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge-default {
  background-color: var(--neutral-100);
  color: var(--neutral-700);
}

.badge-primary {
  background-color: var(--brand-50);
  color: var(--brand-700);
}

.badge-success {
  background-color: var(--success-50);
  color: var(--success-500);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Tooltips */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Tooltips
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Contextual information on hover. Keep them brief and informative.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="flex gap-4 mb-8">
            <div className="relative inline-block">
              <button
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--neutral-100)",
                  color: "var(--neutral-900)",
                  fontWeight: 500,
                }}
              >
                Hover me
              </button>
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap pointer-events-none"
                style={{
                  backgroundColor: "var(--neutral-900)",
                  color: "#FFFFFF",
                }}
              >
                This is a tooltip
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                  style={{
                    backgroundColor: "var(--neutral-900)",
                    marginTop: "-4px",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.tooltip {
  position: absolute;
  padding: 8px 12px;
  background-color: var(--neutral-900);
  color: #FFFFFF;
  border-radius: var(--radius);
  font-size: 0.875rem;
  white-space: nowrap;
  z-index: 1000;
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: var(--neutral-900);
  transform: rotate(45deg);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Empty States */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Empty States
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Helpful messages when there's no content to display.
        </p>
        <div
          className="p-16 rounded-xl text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "var(--neutral-100)" }}
          >
            <Bell className="w-8 h-8" style={{ color: "var(--neutral-400)" }} strokeWidth={1.5} />
          </div>
          <h3 className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
            No notifications yet
          </h3>
          <p className="mb-6 max-w-sm mx-auto" style={{ color: "var(--neutral-600)", lineHeight: "1.6" }}>
            When you have new notifications, they'll appear here. Check back later.
          </p>
          <button
            className="px-6 py-3 rounded-lg"
            style={{
              backgroundColor: "var(--brand-600)",
              color: "#FFFFFF",
              fontWeight: 500,
            }}
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Loading States */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Loading States
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Skeleton screens and spinners for async content.
        </p>
        <div className="grid grid-cols-2 gap-6">
          {/* Skeleton */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--neutral-600)", fontWeight: 500 }}>
              Skeleton Loading
            </p>
            <div className="space-y-3">
              <div
                className="h-4 rounded"
                style={{ backgroundColor: "var(--neutral-200)", width: "60%" }}
              />
              <div
                className="h-4 rounded"
                style={{ backgroundColor: "var(--neutral-200)", width: "100%" }}
              />
              <div
                className="h-4 rounded"
                style={{ backgroundColor: "var(--neutral-200)", width: "80%" }}
              />
            </div>
          </div>

          {/* Spinner */}
          <div
            className="p-6 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--neutral-200)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full border-3 animate-spin"
              style={{
                borderColor: "var(--neutral-200)",
                borderTopColor: "var(--brand-600)",
                borderWidth: "3px",
              }}
            />
          </div>
        </div>

        <div
          className="mt-6 p-8 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <CodeBlock>
{`.skeleton {
  background-color: var(--neutral-200);
  border-radius: 4px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--neutral-200);
  border-top-color: var(--brand-600);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}`}
          </CodeBlock>
        </div>
      </div>

      {/* Dividers */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Dividers
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Subtle separators for content organization.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <p style={{ color: "var(--neutral-900)" }}>Section 1</p>
          <div className="my-6" style={{ height: "1px", backgroundColor: "var(--neutral-200)" }} />
          <p style={{ color: "var(--neutral-900)" }}>Section 2</p>
          <div className="my-6" style={{ height: "1px", backgroundColor: "var(--neutral-200)" }} />
          <p style={{ color: "var(--neutral-900)" }}>Section 3</p>

          <div className="mt-8 pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.divider {
  height: 1px;
  background-color: var(--neutral-200);
  margin: var(--space-6) 0;
}`}
            </CodeBlock>
          </div>
        </div>
      </div>
    </div>
  );
}