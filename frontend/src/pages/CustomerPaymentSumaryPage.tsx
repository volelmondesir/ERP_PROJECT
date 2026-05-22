import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;
const API = "http://localhost:5000/api";

const CustomerPaymentSumaryPage = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");

  const pageSize = 5;

  const loadGroups = async () => {
    try {
      const res = await axios.get(`${API}/ar/customer-payment-groups`);
      setGroups(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD GROUPS ERROR 👉", err.response?.data || err.message);
      setGroups([]);
    }
  };

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
    loadGroups();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return groups.filter((g) =>
      String(g.trxRef || "").toLowerCase().includes(q) ||
      String(g.customerName || "").toLowerCase().includes(q) ||
      String(g.totalPaid || "").includes(q)
    );
  }, [groups, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const setPdf = (doc: jsPDF) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  };

  const previewCustomerTRX = async (group: any) => {
    try {
      const res = await axios.get(
        `${API}/ar/customer-payment-lines/${group.customerId}`
      );

      const rows = res.data?.data || [];

      if (rows.length === 0) {
        alert("No payments found");
        return;
      }

      const doc = new jsPDF("portrait", "mm", "letter");

      const trxRef = group.trxRef || `TRX-${group.customerId}`;
      const customerName = group.customerName || rows[0]?.customerName || "";
      const total = rows.reduce(
        (sum: number, r: any) => sum + Number(r.amount || 0),
        0
      );

      const today = new Date().toLocaleDateString();

      doc.setFillColor(245, 248, 252);
      doc.rect(0, 0, 216, 279, "F");

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 216, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("CUSTOMER PAYMENT TRANSACTION", 15, 18);

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("ERP Accounts Receivable", 15, 38);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`TRX Ref: ${trxRef}`, 15, 52);
      doc.text(`Date: ${today}`, 150, 52);
      doc.text(`Customer: ${customerName}`, 15, 62);

      doc.setDrawColor(200, 200, 200);
      doc.line(15, 70, 200, 70);

      let y = 84;

      const drawHeader = () => {
        doc.setFillColor(226, 232, 240);
        doc.rect(12, y - 6, 190, 10, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);

        doc.text("Date", 15, y);
        doc.text("Receipt", 45, y);
        doc.text("Account", 78, y);
        doc.text("User", 125, y);
        doc.text("Amount", 165, y);

        y += 9;
      };

      drawHeader();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      rows.forEach((r: any) => {
        if (y > 250) {
          doc.addPage();
          y = 25;
          drawHeader();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
        }

        const date = r.createdAt
          ? new Date(r.createdAt).toLocaleDateString()
          : "-";

        const ref = r.referenceNumber || `RCP-${r.id}`;
        const account = String(r.accountName || "-").slice(0, 20);
        const user = String(r.username || "-").slice(0, 14);
        const amount = `$${Number(r.amount || 0).toFixed(2)}`;

        doc.text(date, 15, y);
        doc.text(ref, 45, y);
        doc.text(account, 78, y);
        doc.text(user, 125, y);
        doc.text(amount, 165, y);

        y += 8;
      });

      y += 6;

      if (y > 250) {
        doc.addPage();
        y = 25;
      }

      doc.line(15, y, 200, y);
      y += 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(`TOTAL PAID: $${total.toFixed(2)}`, 130, y);

      y += 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Thank you for your payment.", 15, y);

      y += 28;
      doc.line(130, y, 195, y);
      doc.text("Authorized Signature", 145, y + 8);

      setPdf(doc);
    } catch (err: any) {
      console.log("PREVIEW TRX ERROR 👉", err.response?.data || err.message);
      alert("Preview failed");
    }
  };

  const printPDF = () => {
    const iframe = document.getElementById("trxFrame") as HTMLIFrameElement;
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
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>
          {t("customerpaymenthistory", "Customer Payment History")}
        </h1>

        <p style={styles.sub}>
          {t(
            "trxsummarycustomer",
            "TRX summary by customer, preview all receipt lines and print"
          )}
        </p>
      </div>

      <button onClick={loadGroups} style={styles.refreshBtn}>
        {t("refresh", "Refresh")}
      </button>
    </div>

    <input
      placeholder={t(
        "searchtrxcustomer",
        "Search by TRX, customer, total..."
      )}
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setPage(1);
      }}
      style={styles.search}
    />

    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t("date", "Date")}</th>

            <th style={styles.th}>{t("ref", "Ref #")}</th>

            <th style={styles.th}>{t("customer", "Customer")}</th>

            <th style={styles.th}>{t("payments", "Payments")}</th>

            <th style={styles.th}>{t("total", "Total")}</th>

            <th style={styles.th}>{t("action", "Action")}</th>
          </tr>
        </thead>

        <tbody>
          {paginated.map((g) => (
            <tr key={g.customerId}>
              <td style={styles.td}>
                {g.lastPaymentDate
                  ? new Date(g.lastPaymentDate).toLocaleDateString()
                  : "-"}
              </td>

              <td style={styles.td}>
                {g.trxRef || `TRX-${g.customerId}`}
              </td>

              <td style={styles.td}>
                {g.customerName || "-"}
              </td>

              <td style={styles.td}>
                {g.paymentCount || 0}
              </td>

              <td
                style={{
                  ...styles.td,
                  color: "#16a34a",
                  fontWeight: "bold",
                }}
              >
                ${Number(g.totalPaid || 0).toFixed(2)}
              </td>

              <td
                style={{
                  ...styles.td,
                  whiteSpace: "nowrap",
                }}
              >
                <button
                  onClick={() => previewCustomerTRX(g)}
                  style={styles.previewBtn}
                >
                  {t("previewtrx", "Preview TRX")}
                </button>
              </td>
            </tr>
          ))}

          {paginated.length === 0 && (
            <tr>
              <td colSpan={6} style={styles.empty}>
                {t(
                  "nocustomerpaymenttrx",
                  "No customer payment transactions found"
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div style={styles.pagination}>
      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        style={styles.pageBtn}
      >
        {t("prev", "Prev")}
      </button>

      <span style={styles.pageText}>
        {t("page", "Page")} {page} {t("of", "of")} {totalPages}
      </span>

      <button
        disabled={page === totalPages}
        onClick={() => setPage(page + 1)}
        style={styles.pageBtn}
      >
        {t("next", "Next")}
      </button>
    </div>

    {pdfUrl && (
      <div style={styles.previewBox}>
        <div style={styles.previewHeader}>
          <h2 style={{ margin: 0 }}>
            {t("trxpaymentpreview", "TRX Payment Preview")}
          </h2>

          <div>
            <button
              onClick={printPDF}
              style={styles.printBtn}
            >
              {t("print", "Print")}
            </button>

            <button
              onClick={closePDF}
              style={styles.closeBtn}
            >
              {t("close", "Close")}
            </button>
          </div>
        </div>

        <iframe
          id="trxFrame"
          src={pdfUrl}
          width="100%"
          height="560"
          style={styles.iframe}
        />
      </div>
    )}
  </div>
);
};

export default CustomerPaymentSumaryPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
  },
  h1: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 500,
    color: "#0f172a",
  },
  sub: {
    color: "#64748b",
    fontSize: "16px",
    marginTop: "8px",
  },
  refreshBtn: {
    padding: "12px 20px",
    background: "#dce5ef",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  search: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "17px",
    margin: "10px 0 20px",
    outline: "none",
    background: "#fff",
  },
  tableWrap: {
    background: "#fff",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
  },
  td: {
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },
  previewBtn: {
    padding: "8px 12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "16px",
  },

  previewBox: {
    marginTop: "24px",
    background: "#fff",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  printBtn: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },
  closeBtn: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
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
    pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
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
};