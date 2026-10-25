export type CsvValue = string | number | null | undefined | boolean;

function escapeCell(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return /[",\n\r]/.test(text) ? `"${text}"` : text;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
