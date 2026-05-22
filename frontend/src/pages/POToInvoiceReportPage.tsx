import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;

const API = "/api";

const POToInvoiceReportPage = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const pageSize = 5;

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



  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/ap-inv`);
      setRows(Array.isArray(res.data) ? res.data : []);

      
      setPage(1);
    } catch (err: any) {
      console.log("LOAD AP INV ERROR 👉", err.response?.data || err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    loadInvoices();
  }, []);

  const money = (value: any) => {
    return `$${Number(value || 0).toFixed(2)}`;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return rows.filter((r) =>
      String(r.invoiceNumber || "").toLowerCase().includes(q) ||
      String(r.poNumber || "").toLowerCase().includes(q) ||
      String(r.supplier || "").toLowerCase().includes(q) ||
      String(r.status || "").toLowerCase().includes(q) ||
      String(r.total || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

 const previewInvoice = async (inv: any) => {
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);

  try {
    const res = await axios.get(`${API}/ap-inv/${inv.id}`);

    const invoice = res.data?.invoice || inv;
    const items = Array.isArray(res.data?.items) ? res.data.items : [];

    const doc = new jsPDF("portrait", "mm", "letter");

    doc.setFillColor(255, 255, 255);
doc.rect(0, 0, 216, 28, "F");

doc.setTextColor(15, 23, 42);
doc.setFont("helvetica", "bold");
doc.setFontSize(18);

doc.text(
  t("apinvpreview", "AP Invoice Preview"),
  15,
  18
);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    doc.text(`${t("invoice", "Invoice")}: ${invoice.invoiceNumber || "-"}`, 15, 45);
    doc.text(`${t("ponumber", "PO Number")}: ${invoice.poNumber || "-"}`, 15, 58);
    doc.text(`${t("supplier", "Supplier")}: ${invoice.supplier || "-"}`, 15, 71);
    doc.text(
      `${t("date", "Date")}: ${
        invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "-"
      }`,
      15,
      84
    );
    doc.text(`${t("status", "Status")}: ${invoice.status || "-"}`, 15, 97);

    let y = 115;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(t("items", "Items"), 15, y);

    y += 9;

    doc.setFillColor(226, 232, 240);
    doc.rect(15, y - 6, 185, 9, "F");

    doc.setFontSize(10);
    doc.text(t("item", "Item"), 18, y);
    doc.text(t("qty", "Qty"), 95, y);
    doc.text(t("price", "Price"), 125, y);
    doc.text(t("total", "Total"), 165, y);

    y += 9;

    doc.setFont("helvetica", "normal");

    if (items.length === 0) {
      doc.text(t("noitemsfound", "No items found"), 18, y);
      y += 10;
    } else {
      items.forEach((item: any) => {
        const name = item.itemName || item.name || item.productName || "-";
        const qty = Number(item.qty || item.quantity || 0);
        const price = Number(item.price || 0);
        const lineTotal = Number(item.total || qty * price);

        doc.text(String(name).slice(0, 35), 18, y);
        doc.text(String(qty), 95, y);
        doc.text(money(price), 125, y);
        doc.text(money(lineTotal), 165, y);

        y += 8;
      });
    }

    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${t("total", "Total")}: ${money(invoice.total)}`, 15, y);
    y += 12;
    doc.text(`${t("paid", "Paid")}: ${money(invoice.paidAmount)}`, 15, y);
    y += 12;
    doc.text(
      `${t("balance", "Balance")}: ${money(
        Number(invoice.total || 0) - Number(invoice.paidAmount || 0)
      )}`,
      15,
      y
    );

    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  } catch (err: any) {
    console.log("PREVIEW AP INV ERROR 👉", err.response?.data || err.message);
    alert(err.response?.data?.message || "Preview failed");
  }
};

  const printPDF = () => {
    const iframe = document.getElementById("apInvFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              {t("apotoinvoicereport", "PO To Invoice / AP-INV Report")}
            </h1>

            <p style={styles.subtitle}>
              {t(
                "apotoinvoicesubtitle",
                "Search AP invoices converted from purchase orders"
              )}
            </p>
          </div>

          <button onClick={loadInvoices} style={styles.refreshBtn}>
            {t("refresh", "Refresh")}
          </button>
        </div>

        <input
          style={styles.search}
          placeholder={t(
            "searchapinvoice",
            "Search invoice, PO, supplier, status, total..."
          )}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        {loading && (
          <div style={styles.loading}>
            {t("loading", "Loading...")}
          </div>
        )}

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t("invoice", "Invoice")}</th>
                <th style={styles.th}>{t("ponumber", "PO Number")}</th>
                <th style={styles.th}>{t("supplier", "Supplier")}</th>
                <th style={styles.th}>{t("total", "Total")}</th>
                <th style={styles.th}>{t("paid", "Paid")}</th>
                <th style={styles.th}>{t("balance", "Balance")}</th>
                <th style={styles.th}>{t("status", "Status")}</th>
                <th style={styles.th}>{t("date", "Date")}</th>
                <th style={styles.th}>{t("action", "Action")}</th>
              </tr>
            </thead>

            <tbody>
{paginated.map((r) => {
  const total = Number(r.total || 0);
  const paid = Number(r.paidAmount || 0);
  const balance = Math.max(total - paid, 0);

  const isPaid = balance <= 0;
  const isPartial = paid > 0 && balance > 0;

  const statusText = isPaid
    ? "Paid"
    : isPartial
    ? "Partial"
    : "Unpaid";

  const statusColor = isPaid
    ? "#16a34a"
    : isPartial
    ? "#f59e0b"
    : "#dc2626";

  return (
    <tr key={r.id}>
      <td style={styles.td}>{r.invoiceNumber}</td>

      <td style={styles.td}>{r.poNumber || "-"}</td>

      <td style={styles.td}>{r.supplier}</td>

      <td style={styles.td}>
        <span style={{ color: "#16a34a", fontWeight: "bold" }}>
          {money(total)}
        </span>
      </td>

      <td style={styles.td}>{money(paid)}</td>

      <td style={styles.td}>
        <span
          style={{
            color: isPaid ? "#16a34a" : "#dc2626",
            fontWeight: "bold",
          }}
        >
          {money(balance)}
        </span>
      </td>

      <td style={styles.td}>
        <span
          style={{
            ...styles.badge,
            background: statusColor,
          }}
        >
          {statusText}
        </span>
      </td>

      <td style={styles.td}>
        {r.createdAt
          ? new Date(r.createdAt).toLocaleDateString()
          : "-"}
      </td>

      <td style={styles.td}>
        <button
          style={styles.previewBtn}
          onClick={() => previewInvoice(r)}
        >
          Preview
        </button>
      </td>
    </tr>
  );
})}
</tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              ...styles.pageBtn,
              opacity: page === 1 ? 0.5 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            {t("prev", "Prev")}
          </button>

          <span style={styles.pageText}>
            {t("page", "Page")} {page} {t("of", "of")} {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              ...styles.pageBtn,
              opacity: page === totalPages ? 0.5 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            {t("next", "Next")}
          </button>
        </div>

        {pdfUrl && (
          <div style={styles.previewBox}>
            <div style={styles.previewHeader}>
              <h2 style={{ margin: 0 }}>
                {t("apinvpreview", "AP Invoice Preview")}
              </h2>

              <div>
                <button onClick={printPDF} style={styles.printBtn}>
                  {t("print", "Print")}
                </button>

                <button onClick={closePDF} style={styles.closeBtn}>
                  {t("close", "Close")}
                </button>
              </div>
            </div>

            <iframe
              id="apInvFrame"
              src={pdfUrl}
              width="100%"
              height="560"
              style={styles.iframe}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default POToInvoiceReportPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "16px",
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
    marginTop: "20px",
    width: "360px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
  },

  loading: {
    padding: "16px",
    color: "#64748b",
    fontWeight: "bold",
  },

  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px",
    textAlign: "left",
    fontSize: "14px",
    color: "#334155",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },

  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    fontWeight: "bold",
  },

  amount: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#16a34a",
  },

  balance: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#dc2626",
  },

 badge: {
    color: "white",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  previewBtn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginTop: "18px",
  },

  pageBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
  },

  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },

  previewBox: {
    marginTop: "24px",
    background: "#fff",
    borderRadius: "18px",
    padding: "18px",
    border: "1px solid #e2e8f0",
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  printBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  closeBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#fff",
  },
};