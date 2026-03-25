import type { SupportAttachmentRecord } from "@/lib/support/types";
import { formatSupportDate } from "@/lib/support/utils";

function formatFileSize(size: number | null) {
  if (!size || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportAttachmentsPanel({
  items,
  downloadHrefBuilder,
}: {
  items: SupportAttachmentRecord[];
  downloadHrefBuilder: (attachmentId: string) => string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No attachments.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <a
              key={item.id}
              href={downloadHrefBuilder(item.id)}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-100"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{item.fileName}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {item.mimeType || "file"} - {formatFileSize(item.fileSize)} - {formatSupportDate(item.createdAt)}
                </div>
              </div>
              <span className="ml-3 text-xs font-semibold text-slate-600">Download</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
