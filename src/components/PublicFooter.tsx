import Link from "next/link";
import { BrandIcon } from "./Brand";

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
];

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-slate-300/80 bg-white/95 shadow-[inset_0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <BrandIcon size={30} />
              <p className="text-[1.125rem] font-semibold tracking-tight text-slate-900">
                Ordo
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              CRM for managing orders and customers
            </p>
          </div>

          <nav
            aria-label="Legal links"
            className="flex flex-col gap-3 md:items-end"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Legal
            </p>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700 transition-colors hover:text-[var(--brand-600)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-4 text-xs font-medium text-slate-600">
          (c) 2026 ORDO
        </div>
      </div>
    </footer>
  );
}
