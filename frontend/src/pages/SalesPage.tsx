import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import glogo from "../assets/glogo.png";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";    
type LangType = keyof typeof translations;

const API = "http://localhost:5000";

type Item = {
  name?: string;
  itemName?: string;
  price?: number;
  quantity?: number;
  qty?: number;
};

type Invoice = {
  id: number;
  invoiceNumber?: string;
  customerName?: string;
  username?: string;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  paidAmount?: number;
  items?: Item[];
};

type Company = {
  companyName?: string;
  address?: string;
  phone?: string;
  footerMessage?: string;
};

const SalesPage: React.FC = () => {
  const [invoiceId, setInvoiceId] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
  };

  const money = (n?: number) => `$${Number(n ?? 0).toFixed(2)}`;
useEffect(() => {

  saveAuditLog({

  moduleName: "Cashier",

    submenuName: "Sales",

    actionType: "VIEW PAGE",

  });

}, []);
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
    loadCompany();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const loadCompany = async () => {
    try {
      const companyRes = await axios.get(`${API}/api/company`);
      setCompany(companyRes.data?.data || companyRes.data);
    } catch (err) {
      console.log("COMPANY LOAD ERROR 👉", err);
    }
  };

  const getUsername = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return "Admin";

    try {
      const parsed = JSON.parse(storedUser);
      return parsed.username || "Admin";
    } catch {
      return "Admin";
    }
  };

  const generateBarcode = (value: string) => {
    const canvas = document.createElement("canvas");

    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true,
    });

    return canvas.toDataURL("image/png");
  };

  const balance = Math.max(
    Number(invoice?.total ?? 0) - Number(invoice?.paidAmount ?? 0),
    0
  );

  const computedStatus =
    Number(invoice?.paidAmount ?? 0) >= Number(invoice?.total ?? 0)
      ? "PAID"
      : Number(invoice?.paidAmount ?? 0) > 0
      ? "PARTIAL"
      : "UNPAID";

  const isPaid = computedStatus === "PAID";

  const loadInvoice = async () => {
    if (!invoiceId.trim()) {
      alert("Enter invoice");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(`${API}/api/invoices/${invoiceId.trim()}`);

      setInvoice(res.data);
      setPdfUrl(null);
      setReceipt(null);
      setAmount("");
    } catch (err: any) {
      console.log("INVOICE LOAD ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Invoice not found");
    } finally {
      setLoading(false);
    }
  };

  const newPayment = () => {
    setInvoice(null);
    setInvoiceId("");
    setAmount("");
    setPdfUrl(null);
    setReceipt(null);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const printReceipt = () => {
    window.print();
  };

  const generateReceiptPDF = (
    inv: Invoice,
    payment: {
      receiptNumber: string;
      cashReceived: number;
      amountPaidNow: number;
      change: number;
      cashier: string;
    }
  ) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 220],
    });

    let y = 10;

    const center = (text?: string) => {
      doc.text(text || "", 40, y, { align: "center" });
      y += 5;
    };

    const right = (text: string) => {
      doc.text(text, 75, y, { align: "right" });
    };

    const subtotal = Number(inv.subtotal ?? 0);
    const tax = Number(inv.taxAmount ?? 0);

    const taxRate =
      inv.taxRate && inv.taxRate > 0
        ? Number(inv.taxRate)
        : subtotal > 0
        ? (tax / subtotal) * 100
        : 0;

    const total = Number(inv.total ?? 0);
    const paidNow = Number(payment.amountPaidNow ?? 0);
    const cashReceived = Number(payment.cashReceived ?? paidNow);
    const change = Number(payment.change ?? 0);
    const remainingBalance = Math.max(
      total - Number(inv.paidAmount ?? 0),
      0
    );

    center(company?.companyName || "STORE");
    center(company?.address || "");
    center(company?.phone || "");

    y += 3;

    const barcode = generateBarcode(payment.receiptNumber);
    doc.addImage(barcode, "PNG", 15, y, 50, 14);

    y += 18;

    doc.line(5, y, 75, y);
    y += 5;

    doc.text(`Receipt: ${payment.receiptNumber}`, 5, y);
    y += 5;

    doc.text(`Invoice: ${inv.invoiceNumber || "-"}`, 5, y);
    y += 5;

    doc.text(`Customer: ${inv.customerName || "N/A"}`, 5, y);
    y += 5;

    doc.text(`Cashier: ${payment.cashier || inv.username || "N/A"}`, 5, y);
    y += 5;

    doc.line(5, y, 75, y);
    y += 5;

    inv.items?.forEach((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 0);
      const price = Number(item.price ?? 0);
      const totalLine = qty * price;

      const itemName = doc.splitTextToSize(
        item.name || item.itemName || "",
        60
      );

      doc.setFontSize(10);
      doc.text(itemName, 5, y);
      y += itemName.length * 5;

      doc.setFontSize(8);
      doc.text(`${qty} x ${money(price)}`, 5, y);
      right(money(totalLine));

      doc.setFontSize(10);
      y += 6;
    });

    doc.line(5, y, 75, y);
    y += 5;

    doc.text("Subtotal:", 5, y);
    right(money(subtotal));
    y += 5;

    doc.text(`Tax (${taxRate.toFixed(2)}%):`, 5, y);
    right(money(tax));
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    right(money(total));
    doc.setFont("helvetica", "normal");
    y += 6;

    doc.text("Applied:", 5, y);
    right(money(paidNow));
    y += 5;

    doc.text("Cash:", 5, y);
    right(money(cashReceived));
    y += 5;

    doc.text("Balance:", 5, y);
    right(money(remainingBalance));
    y += 5;

    doc.text("Change:", 5, y);
    right(money(change));
    y += 6;

    doc.line(5, y, 75, y);
    y += 5;

    center(company?.footerMessage || "Thank you!");

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  const handlePayment = async () => {
    if (!invoice || !amount.trim()) {
      alert("Enter amount");
      return;
    }

    const val = Number(amount);

    if (Number.isNaN(val) || val <= 0) {
      alert("Invalid amount");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API}/api/rcp/payments`, {
        invoiceId: invoice.id,
        username: getUsername(),
        amount: val,
      });
 // AUDIT LOG
   await saveAuditLog({
  moduleName: "Cashier",
  submenuName: "Sales",
  actionType: `CREATE SALES: ${invoice?.invoiceNumber} | ${res.data.receiptNumber}`,
});
      const updated = await axios.get(
        `${API}/api/invoices/${invoice.invoiceNumber}`
      );

      const updatedInvoice = updated.data;

      setInvoice(updatedInvoice);

      const paymentData = {
        receiptNumber: res.data.receiptNumber,
        cashReceived: Number(res.data.cashReceived ?? val),
        amountPaidNow: Number(res.data.amountPaidNow ?? 0),
        change: Number(res.data.change ?? 0),
        cashier: getUsername(),
      };

      generateReceiptPDF(updatedInvoice, paymentData);

      setReceipt({
        receiptNumber: paymentData.receiptNumber,
        invoiceNumber: updatedInvoice.invoiceNumber,
        customerName: updatedInvoice.customerName,
        cashier: paymentData.cashier,
        items: updatedInvoice.items || [],
        subtotal: Number(updatedInvoice.subtotal || 0),
        taxRate: Number(updatedInvoice.taxRate || 0),
        taxAmount: Number(updatedInvoice.taxAmount || 0),
        total: Number(updatedInvoice.total || 0),
        paidNow: paymentData.amountPaidNow,
        cashReceived: paymentData.cashReceived,
        change: paymentData.change,
        balance: Math.max(
          Number(updatedInvoice.total || 0) -
            Number(updatedInvoice.paidAmount || 0),
          0
        ),
        barcode: generateBarcode(paymentData.receiptNumber),
      });

      setAmount("");

      alert(`Payment success ✅ Change: ${money(res.data.change)}`);
      window.dispatchEvent(
  new Event("dashboardUpdated")
);
    } catch (err: any) {
      console.log("PAYMENT ERROR:", err.response?.data || err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Payment error"
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
            <h1 style={styles.title}>{t("payinvoice", "Pay Invoice")}</h1>

            <p style={styles.subtitle}>
              {t("loadinvoicecollectpayment", "Load invoice and collect payment")}
            </p>
          </div>

          <button onClick={newPayment} style={styles.secondaryBtn}>
            {t("newpayment", "New Payment")}
          </button>
        </div>

        <div style={styles.searchRow}>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder={t("invoicenumber", "Invoice Number")}
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value.replace(/\s+/g, ""))}
          />

          <button
            onClick={loadInvoice}
            disabled={loading}
            style={styles.primaryBtn}
          >
            {loading ? t("loading", "Loading...") : t("load", "Load")}
          </button>
        </div>

        {invoice && (
          <>
            <div style={styles.invoiceCard}>
              <div>
                <p style={styles.label}>{t("invoice", "Invoice")}</p>
                <h2 style={styles.invoiceNo}>{invoice.invoiceNumber}</h2>
              </div>

              <div>
                <p style={styles.label}>{t("customer", "Customer")}</p>
                <h2 style={styles.invoiceNo}>{invoice.customerName}</h2>
              </div>

              <div>
                <p style={styles.label}>{t("status", "Status")}</p>

                <span
                  style={{
                    ...styles.badge,
                    background:
                      computedStatus === "PAID"
                        ? "#16a34a"
                        : computedStatus === "PARTIAL"
                        ? "#f59e0b"
                        : "#dc2626",
                  }}
                >
                  {computedStatus === "PAID"
                    ? t("paid", "Paid")
                    : computedStatus === "PARTIAL"
                    ? t("partial", "Partial")
                    : t("unpaid", "Unpaid")}
                </span>
              </div>
            </div>

            <div style={styles.summaryGrid}>
              <div style={styles.summaryBox}>
                <span>{t("total", "Total")}</span>
                <strong>{money(invoice.total)}</strong>
              </div>

              <div style={styles.summaryBox}>
                <span>{t("paid", "Paid")}</span>
                <strong>{money(invoice.paidAmount)}</strong>
              </div>

              <div style={styles.summaryBox}>
                <span>{t("balance", "Balance")}</span>
                <strong>{money(balance)}</strong>
              </div>
            </div>

            <div style={styles.payRow}>
              <input
                style={styles.input}
                type="number"
                min="0"
                placeholder={t("amountreceived", "Amount received")}
                value={amount}
                disabled={isPaid || loading}
                onChange={(e) => setAmount(e.target.value)}
              />

              <button
                onClick={handlePayment}
                disabled={isPaid || loading}
                style={{
                  ...styles.submitBtn,
                  opacity: isPaid || loading ? 0.6 : 1,
                }}
              >
                {isPaid
                  ? t("paid", "Paid")
                  : loading
                  ? t("processing", "Processing...")
                  : t("pay", "Pay")}
              </button>
            </div>

            {pdfUrl && (
              <div className="no-print" style={{ marginTop: 20 }}>
                <a href={pdfUrl} download="payment-receipt.pdf">
                  <button style={styles.secondaryBtn}>Download PDF</button>
                </a>
              </div>
            )}

            {receipt && (
              <>
                <div className="no-print" style={{ marginTop: 20 }}>
                  <button onClick={printReceipt} style={styles.submitBtn}>
                    🖨 Print Receipt
                  </button>
                </div>

                <div className="receipt">
                  <div className="receipt-center">
                                <img
    src={glogo}
    alt="glogo"
    className="receipt-logo"
  />
                    <div className="receipt-title">
                      {company?.companyName || "STORE"}
                    </div>

                    <div className="receipt-subtitle">
                      {company?.address || ""}
                    </div>

                    <div className="receipt-subtitle">
                      {company?.phone || ""}
                    </div>

                    {receipt.barcode && (
                      <img
                        src={receipt.barcode}
                        alt="barcode"
                        className="receipt-barcode"
                      />
                    )}
                  </div>

                  <div className="receipt-line"></div>

                  <div className="receipt-row">
                    <span>Receipt</span>
                    <span>{receipt.receiptNumber}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Invoice</span>
                    <span>{receipt.invoiceNumber}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Customer</span>
                    <span>{receipt.customerName || "N/A"}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Cashier</span>
                    <span>{receipt.cashier}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Date</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>

                  <div className="receipt-line"></div>

                  {receipt.items.map((item: any, i: number) => {
                    const qty = Number(item.quantity ?? item.qty ?? 0);
                    const price = Number(item.price ?? 0);
                    const name = item.name || item.itemName || "-";

                    return (
                      <div key={i}>
                        <div className="receipt-item-name">{name}</div>

                        <div className="receipt-row">
                          <span>
                            {qty} x {money(price)}
                          </span>

                          <span>{money(qty * price)}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="receipt-line"></div>

                  <div className="receipt-row">
                    <span>Subtotal</span>
                    <span>{money(receipt.subtotal)}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Tax</span>
                    <span>{money(receipt.taxAmount)}</span>
                  </div>

                  <div className="receipt-row receipt-total">
                    <span>TOTAL</span>
                    <span>{money(receipt.total)}</span>
                  </div>

                  <div className="receipt-line"></div>

                  <div className="receipt-row">
                    <span>Applied</span>
                    <span>{money(receipt.paidNow)}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Cash</span>
                    <span>{money(receipt.cashReceived)}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Balance</span>
                    <span>{money(receipt.balance)}</span>
                  </div>

                  <div className="receipt-row">
                    <span>Change</span>
                    <span>{money(receipt.change)}</span>
                  </div>

                  <div className="receipt-line"></div>

                  <div className="receipt-footer">
                    {company?.footerMessage || "Thank you!"}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "40px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    maxWidth: "760px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "26px",
    padding: "32px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
    marginBottom: "26px",
  },

  title: {
    margin: 0,
    fontSize: "38px",
    color: "#0f172a",
  },

  subtitle: {
    margin: "8px 0 0",
    fontSize: "17px",
    color: "#64748b",
  },

  searchRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },

  input: {
    flex: 1,
    padding: "15px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "17px",
    outline: "none",
  },

  primaryBtn: {
    padding: "14px 24px",
    border: "none",
    borderRadius: "14px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  secondaryBtn: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  invoiceCard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "16px",
    padding: "20px",
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    marginBottom: "18px",
  },

  label: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  invoiceNo: {
    margin: "6px 0 0",
    fontSize: "20px",
    color: "#0f172a",
  },

  badge: {
    display: "inline-block",
    marginTop: "8px",
    padding: "8px 14px",
    borderRadius: "999px",
    color: "#fff",
    fontWeight: "bold",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },

  summaryBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "18px",
  },

  payRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },

  submitBtn: {
    padding: "14px 28px",
    border: "none",
    borderRadius: "14px",
    background: "#16a34a",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};