

import React, { useEffect, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;
const API = "/api";

type Account = {
  id: number;
  accountCode: "CASH" | "PAYMENT";
  accountName: string;
  accountType: string;
  balance: number;
};
type HistoryRow = {
  id: number;
  createdAt: string;
  description?: string;
  transactionType: "IN" | "OUT";
  amount: number;
  referenceNumber?: string;
  username?: string;
};
const AccountPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashHistory, setCashHistory] = useState<HistoryRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmData, setConfirmData] = useState<HistoryRow | null>(null);
const [lang, setLang] = useState<LangType>( (localStorage.getItem("lang") as LangType) || "en" );

  const t = (key: string, fallback: string) => {
    return (  (translations[lang] as Record<string, string>)?.[key] ||  fallback);
  };
   

  useEffect(() => {
   
      const handleLanguageChange = () => {
        setLang((localStorage.getItem("lang") as LangType) || "en");
      };
  
      handleLanguageChange();
  
      window.addEventListener("languageChanged", handleLanguageChange);
  
      return () => {  window.removeEventListener("languageChanged", handleLanguageChange); };
    }, []);
  useEffect(() => {
    loadAll();
  }, []);
  const loadAll = async () => {
    try {
      setLoading(true);
      const accRes = await axios.get(`${API}/accounts`);
      const cashRes = await axios.get(`${API}/accounts/CASH/history`);
      const payRes = await axios.get(`${API}/accounts/PAYMENT/history`);
      setAccounts(accRes.data || []);
      setCashHistory(cashRes.data?.history || []);
      setPaymentHistory(payRes.data?.history || []);
    } catch (err) {
      console.log("ACCOUNT LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  };
  const getBalance = (code: "CASH" | "PAYMENT") => {
    return Number(accounts.find((a) => a.accountCode === code)?.balance || 0);
  };
  const transfer = async (
    fromAccountCode: "CASH" | "PAYMENT",
    toAccountCode: "CASH" | "PAYMENT"
  ) => {
    const amount = Number(prompt("Enter transfer amount"));
    if (!amount || amount <= 0) return;
    try {
      await axios.post(`${API}/accounts/transfer`, {
        fromAccountCode,
        toAccountCode,
        amount,
        note: `${fromAccountCode} to ${toAccountCode}`,
        username: "Admin",
      });
      alert("Transfer completed ✅");
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Transfer failed");
    }
  };
  const confirmReverse = async () => {
    if (!confirmData) return;
    try {
      await axios.post(`${API}/accounts/reverse`, {
        transactionId: confirmData.id,
        username: "Admin",
      });
      alert("Transaction reversed ✅");
      setConfirmData(null);
      await loadAll();
    } catch (err: any) {
      console.log("REVERSE ERROR 👉", err.response?.data || err);
      alert(err.response?.data?.message || "Reverse failed");
    }
  };
  return (
    <div style={styles.page}>
    
  <AccountCard
    title={t("cashaccount", "Cash Account")}
    accountCode="CASH"
    balance={getBalance("CASH")}
    history={cashHistory}
    onLeft={() => transfer("PAYMENT", "CASH")}
    onRight={() => transfer("CASH", "PAYMENT")}
    onReverse={(row) => setConfirmData(row)}
  />

  <AccountCard
    title={t("paymentaccount", "Payment Account")}
    accountCode="PAYMENT"
    balance={getBalance("PAYMENT")}
    history={paymentHistory}
    onLeft={() => transfer("PAYMENT", "CASH")}
    onRight={() => transfer("CASH", "PAYMENT")}
    onReverse={(row) => setConfirmData(row)}
  />

      {loading && <div style={styles.loading}>Loading...</div>}
      {confirmData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Confirm Reverse</h3>
            <p>
              Are you sure you want to reverse transaction{" "}
              <b>{confirmData.referenceNumber || `TX-${confirmData.id}`}</b>?
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setConfirmData(null)}
              >
                No
              </button>
              <button style={styles.confirmBtn} onClick={confirmReverse}>
                Yes, Reverse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const AccountCard = ({
  title,
  accountCode,
  balance,
  history,
  onLeft,
  onRight,
  onReverse,
}: {
  title: string;
  accountCode: "CASH" | "PAYMENT";
  balance: number;
  history: HistoryRow[];
  onLeft: () => void;
  onRight: () => void;
  onReverse: (row: HistoryRow) => void;
}) => {
  const [page, setPage] = useState(1);
  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(history.length / perPage));
  const rows = history.slice((page - 1) * perPage, page * perPage);
  const money = (n: number) => {
    const sign = n < 0 ? "-" : "";
    return `${sign}$${Math.abs(Number(n || 0)).toFixed(2)}`;
  };
  const displayBalance =
    accountCode === "PAYMENT" ? -Math.abs(balance) : balance;
  const balanceColor =
    accountCode === "PAYMENT"
      ? "#dc2626"
      : displayBalance < 0
      ? "#dc2626"
      : "#16a34a";
  const isAlreadyReversed = (row: HistoryRow) => {
    const ref = row.referenceNumber;
    if (!ref) return false;
    if (ref.startsWith("REV-")) return true;
    return history.some((x) => x.referenceNumber === `REV-${ref}`);
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
return (
  <div style={styles.wrapper}>
    <div style={styles.titleBox}>{title}</div>

    <div style={styles.card}>
      <div style={{ ...styles.balance, color: balanceColor }}>
        {money(displayBalance)}
      </div>

      <div style={styles.label}>
        {t("currentbalance", "Current Balance")}
      </div>
    </div>

    <div style={styles.arrows}>
      <button style={styles.arrowBtn} onClick={onLeft}>
        ←
      </button>

      <button style={styles.arrowBtn} onClick={onRight}>
        →
      </button>
    </div>

    <div style={styles.historyBox}>
      <h3 style={styles.historyTitle}>
        {t("history", "History")}
      </h3>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t("date", "Date")}</th>
            <th style={styles.th}>{t("ref", "Ref #")}</th>
            <th style={styles.th}>{t("description", "Description")}</th>
            <th style={styles.th}>{t("type", "Type")}</th>
            <th style={styles.th}>{t("amount", "Amount")}</th>
            <th style={styles.th}>{t("action", "Action")}</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={styles.empty}>
                {t("nohistory", "No history")}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const reversed = isAlreadyReversed(r);

              return (
                <tr key={r.id}>
                  <td style={styles.td}>
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>

                  <td style={styles.td}>
                    {r.referenceNumber || `TX-${r.id}`}
                  </td>

                  <td style={styles.td}>
                    {r.description || "N/A"}
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          r.transactionType === "IN"
                            ? "#16a34a"
                            : "#dc2626",
                      }}
                    >
                      {r.transactionType}
                    </span>
                  </td>

                  <td style={styles.td}>{money(r.amount)}</td>

                  <td style={styles.td}>
                    <button
                      style={{
                        ...styles.reverseBtn,
                        background: reversed ? "#94a3b8" : "#f59e0b",
                        cursor: reversed ? "not-allowed" : "pointer",
                        opacity: reversed ? 0.65 : 1,
                      }}
                      disabled={reversed}
                      onClick={() => onReverse(r)}
                    >
                      {reversed
                        ? t("reversed", "Reversed")
                        : t("reverse", "Reverse")}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <button
          style={styles.pageBtn}
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t("prev", "Prev")}
        </button>

        <b>
          {t("page", "Page")} {page} / {totalPages}
        </b>

        <button
          style={styles.pageBtn}
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          {t("next", "Next")}
        </button>
      </div>
    </div>
  </div>
);
};
export default AccountPage;
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "24px",
    padding: "40px 24px",
    fontFamily: "Arial, sans-serif",
    position: "relative",
    width: "100%",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  wrapper: {
    width: "100%",
    minWidth: 0,
    textAlign: "center",
  },
  titleBox: {
    display: "inline-block",
    padding: "14px 30px",
    border: "4px solid #0f172a",
    borderRadius: "50px",
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "25px",
    background: "white",
    color: "#0f172a",
  },
  card: {
    height: "160px",
    width: "100%",
    boxSizing: "border-box",
    border: "4px solid #0f172a",
    borderRadius: "14px",
    background: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 15px 35px rgba(0,0,0,0.12)",
  },
  balance: {
    fontSize: "40px",
    fontWeight: "bold",
  },
  label: {
    marginTop: "10px",
    fontSize: "16px",
    color: "#64748b",
  },
  arrows: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "space-between",
  },
  arrowBtn: {
    width: "70px",
    height: "46px",
    borderRadius: "14px",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: "26px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  historyBox: {
    marginTop: "25px",
    background: "white",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    textAlign: "left",
    overflowX: "auto",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  historyTitle: {
    margin: "0 0 14px",
    color: "#0f172a",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#f1f5f9",
    padding: "10px",
    textAlign: "left",
    fontSize: "14px",
  },
  td: {
    padding: "10px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },
  empty: {
    padding: "20px",
    textAlign: "center",
    color: "#64748b",
  },
  badge: {
    color: "white",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  reverseBtn: {
    padding: "6px 10px",
    border: "none",
    borderRadius: "8px",
    background: "#f59e0b",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
  loading: {
    position: "fixed",
    top: 20,
    right: 20,
    background: "#0f172a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "12px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modal: {
    background: "white",
    padding: "30px",
    borderRadius: "16px",
    width: "360px",
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
  },
  modalActions: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },
  confirmBtn: {
    flex: 1,
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#e2e8f0",
    cursor: "pointer",
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