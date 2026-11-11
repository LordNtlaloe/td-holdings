/** Downloads rows as a CSV file (UTF-8 with BOM so Excel reads it correctly). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
    const escape = (value: string | number) => {
        const text = String(value);
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}