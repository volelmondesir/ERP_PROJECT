import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

const POtoINVPage = () => {
  const [poNumber, setPoNumber] = useState("");
  const [po, setPo] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

  const loadPO = async () => {
    if (!poNumber.trim()) {
      alert("Enter PO Number");
      return;
    }

    try {
      const res = await axios.get(
        `${API}/po/number/${encodeURIComponent(poNumber.trim())}`
      );

      console.log("PO 👉", res.data);

      setPo(res.data);
      setPdfUrl("");
      setInvoiceNumber("");
    } catch (err: any) {
      console.log("LOAD PO ERROR 👉", err.response?.data || err);
      alert(err.response?.data?.message || "PO not found");
    }
  };

  const getTotal = () => {
    if (!po?.items) return 0;

    return po.items.reduce(
      (sum: number, i: any) =>
        sum + Number(i.quantity || 0) * Number(i.price || 0),
      0
    );
  };

  const generatePDF = (invNo: string) => {
    if (!po) return;

    const doc = new jsPDF();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SUPPLIER INVOICE", 105, y, { align: "center" });

    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(`Invoice #: ${invNo}`, 20, y);
    y += 8;

    doc.text(`PO #: ${po.poNumber}`, 20, y);
    y += 8;

    doc.text(`Supplier: ${po.supplier}`, 20, y);
    y += 8;

    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y);
    y += 12;

    doc.line(20, y, 190, y);
    y += 10;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 6, 170, 10, "F");

    doc.setFont("helvetica", "bold");
    doc.text("#", 22, y);
    doc.text("Material", 32, y);
    doc.text("Qty", 85, y);
    doc.text("Unit", 105, y);
    doc.text("Price", 125, y);
    doc.text("Total", 180, y);

    y += 10;
    doc.setFont("helvetica", "normal");

    po.items.forEach((item: any, index: number) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const total = qty * price;
      const materialLines = doc.splitTextToSize(item.materialName || "", 45);

      doc.text(String(index + 1), 22, y);
      doc.text(materialLines, 32, y);
      doc.text(String(qty), 85, y);
      doc.text(item.unit || "", 105, y);
      doc.text(money(price), 125, y);
      doc.text(money(total), 190, y, { align: "right" });

      y += Math.max(8, materialLines.length * 6);
    //  doc.line(20, y - 3, 190, y - 3);
    });

    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("INVOICE TOTAL:", 130, y);
    doc.text(money(getTotal()), 190, y, { align: "right" });

    y += 18;

    doc.setFont("helvetica", "normal");
    doc.text(
      "Please use this invoice to proceed with material purchase.",
      20,
      y
    );

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  const convertToInvoice = async () => {
    if (!po) {
      alert("Load PO first");
      return;
    }

    const total = getTotal();

    if (total <= 0) {
      alert("PO total is invalid. Check item price.");
      return;
    }

    try {
      console.log("SENDING 👉", {
        poId: po.id,
        supplier: po.supplier,
        amount: total,
        items: po.items,
      });

      const res = await axios.post(`${API}/po/from-po`, {
        poId: po.id,
        supplier: po.supplier,
        amount: total,
        items: po.items,
        username: "Admin",
      });

      console.log("INVOICE 👉", res.data);

      const invNo = res.data.invoiceNumber || "AP-INV-001";

      setInvoiceNumber(invNo);
      generatePDF(invNo);

      alert("Invoice created ✅");
    } catch (err: any) {
  console.log("CONVERT ERROR 👉", err.response?.data || err);
  alert(err.response?.data?.message || "Convert failed");
}
    
  };

  const printPDF = () => {
    const iframe = document.getElementById("frame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  const newInvoice = () => {
    setPoNumber("");
    setPo(null);
    setPdfUrl("");
    setInvoiceNumber("");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>PO → Supplier Invoice</h1>
            <p style={styles.subtitle}>
              Convert PO total into Account Payable invoice
            </p>
          </div>

          <button style={styles.newBtn} onClick={newInvoice}>
            New
          </button>
        </div>

        <div style={styles.loadBox}>
          <input
            style={styles.input}
            placeholder="Enter PO Number"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
          />

          <button style={styles.loadBtn} onClick={loadPO}>
            Load PO
          </button>
        </div>

        {po && (
          <div style={styles.poBox}>
            <div style={styles.infoGrid}>
              <div>
                <b>Supplier</b>
                <p>{po.supplier}</p>
              </div>

              <div>
                <b>PO Number</b>
                <p>{po.poNumber}</p>
              </div>

              <div>
                <b>Invoice Total</b>
                <p style={styles.totalText}>{money(getTotal())}</p>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Material</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Unit</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {po.items?.map((item: any, index: number) => {
                    const qty = Number(item.quantity || 0);
                    const price = Number(item.price || 0);

                    return (
                      <tr key={index}>
                        <td style={styles.td}>{item.materialName}</td>
                        <td style={styles.td}>{qty}</td>
                        <td style={styles.td}>{item.unit}</td>
                        <td style={styles.td}>{money(price)}</td>
                        <td style={styles.amount}>{money(qty * price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button style={styles.convertBtn} onClick={convertToInvoice}>
              Convert to Invoice
            </button>
          </div>
        )}

        {pdfUrl && (
          <div style={styles.pdfBox}>
            <div style={styles.pdfHeader}>
              <h3 style={{ margin: 0 }}>
                Invoice Preview {invoiceNumber ? `- ${invoiceNumber}` : ""}
              </h3>

              <div>
                <button style={styles.printBtn} onClick={printPDF}>
                  Print
                </button>

                <button style={styles.closeBtn} onClick={closePDF}>
                  Close
                </button>
              </div>
            </div>

            <iframe
              id="frame"
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

export default POtoINVPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "35px 24px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "1100px",
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
    fontSize: "34px",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: "6px",
    color: "#64748b",
  },
  newBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#e2e8f0",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  loadBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    marginBottom: "20px",
  },
  input: {
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
  },
  loadBtn: {
    border: "none",
    borderRadius: "14px",
    background: "#2563eb",
    color: "#fff",
    padding: "0 22px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  poBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  totalText: {
    color: "#16a34a",
    fontWeight: "bold",
    fontSize: "20px",
  },
  tableWrap: {
    marginTop: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflowX: "auto",
    background: "white",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#f1f5f9",
    padding: "13px",
    textAlign: "left",
  },
  td: {
    padding: "12px 13px",
    borderTop: "1px solid #e2e8f0",
  },
  amount: {
    padding: "12px 13px",
    borderTop: "1px solid #e2e8f0",
    color: "#16a34a",
    fontWeight: "bold",
  },
  convertBtn: {
    marginTop: "18px",
    width: "100%",
    border: "none",
    borderRadius: "14px",
    background: "#16a34a",
    color: "#fff",
    padding: "15px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
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
  },
  closeBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "white",
  },
};