import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import glogo from "../assets/glogo.png";
 import { saveAuditLog } from "../utils/tempLog2";   
 
const API = "/api";

const DevisePurchasePage: React.FC = () => {
  const [devises, setDevises] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  const [customerName, setCustomerName] = useState("");
  const [deviseId, setDeviseId] = useState("");
  const [amountDevise, setAmountDevise] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const customerRef = useRef<HTMLInputElement>(null);

  const perPage = 5;

  const selected = devises.find((d) => d.id === Number(deviseId));

  const rate = Number(selected?.rate || 0);
  const injectedAmount = Number(selected?.injectedAmount || 0);
  const totalHTG = Number(amountDevise || 0) * rate;

  const remainingAfter =
    Number(amountDevise || 0) > 0
      ? Math.max(injectedAmount - totalHTG, 0)
      : injectedAmount;

  const difference =
    Number(amountDevise || 0) > 0
      ? remainingAfter
      : 0;

  const money = (n?: number) => `$${Number(n ?? 0).toFixed(2)}`;
 const moneyHTG = (n?: number) => `HTG ${Number(n ?? 0).toFixed(2)}`;
  useEffect(() => {
    loadAll();

    setTimeout(() => {
      customerRef.current?.focus();
    }, 100);
  }, []);
useEffect(() => {

  saveAuditLog({

  moduleName: "Cashier",

    submenuName: "Buy Currency",

    actionType: "VIEW PAGE",

  });

}, []);
  const loadAll = async () => {
    try {
      const d = await axios.get(`${API}/devises`);
      const h = await axios.get(`${API}/devises/purchase/history`);
      const c = await axios.get(`${API}/company`);

      setDevises(d.data || []);
      setHistory(h.data || []);
      setCompany(c.data?.data || c.data || null);
    } catch (err) {
      console.log("LOAD ERROR 👉", err);
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
      margin: 0,
    });

    return canvas.toDataURL("image/png");
  };

  const generateReceiptPDF = (data: any) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 210],
    });

    let y = 10;

    const center = (text?: string) => {
      doc.text(text || "", 40, y, { align: "center" });
      y += 5;
    };

    const right = (text: string) => {
      doc.text(text, 75, y, { align: "right" });
    };

    center(company?.companyName || "STORE");
    center(company?.address || "");
    center(company?.phone || "");

    y += 3;

    const barcode = generateBarcode(data.receiptNumber);
    doc.addImage(barcode, "PNG", 15, y, 50, 14);

    y += 18;

    doc.line(5, y, 75, y);
    y += 5;

    doc.text(`Receipt: ${data.receiptNumber}`, 5, y);
    y += 5;

    doc.text(`Customer: ${data.customerName || "N/A"}`, 5, y);
    y += 5;

    doc.text(`Cashier: ${data.cashier || "N/A"}`, 5, y);
    y += 5;

    doc.text(`Date: ${new Date().toLocaleString()}`, 5, y);
    y += 5;

    doc.line(5, y, 75, y);
    y += 5;

    doc.text("Devise:", 5, y);
    right(data.deviseName || "-");
    y += 5;

    doc.text("Montant Devise:", 5, y);
    right(money(data.amountDevise));
    y += 5;

  //  doc.text("Taux:", 5, y);
   // right(money(data.rate));
   // y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL HTG:", 5, y);
    right(money(data.totalHTG));
    doc.setFont("helvetica", "normal");
    y += 7;

   // doc.text("Balance Avant:", 5, y);
   // right(money(data.injectedBefore));
  //  y += 5;

  //  doc.text("Balance Apre:", 5, y);
   // right(money(data.remainingAfter));
  //  y += 6;

    doc.line(5, y, 75, y);
    y += 5;

    center(company?.footerMessage || "Thank you!");

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  const savePurchase = async () => {
    if (!customerName || !deviseId || !amountDevise) {
      alert("Fill all fields");
      return;
    }

    if (totalHTG <= 0) {
      alert("Invalid amount");
      return;
    }

    if (totalHTG > injectedAmount) {
      alert("The amount injected is not enough.");
      return;
    }

    const payload = {
      customerName,
       cashier: getUsername(),
      deviseId: Number(deviseId),
      deviseName: selected?.name || "",
      amountDevise: Number(amountDevise),
      rate,
      totalHTG,
    };

    try {
      setLoading(true);

      const res = await axios.post(`${API}/devises/purchase`, payload);

        // AUDIT LOG
   await saveAuditLog({
  moduleName: "Cashier",
  submenuName: "Buy Currency",
  actionType: `CREATE Buy Currency:  ${res.data.receiptNumber}`,
});
     const receiptNo =
  res.data.receiptNumber || "DEV-" + Date.now();


const receiptData = {
  ...payload,
  receiptNumber: receiptNo,
  cashier: getUsername(),
  injectedBefore: Number(res.data.injectedBefore || injectedAmount),
  difference: Number(res.data.difference || difference),
  remainingAfter: Number(res.data.remainingAfter || remainingAfter),
  barcode: generateBarcode(receiptNo),
};
      generateReceiptPDF(receiptData);
      setReceipt(receiptData);

      alert("Purchase saved ✅");

      setCustomerName("");
      setAmountDevise("");

      await loadAll();

      window.dispatchEvent(new Event("dashboardUpdated"));
    } catch (err: any) {
      console.log("SAVE PURCHASE ERROR 👉", err.response?.data || err);
      alert(err.response?.data || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const newTransaction = () => {
    setCustomerName("");
    setDeviseId("");
    setAmountDevise("");
    setPdfUrl(null);
    setReceipt(null);

    setTimeout(() => {
      customerRef.current?.focus();
    }, 100);
  };

  const printReceipt = () => {
    window.print();
  };

  const filtered = history.filter((h) =>
    `${h.customerName} ${h.deviseName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);

  const paged = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Buying Currency</h1>
            <p style={styles.subtitle}>
            Buy currency, calculate HTG, and print the customer receipt
            </p>
          </div>

          <button onClick={newTransaction} style={styles.secondaryBtn}>
            New Transaction
          </button>
        </div>

        <div style={styles.grid}>
          <div>
            <h2 style={styles.sectionTitle}>New Purchase</h2>

            <input
              ref={customerRef}
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={styles.input}
            />

            <select
              value={deviseId}
              onChange={(e) => setDeviseId(e.target.value)}
              style={styles.input}
            >
              <option value="">Currency</option>

              {devises.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Amount Currency"
              value={amountDevise}
              onChange={(e) => setAmountDevise(e.target.value)}
              style={styles.input}
            />

            <div style={styles.result}>
              <div style={styles.row}>
                <span>Currency</span>
                <b>{selected?.name || "-"}</b>
              </div>

              <div style={styles.row}>
                <span>Rate</span>
                <b>{moneyHTG(rate)}</b>
              </div>

              <div style={styles.row}>
                <span>Amount Currency</span>
                <b>{moneyHTG(Number(amountDevise || 0))}</b>
              </div>

              <div style={styles.totalRow}>
                <span>Total</span>
                <b>{moneyHTG(totalHTG)}</b>
              </div>

              <div style={styles.row}>
                <span>Amount Injected</span>
                <b>{moneyHTG(injectedAmount)}</b>
              </div>

              <div style={styles.row}>
                <span>Difference</span>
                <b>{moneyHTG(difference)}</b>
              </div>

              <div style={styles.row}>
                <span>remaining</span>
                <b>{moneyHTG(remainingAfter)}</b>
              </div>
            </div>

            <button
              onClick={savePurchase}
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Saving..." : "Save Buy"}
            </button>

            {pdfUrl && (
              <div className="no-print" style={{ marginTop: 18 }}>
                <a href={pdfUrl} download="devise-receipt.pdf">
                  <button style={styles.secondaryBtn}>
                    Download PDF
                  </button>
                </a>
              </div>
            )}

            {receipt && (
              <div className="no-print" style={{ marginTop: 18 }}>
                <button onClick={printReceipt} style={styles.submitBtn}>
                  🖨 Print Receipt
                </button>
              </div>
            )}
          </div>

          <div>
            <div style={styles.historyHeader}>
              <h2 style={styles.sectionTitle}>Transaction History</h2>

             
            </div>

            <input
              placeholder="Search customer / currency"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={styles.input}
            />

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Customer</th>
                     <th style={styles.th}>ReceiptNumber</th>
                    <th style={styles.th}>Currency</th>
                    <th style={styles.th}>USD</th>
                    <th style={styles.th}>Paid HTG</th>
                    <th style={styles.th}>Before</th>
                    <th style={styles.th}>Remaining</th>
                  </tr>
                </thead>

                <tbody>
                  {paged.map((h) => (
                    <tr key={h.id}>
                      <td style={styles.td}>{h.customerName}</td>
                       <td style={styles.td}>{h.receiptNumber}</td>
                      <td style={styles.td}>{h.deviseName}</td>
                      <td style={styles.td}>{money(h.amountDevise)}</td>
                      <td style={styles.td}>{moneyHTG(h.totalHTG)}</td>
                      <td style={styles.td}>{moneyHTG(h.injectedBefore)}</td>
                      <td style={styles.td}>{moneyHTG(h.remainingAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.pagination}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={styles.pageBtn}
              >
                Prev
              </button>

              <span style={styles.pageText}>
                Page {page} / {totalPages || 1}
              </span>

              <button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(page + 1)}
                style={styles.pageBtn}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {receipt && (
          <div className="receipt">
            <div className="receipt-center">
              <img src={glogo} alt="logo" className="receipt-logo" />

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
              <span>Customer</span>
              <span>{receipt.customerName}</span>
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

            <div className="receipt-row">
              <span>Devise</span>
              <span>{receipt.deviseName}</span>
            </div>

            <div className="receipt-row">
              <span>Montant</span>
              <span>{money(receipt.amountDevise)}</span>
            </div>

           

            <div className="receipt-row receipt-total">
              <span>TOTAL </span>
              <span>{moneyHTG(receipt.totalHTG)}</span>
            </div>

            <div className="receipt-line"></div>

       
            <div className="receipt-line"></div>

            <div className="receipt-footer">
              {company?.footerMessage || "Thank you!"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevisePurchasePage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
    overflowX: "hidden",
  },

  card: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "26px",
    padding: "28px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
    marginBottom: "26px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    color: "#0f172a",
  },

  subtitle: {
    margin: "8px 0 0",
    fontSize: "16px",
    color: "#64748b",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
    gap: "24px",
    alignItems: "start",
  },

  sectionTitle: {
    margin: "0 0 18px",
    color: "#0f172a",
  },

  input: {
    width: "100%",
    padding: "15px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "14px",
  },

  result: {
    background: "#f8fafc",
    padding: "18px",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    marginBottom: "18px",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px 0",
    color: "#334155",
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 0",
    color: "#0f172a",
    fontSize: "18px",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    margin: "8px 0",
  },

  submitBtn: {
    width: "100%",
    padding: "14px 28px",
    border: "none",
    borderRadius: "14px",
    background: "#16a34a",
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

  smallBtn: {
    padding: "9px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

   tableWrap: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
  },

   table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "720px",
  },

  th: {
    textAlign: "left",
    padding: "10px 8px",
    color: "#334155",
    fontSize: "13px",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px 8px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "13px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  pagination: {
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  pageBtn: {
    padding: "9px 15px",
    border: "none",
    background: "#e2e8f0",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },
};