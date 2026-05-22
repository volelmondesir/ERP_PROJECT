import { useEffect, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api";

const AccountPayablePage = () => {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

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

  const getUsername = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return "Admin";

    try {
      const user = JSON.parse(storedUser);
      return user?.username || "Admin";
    } catch {
      return "Admin";
    }
  };

  const submitTransaction = async () => {
    const value = Number(amount);

    if (!date || !description.trim() || value <= 0) {
      alert(t("fillallfields", "Fill all fields"));
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API}/ap`, {
        date,
        description: description.trim(),
        amount: value,
        username: getUsername(),
      });

      alert(t("transactionsaved", "Transaction saved ✅"));

      setDate("");
      setDescription("");
      setAmount("");
    } catch (err: any) {
      console.log("AP SAVE ERROR 👉", err.response?.data || err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          t("savefailed", "Save failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              💳 {t("accountpayable", "Account Payable")}
            </h1>

            <p style={styles.subtitle}>
              {t(
                "creditpaymentaccountdebitcashaccount",
                "Credit Payment Account / Debit Cash Account"
              )}
            </p>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t("date", "Date")}</label>

          <input
            type="date"
            style={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            {t("description", "Description")}
          </label>

          <input
            style={styles.input}
            placeholder={t("enterdescription", "Enter description...")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t("amount", "Amount")}</label>

          <input
            type="number"
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          disabled={loading}
          onClick={submitTransaction}
        >
          {loading
            ? t("saving", "Saving...")
            : `💾 ${t("savetransaction", "Save Transaction")}`}
        </button>
      </div>
    </div>
  );
};

export default AccountPayablePage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f1f5f9",
    padding: "20px",
  },

  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "18px",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
  },

  header: {
    marginBottom: "25px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "18px",
  },

  title: {
    fontSize: "34px",
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: "6px",
  },

  subtitle: {
    color: "#64748b",
    fontSize: "15px",
  },

  label: {
    marginBottom: "8px",
    fontWeight: 600,
    color: "#334155",
  },

  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "15px",
  },

  button: {
    marginTop: "10px",
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    fontSize: "15px",
    transition: "0.2s ease",
  },
};