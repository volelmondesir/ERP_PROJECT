import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

const initialForm = {
  ficheDate: "",
  itemName: "",
  qty: "",
  note: "",
};

const InventoryFichePage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const res = await axios.get(`${API}/ic/inventory/items`);
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD ITEMS ERROR 👉", err.response?.data || err.message);
      setItems([]);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generatePDF = (data: any) => {
    const doc = new jsPDF("portrait", "mm", "letter");

    doc.setFillColor(245, 248, 252);
    doc.rect(0, 0, 216, 279, "F");

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("INVENTORY FICHE", 15, 18);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("ERP Inventory Control", 15, 38);

    doc.setFont("helvetica", "bold");
    doc.text(`Fiche No: INV-${data.id || "NEW"}`, 15, 52);
    doc.text(`Date: ${String(data.ficheDate || form.ficheDate).slice(0, 10)}`, 145, 52);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 60, 200, 60);

    doc.setFontSize(13);
    doc.text("Inventory Details", 15, 76);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Item: ${data.itemName || form.itemName}`, 15, 92);
    doc.text(`Quantity: ${Number(data.qty || form.qty || 0).toFixed(2)}`, 15, 106);

    doc.text("Note:", 15, 124);
    doc.setDrawColor(220, 220, 220);
    doc.rect(15, 130, 185, 45);
    doc.text(String(data.note || form.note || "-"), 20, 140, { maxWidth: 175 });

    doc.line(15, 198, 85, 198);
    doc.text("Prepared By", 30, 206);

    doc.line(130, 198, 200, 198);
    doc.text("Approved By", 145, 206);

    doc.setFontSize(10);
    doc.text("This document confirms inventory count / adjustment for the item listed above.", 15, 235, {
      maxWidth: 185,
    });

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  };

  const saveFiche = async () => {
    if (saving) return;

    if (!form.ficheDate || !form.itemName || !form.qty) {
      alert("Select date, item and qty");
      return;
    }

    try {
      setSaving(true);

      const res = await axios.post(`${API}/ic/inventory/fiche`, {
        ficheDate: form.ficheDate,
        itemName: form.itemName,
        qty: Number(form.qty),
        note: form.note,
      });

      const saved = res.data?.data;

      generatePDF(saved);

      alert("Inventory fiche saved ✅");

      setForm(initialForm);
    } catch (err: any) {
      console.log("SAVE FICHE ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewPDF = () => {
    if (!form.ficheDate || !form.itemName || !form.qty) {
      alert("Select date, item and qty");
      return;
    }

    generatePDF(form);
  };

  const printPDF = () => {
    const iframe = document.getElementById("inventoryFicheFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.formCard}>
        <h1 style={styles.h1}>Inventory Fiche</h1>
        <p style={styles.sub}>Create inventory count fiche and print PDF</p>

        <input
          type="date"
          name="ficheDate"
          value={form.ficheDate}
          onChange={handleChange}
          style={styles.input}
        />

        <select
          name="itemName"
          value={form.itemName}
          onChange={handleChange}
          style={styles.input}
        >
          <option value="">Select Item</option>
          {items.map((item, index) => (
            <option key={index} value={item.itemName}>
              {item.itemName}
            </option>
          ))}
        </select>

        <input
          name="qty"
          type="number"
          placeholder="Quantity"
          value={form.qty}
          onChange={handleChange}
          style={styles.input}
        />

        <textarea
          name="note"
          placeholder="Note"
          value={form.note}
          onChange={handleChange}
          style={styles.textarea}
        />

        <button onClick={previewPDF} style={styles.previewBtn}>
          Preview PDF
        </button>

        <button onClick={saveFiche} disabled={saving} style={styles.saveBtn}>
          {saving ? "Saving..." : "Save & Preview"}
        </button>
      </div>

      <div style={styles.previewCard}>
        <div style={styles.previewHeader}>
          <h2 style={{ margin: 0 }}>Inventory PDF Preview</h2>

          {pdfUrl && (
            <div>
              <button onClick={printPDF} style={styles.printBtn}>
                Print
              </button>
              <button onClick={closePDF} style={styles.closeBtn}>
                Close
              </button>
            </div>
          )}
        </div>

        {pdfUrl ? (
          <iframe
            id="inventoryFicheFrame"
            src={pdfUrl}
            width="100%"
            height="600"
            style={styles.iframe}
          />
        ) : (
          <div style={styles.emptyPreview}>
            Inventory fiche PDF ap parèt la apre preview oswa save.
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryFichePage;

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
    minHeight: "100px",
  },
  previewBtn: {
    padding: "13px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
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
    background: "#16a34a",
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