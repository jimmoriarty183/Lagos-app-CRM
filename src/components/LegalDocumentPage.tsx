import Link from "next/link";
import { PublicFooter } from "./PublicFooter";

type Section = {
  title: string;
  paragraphs: string[];
};

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: Section[];
};

export default function LegalDocumentPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  sections,
}: Props) {
  return (
    <div
      className="flex min-h-screen flex-col bg-[#f7fafc] dark:bg-[var(--bg-app)] text-slate-900 dark:text-white"
    >
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-600 dark:text-white/70 shadow-sm transition hover:text-[var(--brand-600)]"
          >
            Back to login
          </Link>

          <article className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
            <div className="border-b border-slate-200 dark:border-white/10 bg-[linear-gradient(135deg,rgba(219,234,254,0.75),rgba(236,253,245,0.7))] px-6 py-8 sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-white/55">
                {eyebrow}
              </p>
              <h2 className="mt-3 !text-3xl font-semibold !leading-[1.14] tracking-tight text-slate-950 dark:text-white sm:!text-4xl">
                {title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-white/80">
                {intro}
              </p>
              <p className="mt-4 text-sm font-medium text-slate-500 dark:text-white/55">
                Last updated: {updatedAt}
              </p>
            </div>

            <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
              {sections.map((section, index) => (
                <section
                  key={section.title}
                  className={
                    index === 0 ? "" : "border-t border-slate-100 dark:border-white/[0.06] pt-8"
                  }
                >
                  <h3 className="!text-[1.375rem] font-semibold tracking-tight text-slate-950 dark:text-white sm:!text-2xl">
                    {section.title}
                  </h3>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 dark:text-white/80 sm:text-base">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
