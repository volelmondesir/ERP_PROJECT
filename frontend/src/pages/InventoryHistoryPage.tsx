import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

const InventoryHistoryPage = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");

  const pageSize = 5;

  const loadGroups = async () => {
    try {
      const res = await axios.get(`${API}/ic/inventory/groups`);
      console.log("INVENTORY GROUPS 👉", res.data);

      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setGroups(rows);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD INVENTORY GROUPS ERROR 👉", err.response?.data || err.message);
      setGroups([]);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return groups.filter((g) =>
      String(g.trxRef || "").toLowerCase().includes(q) ||
      String(g.inventoryDate || "").toLowerCase().includes(q) ||
      String(g.itemCount || "").includes(q) ||
      String(g.totalQty || "").includes(q)
    );
  }, [groups, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const setPdf = (doc: jsPDF) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  };

  const previewInventory = async (group: any) => {
    try {
      const res = await axios.get(`${API}/ic/inventory/groups/${group.inventoryDate}`);
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];

      if (rows.length === 0) {
        alert("No inventory items found for this date");
        return;
      }

      const doc = new jsPDF("portrait", "mm", "letter");

      const trxRef = group.trxRef || `INV-${group.inventoryDate}`;
      const inventoryDate = group.inventoryDate;
      const totalQty = rows.reduce(
        (sum: number, r: any) => sum + Number(r.qty || 0),
        0
      );

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
      doc.setFontSize(10);
      doc.text("ERP Inventory Control", 15, 38);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Ref #: ${trxRef}`, 15, 52);
      doc.text(`Inventory Date: ${inventoryDate}`, 125, 52);

      doc.setDrawColor(200, 200, 200);
      doc.line(15, 62, 200, 62);

      let y = 78;

      const drawHeader = () => {
        doc.setFillColor(226, 232, 240);
        doc.rect(12, y - 6, 190, 10, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);

        doc.text("#", 15, y);
        doc.text("Item", 28, y);
        doc.text("Qty", 130, y);
        doc.text("Date/Time", 160, y);

        y += 9;
      };

      drawHeader();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      rows.forEach((item: any, index: number) => {
        if (y > 250) {
          doc.addPage();
          y = 25;
          drawHeader();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
        }

        const itemName = String(item.itemName || "-").slice(0, 42);
        const qty = Number(item.qty || 0).toFixed(2);
        const created = item.createdAt
          ? new Date(item.createdAt).toLocaleString()
          : "-";

        doc.text(String(index + 1), 15, y);
        doc.text(itemName, 28, y);
        doc.text(qty, 130, y);
        doc.text(created.slice(0, 22), 160, y);

        y += 8;
      });

      y += 6;

      if (y > 250) {
        doc.addPage();
        y = 25;
      }

      doc.line(15, y, 200, y);
      y += 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`TOTAL QTY: ${Number(totalQty || 0).toFixed(2)}`, 135, y);

      y += 24;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.line(15, y, 85, y);
      doc.text("Prepared By", 30, y + 8);

      doc.line(130, y, 200, y);
      doc.text("Approved By", 145, y + 8);

      setPdf(doc);
    } catch (err: any) {
      console.log("PREVIEW INVENTORY ERROR 👉", err.response?.data || err.message);
      alert("Preview failed");
    }
  };

  const printPDF = () => {
    const iframe = document.getElementById("inventoryFrame") as HTMLIFrameElement;
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
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Inventory History</h1>
          <p style={styles.sub}>
            Inventory grouped by date, preview all items and print
          </p>
        </div>

        <button onClick={loadGroups} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <input
        placeholder="Search by ref, date, total..."
        value={search}
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
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Ref #</th>
              <th style={styles.th}>Items</th>
              <th style={styles.th}>Total Qty</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((g) => (
              <tr key={g.trxRef}>
                <td style={styles.td}>
                  {g.inventoryDate || "-"}
                </td>

                <td style={styles.td}>
                  {g.trxRef || "-"}
                </td>

                <td style={styles.td}>
                  {g.itemCount || 0}
                </td>

                <td
                  style={{
                    ...styles.td,
                    color: "#16a34a",
                    fontWeight: "bold",
                  }}
                >
                  {Number(g.totalQty || 0).toFixed(2)}
                </td>

                <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                  <button
                    onClick={() => previewInventory(g)}
                    style={styles.previewBtn}
                  >
                    Preview
                  </button>
                </td>
              </tr>
            ))}

            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} style={styles.empty}>
                  No inventory transactions found
                </td>
              </tr>
            )}
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
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          style={styles.pageBtn}
        >
          Next
        </button>
      </div>

      {pdfUrl && (
        <div style={styles.previewBox}>
          <div style={styles.previewHeader}>
            <h2 style={{ margin: 0 }}>Inventory PDF Preview</h2>

            <div>
              <button onClick={printPDF} style={styles.printBtn}>
                Print
              </button>

              <button onClick={closePDF} style={styles.closeBtn}>
                Close
              </button>
            </div>
          </div>

          <iframe
            id="inventoryFrame"
            src={pdfUrl}
            width="100%"
            height="560"
            style={styles.iframe}
          />
        </div>
      )}
    </div>
  );
};

export default InventoryHistoryPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
  },
  h1: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 500,
    color: "#0f172a",
  },
  sub: {
    color: "#64748b",
    fontSize: "16px",
    marginTop: "8px",
  },
  refreshBtn: {
    padding: "12px 20px",
    background: "#dce5ef",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  search: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "17px",
    margin: "10px 0 20px",
    outline: "none",
    background: "#fff",
  },
  tableWrap: {
    background: "#fff",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
  },
  td: {
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },
  previewBtn: {
    padding: "8px 12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "16px",
  },
  pagination: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
  },
  pageBtn: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  pageText: {
    fontSize: "15px",
    fontWeight: "bold",
  },
  previewBox: {
    marginTop: "24px",
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
};