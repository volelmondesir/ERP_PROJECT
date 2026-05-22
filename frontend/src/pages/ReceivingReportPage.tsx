import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

type Receiving = {
  id: number;
  receptionNumber: string;
  poId: number;
  poNumber: string;
  supplier: string;
  status: string;
  comment?: string;
  username?: string;
  createdAt?: string;
  items?: any[];
};

const ReceivingReportPage: React.FC = () => {
  const [receivings, setReceivings] = useState<Receiving[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");

  const pageSize = 5;

  useEffect(() => {
    loadReceivings();
  }, []);

  const loadReceivings = async () => {
    try {
      const res = await axios.get(`${API}/po/receivings`);
      setReceivings(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.log("LOAD RECEIVINGS ERROR:", err);
      setReceivings([]);
    }
  };

  const money = (value: any) => `$${Number(value || 0).toFixed(2)}`;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return receivings.filter((r) =>
      String(r.receptionNumber || "").toLowerCase().includes(q) ||
      String(r.poNumber || "").toLowerCase().includes(q) ||
      String(r.supplier || "").toLowerCase().includes(q) ||
      String(r.status || "").toLowerCase().includes(q) ||
      String(r.username || "").toLowerCase().includes(q)
    );
  }, [receivings, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const closePreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
  };

  const printPDF = () => {
    const iframe = document.getElementById("receivingFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
  };

const viewReceiving = async (r: Receiving) => {
  try {
    let detail: any = r;
    let items: any[] = r.items || [];

    try {
      const res = await axios.get(
        `${API}/po/receivings/${encodeURIComponent(r.receptionNumber)}`
      );

      detail = res.data?.data || res.data || r;
      items = detail.items || items;
    } catch {}

    const doc = new jsPDF();
    let y = 18;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);

    doc.text("RECEIVING", pageWidth / 2, y, {
      align: "center",
    });

    const canvas = document.createElement("canvas");

    JsBarcode(canvas, detail.receptionNumber || r.receptionNumber, {
      format: "CODE128",
      width: 2,
      height: 45,
      displayValue: true,
      fontSize: 14,
    });

    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      125,
      30,
      60,
      28
    );

    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(
      `Reception #: ${detail.receptionNumber || r.receptionNumber}`,
      20,
      y
    );
    y += 8;

    doc.text(`PO #: ${detail.poNumber || r.poNumber || "-"}`, 20, y);
    y += 8;

    doc.text(`PO ID: ${detail.poId || r.poId || "-"}`, 20, y);
    y += 8;

    doc.text(`Supplier: ${detail.supplier || r.supplier || "-"}`, 20, y);
    y += 8;

    const status = String(detail.status || r.status || "").toUpperCase();

    doc.text("Status:", 20, y);

    if (status === "COMPLETE") {
      doc.setTextColor(22, 163, 74);
    } else if (status === "PARTIAL") {
      doc.setTextColor(245, 158, 11);
    } else {
      doc.setTextColor(220, 38, 38);
    }

    doc.setFont("helvetica", "bold");
    doc.text(status || "-", 42, y);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");

    y += 8;

    doc.text(`Comment: ${detail.comment || r.comment || "-"}`, 20, y);
    y += 8;

    doc.text(`Created By: ${detail.username || r.username || "-"}`, 20, y);
    y += 8;

    doc.text(
      `Created At: ${
        detail.createdAt || r.createdAt
          ? new Date(detail.createdAt || r.createdAt).toLocaleString()
          : "-"
      }`,
      20,
      y
    );

    y += 14;

    doc.line(20, y, 190, y);
    y += 10;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 6, 170, 10, "F");

    doc.setFont("helvetica", "bold");

    doc.text("#", 22, y);
    doc.text("Item", 30, y);
    doc.text("UOM", 72, y);
    doc.text("Ordered", 92, y);
    doc.text("Received", 120, y);
    doc.text("Remain", 148, y);
    doc.text("Amount", 190, y, { align: "right" });

    y += 10;

    doc.setFont("helvetica", "normal");

    let totalAmount = 0;
    let totalOrdered = 0;
    let totalReceived = 0;
    let totalRemaining = 0;

    if (!items || items.length === 0) {
      doc.text("No items found", 20, y);
      y += 10;
    } else {
      items.forEach((item: any, index: number) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        const name =
          item.itemName ||
          item.materialName ||
          item.name ||
          item.productName ||
          "-";

        const uom = item.uom || item.unit || "pcs";

        const orderedQty = Number(
          item.orderedQty ??
            item.orderQty ??
            item.quantity ??
            item.qty ??
            0
        );

        const receivedQty = Number(
          item.receivedQty ??
            item.receiptQty ??
            item.deliveredQty ??
            0
        );

        const remainingQty = Math.max(orderedQty - receivedQty, 0);

        const price = Number(item.price || item.unitPrice || 0);
        const amount = receivedQty * price;

        totalOrdered += orderedQty;
        totalReceived += receivedQty;
        totalRemaining += remainingQty;
        totalAmount += amount;

        const nameLines = doc.splitTextToSize(name, 38);

        doc.text(String(index + 1), 22, y);
        doc.text(nameLines, 30, y);
        doc.text(uom, 72, y);
        doc.text(String(orderedQty), 92, y);
        doc.text(String(receivedQty), 120, y);

        if (remainingQty > 0) {
          doc.setTextColor(220, 38, 38);
          doc.setFont("helvetica", "bold");
          doc.text(String(remainingQty), 148, y);
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "normal");
        } else {
          doc.setTextColor(22, 163, 74);
          doc.setFont("helvetica", "bold");
          doc.text("0", 148, y);
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "normal");
        }

        doc.text(money(amount), 190, y, {
          align: "right",
        });

        y += Math.max(8, nameLines.length * 6);

        doc.setDrawColor(226, 232, 240);
        doc.line(20, y - 3, 190, y - 3);
      });
    }

    y += 12;

    if (y > 245) {
      doc.addPage();
      y = 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text("TOTAL ORDERED:", 120, y);
    doc.text(String(totalOrdered), 190, y, {
      align: "right",
    });

    y += 8;

    doc.text("TOTAL RECEIVED:", 120, y);
    doc.text(String(totalReceived), 190, y, {
      align: "right",
    });

    y += 8;

    doc.setTextColor(
      totalRemaining > 0 ? 220 : 22,
      totalRemaining > 0 ? 38 : 163,
      totalRemaining > 0 ? 38 : 74
    );

    doc.text("TOTAL REMAINING:", 120, y);
    doc.text(String(totalRemaining), 190, y, {
      align: "right",
    });

    doc.setTextColor(15, 23, 42);

    y += 8;

    doc.text("TOTAL AMOUNT:", 120, y);
    doc.text(money(totalAmount), 190, y, {
      align: "right",
    });

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    setPdfUrl(url);
  } catch (err: any) {
    console.log("VIEW RECEIVING ERROR:", err.response?.data || err);
    alert(err.response?.data?.message || "Receiving preview failed");
  }
};
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📦 Receiving Report</h1>
            <p style={styles.subtitle}>Search, preview and print receiving records</p>
          </div>

          <button onClick={loadReceivings} style={styles.refreshBtn}>
            Refresh
          </button>
        </div>

        <input
          value={search}
          placeholder="Search reception, PO, supplier, status, user..."
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={styles.search}
        />

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
           
                <th style={styles.th}>Reception #</th>
         
                <th style={styles.th}>PO #</th>
                <th style={styles.th}>Supplier</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Comment</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Created At</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} style={styles.empty}>
                    No receiving records found
                  </td>
                </tr>
              ) : (
                paginated.map((r, index) => {
                  const status = String(r.status || "").toUpperCase();

                  return (
                    <tr key={r.id}>
                     
                      <td style={styles.tdBold}>{r.receptionNumber}</td>
                   
                      <td style={styles.td}>{r.poNumber}</td>
                      <td style={styles.td}>{r.supplier}</td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            background:
                              status === "COMPLETE"
                                ? "#16a34a"
                                : status === "PARTIAL"
                                ? "#f59e0b"
                                : "#dc2626",
                          }}
                        >
                          {status || "-"}
                        </span>
                      </td>

                      <td style={styles.td}>{r.comment || "-"}</td>
                      <td style={styles.td}>{r.username || "-"}</td>

                      <td style={styles.td}>
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString()
                          : "-"}
                      </td>

                      <td style={styles.td}>
                        <button
                          onClick={() => viewReceiving(r)}
                          style={styles.viewBtn}
                        >
                          View
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
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              ...styles.pageBtn,
              opacity: page === 1 ? 0.5 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            Prev
          </button>

          <span style={styles.pageText}>
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              ...styles.pageBtn,
              opacity: page === totalPages ? 0.5 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>

        {pdfUrl && (
          <div style={styles.pdfBox}>
            <div style={styles.pdfHeader}>
              <h3 style={{ margin: 0 }}>Receiving Preview</h3>

              <div>
                <button onClick={printPDF} style={styles.printBtn}>
                  Print
                </button>

                <button onClick={closePreview} style={styles.closeBtn}>
                  Close
                </button>
              </div>
            </div>

            <iframe
              id="receivingFrame"
              src={pdfUrl}
              width="100%"
              height="700"
              style={styles.iframe}
              title="Receiving Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivingReportPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "32px",
  },

  subtitle: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "15px",
  },

  refreshBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#2563eb",
    color: "#fff",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  search: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "16px",
    marginBottom: "16px",
    boxSizing: "border-box",
  },

  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "1100px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px",
    textAlign: "left",
    color: "#334155",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  badge: {
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },

  viewBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginTop: "18px",
  },

  pageBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
  },

  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },

  pdfBox: {
    marginTop: "24px",
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
    color: "#fff",
    padding: "10px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  closeBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "#fff",
    padding: "10px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#fff",
  },
};