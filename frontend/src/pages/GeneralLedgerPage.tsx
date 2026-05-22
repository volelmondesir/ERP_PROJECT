import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;
const API = "http://localhost:5000/api";

const GeneralLedgerPage = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reversingId, setReversingId] = useState<number | null>(null);

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
  const loadAccounts = async () => {
    try {
      const res = await axios.get(`${API}/accounts`);
      setAccounts(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD ACCOUNTS ERROR 👉", err.response?.data || err.message);
      setAccounts([]);
    }
  };

  const loadHistory = async (code: string) => {
    if (!code) {
      setHistory([]);
      setSelectedAccount(null);
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(`${API}/accounts/${code}/historygl`);

      setSelectedAccount(res.data?.account || null);
      setHistory(res.data?.history || []);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD HISTORY ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Load history failed");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAccountChange = (code: string) => {
    setSelectedCode(code);
    loadHistory(code);
  };

  const reverseTransaction = async (row: any) => {
    if (row.isReversal || row.isAlreadyReversed) return;

    const ok = window.confirm(
      `Are you sure you want to reverse transaction ${row.referenceNumber || row.id}?`
    );

    if (!ok) return;

    try {
      setReversingId(row.id);

      await axios.post(`${API}/accounts/reverse`, {
        transactionId: row.id,
        username: "Admin",
      });

      alert("Transaction reversed ✅");

      await loadAccounts();
      await loadHistory(selectedCode);
    } catch (err: any) {
      alert(err.response?.data?.message || "Reverse failed");
    } finally {
      setReversingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return history.filter((r) =>
      String(r.referenceNumber || "").toLowerCase().includes(q) ||
      String(r.description || "").toLowerCase().includes(q) ||
      String(r.sourceType || "").toLowerCase().includes(q) ||
      String(r.username || "").toLowerCase().includes(q) ||
      String(r.transactionType || "").toLowerCase().includes(q) ||
      String(r.amount || "").includes(q)
    );
  }, [history, search]);

  const totalIn = filtered
    .filter((r) => String(r.transactionType || "").toUpperCase() === "IN")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const totalOut = filtered
    .filter((r) => String(r.transactionType || "").toUpperCase() === "OUT")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const netBalance = totalIn - totalOut;

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);

 return (
  <div style={styles.page}>
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>{t("generalledger", "General Ledger")}</h1>
        <p style={styles.sub}>
          {t(
            "ledgercontrolsubtitle",
            "Account transaction history, balance, and reversal control"
          )}
        </p>
      </div>

      <button
        onClick={() => {
          loadAccounts();
          if (selectedCode) loadHistory(selectedCode);
        }}
        style={styles.refreshBtn}
      >
        {t("refresh", "Refresh")}
      </button>
    </div>

    <div style={styles.summaryGrid}>
      <div style={styles.summaryCard}>
        <span style={styles.summaryLabel}>{t("totalin", "Total In")}</span>
        <b style={{ ...styles.summaryValue, color: "#16a34a" }}>
          ${totalIn.toFixed(2)}
        </b>
      </div>

      <div style={styles.summaryCard}>
        <span style={styles.summaryLabel}>{t("totalout", "Total Out")}</span>
        <b style={{ ...styles.summaryValue, color: "#dc2626" }}>
          ${totalOut.toFixed(2)}
        </b>
      </div>

      <div style={styles.summaryCard}>
        <span style={styles.summaryLabel}>{t("netbalance", "Net Balance")}</span>
        <b style={{ ...styles.summaryValue, color: "#2563eb" }}>
          ${netBalance.toFixed(2)}
        </b>
      </div>
    </div>

    <div style={styles.card}>
      <div style={styles.toolbar}>
        <select
          value={selectedCode}
          onChange={(e) => handleAccountChange(e.target.value)}
          style={styles.input}
        >
          <option value="">{t("selectaccount", "Select Account")}</option>

          {accounts.map((a) => (
            <option key={a.id} value={a.accountCode}>
              {a.accountCode} - {a.accountName} | {t("balance", "Balance")}: $
              {Number(a.balance || 0).toFixed(2)}
            </option>
          ))}
        </select>

        <input
          placeholder={t(
            "searchledger",
            "Search ref, description, source, user..."
          )}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={styles.search}
        />
      </div>

      {selectedAccount && (
        <div style={styles.accountBox}>
          <div style={styles.accountRow}>
            <b>
              {selectedAccount.accountCode} - {selectedAccount.accountName}
            </b>

            <b style={{ color: netBalance >= 0 ? "#16a34a" : "#dc2626" }}>
              {t("balance", "Balance")}: ${netBalance.toFixed(2)}
            </b>
          </div>
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{t("date", "Date")}</th>
              <th style={styles.th}>{t("ref", "Ref #")}</th>
              <th style={styles.th}>{t("source", "Source")}</th>
              <th style={styles.th}>{t("description", "Description")}</th>
              <th style={styles.th}>{t("type", "Type")}</th>
              <th style={styles.th}>{t("amount", "Amount")}</th>
              <th style={styles.th}>{t("runningbalance", "Running Balance")}</th>
              <th style={styles.th}>{t("user", "User")}</th>
              <th style={styles.th}>{t("action", "Action")}</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((row) => {
              const type = String(row.transactionType || "").toUpperCase();
              const isIn = type === "IN";
              const disabled =
                row.isReversal || row.isAlreadyReversed || reversingId === row.id;

              return (
                <tr key={row.id}>
                  <td style={styles.td}>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "-"}
                  </td>

                  <td style={styles.td}>{row.referenceNumber || "-"}</td>
                  <td style={styles.td}>{row.sourceType || "-"}</td>
                  <td style={styles.td}>{row.description || "-"}</td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        background: isIn ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {type}
                    </span>
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color: isIn ? "#16a34a" : "#dc2626",
                      fontWeight: "bold",
                    }}
                  >
                    ${Number(row.amount || 0).toFixed(2)}
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color: "#2563eb",
                      fontWeight: "bold",
                    }}
                  >
                    ${Number(row.runningBalance || 0).toFixed(2)}
                  </td>

                  <td style={styles.td}>{row.username || "-"}</td>

                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    {row.isReversal ? (
                      <span style={{ ...styles.statusBadge, background: "#dc2626" }}>
                        {t("reversal", "Reversal")}
                      </span>
                    ) : row.isAlreadyReversed ? (
                      <span style={{ ...styles.statusBadge, background: "#64748b" }}>
                        {t("reversed", "Reversed")}
                      </span>
                    ) : (
                      <button
                        disabled={disabled}
                        onClick={() => reverseTransaction(row)}
                        style={{
                          ...styles.reverseBtn,
                          opacity: disabled ? 0.5 : 1,
                          cursor: disabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {reversingId === row.id
                          ? t("reversing", "Reversing...")
                          : t("reverse", "Reverse")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {!loading && paginatedData.length === 0 && (
              <tr>
                <td colSpan={9} style={styles.empty}>
                  {selectedCode
                    ? t("notransactionsfound", "No transactions found")
                    : t("selectaccountviewledger", "Select an account to view ledger")}
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={9} style={styles.empty}>
                  {t("loadingledger", "Loading ledger...")}
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
          }}
        >
          {t("next", "Next")}
        </button>
      </div>
    </div>
  </div>
);
};

export default GeneralLedgerPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
  },

  h1: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 600,
    color: "#0f172a",
  },

  sub: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "16px",
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

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "18px",
    marginBottom: "22px",
  },

  summaryCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "15px",
  },

  summaryValue: {
    fontSize: "28px",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  toolbar: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "14px",
    marginBottom: "16px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },

  search: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },

  accountBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px 16px",
    marginBottom: "16px",
  },

  accountRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    minWidth: "1250px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
    whiteSpace: "nowrap",
    color: "#0f172a",
  },

  td: {
    padding: "13px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    whiteSpace: "nowrap",
    color: "#334155",
  },

  badge: {
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
  },

  reverseBtn: {
    padding: "8px 12px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  statusBadge: {
    color: "#fff",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
    display: "inline-block",
  },

  empty: {
    padding: "30px",
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
    cursor: "pointer",
  },

  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },
};