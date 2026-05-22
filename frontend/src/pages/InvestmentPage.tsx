import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api";

const InvestmentPage = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [printUrl, setPrintUrl] = useState("");
  const [search, setSearch] = useState("");
const [page, setPage] = useState(1);

const pageSize = 5;
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
  const [form, setForm] = useState({
    amount: "",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
  });

  const loadAccounts = async () => {
    try {
      const res = await axios.get(`${API}/accounts`);
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.log(err.response?.data || err.message);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/accounts/INVEST/historygl`);
      setHistory(res.data?.history || []);
    } catch (err: any) {
      console.log("LOAD HISTORY ERROR 👉", err.response?.data || err.message);
      setHistory([]);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadHistory();
  }, []);






  const cashAccount = useMemo(() => {
    return accounts.find(
      (a) => String(a.accountCode).toUpperCase() === "CASH"
    );
  }, [accounts]);

  const investAccount = useMemo(() => {
    return accounts.find(
      (a) => String(a.accountCode).toUpperCase() === "INVEST"
    );
  }, [accounts]);

  const saveInvestment = async () => {
    const amount = Number(form.amount || 0);

    if (amount <= 0) {
      alert("Enter valid amount");
      return;
    }

    if (!cashAccount || !investAccount) {
      alert("CASH or INVEST account missing");
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/journal-entry`, {
        entryDate: form.entryDate,
        description: form.description || "Owner cash investment",
        createdBy: "Admin",
        lines: [
          {
            accountId: cashAccount.id,
            accountCode: cashAccount.accountCode,
            accountName: cashAccount.accountName,
            debit: amount,
            credit: 0,
            description: "Cash injected into business",
          },
          {
            accountId: investAccount.id,
            accountCode: investAccount.accountCode,
            accountName: investAccount.accountName,
            debit: 0,
            credit: amount,
            description: "Owner capital investment",
          },
        ],
      });

      alert("Investment posted ✅");

      setForm({
        amount: "",
        description: "",
        entryDate: new Date().toISOString().slice(0, 10),
      });

      loadAccounts();
      loadHistory();
    } catch (err: any) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

const filteredHistory = useMemo(() => {
  const q = search.toLowerCase();

  return history.filter((h) =>
    String(h.referenceNumber || "").toLowerCase().includes(q) ||
    String(h.description || "").toLowerCase().includes(q) ||
    String(h.transactionType || "").toLowerCase().includes(q) ||
    String(h.username || "").toLowerCase().includes(q) ||
    String(h.amount || "").includes(q)
  );
}, [history, search]);

const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;

const paginatedHistory = filteredHistory.slice(
  (page - 1) * pageSize,
  page * pageSize
);



  const printHistory = () => {
    const html = `
      <html>
        <head>
          <title>Capital Investment History</title>
          <style>
            body { font-family: Arial; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 4px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #eef2f7; text-align: left; padding: 12px; border: 1px solid #e2e8f0; }
            td { padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; }
            .amount { font-weight: bold; color: #16a34a; }
          </style>
        </head>
        <body>
          <h1>Capital Investment History</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              ${history
                .map(
                  (h) => `
                  <tr>
                    <td>${h.createdAt ? new Date(h.createdAt).toLocaleString() : "-"}</td>
                    <td>${h.referenceNumber || "-"}</td>
                    <td>${h.description || "-"}</td>
                    <td>${h.transactionType || "-"}</td>
                    <td class="amount">$${Number(h.amount || 0).toFixed(2)}</td>
                    <td>${h.username || "-"}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });

    if (printUrl) URL.revokeObjectURL(printUrl);

    setPrintUrl(URL.createObjectURL(blob));
  };

  const printIframe = () => {
    const iframe = document.getElementById("capitalPrintFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

 return (
  <div style={styles.page}>
    <div style={styles.layout}>
      <div style={styles.card}>
        <h1 style={styles.h1}>
          {t("ownerinvestment", "Owner Investment")}
        </h1>

        <p style={styles.sub}>
          {t("injectcashbusiness", "Inject cash into business")}
        </p>

        <input
          type="date"
          value={form.entryDate}
          onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
          style={styles.input}
        />

        <input
          type="number"
          min="0"
          placeholder={t("investmentamount", "Investment Amount")}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          style={styles.input}
        />

        <textarea
          placeholder={t("description", "Description")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={styles.textarea}
        />

        <div style={styles.preview}>
          <div style={styles.line}>
            <span>{t("debit", "Debit")}</span>
            <b>{t("cashaccount", "CASH ACCOUNT")}</b>
            <span>${Number(form.amount || 0).toFixed(2)}</span>
          </div>

          <div style={styles.line}>
            <span>{t("credit", "Credit")}</span>
            <b>{t("investaccount", "INVEST ACCOUNT")}</b>
            <span>${Number(form.amount || 0).toFixed(2)}</span>
          </div>
        </div>

        <button onClick={saveInvestment} disabled={saving} style={styles.saveBtn}>
          {saving
            ? t("posting", "Posting...")
            : t("postinvestment", "Post Investment")}
        </button>
      </div>

      <div style={styles.historyCard}>
        <div style={styles.historyHeader}>
          <h2 style={styles.cardTitle}>
            {t("transactionhistory", "Transaction History")}
          </h2>

          <div>
            <button onClick={printHistory} style={styles.previewBtn}>
              {t("previewprint", "Preview Print")}
            </button>

            {printUrl && (
              <button onClick={printIframe} style={styles.printBtn}>
                {t("print", "Print")}
              </button>
            )}
          </div>
        </div>

        <input
          placeholder={t("searchjournal", "Search ref, description, type, user...")}
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
                <th style={styles.th}>{t("ref", "Ref")}</th>
                <th style={styles.th}>{t("description", "Description")}</th>
                <th style={styles.th}>{t("type", "Type")}</th>
                <th style={styles.th}>{t("amount", "Amount")}</th>
                <th style={styles.th}>{t("user", "User")}</th>
              </tr>
            </thead>

            <tbody>
              {paginatedHistory.map((h) => (
                <tr key={h.id}>
                  <td style={styles.td}>
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleDateString()
                      : "-"}
                  </td>

                  <td style={styles.td}>{h.referenceNumber || "-"}</td>
                  <td style={styles.td}>{h.description || "-"}</td>
                  <td style={styles.td}>{h.transactionType || "-"}</td>

                  <td
                    style={{
                      ...styles.td,
                      color: "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    ${Number(h.amount || 0).toFixed(2)}
                  </td>

                  <td style={styles.td}>{h.username || "-"}</td>
                </tr>
              ))}

              {paginatedHistory.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.empty}>
                    {t("noinvestmenthistory", "No investment history found")}
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
            onClick={() => setPage(page + 1)}
            style={{
              ...styles.pageBtn,
              opacity: page === totalPages ? 0.5 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            {t("next", "Next")}
          </button>
        </div>

        {printUrl && (
          <iframe
            id="capitalPrintFrame"
            src={printUrl}
            style={styles.iframe}
            title={t("capitalinvestmentpreview", "Capital Investment Print Preview")}
          />
        )}
      </div>
    </div>
  </div>
);
};

export default InvestmentPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "40px",
    fontFamily: "Arial",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "420px minmax(0, 1fr)",
    gap: "22px",
  },

  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  historyCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    overflow: "hidden",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },

  cardTitle: {
    margin: 0,
    color: "#0f172a",
  },

  h1: {
    margin: 0,
    fontSize: "32px",
    color: "#0f172a",
  },

  sub: {
    marginTop: "-4px",
    marginBottom: "8px",
    color: "#64748b",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    resize: "vertical",
    boxSizing: "border-box",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },

  preview: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    marginTop: "6px",
  },

  line: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "15px",
  },

  saveBtn: {
    padding: "14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
  },

  previewBtn: {
    padding: "10px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  printBtn: {
    padding: "10px 14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },

  iframe: {
    width: "100%",
    height: "360px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    marginTop: "18px",
  },
  search: {
  width: "100%",
  padding: "13px 16px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  marginBottom: "14px",
  boxSizing: "border-box",
  outline: "none",
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