// Export d'un tableau en CSV compatible Excel (UTF-8 BOM + séparateur ';').
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const sep = ";";
  const lines = [
    headers.map(esc).join(sep),
    ...rows.map((r) => r.map(esc).join(sep)),
  ];
  // BOM pour qu'Excel ouvre correctement les accents en UTF-8
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
