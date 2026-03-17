import Link from "next/link";

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
    <main className="min-h-screen bg-[#f7fafc] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/login"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:text-slate-900"
        >
          Back to login
        </Link>

        <article className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(219,234,254,0.75),rgba(236,253,245,0.7))] px-6 py-8 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {intro}
            </p>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Last updated: {updatedAt}
            </p>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-slate-950">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
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
  );
}
