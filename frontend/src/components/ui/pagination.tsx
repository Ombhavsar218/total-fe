import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

function pagesAround(current: number, total: number) {
  const pages: (number | "…")[] = [];
  if (total <= 7) {
    for (let index = 1; index <= total; index += 1) pages.push(index);
    return pages;
  }
  pages.push(1);
  if (current > 3) pages.push("…");
  for (let index = Math.max(2, current - 1); index <= Math.min(total - 1, current + 1); index += 1) {
    pages.push(index);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  className,
}: {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) {
    return total !== undefined ? (
      <p className="px-1 text-xs text-slate-400">{formatNumber(total)} records</p>
    ) : null;
  }

  const from = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to = pageSize && total !== undefined ? Math.min(page * pageSize, total) : undefined;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 px-1", className)}>
      <p className="text-xs text-slate-400">
        {total !== undefined && from !== undefined && to !== undefined ? (
          <>
            Showing <span className="font-semibold text-slate-600">{formatNumber(from)}</span>–
            <span className="font-semibold text-slate-600">{formatNumber(to)}</span> of{" "}
            <span className="font-semibold text-slate-600">{formatNumber(total)}</span>
          </>
        ) : (
          <>
            Page <span className="font-semibold text-slate-600">{page}</span> of {totalPages}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pagesAround(page, totalPages).map((item, index) =>
          item === "…" ? (
            <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPage(item)}
              className={cn(
                "grid size-8 place-items-center rounded-lg text-xs font-semibold transition",
                item === page
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
