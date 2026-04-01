import { Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { FOCUS_STYLES } from "../utils/constants";

export default function Forms() {
  const [showPassword, setShowPassword] = useState(false);
  const [checked, setChecked] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState("option1");

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
          Forms
        </h1>
        <p
          className="text-xl max-w-3xl"
          style={{
            color: "var(--neutral-600)",
            lineHeight: "1.7",
          }}
        >
          Form elements should be clear, accessible, and forgiving. Good forms reduce friction
          and guide users to successful completion.
        </p>
      </div>

      {/* Text Input */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Text Input
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Standard input for single-line text entry.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="max-w-md space-y-6 mb-8">
            {/* Default */}
            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--neutral-700)", fontWeight: 500 }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 rounded-lg transition-all"
                style={{
                  border: "1px solid var(--neutral-200)",
                  color: "var(--neutral-900)",
                  backgroundColor: "#FFFFFF",
                }}
              />
            </div>

            {/* With helper text */}
            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--neutral-700)", fontWeight: 500 }}
              >
                Username
              </label>
              <input
                type="text"
                placeholder="johndoe"
                className="w-full px-4 py-2.5 rounded-lg"
                style={{
                  border: "1px solid var(--neutral-200)",
                  color: "var(--neutral-900)",
                  backgroundColor: "#FFFFFF",
                }}
              />
              <p
                className="text-sm mt-2"
                style={{ color: "var(--neutral-500)" }}
              >
                This will be your public username
              </p>
            </div>

            {/* Error state */}
            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--neutral-700)", fontWeight: 500 }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg"
                style={{
                  border: "1px solid var(--error-500)",
                  color: "var(--neutral-900)",
                  backgroundColor: "#FFFFFF",
                }}
              />
              <p
                className="text-sm mt-2"
                style={{ color: "var(--error-500)" }}
              >
                Password must be at least 8 characters
              </p>
            </div>

            {/* Disabled */}
            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--neutral-500)", fontWeight: 500 }}
              >
                Organization
              </label>
              <input
                type="text"
                placeholder="Acme Inc."
                disabled
                className="w-full px-4 py-2.5 rounded-lg cursor-not-allowed"
                style={{
                  border: "1px solid var(--neutral-200)",
                  color: "var(--neutral-500)",
                  backgroundColor: "var(--neutral-100)",
                }}
              />
            </div>
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="text-sm mb-3" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
              Specifications
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Height</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>40px</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Padding</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>10px 16px</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Border</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>1px solid</p>
              </div>
              <div>
                <p style={{ color: "var(--neutral-500)" }}>Border Radius</p>
                <p className="font-mono" style={{ color: "var(--neutral-900)" }}>10px</p>
              </div>
            </div>
            <CodeBlock>
{`input {
  padding: 10px 16px;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius);
  color: var(--neutral-900);
  background-color: #FFFFFF;
  font-size: 0.9375rem;
  transition: border-color 150ms;
}

input:focus {
  outline: none;
  border-color: var(--brand-600);
}

input:disabled {
  background-color: var(--neutral-100);
  color: var(--neutral-500);
  cursor: not-allowed;
}

input.error {
  border-color: var(--error-500);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Textarea
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          For multi-line text input.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="max-w-md mb-8">
            <label
              className="block text-sm mb-2"
              style={{ color: "var(--neutral-700)", fontWeight: 500 }}
            >
              Description
            </label>
            <textarea
              placeholder="Tell us more about your project..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg resize-none"
              style={{
                border: "1px solid var(--neutral-200)",
                color: "var(--neutral-900)",
                backgroundColor: "#FFFFFF",
              }}
            />
            <p
              className="text-sm mt-2"
              style={{ color: "var(--neutral-500)" }}
            >
              Maximum 500 characters
            </p>
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`textarea {
  padding: 12px 16px;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius);
  color: var(--neutral-900);
  background-color: #FFFFFF;
  resize: vertical;
  min-height: 100px;
}

textarea:focus {
  outline: none;
  border-color: var(--brand-600);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Select */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Select
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          Dropdown selection from a list of options.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="max-w-md mb-8">
            <label
              className="block text-sm mb-2"
              style={{ color: "var(--neutral-700)", fontWeight: 500 }}
            >
              Country
            </label>
            <select
              className="w-full px-4 py-2.5 rounded-lg appearance-none cursor-pointer"
              style={{
                border: "1px solid var(--neutral-200)",
                color: "var(--neutral-900)",
                backgroundColor: "#FFFFFF",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23868C98' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 16px center",
                paddingRight: "40px",
              }}
            >
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Canada</option>
              <option>Australia</option>
              <option>Germany</option>
            </select>
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`select {
  padding: 10px 40px 10px 16px;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius);
  color: var(--neutral-900);
  background-color: #FFFFFF;
  appearance: none;
  cursor: pointer;
  background-image: url("chevron-down.svg");
  background-repeat: no-repeat;
  background-position: right 16px center;
}

select:focus {
  outline: none;
  border-color: var(--brand-600);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Checkbox */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Checkbox
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          For binary choices or multiple selections.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="max-w-md space-y-4 mb-8">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-5 h-5 rounded flex items-center justify-center transition-all"
                style={{
                  border: checked ? "none" : "2px solid var(--neutral-300)",
                  backgroundColor: checked ? "var(--brand-600)" : "transparent",
                }}
                onClick={() => setChecked(!checked)}
              >
                {checked && <Check className="w-3.5 h-3.5" color="#FFFFFF" strokeWidth={3} />}
              </div>
              <span style={{ color: "var(--neutral-900)" }}>
                I agree to the terms and conditions
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{
                  border: "2px solid var(--neutral-300)",
                  backgroundColor: "transparent",
                }}
              >
              </div>
              <span style={{ color: "var(--neutral-900)" }}>
                Send me marketing emails
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{
                  border: "2px solid var(--neutral-300)",
                  backgroundColor: "var(--neutral-100)",
                }}
              >
              </div>
              <span style={{ color: "var(--neutral-500)" }}>
                Disabled option
              </span>
            </label>
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--neutral-300);
  border-radius: 4px;
  transition: all 150ms;
}

.checkbox:checked {
  background-color: var(--brand-600);
  border-color: var(--brand-600);
}

.checkbox:disabled {
  background-color: var(--neutral-100);
  cursor: not-allowed;
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Radio */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Radio Button
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          For selecting one option from a group.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="max-w-md mb-8">
            <p className="text-sm mb-4" style={{ color: "var(--neutral-700)", fontWeight: 500 }}>
              Select a plan
            </p>
            <div className="space-y-3">
              {["option1", "option2", "option3"].map((option) => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    style={{
                      border: selectedRadio === option ? "2px solid var(--brand-600)" : "2px solid var(--neutral-300)",
                    }}
                    onClick={() => setSelectedRadio(option)}
                  >
                    {selectedRadio === option && (
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: "var(--brand-600)" }}
                      />
                    )}
                  </div>
                  <span style={{ color: "var(--neutral-900)" }}>
                    {option === "option1" && "Starter - $9/month"}
                    {option === "option2" && "Professional - $29/month"}
                    {option === "option3" && "Enterprise - $99/month"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.radio {
  width: 20px;
  height: 20px;
  border: 2px solid var(--neutral-300);
  border-radius: 50%;
  transition: all 150ms;
}

.radio:checked {
  border-color: var(--brand-600);
}

.radio:checked::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--brand-600);
}`}
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* Toggle/Switch */}
      <div>
        <h2
          className="text-3xl mb-6"
          style={{
            color: "var(--neutral-900)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Toggle Switch
        </h2>
        <p className="mb-8" style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
          For instant on/off settings that take effect immediately.
        </p>
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--neutral-200)",
          }}
        >
          <div className="max-w-md space-y-4 mb-8">
            {[true, false, false].map((isOn, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span style={{ color: "var(--neutral-900)" }}>
                  {idx === 0 && "Email notifications"}
                  {idx === 1 && "Push notifications"}
                  {idx === 2 && "SMS notifications"}
                </span>
                <button
                  className="w-11 h-6 rounded-full transition-all relative"
                  style={{
                    backgroundColor: isOn ? "var(--brand-600)" : "var(--neutral-300)",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                    style={{
                      left: isOn ? "calc(100% - 20px)" : "4px",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-8" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <CodeBlock>
{`.switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: var(--neutral-300);
  transition: background-color 150ms;
  position: relative;
}

.switch:checked {
  background-color: var(--brand-600);
}

.switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #FFFFFF;
  position: absolute;
  top: 4px;
  left: 4px;
  transition: left 150ms;
}

.switch:checked .switch-thumb {
  left: calc(100% - 20px);
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
              Always use labels
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Every input needs a label. Placeholders are not labels—they disappear when users
              type and can't be referenced for context.
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Provide helpful error messages
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Don't just say "Invalid input". Tell users exactly what's wrong and how to fix it.
              "Password must be at least 8 characters" is better than "Invalid password".
            </p>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid var(--neutral-200)" }}>
            <p className="mb-2" style={{ color: "var(--neutral-900)", fontWeight: 500 }}>
              Use appropriate input types
            </p>
            <p style={{ color: "var(--neutral-600)", lineHeight: "1.65" }}>
              Use type="email" for emails, type="tel" for phones. This enables better mobile
              keyboards and built-in validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}