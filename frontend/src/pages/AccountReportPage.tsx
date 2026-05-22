import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;
const API = "/api";

type LedgerRow = {
  id: number;
  accountCode: "CASH" | "PAYMENT";
  createdAt: string;
  referenceNumber?: string;
  description?: string;
  transactionType: "IN" | "OUT";
  amount: number;
  username?: string;
};

const AccountReportsPage = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const perPage = 5;
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
    setDefaultDates("today");
  }, []);

  useEffect(() => {
    if (startDate && endDate) loadReports();
  }, [startDate, endDate]);

  const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;

  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

  const setDefaultDates = (filter: string) => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (filter === "yesterday") {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    }

    if (filter === "week") {
      start.setDate(today.getDate() - 7);
    }

    if (filter === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    if (filter === "all") {
      start = new Date("2000-01-01");
    }

    setStartDate(dateOnly(start));
    setEndDate(dateOnly(end));
  };

  const loadReports = async () => {
    try {
      setLoading(true);

      const cashRes = await axios.get(`${API}/accounts/CASH/history`);
      const paymentRes = await axios.get(`${API}/accounts/PAYMENT/history`);

      const cashRows = (cashRes.data?.history || []).map((r: any) => ({
        ...r,
        accountCode: "CASH",
      }));

      const paymentRows = (paymentRes.data?.history || []).map((r: any) => ({
        ...r,
        accountCode: "PAYMENT",
      }));

      setRows([...cashRows, ...paymentRows]);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD ACCOUNT REPORT ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

 const getDateOnly = (value: any) => {
  if (!value) return "";

  // Si value a se "2026-05-02T12:00:00.000Z"
  return String(value).slice(0, 10);
};

const filtered = rows.filter((r) => {
  const q = search.toLowerCase();

  const rowDate = getDateOnly(r.createdAt);
  const start = startDate;
  const end = endDate;

  const matchDate =
    quickFilter === "all" || (rowDate >= start && rowDate <= end);

  const matchSearch =
    String(r.accountCode || "").toLowerCase().includes(q) ||
    String(r.referenceNumber || "").toLowerCase().includes(q) ||
    String(r.description || "").toLowerCase().includes(q) ||
    String(r.username || "").toLowerCase().includes(q);

  return matchDate && matchSearch;
});

  const calcBalance = (accountCode: "CASH" | "PAYMENT") => {
    const list = filtered.filter((r) => r.accountCode === accountCode);

    const balance = list.reduce((sum, r) => {
      const amount = Number(r.amount || 0);

      if (r.transactionType === "IN") return sum + amount;
      return sum - amount;
    }, 0);

    return accountCode === "PAYMENT" ? -Math.abs(balance) : balance;
  };

  const cashBalance = calcBalance("CASH");
  const paymentBalance = calcBalance("PAYMENT");

  const cashIn = filtered
    .filter((r) => r.accountCode === "CASH" && r.transactionType === "IN")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const cashOut = filtered
    .filter((r) => r.accountCode === "CASH" && r.transactionType === "OUT")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const paymentIn = filtered
    .filter((r) => r.accountCode === "PAYMENT" && r.transactionType === "IN")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const paymentOut = filtered
    .filter((r) => r.accountCode === "PAYMENT" && r.transactionType === "OUT")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentData = filtered.slice((page - 1) * perPage, page * perPage);

  const resetFilter = () => {
    setSearch("");
    setQuickFilter("today");
    setDefaultDates("today");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("ACCOUNT REPORT", 105, y, { align: "center" });

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 20, y);
    y += 6;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);

    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text(`Cash Balance: ${money(cashBalance)}`, 20, y);
    doc.text(`Payment Balance: ${money(paymentBalance)}`, 120, y);

    y += 10;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 6, 170, 10, "F");

    doc.text("Date", 22, y);
    doc.text("Account", 48, y);
    doc.text("Ref", 78, y);
    doc.text("Type", 115, y);
    doc.text("Amount", 140, y);
    doc.text("Desc", 165, y);

    y += 10;
    doc.setFont("helvetica", "normal");

    filtered.forEach((r) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const date = r.createdAt
        ? new Date(r.createdAt).toLocaleDateString()
        : "N/A";

      doc.text(date, 22, y);
      doc.text(r.accountCode, 48, y);
      doc.text(r.referenceNumber || `TX-${r.id}`, 78, y);
      doc.text(r.transactionType, 115, y);
      doc.text(money(r.amount), 140, y);
      doc.text(doc.splitTextToSize(r.description || "", 35), 165, y);

      y += 8;
    });

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  const printPDF = () => {
    const iframe = document.getElementById(
      "accountReportFrame"
    ) as HTMLIFrameElement;

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
          <h1 style={styles.title}>{t("accountreports", "Account Reports")}</h1>
          <p style={styles.subtitle}>
            {t("ledgeranalyticsdashboard", "ERP / Ledger Analytics Dashboard")}
          </p>
        </div>

        <button style={styles.exportBtn} onClick={exportPDF}>
          {t("exportpdf", "Export PDF")}
        </button>
      </div>

      <div style={styles.filterBox}>
        <div>
          <label style={styles.label}>{t("quickfilter", "Quick Filter")}</label>
          <select
            style={styles.input}
            value={quickFilter}
            onChange={(e) => {
              setQuickFilter(e.target.value);
              setDefaultDates(e.target.value);
            }}
          >
            <option value="today">{t("today", "Today")}</option>
            <option value="yesterday">{t("yesterday", "Yesterday")}</option>
            <option value="week">{t("last7days", "Last 7 Days")}</option>
            <option value="month">{t("thismonth", "This Month")}</option>
            <option value="all">{t("all", "All")}</option>
          </select>
        </div>

        <div>
          <label style={styles.label}>{t("startdate", "Start Date")}</label>
          <input style={styles.input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div>
          <label style={styles.label}>{t("enddate", "End Date")}</label>
          <input style={styles.input} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <button style={styles.applyBtn} onClick={loadReports}>
          {t("applyfilter", "Apply Filter")}
        </button>

        <button style={styles.resetBtn} onClick={resetFilter}>
          {t("reset", "Reset")}
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span>{t("cashbalance", "Cash Balance")}</span>
          <b style={styles.greenText}>{money(cashBalance)}</b>
        </div>

        <div style={styles.statCard}>
          <span>{t("paymentbalance", "Payment Balance")}</span>
          <b style={styles.redText}>{money(paymentBalance)}</b>
        </div>

        <div style={styles.statCard}>
          <span>{t("cashinout", "Cash IN / OUT")}</span>
          <b>{money(cashIn)} / {money(cashOut)}</b>
        </div>

        <div style={styles.statCard}>
          <span>{t("paymentinout", "Payment IN / OUT")}</span>
          <b>{money(paymentIn)} / {money(paymentOut)}</b>
        </div>
      </div>

      {loading && <div style={styles.loading}>{t("loading", "Loading...")}</div>}

      <input
        style={styles.search}
        placeholder={t("searchaccountrefdescription", "Search account, ref, description...")}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{t("date", "Date")}</th>
              <th style={styles.th}>{t("account", "Account")}</th>
              <th style={styles.th}>{t("ref", "Ref #")}</th>
              <th style={styles.th}>{t("description", "Description")}</th>
              <th style={styles.th}>{t("type", "Type")}</th>
              <th style={styles.th}>{t("amount", "Amount")}</th>
              <th style={styles.th}>{t("user", "User")}</th>
            </tr>
          </thead>

          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.empty}>
                  {t("noaccounttransactionsfound", "No account transactions found")}
                </td>
              </tr>
            ) : (
              currentData.map((r) => (
                <tr key={`${r.accountCode}-${r.id}`}>
                  <td style={styles.td}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}
                  </td>
                  <td style={styles.tdBold}>{r.accountCode}</td>
                  <td style={styles.td}>{r.referenceNumber || `TX-${r.id}`}</td>
                  <td style={styles.td}>{r.description || "N/A"}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        background: r.transactionType === "IN" ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {r.transactionType}
                    </span>
                  </td>
                  <td style={styles.amount}>{money(r.amount)}</td>
                  <td style={styles.td}>{r.username || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        <button style={styles.pageBtn} disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          {t("prev", "Prev")}
        </button>

        <b>{t("page", "Page")} {page} / {totalPages}</b>

        <button style={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          {t("next", "Next")}
        </button>
      </div>

      {pdfUrl && (
        <div style={styles.pdfBox}>
          <div style={styles.pdfHeader}>
            <h3 style={{ margin: 0 }}>
              {t("accountreportpreview", "Account Report Preview")}
            </h3>

            <div>
              <button style={styles.printBtn} onClick={printPDF}>
                {t("print", "Print")}
              </button>

              <button style={styles.closeBtn} onClick={closePDF}>
                {t("close", "Close")}
              </button>
            </div>
          </div>

          <iframe
            id="accountReportFrame"
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

export default AccountReportsPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "white",
    borderRadius: "24px",
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
    fontSize: "52px",
    color: "#0f172a",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "20px",
    color: "#64748b",
  },
  filterBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr auto auto",
    gap: "14px",
    alignItems: "end",
    marginTop: "18px",
    background: "#f8fafc",
    padding: "18px",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "bold",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    background: "white",
  },
  applyBtn: {
    border: "none",
    borderRadius: "14px",
    background: "#2563eb",
    color: "white",
    padding: "14px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  resetBtn: {
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    padding: "14px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  exportBtn: {
    border: "none",
    borderRadius: "16px",
    background: "#020617",
    color: "white",
    padding: "14px 22px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px",
    marginTop: "20px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "18px",
  },
  greenText: {
    color: "#16a34a",
    fontSize: "30px",
  },
  redText: {
    color: "#dc2626",
    fontSize: "30px",
  },
  loading: {
    marginTop: "14px",
    color: "#64748b",
  },
  search: {
    marginTop: "20px",
    width: "420px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
  },
  tableWrap: {
    marginTop: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#f1f5f9",
    padding: "14px",
    textAlign: "left",
    color: "#0f172a",
    fontSize: "16px",
  },
  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "15px",
  },
  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontWeight: "bold",
    fontSize: "15px",
  },
  amount: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#16a34a",
    fontWeight: "bold",
    fontSize: "15px",
  },
  badge: {
    color: "white",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
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
  printBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
    outline: "none",
  },
  closeBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "white",
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