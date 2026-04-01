import { useState } from "react";
import { Check, Copy } from "lucide-react";

export const CodeBlock = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mt-4 p-5 rounded-xl font-mono text-sm overflow-x-auto relative group"
      style={{
        backgroundColor: "#1A1D2E",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: copied ? "rgba(14, 169, 113, 0.1)" : "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          opacity: 0,
        }}
        onMouseEnter={(e) => {
          if (!copied) {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.outline = "2px solid var(--brand-500)";
          e.currentTarget.style.outlineOffset = "2px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = "none";
        }}
      >
        {copied ? (
          <Check className="w-4 h-4" style={{ color: "#0EA971" }} strokeWidth={2} />
        ) : (
          <Copy className="w-4 h-4" style={{ color: "#E8E9ED" }} strokeWidth={2} />
        )}
      </button>
      <style>{`
        .group:hover button {
          opacity: 1 !important;
        }
      `}</style>
      <pre style={{ color: "#E8E9ED", paddingRight: "3rem" }}>{children}</pre>
    </div>
  );
};