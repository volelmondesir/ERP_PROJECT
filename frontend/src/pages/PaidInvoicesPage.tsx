

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000";
import { translations } from "../translations/translations";

type LangType = keyof typeof translations;
type Item = {
  name?: string;
  itemName?: string;
  price?: number;
  quantity?: number;
  qty?: number;
};
type Invoice = {
  id: number;
  invoiceNumber?: string;
  customerName?: string;
  username?: string;
  total?: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  paidAmount?: number;
  status?: string;
  items?: Item[];
};
type Company = {
  companyName?: string;
  address?: string;
  phone?: string;
  footerMessage?: string;
};
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

    const [lang, setLang] = useState<LangType>(
        (localStorage.getItem("lang") as LangType) || "en"
      );
    
      const t = (key: string, fallback: string) => {
        return (
          (translations[lang] as Record<string, string>)?.[key] ||
          fallback
        );
      };
  useEffect(() => {
    loadData();
    loadCompany();
  }, []);
  
    useEffect(() => {
     
        const handleLanguageChange = () => {
          setLang((localStorage.getItem("lang") as LangType) || "en");
        };
    
        handleLanguageChange();
    
        window.addEventListener("languageChanged", handleLanguageChange);
    
        return () => {  window.removeEventListener("languageChanged", handleLanguageChange); };
      }, []);
  const loadData = async () => {
    try {
      const invRes = await fetch(`${API}/api/invoices`);
      const invData = await invRes.json();
      setInvoices(Array.isArray(invData) ? invData : []);
     
    } catch (err) {
      console.log("LOAD ERROR:", err);
    }
  };
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const loadCompany = async () => {

  try {

    const companyRes = await axios.get(

      "http://localhost:5000/api/company"

    );

    console.log("COMPANY 👉", companyRes.data);

    setCompany(

      companyRes.data?.data || companyRes.data

    );

  } catch (err) {

    console.log("COMPANY LOAD ERROR 👉", err);

  }

}

  const money = (n?: number) => `$${Number(n ?? 0).toFixed(2)}`;


 const normalizeStatus = (status?: string) => {
  const s = (status || "").toUpperCase();

  if (s === "PENDING") return "UNPAID";
  if (s === "PAID") return "PAID";
  if (s === "PARTIAL") return "PARTIAL";

  return s;
};

const filtered = invoices.filter((inv) => {
  const name = (inv.customerName || "").toLowerCase();
  const invoiceNo = (inv.invoiceNumber || "").toLowerCase();
  const searchText = search.toLowerCase();

  const status = normalizeStatus(inv.status);
  const filter = statusFilter.toUpperCase();

  return (
    (name.includes(searchText) || invoiceNo.includes(searchText)) &&
    (statusFilter === "all" || status === filter)
  );
});
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const downloadPDF = async (inv: Invoice) => {
    try {
      const res = await fetch(`${API}/api/invoices/${inv.invoiceNumber}`);
      const fullInv = await res.json();
      if (!fullInv || !fullInv.items) {
        alert("Invoice data incomplete");
        return;
      }
      const doc = new jsPDF();
      let y = 40;
      doc.rect(10, 10, 190, 270);
      doc.setFontSize(18);
      doc.text(company?.companyName || "MY STORE", 105, y, {
        align: "center",
      });
      y += 10;
      doc.setFontSize(10);
      doc.text(company?.address || "", 105, y, { align: "center" });
      y += 5;
      doc.text(company?.phone || "", 105, y, { align: "center" });
      y += 10;
      doc.setFontSize(16);
      doc.text("INVOICE", 105, y, { align: "center" });
      y += 10;
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, fullInv.invoiceNumber || `INV-${fullInv.id}`, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: false,
      });
      doc.addImage(canvas.toDataURL("image/png"), "PNG", 140, y - 10, 50, 20);
      doc.setFontSize(10);
      doc.text(`Invoice #: ${fullInv.invoiceNumber}`, 20, y);
      y += 10;
      doc.text(`Customer: ${fullInv.customerName}`, 20, y);
      y += 10;
      const status = (fullInv.status || "").toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.text(`Status: ${status}`, 20, y);
      doc.setFont("helvetica", "normal");
      y += 8;
      doc.setFillColor(230, 230, 230);
      doc.rect(20, y - 5, 170, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Product", 20, y);
      doc.text("Qty", 90, y);
      doc.text("Price", 120, y);
      doc.text("Total", 170, y);
      doc.setFont("helvetica", "normal");
      y += 10;
      let subtotal = 0;
      fullInv.items.forEach((item: Item) => {
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const price = Number(item.price || 0);
        const totalLine = qty * price;
        subtotal += totalLine;
        doc.text(item.name || item.itemName || "", 20, y);
        doc.text(String(qty), 90, y);
        doc.text(money(price), 120, y);
        doc.text(money(totalLine), 190, y, { align: "right" });
        y += 8;
      });
      const tax = Number(fullInv.taxAmount || 0);
      const total = subtotal + tax;
      y += 5;
      doc.line(120, y, 190, y);
      y += 5;
      doc.text("Subtotal:", 130, y);
      doc.text(money(subtotal), 190, y, { align: "right" });
      y += 5;
      doc.text(`Tax (${fullInv.taxRate}%):`, 130, y);
      doc.text(money(tax), 190, y, { align: "right" });
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", 130, y);
      doc.text(money(total), 190, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      const pageHeight = doc.internal.pageSize.height;
      doc.line(20, pageHeight - 15, 190, pageHeight - 15);
      doc.text(
        company?.footerMessage || "Thank you for your business!",
        105,
        pageHeight - 8,
        { align: "center" }
      );
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      alert("PDF error");
      console.error(err);
    }
  };
  const printPDF = () => {
  const iframe = document.getElementById("pdfFrame") as HTMLIFrameElement;

  if (!iframe?.contentWindow) return;

  const scrollY = window.scrollY;

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  setTimeout(() => {
    window.scrollTo(0, scrollY);
  }, 300);
};
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>All Invoices</h1>
            <p style={styles.subtitle}>Search, filter and preview invoices</p>
          </div>
          <button style={styles.refreshBtn} onClick={loadData}>
            Refresh
          </button>
        </div>
        <div style={styles.filters}>
          <input
            style={styles.search}
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            style={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Invoice</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Cashier</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.empty}>
                    No invoices found
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => {
                  const status = (inv.status || "").toUpperCase();
                  return (
                    <tr key={inv.id}>
                      <td style={styles.tdBold}>{inv.invoiceNumber}</td>
                      <td style={styles.td}>{inv.customerName}</td>
                      <td style={styles.amount}>{money(inv.total)}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            background:
                              status === "PAID"
                                ? "#16a34a"
                                : status === "PARTIAL"
                                ? "#f59e0b"
                                : "#dc2626",
                          }}
                        >
                          {status || "UNPAID"}
                        </span>
                      </td>
                      <td style={styles.td}>{inv.username || "N/A"}</td>
                      <td style={styles.td}>
                        <button
                          style={styles.previewBtn}
                          onClick={() => downloadPDF(inv)}
                        >
                          View PDF
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
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span style={styles.pageText}>
            Page {page} / {totalPages}
          </span>
          <button
            style={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
        {pdfUrl && (
          <div style={styles.pdfBox}>
            <div style={styles.pdfHeader}>
              <h3 style={{ margin: 0 }}>Invoice Preview</h3>
              <div>
                <a href={pdfUrl} download="invoice.pdf">
                  <button style={styles.downloadBtn}>Download PDF</button>
                </a>
                 <button style={styles.printBtn} onClick={printPDF}>
                {t("print", "Print")}
              </button>
                <button
                  style={styles.closeBtn}
                  onClick={() => {
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          <iframe
  id="pdfFrame"
  src={pdfUrl}
  width="100%"
  height="520px"
  style={styles.iframe}
/>
          </div>
        )}
      </div>
    </div>
  );
}
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "35px 24px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
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
  filters: {
    display: "flex",
    gap: "12px",
    marginBottom: "18px",
  },
  search: {
    flex: 1,
    padding: "14px 16px",
    fontSize: "16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "180px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    background: "white",
  },
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflowX: "auto",
    background: "white",
  },
  table: {
    width: "100%",
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
  badge: {
    color: "white",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
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
  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "white",
  },
};