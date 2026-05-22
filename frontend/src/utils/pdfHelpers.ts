import { jsPDF } from "jspdf";

export type InvoicePDF = {
  taxRate?: number;
  taxAmount?: number;
};

// ⚠️ ENPÒTAN: dwe gen "export"
export const drawTaxLine = (
  doc: jsPDF,
  invoice: InvoicePDF,
  y: number,
  money: (n?: number) => string
): number => {
  const taxRate = invoice.taxRate ?? 0;
  const taxAmount = invoice.taxAmount ?? 0;

  doc.text(`Tax (${taxRate}%):`, 5, y);
  doc.text(money(taxAmount), 75, y, { align: "right" });

  return y + 5;
};