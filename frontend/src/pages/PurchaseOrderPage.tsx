import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

const API = "http://localhost:5000/api";

type POItem = {
  materialName: string;
  quantity: number;
  unit: string;
  price: number;
  note?: string;
};

const PurchaseOrderPage = () => {
  const [supplier, setSupplier] = useState("");
  const [poDate, setPoDate] = useState("");
  const [comment, setComment] = useState("");

  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  const [items, setItems] = useState<POItem[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [poNumber, setPoNumber] = useState("");

  const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

  const poTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const getUsername = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.username || "Admin";
    } catch {
      return "Admin";
    }
  };

  const addItem = () => {
    const qty = Number(quantity);
    const pr = Number(price);

    if (!materialName.trim() || qty <= 0 || pr <= 0) {
      alert("Enter material, quantity and price");
      return;
    }

    setItems([
      ...items,
      {
        materialName: materialName.trim(),
        quantity: qty,
        unit,
        price: pr,
        note: note.trim(),
      },
    ]);

    setMaterialName("");
    setQuantity("");
    setPrice("");
    setUnit("pcs");
    setNote("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const savePO = async () => {
    if (!supplier.trim() || !poDate || items.length === 0) {
      alert("Fill supplier, date, and add items");
      return;
    }

    try {
      const res = await axios.post(`${API}/po`, {
        supplier: supplier.trim(),
        poDate,
        comment: comment.trim(),
        items,
        username: getUsername(),
      });

      const newPoNumber = res.data.poNumber;

      setPoNumber(newPoNumber);
      generatePDF(newPoNumber);

      alert("PO created ✅");
    } catch (err: any) {
      console.log("SAVE PO ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Save failed");
    }
  };

  const generatePDF = (poNo: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = 20;
    const username = getUsername();
const canvas = document.createElement("canvas");


    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PURCHASE ORDER", pageWidth / 2, y, { align: "center" });

    y += 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(`PO #: ${poNo}`, 20, y);
    y += 8;
JsBarcode(canvas, poNo, {
  format: "CODE128",
  width: 2,
  height: 40,
  displayValue: true,
});

doc.addImage(
  canvas.toDataURL("image/png"),
  "PNG",
  125,
  30,
  65,
  25
);
    doc.text(`Supplier: ${supplier}`, 20, y);
    y += 8;

    doc.text(`Date: ${new Date(poDate).toLocaleDateString()}`, 20, y);
    y += 8;

    doc.text(`Created By: ${username}`, 20, y);
    y += 12;

    doc.line(20, y, 190, y);
    y += 10;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 6, 170, 10, "F");

    doc.setFont("helvetica", "bold");
    doc.text("#", 22, y);
    doc.text("Material", 32, y);
    doc.text("Qty", 82, y);
    doc.text("Unit", 102, y);
    doc.text("Price", 123, y);
    doc.text("Total", 148, y);
    doc.text("Note", 172, y);

    y += 10;
    doc.setFont("helvetica", "normal");

    items.forEach((item, index) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const lineTotal = item.quantity * item.price;
      const materialLines = doc.splitTextToSize(item.materialName, 45);
      const noteLines = doc.splitTextToSize(item.note || "-", 22);

      doc.text(String(index + 1), 22, y);
      doc.text(materialLines, 32, y);
      doc.text(String(item.quantity), 82, y);
      doc.text(item.unit, 102, y);
      doc.text(money(item.price), 123, y);
      doc.text(money(lineTotal), 148, y);
      doc.text(noteLines, 172, y);

      const rowHeight = Math.max(materialLines.length, noteLines.length) * 6;
      y += Math.max(8, rowHeight);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, y - 3, 190, y - 3);
    });

    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("PO TOTAL:", 130, y);
    doc.text(money(poTotal), 190, y, { align: "right" });
    doc.setFont("helvetica", "normal");

    if (comment.trim()) {
      y += 14;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text("Comment:", 20, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(comment, 170), 20, y);
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Generated by ERP System", pageWidth / 2, pageHeight - 10, {
      align: "center",
    });

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  const printPDF = () => {
    const iframe = document.getElementById("poFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const newPO = () => {
    setSupplier("");
    setPoDate("");
    setComment("");
    setMaterialName("");
    setQuantity("");
    setUnit("pcs");
    setPrice("");
    setNote("");
    setItems([]);
    setPoNumber("");

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Create PO</h1>
            <p style={styles.subtitle}>Create purchase order and print PDF</p>
          </div>

          <button style={styles.secondaryBtn} onClick={newPO}>
            New PO
          </button>
        </div>

        <div style={styles.grid}>
          <input
            style={styles.input}
            placeholder="Supplier / Vendor Name"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />

          <input
            style={styles.input}
            type="date"
            value={poDate}
            onChange={(e) => setPoDate(e.target.value)}
          />
        </div>

        <textarea
          style={styles.textarea}
          placeholder="PO comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div style={styles.itemBox}>
          <h3 style={styles.sectionTitle}>Add Material</h3>

          <div style={styles.grid}>
            <input
              style={styles.input}
              placeholder="Material name"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
            />

            <input
              style={styles.input}
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />

            <input
              style={styles.input}
              type="number"
              placeholder="Unit Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <select
              style={styles.input}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="pcs">pcs</option>
              <option value="box">box</option>
              <option value="kg">kg</option>
              <option value="gal">gal</option>
              <option value="meter">meter</option>
              <option value="liter">liter</option>
            </select>
          </div>

          <textarea
            style={styles.textarea}
            placeholder="Item note / specification"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button style={styles.addBtn} onClick={addItem}>
            Add Material
          </button>
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
                <th style={styles.th}>Note</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.empty}>
                    No materials added
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{item.materialName}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>{item.unit}</td>
                    <td style={styles.td}>{money(item.price)}</td>
                    <td style={styles.amount}>
                      {money(item.quantity * item.price)}
                    </td>
                    <td style={styles.td}>{item.note || "N/A"}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.removeBtn}
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.totalBox}>
          <span>PO Total</span>
          <b>{money(poTotal)}</b>
        </div>

        <button style={styles.submitBtn} onClick={savePO}>
          Save & Preview PO
        </button>

        {pdfUrl && (
          <div style={styles.pdfBox}>
            <div style={styles.pdfHeader}>
              <h3 style={{ margin: 0 }}>
                PO Preview {poNumber ? `- ${poNumber}` : ""}
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
              id="poFrame"
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

export default PurchaseOrderPage;

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
    background: "#fff",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "center",
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    fontSize: "36px",
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    marginTop: "6px",
  },
  secondaryBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#e2e8f0",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  grid: {
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
    background: "#fff",
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
  itemBox: {
    marginTop: "24px",
    padding: "20px",
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  sectionTitle: {
    marginTop: 0,
    color: "#0f172a",
  },
  addBtn: {
    marginTop: "14px",
    border: "none",
    borderRadius: "12px",
    background: "#2563eb",
    color: "#fff",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  tableWrap: {
    marginTop: "24px",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflowX: "auto",
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
  amount: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#16a34a",
    fontWeight: "bold",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },
  removeBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "#fff",
    padding: "8px 12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  totalBox: {
    marginTop: "18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "18px",
  },
  submitBtn: {
    marginTop: "24px",
    width: "100%",
    border: "none",
    borderRadius: "14px",
    background: "#16a34a",
    color: "#fff",
    padding: "15px",
    fontSize: "17px",
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