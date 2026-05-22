import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { can } from "../utils/auth";
import axios from "axios";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api";

const initialForm = {
  date: "",
  beneficiaire: "",
  beneficiaire_name: "",
  amount: "",
  reason: "",
  requester: "",
  department: "",
  bank_id: "",
};

const ChequeFormPage = () => {
  const [banks, setBanks] = useState<any[]>([]);
  const [formData, setFormData] = useState(initialForm);
  const [pin, setPin] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);

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
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const res = await axios.get(`${API}/bank/banks`);
      setBanks(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.log("LOAD BANK ERROR 👉", err.response?.data || err.message);
      setBanks([]);
    }
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const verifyPin = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!pin.trim()) {
      alert(t("enterpin", "Enter PIN"));
      return;
    }

    try {
      const res = await axios.post(`${API}/bank/verify-pin`, {
        username: user.username || "Admin",
        pin,
      });

      if (res.data?.success) {
        setIsVerified(true);
        alert(t("accessgranted", "Access granted ✅"));
      } else {
        setIsVerified(false);
        alert(res.data?.message || t("wrongpin", "Wrong PIN ❌"));
      }
    } catch (err: any) {
      console.log("PIN ERROR 👉", err.response?.data || err);
      alert(err.response?.data?.message || t("pinfailed", "PIN verification failed"));
    }
  };

  const handleSave = async () => {
    if (saving) return;

    if (!isVerified) {
      alert(t("verifypinfirst", "Verify PIN first 🔐"));
      return;
    }

    if (
      !formData.bank_id ||
      !formData.date ||
      !formData.beneficiaire ||
      !formData.amount
    ) {
      alert(t("fillchequefields", "Fill bank, date, beneficiaire and amount"));
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/ar/cheque`, {
        date: formData.date,
        amount: Number(formData.amount),
        beneficiaire_id: 1,
        beneficiaire_name: formData.beneficiaire,
        reason: formData.reason,
        requester: formData.requester,
        department: formData.department,
        bank_id: Number(formData.bank_id),
        fraud_flag: false,
        fraud_note: "",
      });

      alert(t("saved", "Saved 🔥"));

      setFormData(initialForm);
      setPin("");
      setIsVerified(false);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl("");
      }
    } catch (err: any) {
      console.log("SAVE ERROR 👉", err.response?.data || err);
      alert(err.response?.data?.message || t("savefailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const numberToWords = (num: number) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const convert = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
      if (n < 1000) {
        return `${ones[Math.floor(n / 100)]} Hundred ${convert(n % 100)}`.trim();
      }
      if (n < 1000000) {
        return `${convert(Math.floor(n / 1000))} Thousand ${convert(n % 1000)}`.trim();
      }

      return n.toString();
    };

    const integer = Math.floor(num);
    const cents = Math.round((num - integer) * 100);

    let words = integer === 0 ? "Zero Dollars" : `${convert(integer)} Dollars`;

    if (cents > 0) {
      words += ` and ${cents}/100`;
    }

    return `${words} Only`;
  };

  const generatePDF = () => {
    if (!isVerified) {
      alert(t("enterpinfirst", "Enter PIN first 🔐"));
      return;
    }

    if (
      !formData.bank_id ||
      !formData.date ||
      !formData.beneficiaire ||
      !formData.amount
    ) {
      alert(t("fillchequefields", "Fill bank, date, beneficiaire and amount"));
      return;
    }

    const selectedBank = banks.find(
      (b) => String(b.id) === String(formData.bank_id)
    );

    const doc = new jsPDF("landscape");
    const amount = Number(formData.amount || 0);
    const amountWords = numberToWords(amount);

    doc.setFillColor(200, 230, 240);
    doc.rect(0, 0, 297, 150, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(selectedBank?.name || "BANK NAME", 15, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(selectedBank?.account_number || "", 15, 35);

    doc.setFontSize(12);
    doc.text("DATE:", 220, 40);
    doc.text(formData.date, 242, 40);

    doc.text("PAY TO THE ORDER OF:", 15, 55);
    doc.line(15, 60, 200, 60);
    doc.text(formData.beneficiaire, 18, 58);

    doc.rect(210, 52, 70, 12);
    doc.setFont("helvetica", "bold");
    doc.text(`$ ${amount.toFixed(2)}`, 220, 60);

    doc.setFont("helvetica", "normal");
    doc.line(15, 75, 290, 75);
    doc.setFontSize(11);
    doc.text(amountWords, 18, 73);

    doc.setFontSize(12);
    doc.text("MEMO:", 15, 95);
    doc.text(formData.reason || "", 40, 95);

    doc.text("Requester:", 15, 110);
    doc.text(formData.requester || "", 45, 110);

    doc.text("Department:", 15, 120);
    doc.text(formData.department || "", 45, 120);

    doc.line(210, 115, 285, 115);
    doc.text("Authorized Signature", 220, 123);

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  };

  const printPDF = () => {
    const iframe = document.getElementById("chequeFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  const newCheque = () => {
    setFormData(initialForm);
    setPin("");
    setIsVerified(false);

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{t("chequeform", "Cheque Form")}</h2>

        <select
          name="bank_id"
          value={formData.bank_id}
          onChange={handleChange}
          style={styles.input}
        >
          <option value="">{t("selectbank", "Select Bank")}</option>

          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.account_number}
            </option>
          ))}
        </select>

        <input
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="beneficiaire"
          autoComplete="off"

          placeholder={t("beneficiaire", "Beneficiaire")}
          value={formData.beneficiaire}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="amount"
          type="number"
          autoComplete="off"
          placeholder={t("amount", "Amount")}
          value={formData.amount}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="reason"
          autoComplete="off"
          placeholder={t("reason", "Reason")}
          value={formData.reason}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="requester"
          autoComplete="off"
          placeholder={t("requester", "Requester")}
          value={formData.requester}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="department"
          autoComplete="off"
          placeholder={t("department", "Department")}
          value={formData.department}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          type="password"
          autoComplete="off"
          placeholder={t("enterpin", "Enter PIN")}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={styles.input}
        />

        <button onClick={verifyPin} style={styles.button}>
          {t("verifypin", "Verify PIN")}
        </button>

        <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? t("saving", "Saving...") : t("save", "Save")}
        </button>

        {can("cheque", "delete") && (
          <button style={styles.deleteBtn}>
            {t("delete", "Delete")}
          </button>
        )}

        <button
          onClick={generatePDF}
          disabled={!isVerified}
          style={{
            ...styles.previewBtn,
            opacity: !isVerified ? 0.5 : 1,
            cursor: !isVerified ? "not-allowed" : "pointer",
          }}
        >
          {t("previewcheque", "Preview Cheque")}
        </button>

        <button onClick={newCheque} style={styles.newBtn}>
          {t("newcheque", "New Cheque")}
        </button>
      </div>

      {pdfUrl && (
        <div style={styles.previewBox}>
          <div style={styles.previewHeader}>
            <h3 style={{ margin: 0 }}>
              {t("chequepreview", "Cheque Preview")}
            </h3>

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
            id="chequeFrame"
            src={pdfUrl}
            width="100%"
            height="420"
            style={styles.iframe}
          />
        </div>
      )}
    </div>
  );
};

export default ChequeFormPage;

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#f3f6fb",
    display: "flex",
    gap: "24px",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "35px 24px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    width: "360px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },

  title: {
    margin: "0 0 8px",
    color: "#0f172a",
  },

  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },

  button: {
    padding: "11px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  saveBtn: {
    padding: "11px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  deleteBtn: {
    padding: "11px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  previewBtn: {
    padding: "11px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  newBtn: {
    padding: "11px",
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  previewBox: {
    background: "#fff",
    padding: "18px",
    borderRadius: "18px",
    width: "720px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  printBtn: {
    padding: "9px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  closeBtn: {
    padding: "9px 14px",
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