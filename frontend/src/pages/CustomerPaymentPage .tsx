import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api";

const initialForm = {
  customer_id: "",
  account_id: "",
  amount: "",
  payment_method: "Cash",
  reference_no: "",
  note: "",
  cashier: "",
};

const CustomerPaymentPage = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API}/ar/customers`);
      setCustomers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD CUSTOMER ERROR 👉", err.response?.data || err.message);
      setCustomers([]);
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
  const loadAccounts = async () => {
    try {
      const res = await axios.get(`${API}/bank/accounts`);
      setAccounts(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD ACCOUNTS ERROR 👉", err.response?.data || err.message);
      setAccounts([]);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadAccounts();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "customer_id") {
      const customer = customers.find((c) => String(c.id) === String(value));
      setSelectedCustomer(customer || null);
    }

    if (name === "account_id") {
      const account = accounts.find((a) => String(a.id) === String(value));
      setSelectedAccount(account || null);
    }
  };

  const savePayment = async () => {
    if (saving) return;

    if (!form.customer_id || !form.account_id || !form.amount) {
      alert("Select customer, account and enter amount");
      return;
    }

    try {
      setSaving(true);

      const res = await axios.post(`${API}/ar/customer-payment`, {
        customer_id: Number(form.customer_id),
        account_id: Number(form.account_id),
        amount: Number(form.amount),
        payment_method: form.payment_method,
        reference_no: form.reference_no,
        note: form.note,
        cashier: form.cashier || "admin",
      });

      const payment = res.data?.data;

      generateReceipt(payment);

      alert("Payment saved ✅");

      setForm(initialForm);
      setSelectedCustomer(null);
      setSelectedAccount(null);

      loadCustomers();
      loadAccounts();
    } catch (err: any) {
      console.log("PAYMENT ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  const generateReceipt = (payment: any) => {
    const customer = selectedCustomer;
    const account = selectedAccount;

    const doc = new jsPDF("portrait", "mm", "letter");

    const receiptNo = `RCP-${payment?.id || "NEW"}`;
    const amount = Number(payment?.amount || form.amount || 0);

    const accountName =
      account?.accountName ||
      account?.name ||
      account?.accountCode ||
      "";

    doc.setFillColor(245, 248, 252);
    doc.rect(0, 0, 216, 279, "F");

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PAYMENT RECEIPT", 15, 18);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("ERP Accounts Receivable", 15, 38);

    doc.setFont("helvetica", "bold");
    doc.text(`Receipt No: ${receiptNo}`, 15, 52);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 145, 52);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 58, 200, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Customer Information", 15, 72);

    doc.setFont("helvetica", "normal");
    doc.text(`Customer: ${customer?.name || ""}`, 15, 84);
    doc.text(`Phone: ${customer?.phone || "-"}`, 15, 94);
    doc.text(`Email: ${customer?.email || "-"}`, 15, 104);

    doc.line(15, 114, 200, 114);

    doc.setFont("helvetica", "bold");
    doc.text("Payment Details", 15, 128);

    doc.setFont("helvetica", "normal");
    doc.text(`Account: ${accountName}`, 15, 140);
    doc.text(`Method: ${form.payment_method}`, 15, 150);
    doc.text(`Reference: ${form.reference_no || "-"}`, 15, 160);
    doc.text(`Cashier: ${form.cashier || "admin"}`, 15, 170);
    doc.text(`Note: ${form.note || "-"}`, 15, 180);

    doc.setFillColor(220, 252, 231);
    doc.rect(15, 195, 185, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Amount Paid: $${amount.toFixed(2)}`, 22, 211);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your payment.", 15, 235);

    doc.line(130, 252, 195, 252);
    doc.text("Authorized Signature", 145, 260);

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  };

  const printReceipt = () => {
    const iframe = document.getElementById("receiptFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closeReceipt = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

 return (
  <div style={styles.page}>
    <div style={styles.formCard}>
      <h1 style={styles.h1}>
        {t("customerpayment", "Customer Payment")}
      </h1>

      <p style={styles.sub}>
        {t(
          "receivecustomerpayment",
          "Receive customer payment and print receipt"
        )}
      </p>

      <select
        name="customer_id"
        value={form.customer_id}
        onChange={handleChange}
        style={styles.input}
      >
        <option value="">{t("selectcustomer", "Select Customer")}</option>

        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {t("balance", "Balance")}: $
            {Number(c.balance || 0).toFixed(2)}
          </option>
        ))}
      </select>

      {selectedCustomer && (
        <div style={styles.infoBox}>
          <b>{selectedCustomer.name}</b>
          <span>
            {t("phone", "Phone")}: {selectedCustomer.phone || "-"}
          </span>
          <span>
            {t("balance", "Balance")}: $
            {Number(selectedCustomer.balance || 0).toFixed(2)}
          </span>
        </div>
      )}

      <select
        name="account_id"
        value={form.account_id}
        onChange={handleChange}
        style={styles.input}
      >
        <option value="">
          {t("selectcashbankaccount", "Select Cash / Bank Account")}
        </option>

        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.accountName || a.name || a.accountCode} —{" "}
            {a.accountType || a.type}
            {a.balance !== undefined
              ? ` — $${Number(a.balance || 0).toFixed(2)}`
              : ""}
          </option>
        ))}
      </select>

      {selectedAccount && (
        <div style={styles.accountBox}>
          <b>
            {selectedAccount.accountName ||
              selectedAccount.name ||
              selectedAccount.accountCode}
          </b>

          <span>
            {t("type", "Type")}:{" "}
            {selectedAccount.accountType || selectedAccount.type || "-"}
          </span>

          <span>
            {t("balance", "Balance")}: $
            {Number(selectedAccount.balance || 0).toFixed(2)}
          </span>
        </div>
      )}

      <input
        name="amount"
        type="number"
        placeholder={t("amountpaid", "Amount paid")}
        value={form.amount}
        onChange={handleChange}
        style={styles.input}
      />

      <select
        name="payment_method"
        value={form.payment_method}
        onChange={handleChange}
        style={styles.input}
      >
        <option value="Cash">{t("cash", "Cash")}</option>
        <option value="Check">{t("check", "Check")}</option>
        <option value="Bank Transfer">
          {t("banktransfer", "Bank Transfer")}
        </option>
        <option value="Zelle">Zelle</option>
        <option value="Card">{t("card", "Card")}</option>
      </select>

      <input
        name="reference_no"
        placeholder={t("referenceno", "Reference No")}
        value={form.reference_no}
        onChange={handleChange}
        style={styles.input}
      />

      <input
        name="cashier"
        placeholder={t("cashier", "Cashier")}
        value={form.cashier}
        onChange={handleChange}
        style={styles.input}
      />

      <textarea
        name="note"
        placeholder={t("note", "Note")}
        value={form.note}
        onChange={handleChange}
        style={styles.textarea}
      />

      <button onClick={savePayment} disabled={saving} style={styles.saveBtn}>
        {saving
          ? t("saving", "Saving...")
          : t("savepaymentpreview", "Save Payment & Preview Receipt")}
      </button>
    </div>

    <div style={styles.previewCard}>
      <div style={styles.previewHeader}>
        <h2 style={{ margin: 0 }}>
          {t("receiptpreview", "Receipt Preview")}
        </h2>

        {pdfUrl && (
          <div>
            <button onClick={printReceipt} style={styles.printBtn}>
              {t("print", "Print")}
            </button>

            <button onClick={closeReceipt} style={styles.closeBtn}>
              {t("close", "Close")}
            </button>
          </div>
        )}
      </div>

      {pdfUrl ? (
        <iframe
          id="receiptFrame"
          src={pdfUrl}
          width="100%"
          height="600"
          style={styles.iframe}
        />
      ) : (
        <div style={styles.emptyPreview}>
          {t(
            "receiptpreviewempty",
            "Receipt iframe will appear here after the payment is saved."
          )}
        </div>
      )}
    </div>
  </div>
);
};

export default CustomerPaymentPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f4f7fb",
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "24px",
    fontFamily: "Arial, sans-serif",
  },
  formCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },
  h1: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 500,
  },
  sub: {
    marginTop: "-4px",
    color: "#64748b",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },
  textarea: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    minHeight: "80px",
  },
  infoBox: {
    background: "#eef6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  accountBox: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  saveBtn: {
    padding: "13px",
    borderRadius: "10px",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  previewCard: {
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
    background: "#2563eb",
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
  emptyPreview: {
    height: "600px",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontSize: "18px",
  },
};