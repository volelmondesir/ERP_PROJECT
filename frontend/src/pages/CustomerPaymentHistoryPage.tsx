import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";

type LangType = keyof typeof translations;

const CustomerPaymentHistoryPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");

  const lang = (localStorage.getItem("lang") as LangType) || "en";

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
  };

  const pageSize = 5;

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/ar/payment-sumary`);
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setData(rows);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD PAYMENT HISTORY ERROR 👉", err.response?.data || err.message);
      setData([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return data.filter((r) =>
      String(r.referenceNumber || "").toLowerCase().includes(q) ||
      String(r.description || "").toLowerCase().includes(q) ||
      String(r.username || "").toLowerCase().includes(q) ||
      String(r.accountName || "").toLowerCase().includes(q) ||
      String(r.customerName || "").toLowerCase().includes(q) ||
      String(r.amount || "").includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const setPdf = (doc: jsPDF) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  };

  const previewReceipt = (row: any) => {
    const doc = new jsPDF("portrait", "mm", "letter");

    const amount = Number(row.amount || 0);
    const receiptNo = row.referenceNumber || `RCP-${row.sourceId || row.id}`;
    const date = row.createdAt
      ? new Date(row.createdAt).toLocaleDateString()
      : new Date().toLocaleDateString();

    doc.setFillColor(245, 248, 252);
    doc.rect(0, 0, 216, 279, "F");

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(t("paymentreceipt", "PAYMENT RECEIPT"), 15, 18);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("ERP Accounts Receivable", 15, 38);

    doc.setFont("helvetica", "bold");
    doc.text(`${t("receiptno", "Receipt No")}: ${receiptNo}`, 15, 52);
    doc.text(`${t("date", "Date")}: ${date}`, 145, 52);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 58, 200, 58);

    doc.setFont("helvetica", "bold");
    doc.text(t("paymentdetails", "Payment Details"), 15, 76);

    doc.setFont("helvetica", "normal");
    doc.text(`${t("customer", "Customer")}: ${row.customerName || "-"}`, 15, 90);
    doc.text(`${t("account", "Account")}: ${row.accountName || "-"}`, 15, 100);
    doc.text(`${t("type", "Type")}: ${row.transactionType || "-"}`, 15, 110);
    doc.text(`${t("reference", "Reference")}: ${receiptNo}`, 15, 120);
    doc.text(`${t("cashieruser", "Cashier/User")}: ${row.username || "-"}`, 15, 130);
    doc.text(`${t("description", "Description")}: ${row.description || "-"}`, 15, 140);

    doc.setFillColor(220, 252, 231);
    doc.rect(15, 160, 185, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`${t("amountpaid", "Amount Paid")}: $${amount.toFixed(2)}`, 22, 176);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(t("thankpayment", "Thank you for your payment."), 15, 205);

    doc.line(130, 235, 195, 235);
    doc.text(t("authorizedsignature", "Authorized Signature"), 145, 243);

    setPdf(doc);
  };

  const previewAllTransactions = () => {
    const doc = new jsPDF("portrait", "mm", "letter");

    const rows = filtered;
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    doc.setFillColor(245, 248, 252);
    doc.rect(0, 0, 216, 279, "F");

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(t("customerpaymenthistory", "CUSTOMER PAYMENT HISTORY"), 15, 18);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${t("generated", "Generated")}: ${new Date().toLocaleString()}`, 15, 38);
    doc.text(`${t("totaltransactions", "Total Transactions")}: ${rows.length}`, 15, 46);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${t("totalpaid", "Total Paid")}: $${totalAmount.toFixed(2)}`, 145, 46);

    let y = 62;

    const drawHeader = () => {
      doc.setFillColor(226, 232, 240);
      doc.rect(10, y - 6, 196, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text(t("date", "Date"), 12, y);
      doc.text(t("ref", "Ref #"), 38, y);
      doc.text(t("customer", "Customer"), 65, y);
      doc.text(t("account", "Account"), 105, y);
      doc.text(t("type", "Type"), 142, y);
      doc.text(t("amount", "Amount"), 160, y);
      doc.text(t("user", "User"), 185, y);

      y += 8;
    };

    drawHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    rows.forEach((row) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
        drawHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      const date = row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-";
      const ref = row.referenceNumber || `RCP-${row.sourceId || row.id}`;
      const customer = String(row.customerName || "-").slice(0, 18);
      const account = String(row.accountName || "-").slice(0, 16);
      const type = String(row.transactionType || "-");
      const amount = `$${Number(row.amount || 0).toFixed(2)}`;
      const user = String(row.username || "-").slice(0, 10);

      doc.text(date, 12, y);
      doc.text(ref.slice(0, 14), 38, y);
      doc.text(customer, 65, y);
      doc.text(account, 105, y);
      doc.text(type, 142, y);
      doc.text(amount, 160, y);
      doc.text(user, 185, y);

      y += 8;
    });

    y += 6;

    if (y > 250) {
      doc.addPage();
      y = 25;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(10, y, 206, y);

    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${t("grandtotal", "Grand Total")}: $${totalAmount.toFixed(2)}`, 140, y);

    setPdf(doc);
  };

  const printPDF = () => {
    const iframe = document.getElementById("paymentReceiptFrame") as HTMLIFrameElement;
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
            {t("searchpreview", "Search, preview and reprint customer payment receipts")}
          </p>
        </div>

        <div style={styles.headerButtons}>
          <button onClick={previewAllTransactions} style={styles.previewAllBtn}>
            {t("previewall", "Preview All")}
          </button>

          <button onClick={loadHistory} style={styles.refreshBtn}>
            {t("refresh", "Refresh")}
          </button>
        </div>
      </div>

      <input
        placeholder={t("searchby", "Search by ref, customer, account, description, user, amount...")}
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
              <th style={styles.th}>{t("account", "Account")}</th>
              <th style={styles.th}>{t("description", "Description")}</th>
              <th style={styles.th}>{t("type", "Type")}</th>
              <th style={styles.th}>{t("amount", "Amount")}</th>
              <th style={styles.th}>{t("user", "User")}</th>
              <th style={styles.th}>{t("action", "Action")}</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((row) => (
              <tr key={row.id}>
                <td style={styles.td}>
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}
                </td>

                <td style={styles.td}>
                  {row.referenceNumber || `RCP-${row.sourceId || row.id}`}
                </td>

                <td style={styles.td}>{row.customerName || "-"}</td>
                <td style={styles.td}>{row.accountName || "-"}</td>
                <td style={styles.td}>{row.description || "-"}</td>

                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      background: row.transactionType === "IN" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {row.transactionType}
                  </span>
                </td>

                <td
                  style={{
                    ...styles.td,
                    color: row.transactionType === "IN" ? "#16a34a" : "#dc2626",
                    fontWeight: "bold",
                  }}
                >
                  ${Number(row.amount || 0).toFixed(2)}
                </td>

                <td style={styles.td}>{row.username || "-"}</td>

                <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                  <button onClick={() => previewReceipt(row)} style={styles.previewBtn}>
                    {t("preview", "Preview")}
                  </button>
                </td>
              </tr>
            ))}

            {paginated.length === 0 && (
              <tr>
                <td colSpan={9} style={styles.empty}>
                  {t("nopaymenthistory", "No payment history found")}
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
            <h2 style={{ margin: 0 }}>{t("paymentpdfpreview", "Payment PDF Preview")}</h2>

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
            id="paymentReceiptFrame"
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

export default CustomerPaymentHistoryPage;

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
  headerButtons: {
    display: "flex",
    gap: "10px",
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
  previewAllBtn: {
    padding: "12px 20px",
    background: "#2563eb",
    color: "#fff",
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
    padding: "14px 12px",
    textAlign: "left",
    fontSize: "14px",
  },
  td: {
    padding: "12px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },
  badge: {
    display: "inline-block",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
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