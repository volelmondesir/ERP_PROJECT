import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import axios from "axios";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;

const API = "http://localhost:5000";

type Receipt = {
  id?: number;
  paymentId?: number;
  receiptNumber: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  cash?: number;
  applied?: number;
  change?: number;
  paymentDate?: string;
  username?: string;
  cashier?: string;
  subtotal?: number;
  taxAmount?: number;
  taxRate?: number;
  total?: number;
  items?: {
    name?: string;
    itemName?: string;
    quantity?: number;
    qty?: number;
    price?: number;
  }[];
};

type Company = {
  companyName?: string;
  address?: string;
  phone?: string;
  footerMessage?: string;
};

const ReceiptPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const itemsPerPage = 4;

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang((localStorage.getItem("lang") as LangType) || "en");
    };

    handleLanguageChange();
    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);
useEffect(() => {

  saveAuditLog({

  moduleName: "Cashier",

    submenuName: "Receipt",

    actionType: "VIEW PAGE",

  });

}, []);
  useEffect(() => {
    loadReceipts();
    loadCompany();
  }, []);

  const money = (v: any) => `$${Number(v || 0).toFixed(2)}`;

  const safe = (v: any) =>
    v === null || v === undefined ? "" : String(v).toLowerCase();

  const generateBarcode = (value: string) => {
    const canvas = document.createElement("canvas");

    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true,
    });

    return canvas.toDataURL("image/png");
  };

  const loadReceipts = async () => {
    try {
      const res = await fetch(`${API}/api/rcp/receipts`);
      const data = await res.json();

      setReceipts(Array.isArray(data.data) ? data.data : data);
    } catch (err) {
      console.log("LOAD RECEIPTS ERROR:", err);
      setReceipts([]);
    }
  };

  const loadCompany = async () => {
    try {
      const companyRes = await axios.get(`${API}/api/company`);
      setCompany(companyRes.data?.data || companyRes.data);
    } catch (err) {
      console.log("COMPANY LOAD ERROR 👉", err);
    }
  };

  const filtered = receipts.filter((r) => {
    const q = search.toLowerCase();

    return (
      safe(r.receiptNumber).includes(q) ||
      safe(r.invoiceNumber).includes(q) ||
      safe(r.customerName).includes(q) ||
      safe(r.username).includes(q) ||
      safe(r.cashier).includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  const currentData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const printReceipt = () => {
    window.print();
  };

  const previewReceipt = async (rowReceipt: Receipt) => {
    try {
      const res = await fetch(`${API}/api/receipts/${rowReceipt.receiptNumber}`);
      const detail = await res.json();

      if (!res.ok) {
        alert(detail.message || "Receipt load failed");
        return;
      }

      const mergedReceipt: Receipt = {
        ...detail,
        receiptNumber: detail.receiptNumber ?? rowReceipt.receiptNumber,
        invoiceNumber: detail.invoiceNumber ?? rowReceipt.invoiceNumber,
        customerName: detail.customerName ?? rowReceipt.customerName,
        amount: Number(detail.amount ?? rowReceipt.amount ?? 0),
        applied:
          detail.applied !== undefined && detail.applied !== null
            ? Number(detail.applied)
            : Number(rowReceipt.applied ?? rowReceipt.amount ?? 0),
        cash:
          detail.cash !== undefined && detail.cash !== null
            ? Number(detail.cash)
            : Number(rowReceipt.cash ?? rowReceipt.amount ?? 0),
        change:
          detail.change !== undefined && detail.change !== null
            ? Number(detail.change)
            : Number(rowReceipt.change ?? 0),
        paymentDate: detail.paymentDate ?? rowReceipt.paymentDate,
        username: detail.username ?? rowReceipt.username,
        cashier: detail.cashier ?? rowReceipt.cashier,
        subtotal: Number(detail.subtotal ?? rowReceipt.subtotal ?? 0),
        taxAmount: Number(detail.taxAmount ?? rowReceipt.taxAmount ?? 0),
        taxRate: Number(detail.taxRate ?? rowReceipt.taxRate ?? 0),
        total: Number(detail.total ?? rowReceipt.total ?? rowReceipt.amount ?? 0),
        items: detail.items ?? rowReceipt.items ?? [],
      };

      generatePDF(mergedReceipt);

      const applied = Number(mergedReceipt.applied ?? mergedReceipt.amount ?? 0);
      const cash = Number(mergedReceipt.cash ?? applied);
      const change = Number(mergedReceipt.change ?? Math.max(cash - applied, 0));
      const total = Number(mergedReceipt.total ?? mergedReceipt.amount ?? 0);
      const balance = Math.max(total - applied, 0);

      setReceipt({
        ...mergedReceipt,
        applied,
        cash,
        change,
        total,
        balance,
        barcode: generateBarcode(mergedReceipt.receiptNumber),
      });
    } catch (err) {
      console.log("PREVIEW ERROR:", err);
      alert("Receipt load failed");
    }
  };

  const generatePDF = (receipt: Receipt) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 220],
    });

    let y = 10;

    const center = (text?: string) => {
      doc.text(text || "", 40, y, { align: "center" });
      y += 5;
    };

    const right = (text: string) => {
      doc.text(text, 75, y, { align: "right" });
    };

    const subtotal = Number(receipt.subtotal || 0);
    const tax = Number(receipt.taxAmount || 0);
    const taxRate = Number(receipt.taxRate || 0);
    const total = Number(receipt.total || receipt.amount || 0);

    const applied =
      receipt.applied !== undefined && receipt.applied !== null
        ? Number(receipt.applied)
        : Number(receipt.amount || 0);

    const cash =
      receipt.cash !== undefined && receipt.cash !== null
        ? Number(receipt.cash)
        : applied;

    const change =
      receipt.change !== undefined && receipt.change !== null
        ? Number(receipt.change)
        : Math.max(cash - applied, 0);

    const balance = Math.max(total - applied, 0);

    center(company?.companyName || "STORE");
    center(company?.address || "");
    center(company?.phone || "");

    y += 3;

    const barcode = generateBarcode(receipt.receiptNumber);
    doc.addImage(barcode, "PNG", 15, y, 50, 14);
    y += 18;

    doc.line(5, y, 75, y);
    y += 5;

    doc.text(`Receipt: ${receipt.receiptNumber}`, 5, y);
    y += 5;

    doc.text(`Invoice: ${receipt.invoiceNumber}`, 5, y);
    y += 5;

    doc.text(`Customer: ${receipt.customerName}`, 5, y);
    y += 5;

    doc.text(`Cashier: ${receipt.cashier || receipt.username || "N/A"}`, 5, y);
    y += 5;

    doc.text(
      `Date: ${
        receipt.paymentDate
          ? new Date(receipt.paymentDate).toLocaleString()
          : "N/A"
      }`,
      5,
      y
    );

    y += 5;

    doc.line(5, y, 75, y);
    y += 5;

    if (!receipt.items || receipt.items.length === 0) {
      doc.text("No items", 5, y);
      y += 5;
    } else {
      receipt.items.forEach((item) => {
        const name = item.name || item.itemName || "";
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const price = Number(item.price || 0);
        const lineTotal = qty * price;

        const wrapped = doc.splitTextToSize(name, 55);

        doc.setFontSize(10);
        doc.text(wrapped, 5, y);
        y += wrapped.length * 5;

        doc.setFontSize(8);
        doc.text(`${qty} x ${money(price)}`, 5, y);
        right(money(lineTotal));

        doc.setFontSize(10);
        y += 6;
      });
    }

    doc.line(5, y, 75, y);
    y += 5;

    doc.text("Subtotal:", 5, y);
    right(money(subtotal));
    y += 5;

    doc.text(`Tax (${taxRate.toFixed(2)}%):`, 5, y);
    right(money(tax));
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    right(money(total));
    doc.setFont("helvetica", "normal");
    y += 6;

    doc.text("Applied:", 5, y);
    right(money(applied));
    y += 5;

    doc.text("Cash:", 5, y);
    right(money(cash));
    y += 5;

    doc.text("Balance:", 5, y);
    right(money(balance));
    y += 5;

    doc.text("Change:", 5, y);
    right(money(change));
    y += 6;

    doc.line(5, y, 75, y);
    y += 5;

    center(company?.footerMessage || "Thank you!");

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{t("receipts", "Receipts")}</h1>

            <p style={styles.subtitle}>
              {t("receiptssubtitle", "Search, preview and reprint receipts")}
            </p>
          </div>

          <button style={styles.refreshBtn} onClick={loadReceipts}>
            {t("refresh", "Refresh")}
          </button>
        </div>

        <input
          style={styles.search}
          placeholder={t("search", "Search...")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <div style={styles.tableWrap}>
          <table width="100%" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t("receipt", "Receipt")}</th>
                <th style={styles.th}>{t("invoice", "Invoice")}</th>
                <th style={styles.th}>{t("customer", "Customer")}</th>
                <th style={styles.th}>{t("amount", "Amount")}</th>
                <th style={styles.th}>{t("cash", "Cash")}</th>
                <th style={styles.th}>{t("change", "Change")}</th>
                <th style={styles.th}>{t("date", "Date")}</th>
                <th style={styles.th}>{t("cashier", "Cashier")}</th>
                <th style={styles.th}>{t("action", "Action")}</th>
              </tr>
            </thead>

            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={9} style={styles.empty}>
                    {t("noreceiptsfound", "No receipts found")}
                  </td>
                </tr>
              ) : (
                currentData.map((r, i) => {
                  const applied = r.applied ?? r.amount;
                  const cash = r.cash ?? r.amount;
                  const change = r.change ?? 0;

                  return (
                    <tr key={i}>
                      <td style={styles.tdBold}>{r.receiptNumber}</td>
                      <td style={styles.td}>{r.invoiceNumber}</td>
                      <td style={styles.td}>{r.customerName}</td>
                      <td style={styles.amount}>{money(applied)}</td>
                      <td style={styles.td}>{money(cash)}</td>
                      <td style={Number(change) > 0 ? styles.change : styles.td}>
                        {money(change)}
                      </td>
                      <td style={styles.td}>
                        {r.paymentDate
                          ? new Date(r.paymentDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td style={styles.td}>
                        {r.cashier || r.username || "N/A"}
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.previewBtn}
                          onClick={() => previewReceipt(r)}
                        >
                          {t("previewpdf", "Preview")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <button
            style={styles.pageBtn}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            {t("prev", "Prev")}
          </button>

          <span style={styles.pageText}>
            {t("page", "Page")} {currentPage} / {totalPages}
          </span>

          <button
            style={styles.pageBtn}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("next", "Next")}
          </button>
        </div>

        {pdfUrl && (
          <div className="no-print" style={styles.pdfBox}>
            <div style={styles.pdfHeader}>
              <h3 style={{ margin: 0 }}>{t("receiptpreview", "Receipt Preview")}</h3>

              <div>
                <a href={pdfUrl} download="receipt.pdf">
                  <button style={styles.downloadBtn}>
                    {t("download", "Download PDF")}
                  </button>
                </a>

                <button style={styles.printBtn} onClick={printReceipt}>
                  {t("print", "Print")}
                </button>

                <button
                  style={styles.closeBtn}
                  onClick={() => {
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl("");
                    setReceipt(null);
                  }}
                >
                  {t("close", "Close")}
                </button>
              </div>
            </div>
          </div>
        )}

        {receipt && (
          <div className="receipt">
            <div className="receipt-center">
              <div className="receipt-title">
                {company?.companyName || "STORE"}
              </div>

              <div className="receipt-subtitle">
                {company?.address || ""}
              </div>

              <div className="receipt-subtitle">
                {company?.phone || ""}
              </div>

              {receipt.barcode && (
                <img
                  src={receipt.barcode}
                  alt="barcode"
                  className="receipt-barcode"
                />
              )}
            </div>

            <div className="receipt-line"></div>

            <div className="receipt-row">
              <span>Receipt</span>
              <span>{receipt.receiptNumber}</span>
            </div>

            <div className="receipt-row">
              <span>Invoice</span>
              <span>{receipt.invoiceNumber}</span>
            </div>

            <div className="receipt-row">
              <span>Customer</span>
              <span>{receipt.customerName}</span>
            </div>

            <div className="receipt-row">
              <span>Cashier</span>
              <span>{receipt.cashier || receipt.username || "N/A"}</span>
            </div>

            <div className="receipt-row">
              <span>Date</span>
              <span>
                {receipt.paymentDate
                  ? new Date(receipt.paymentDate).toLocaleString()
                  : "N/A"}
              </span>
            </div>

            <div className="receipt-line"></div>

            {receipt.items && receipt.items.length > 0 ? (
              receipt.items.map((item: any, i: number) => {
                const name = item.name || item.itemName || "";
                const qty = Number(item.quantity ?? item.qty ?? 0);
                const price = Number(item.price || 0);

                return (
                  <div key={i}>
                    <div className="receipt-item-name">{name}</div>

                    <div className="receipt-row">
                      <span>
                        {qty} x {money(price)}
                      </span>

                      <span>{money(qty * price)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="receipt-row">
                <span>No items</span>
                <span></span>
              </div>
            )}

            <div className="receipt-line"></div>

            <div className="receipt-row">
              <span>Subtotal</span>
              <span>{money(receipt.subtotal)}</span>
            </div>

            <div className="receipt-row">
              <span>Tax</span>
              <span>{money(receipt.taxAmount)}</span>
            </div>

            <div className="receipt-row receipt-total">
              <span>TOTAL</span>
              <span>{money(receipt.total)}</span>
            </div>

            <div className="receipt-line"></div>

            <div className="receipt-row">
              <span>Applied</span>
              <span>{money(receipt.applied)}</span>
            </div>

            <div className="receipt-row">
              <span>Cash</span>
              <span>{money(receipt.cash)}</span>
            </div>

            <div className="receipt-row">
              <span>Balance</span>
              <span>{money(receipt.balance)}</span>
            </div>

            <div className="receipt-row">
              <span>Change</span>
              <span>{money(receipt.change)}</span>
            </div>

            <div className="receipt-line"></div>

            <div className="receipt-footer">
              {company?.footerMessage || "Thank you!"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "35px 24px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  card: {
    maxWidth: "1250px",
    margin: "0 auto",
    background: "white",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    fontSize: "38px",
    color: "#0f172a",
  },

  subtitle: {
    margin: "6px 0 0",
    fontSize: "16px",
    color: "#64748b",
  },

  refreshBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#e2e8f0",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  search: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    outline: "none",
    marginBottom: "18px",
    boxSizing: "border-box",
  },

  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflowX: "auto",
    background: "white",
  },

  table: {
    borderCollapse: "collapse",
    fontSize: "15px",
  },

  th: {
    background: "#f1f5f9",
    color: "#0f172a",
    padding: "14px",
    textAlign: "left",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },

  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
    fontWeight: "bold",
    color: "#0f172a",
  },

  amount: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
    color: "#16a34a",
    fontWeight: "bold",
  },

  change: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
    color: "#f59e0b",
    fontWeight: "bold",
  },

  empty: {
    textAlign: "center",
    padding: "28px",
    color: "#64748b",
  },

  previewBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    padding: "8px 12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  pagination: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
  },

  pageBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#e2e8f0",
    padding: "9px 15px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  pageText: {
    fontWeight: "bold",
  },

  pdfBox: {
    marginTop: "25px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
  },

  pdfHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  downloadBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  printBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  closeBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};