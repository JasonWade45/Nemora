export function downloadCsv(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    "\uFEFF" + headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport(html: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        * { font-family: 'Segoe UI', Tahoma, sans-serif; }
        body { padding: 40px; direction: rtl; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 8px; }
        .subtitle { text-align: center; color: #666; font-size: 13px; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: right; font-size: 13px; }
        th { background: #f1f5f9; font-weight: 600; }
        tr:nth-child(even) { background: #f8fafc; }
        .stat-row { display: flex; gap: 20px; justify-content: center; margin-bottom: 20px; }
        .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 24px; text-align: center; }
        .stat .num { font-size: 28px; font-weight: 800; color: #0f172a; }
        .stat .label { font-size: 11px; color: #64748b; margin-top: 4px; }
        .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #94a3b8; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      ${html}
      <div class="footer">Nemora CRM — ${new Date().toLocaleDateString("ar-EG")}</div>
    </body>
    </html>
  `);
  w.document.close();
  setTimeout(() => w.print(), 500);
}
