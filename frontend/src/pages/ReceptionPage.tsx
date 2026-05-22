import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

type POItem = {
  id?: number;
  materialName: string;
  quantity: number;
  unit: string;
  price?: number;
  note?: string;
  alreadyReceived?: number;
  receivedNow?: number;
};

type PO = {
  id: number;
  poNumber: string;
  supplier: string;
  poDate?: string;
  items: POItem[];
};

const ReceptionPage = () => {
  const [poNumber, setPoNumber] = useState("");
  const [po, setPo] = useState<PO | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [comment, setComment] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [receptionNumber, setReceptionNumber] = useState("");

  const getUsername = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.username || "Admin";
    } catch {
      return "Admin";
    }
  };

  const loadPO = async (numberParam?: string) => {
    const numberToLoad = (numberParam || poNumber).trim();

    if (!numberToLoad) {
      alert("Enter PO number");
      return;
    }

    try {
      const res = await axios.get(
        `${API}/po/number/${encodeURIComponent(numberToLoad)}`
      );

      const loadedPO = res.data;

      setPo(loadedPO);

      setItems(
        (loadedPO.items || []).map((item: any) => ({
          ...item,
          alreadyReceived: Number(
            item.alreadyReceived ?? item.receivedQty ?? item.received_qty ?? 0
          ),
          receivedNow: 0,
        }))
      );

      setPoNumber(numberToLoad);
      setComment("");
    } catch (err: any) {
      console.log("LOAD PO ERROR 👉", err.response?.data || err);
      alert(err.response?.data?.message || "PO not found");
    }
  };

  const updateReceivedQty = (index: number, value: string) => {
    const qty = Number(value || 0);

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const ordered = Number(item.quantity || 0);
        const already = Number(item.alreadyReceived || 0);
        const maxCanReceive = Math.max(ordered - already, 0);

        return {
          ...item,
          receivedNow:
            qty > maxCanReceive ? maxCanReceive : qty < 0 ? 0 : qty,
        };
      })
    );
  };

  const getReceptionStatus = () => {
  if (items.length === 0) return "NONE";

  const allComplete = items.every((item) => {
    const ordered = Number(item.quantity || 0);
    const already = Number(item.alreadyReceived || 0);
    const now = Number(item.receivedNow || 0);

    return already + now >= ordered;
  });

  const hasAnyReceived = items.some((item) => {
    const already = Number(item.alreadyReceived || 0);
    const now = Number(item.receivedNow || 0);

    return already + now > 0;
  });

  if (allComplete) return "COMPLETE";
  if (hasAnyReceived) return "PARTIAL";
  return "NONE";
};

  const validateReception = () => {
    if (!po) {
      alert("Load PO first");
      return false;
    }

    if (items.length === 0) {
      alert("No PO items");
      return false;
    }

    for (const item of items) {
      const ordered = Number(item.quantity || 0);
      const already = Number(item.alreadyReceived || 0);
      const receivedNow = Number(item.receivedNow || 0);

      if (receivedNow < 0) {
        alert("Received quantity cannot be negative");
        return false;
      }

      if (already + receivedNow > ordered) {
        alert(`${item.materialName}: received qty cannot exceed balance`);
        return false;
      }
    }

    if (getReceptionStatus() === "NONE") {
      alert("Enter at least one received quantity");
      return false;
    }

    return true;
  };

  const generatePDF = (recNo: string, status: string) => {
    if (!po) return;

    const doc = new jsPDF();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("BON DE RECEPTION", 105, y, { align: "center" });

    y += 14;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(`Reception #: ${recNo}`, 20, y);
    y += 8;

    doc.text(`PO #: ${po.poNumber}`, 20, y);
    y += 8;

    doc.text(`Supplier: ${po.supplier}`, 20, y);
    y += 8;

    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y);
    y += 8;

    doc.text(`Received By: ${getUsername()}`, 20, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text(`Status: ${status}`, 20, y);
    doc.setFont("helvetica", "normal");

    y += 12;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 6, 170, 10, "F");

    doc.setFont("helvetica", "bold");
    doc.text("#", 22, y);
    doc.text("Material", 32, y);
    doc.text("Ordered", 82, y);
    doc.text("Already", 112, y);
    doc.text("Now", 140, y);
    doc.text("Balance", 165, y);

    y += 10;
    doc.setFont("helvetica", "normal");

    items.forEach((item, index) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const ordered = Number(item.quantity || 0);
      const already = Number(item.alreadyReceived || 0);
      const now = Number(item.receivedNow || 0);
      const balance = Math.max(ordered - already - now, 0);

      const materialLines = doc.splitTextToSize(item.materialName || "", 45);

      doc.text(String(index + 1), 22, y);
      doc.text(materialLines, 32, y);
      doc.text(`${ordered} ${item.unit}`, 82, y);
      doc.text(`${already} ${item.unit}`, 112, y);
      doc.text(`${now} ${item.unit}`, 140, y);
      doc.text(`${balance} ${item.unit}`, 165, y);

      y += Math.max(8, materialLines.length * 6);
    });

    if (comment.trim()) {
      y += 12;

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

    y += 20;

    if (y > 260) {
      doc.addPage();
      y = 30;
    }

    doc.text("Receiver Signature:", 20, y);
    doc.line(65, y, 120, y);

    doc.text("Manager Signature:", 130, y);
    doc.line(175, y, 195, y);

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  const saveReception = async () => {
    if (!validateReception()) return;

    const status = getReceptionStatus();
    const recNo = "REC-" + Math.floor(100000 + Math.random() * 900000);

    const receivedItems = items
      .filter((item) => Number(item.receivedNow || 0) > 0)
      .map((item) => ({
        poItemId: item.id,
        materialName: item.materialName,
        orderedQty: Number(item.quantity || 0),
        alreadyReceived: Number(item.alreadyReceived || 0),
        receivedQty: Number(item.receivedNow || 0),
        unit: item.unit,
      }));

    try {
      await axios.post(`${API}/po/receptions`, {
        receptionNumber: recNo,
        poId: po?.id,
        poNumber: po?.poNumber,
        supplier: po?.supplier,
        status,
        comment,
        username: getUsername(),
        items: receivedItems,
      });

      setReceptionNumber(recNo);
      generatePDF(recNo, status);

      await loadPO(po?.poNumber);

      alert(`Reception saved ✅ Status: ${status}`);
    } catch (err: any) {
      console.log("SAVE RECEPTION ERROR 👉", err.response?.data || err);
      alert(err.response?.data?.message || "Save reception failed");
    }
  };

  const newReception = () => {
    setPoNumber("");
    setPo(null);
    setItems([]);
    setComment("");
    setReceptionNumber("");

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  const printPDF = () => {
    const iframe = document.getElementById(
      "receptionFrame"
    ) as HTMLIFrameElement;

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
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Goods Receipt</h1>
            <p style={styles.subtitle}>
              Partial or complete material receipt from PO
            </p>
          </div>

          <button style={styles.newBtn} onClick={newReception}>
            New Receipt
          </button>
        </div>

        <div style={styles.loadBox}>
          <input
            style={styles.input}
            placeholder="Enter PO Number"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
          />

          <button style={styles.loadBtn} onClick={() => loadPO()}>
            Load PO
          </button>
        </div>

        {po && (
          <div style={styles.poBox}>
            <div style={styles.infoGrid}>
              <div>
                <b>PO</b>
                <p>{po.poNumber}</p>
              </div>

              <div>
                <b>Supplier</b>
                <p>{po.supplier}</p>
              </div>

              <div>
                <b>Status</b>
                <p
                  style={{
                    ...styles.statusText,
                    color:
                      getReceptionStatus() === "COMPLETE"
                        ? "#16a34a"
                        : getReceptionStatus() === "PARTIAL"
                        ? "#f59e0b"
                        : "#64748b",
                  }}
                >
                  {getReceptionStatus()}
                </p>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Material</th>
                    <th style={styles.th}>Ordered</th>
                    <th style={styles.th}>Already Received</th>
                    <th style={styles.th}>Receive Now</th>
                    <th style={styles.th}>Balance</th>
                    <th style={styles.th}>Unit</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const ordered = Number(item.quantity || 0);
                    const already = Number(item.alreadyReceived || 0);
                    const receivedNow = Number(item.receivedNow || 0);

                    const maxCanReceive = Math.max(ordered - already, 0);
                    const balance = Math.max(
                      ordered - already - receivedNow,
                      0
                    );

                    return (
                      <tr key={item.id || index}>
                        <td style={styles.td}>{item.materialName}</td>
                        <td style={styles.td}>{ordered}</td>
                        <td style={styles.td}>{already}</td>

                        <td style={styles.td}>
                          <input
                            type="number"
                            min="0"
                            max={maxCanReceive}
                            value={item.receivedNow ?? 0}
                            onChange={(e) =>
                              updateReceivedQty(index, e.target.value)
                            }
                            style={styles.qtyInput}
                            disabled={maxCanReceive <= 0}
                          />
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            color: balance === 0 ? "#16a34a" : "#f59e0b",
                            fontWeight: "bold",
                          }}
                        >
                          {balance}
                        </td>

                        <td style={styles.td}>{item.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <textarea
              style={styles.textarea}
              placeholder="Reception comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <button style={styles.saveBtn} onClick={saveReception}>
              Save Reception
            </button>
          </div>
        )}

        {pdfUrl && (
          <div style={styles.pdfBox}>
            <div style={styles.pdfHeader}>
              <h3 style={{ margin: 0 }}>
                Reception Preview{" "}
                {receptionNumber ? `- ${receptionNumber}` : ""}
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
              id="receptionFrame"
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

export default ReceptionPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "35px 24px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "1150px",
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
  newBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#e2e8f0",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
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
    outline: "none",
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
  statusText: {
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
  qtyInput: {
    width: "120px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    marginTop: "18px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  saveBtn: {
    marginTop: "18px",
    width: "100%",
    border: "none",
    borderRadius: "14px",
    background: "#16a34a",
    color: "white",
    padding: "15px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
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
    outline: "none",
  },
  closeBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "white",
  },
};