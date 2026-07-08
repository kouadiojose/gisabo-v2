// Export Excel natif (.xlsx) avec en-têtes stylisés, filtres et multi-onglets.
// exceljs est chargé dynamiquement pour ne pas alourdir le bundle principal.

export interface SheetSpec {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number | boolean | null | undefined>[];
}

export async function exportToXlsx(
  filename: string,
  sheets: SheetSpec[],
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "GISABO";
  wb.created = new Date();

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = s.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 20,
    }));
    ws.addRows(s.rows);

    // En-tête stylisé (fond bleu GISABO, texte blanc gras)
    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B5E9B" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    if (s.columns.length > 0) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: s.columns.length },
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
