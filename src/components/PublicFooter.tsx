import Link from "next/link";
import { BrandIcon } from "./Brand";

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund Policy" },
];

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-slate-300/80 bg-white/95 shadow-[inset_0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <BrandIcon size={30} />
              <p className="text-[1.125rem] font-semibold tracking-tight text-slate-900">
                Ordo
              </p>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              CRM for managing orders and customers
            </p>
          </div>

          <nav
            aria-label="Legal and contact links"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end"
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700 transition-colors hover:text-[var(--brand-600)]"
              >
                {link.label}
              </Link>
            ))}
            <span className="hidden text-slate-300 md:inline" aria-hidden>
              |
            </span>
            <a
              href="mailto:support@ordo.uno"
              className="text-sm font-medium text-slate-700 transition-colors hover:text-[var(--brand-600)]"
            >
              support@ordo.uno
            </a>
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-2 text-xs font-medium text-slate-600">
          (c) 2026 ORDO
        </div>
      </div>
    </footer>
  );
}
