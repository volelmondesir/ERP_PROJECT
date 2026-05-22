import React, { useEffect, useState,useMemo } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;
const API = "/api";

type SupplierInvoice = {
  id: number;
  poId?: number;
  invoiceNumber: string;
  poNumber: string;
  supplier: string;
  total: number;
  paidAmount: number;
  status: string;
  createdAt?: string;
};

const AccountPayablePOPage = () => {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (
      (translations[lang] as Record<string, string>)?.[key] ||
      fallback
    );
  };
  const [page, setPage] = useState(1);
  const perPage = 5;

 

  const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

  const getUsername = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.username || "Admin";
    } catch {
      return "Admin";
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/ap/supplier-invoices`);
      setInvoices(Array.isArray(res.data) ? res.data : []);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD AP ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
     loadInvoices();
      const handleLanguageChange = () => {
        setLang((localStorage.getItem("lang") as LangType) || "en");
      };
  
      handleLanguageChange();
  
      window.addEventListener("languageChanged", handleLanguageChange);
  
      return () => {
        window.removeEventListener("languageChanged", handleLanguageChange);
      };
    }, []);

const filteredHistory = useMemo(() => {
  const q = search.toLowerCase();

  return invoices.filter((h) =>
    String(h.invoiceNumber || "").toLowerCase().includes(q) ||
    String(h.poNumber|| "").toLowerCase().includes(q) ||
    String(h.supplier || "").toLowerCase().includes(q) ||
    String(h.status || "").toLowerCase().includes(q) ||
    String(h.paidAmount || "").includes(q)
  );
}, [invoices, search]);

 const totalPages = Math.max(1, Math.ceil(invoices.length / perPage));
  const currentInvoices = invoices.slice((page - 1) * perPage, page * perPage);

const paginatedHistory = filteredHistory.slice(
  (page - 1) * perPage,
  page * perPage
);






  const getBalance = (inv: SupplierInvoice) => {
    return Number(inv.total || 0) - Number(inv.paidAmount || 0);
  };

  const selectInvoice = (inv: SupplierInvoice) => {
    setSelected(inv);
    setAmount(String(getBalance(inv)));
    setMethod("Cash");
    setNote("");
  };

  const payInvoice = async () => {
    if (!selected) {
      alert("Select invoice first");
      return;
    }

    const value = Number(amount);
    const balance = getBalance(selected);

    if (!value || value <= 0) {
      alert("Enter valid amount");
      return;
    }

    if (value > balance) {
      alert("Amount cannot exceed balance");
      return;
    }

    if (!window.confirm(`Pay ${money(value)} for ${selected.invoiceNumber}?`)) {
      return;
    }

    try {
      await axios.post(`${API}/ap/pay-supplier`, {
        supplierInvoiceId: selected.id,
        amount: value,
        method,
        note,
        username: getUsername(),
      });

      alert("Payment completed ✅");

      setSelected(null);
      setAmount("");
      setNote("");

      await loadInvoices();
    } catch (err: any) {
      console.log("PAY ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Payment failed");
    }
  };

  return (
  <div style={styles.page}>
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            💸 {t("accountpayable", "Account Payable")}
          </h2>

          <p style={styles.subtitle}>
            {t(
              "manageposupplierinvoices",
              "Manage PO supplier invoices and payments"
            )}
            
          </p>
          <input
  placeholder="Search ref, description, type, user..."
  value={search}
  onChange={(e) => {
    setSearch(e.target.value);
    setPage(1);
  }}
  style={styles.search}
/>
        </div>

        <button style={styles.refreshBtn} onClick={loadInvoices}>
          {t("refresh", "Refresh")}
        </button>
      </div>

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
               <th style={styles.th}>{t("po number", "PO Number")}</th>
              <th style={styles.th}>{t("supplier", "Supplier")}</th>
              <th style={styles.th}>{t("total", "Total")}</th>
              <th style={styles.th}>{t("paid", "Paid")}</th>
              <th style={styles.th}>{t("balance", "Balance")}</th>
              <th style={styles.th}>{t("status", "Status")}</th>
              <th style={styles.th}>{t("action", "Action")}</th>
            </tr>
          </thead>

          <tbody>
            {paginatedHistory.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.empty}>
                  {t("noapinvoices", "No AP invoices")}
                </td>
              </tr>
            ) : (
            paginatedHistory.map((inv) => {
                const balance = getBalance(inv);
                const status = (inv.status || "").toUpperCase();

                return (
                  <tr key={inv.id}
                  onMouseEnter={(e) =>
  (e.currentTarget.style.background = "#f8fafc")
}
onMouseLeave={(e) =>
  (e.currentTarget.style.background = "transparent")
}>
                    <td style={styles.tdBold}>{inv.invoiceNumber}</td>
                    <td style={styles.td}>{inv.poNumber}</td>
                    <td style={styles.td}>{inv.supplier}</td>
                    <td style={styles.amount}>{money(inv.total)}</td>
                    <td style={styles.td}>{money(inv.paidAmount)}</td>
                    <td style={styles.balance}>{money(balance)}</td>
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
                        {status === "PAID"
                          ? t("paid", "Paid")
                          : status === "PARTIAL"
                          ? t("partial", "Partial")
                          : t("unpaid", "Unpaid")}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{
                          ...styles.payBtn,
                          opacity: balance <= 0 ? 0.5 : 1,
                          cursor: balance <= 0 ? "not-allowed" : "pointer",
                        }}
                        disabled={balance <= 0}
                        onClick={() => selectInvoice(inv)}
                      >
                        {t("pay", "Pay")}
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

      {selected && (
        <div style={styles.paymentBox}>
          <h3 style={styles.sectionTitle}>
            {t("paysupplierinvoice", "Pay Supplier Invoice")}
          </h3>

          <div style={styles.infoGrid}>
            <div>
              <b>{t("invoice", "Invoice")}</b>
              <p>{selected.invoiceNumber}</p>
            </div>

            <div>
              <b>{t("supplier", "Supplier")}</b>
              <p>{selected.supplier}</p>
            </div>

            <div>
              <b>{t("balance", "Balance")}</b>
              <p style={styles.balanceText}>{money(getBalance(selected))}</p>
            </div>
          </div>

          <div style={styles.grid}>
            <input
              style={styles.input}
              type="number"
              placeholder={t("amount", "Amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <select
              style={styles.input}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Cash">{t("cash", "Cash")}</option>
              <option value="Cheque">{t("cheque", "Cheque")}</option>
              <option value="Bank Transfer">
                {t("banktransfer", "Bank Transfer")}
              </option>
            </select>
          </div>

          <textarea
            style={styles.textarea}
            placeholder={t("paymentnote", "Payment note")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div style={styles.actions}>
            <button style={styles.cancelBtn} onClick={() => setSelected(null)}>
              {t("cancel", "Cancel")}
            </button>

            <button style={styles.submitBtn} onClick={payInvoice}>
              {t("submitpayment", "Submit Payment")}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default AccountPayablePOPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "35px 24px",
    fontFamily: "Arial, sans-serif",
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
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    fontSize: "36px",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: "6px",
    color: "#64748b",
  },
  refreshBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#e2e8f0",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  loading: {
    marginBottom: "12px",
    color: "#64748b",
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
  },
  th: {
    background: "#f1f5f9",
    padding: "14px",
    textAlign: "left",
    color: "#0f172a",
  },
  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
  },
  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontWeight: "bold",
  },
  amount: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#16a34a",
    fontWeight: "bold",
  },
  balance: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#dc2626",
    fontWeight: "bold",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },
  badge: {
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
},
  payBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  pagination: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
  },
 pageBtn: {
  padding: "10px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  cursor: "pointer",
  fontWeight: 600,
},
  paymentBox: {
    marginTop: "24px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "20px",
  },
  sectionTitle: {
    marginTop: 0,
    color: "#0f172a",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  balanceText: {
    color: "#dc2626",
    fontWeight: "bold",
    fontSize: "18px",
  },
  grid: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  input: {
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    background: "white",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    marginTop: "14px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  actions: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  cancelBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#e2e8f0",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  submitBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#16a34a",
    color: "white",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
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
  
};