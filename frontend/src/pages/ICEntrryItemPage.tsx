import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
type Item = {
  id: number;
  itemName: string;
};

type Bin = {
  id: number;
  binCode: string;
  binName: string;
};

type StockRow = {
  id?: number;
  itemName: string;
  binCode?: string;
  qty: number;
  date: string;
  time: string;
};

export default function ICEntryItemPage() {
  const today = new Date().toISOString().split("T")[0];

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const [items, setItems] = useState<Item[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [printUrl, setPrintUrl] = useState("");

  const pageSize = 5;

  const [row, setRow] = useState({
    itemId: "",
    itemName: "",
    binId: "",
    binCode: "",
    qty: 0,
  });

  useEffect(() => {
    loadItems();
    loadBins();
    loadStock();
  }, []);

  const loadItems = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/ic/items");
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBins = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/bins/bins");
      setBins(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStock = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/ic/stock");
      setStock(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemChange = (id: string) => {
    const item = items.find((i) => String(i.id) === String(id));

    setRow({
      ...row,
      itemId: id,
      itemName: item?.itemName || "",
    });
  };

  const handleBinChange = (id: string) => {
    const bin = bins.find((b) => String(b.id) === String(id));

    setRow({
      ...row,
      binId: id,
      binCode: bin?.binCode || "",
    });
  };

  const handleUpdate = async () => {
    if (!row.itemName) {
      alert("Select item");
      return;
    }

    if (!row.binId) {
      alert("Select bin");
      return;
    }

    if (row.qty <= 0) {
      alert("Qty must be > 0");
      return;
    }

    try {
      setSaving(true);

      await axios.put("http://localhost:5000/api/ic/stock-update", {
        itemName: row.itemName,
        qty: row.qty,
        date: today,
        time: getCurrentTime(),
        binCode: row.binCode.split(" - ")[0]
      });

    {/* await axios.post("http://localhost:5000/api/inventory/item-bin", {
        itemId: Number(row.itemId),
        itemName: row.itemName,
        binId: Number(row.binId),
        binCode: row.binCode,
        qty: Number(row.qty),
      });*/}

      alert("Stock updated with bin ✅");

      await loadStock();

      setRow({
        itemId: "",
        itemName: "",
        binId: "",
        binCode: "",
        qty: 0,
      });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Update failed ❌");
    } finally {
      setSaving(false);
    }
  };

  const filteredStock = useMemo(() => {
    const q = search.toLowerCase();

    return stock.filter((s) =>
      String(s.itemName || "").toLowerCase().includes(q) ||
      String(s.binCode || "").toLowerCase().includes(q) ||
      String(s.qty || "").includes(q) ||
      String(s.date || "").toLowerCase().includes(q) ||
      String(s.time || "").toLowerCase().includes(q)
    );
  }, [stock, search]);

  const totalPages = Math.ceil(filteredStock.length / pageSize) || 1;

  const paginatedStock = filteredStock.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const printStock = () => {
    const html = `
      <html>
        <head>
          <title>Stock Balance Report</title>
          <style>
            body {
              font-family: Arial;
              padding: 24px;
              color: #0f172a;
            }

            h1 {
              margin-bottom: 4px;
            }

            p {
              color: #64748b;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th {
              background: #eef2f7;
              text-align: left;
              padding: 12px;
              border: 1px solid #e2e8f0;
            }

            td {
              padding: 10px;
              border: 1px solid #e2e8f0;
              font-size: 13px;
            }

            .qty {
              font-weight: bold;
            }
          </style>
        </head>

        <body>
          <h1>Stock Balance Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Bin</th>
                <th>Qty</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              ${filteredStock
                .map(
                  (s) => `
                    <tr>
                      <td>${s.itemName || "-"}</td>
                      <td>${s.binCode || "-"}</td>
                      <td class="qty">${Number(s.qty || 0).toFixed(2)}</td>
                      <td>${s.date || "-"}</td>
                      <td>${s.time || "-"}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });

    if (printUrl) URL.revokeObjectURL(printUrl);

    setPrintUrl(URL.createObjectURL(blob));
  };

  const printIframe = () => {
    const iframe = document.getElementById("stockPrintFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Update Stock</h1>
          <p style={styles.sub}>Add stock to bins and review current bin balances</p>
        </div>

        <button onClick={loadStock} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>New Stock Entry</h2>

        <div style={styles.formRow}>
          <select
            value={row.itemId}
            onChange={(e) => handleItemChange(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Item</option>

            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.itemName}
              </option>
            ))}
          </select>

          <select
            value={row.binId}
            onChange={(e) => handleBinChange(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Bin</option>

            {bins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.binCode} - {b.binName}
              </option>
            ))}
          </select>

          <input
            type="number"
            min ="0"
            value={row.qty}
            onChange={(e) =>
              setRow({
                ...row,
                qty: Number(e.target.value),
              })
            }
            style={styles.qtyInput}
          />

          <input type="date" value={today} readOnly style={styles.dateInput} />

          <input
            type="text"
            value={getCurrentTime()}
            readOnly
            style={styles.timeInput}
          />

          <button
            onClick={handleUpdate}
            disabled={saving}
            style={{
              ...styles.updateBtn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Updating..." : "🔄 Update"}
          </button>
        </div>
      </div>

      <div style={styles.listCard}>
        <div style={styles.listHeader}>
          <h2 style={styles.cardTitle}>Stock By Bin</h2>

          <div>
            <button onClick={printStock} style={styles.previewBtn}>
              Preview Print
            </button>

            {printUrl && (
              <button onClick={printIframe} style={styles.printBtn}>
                Print
              </button>
            )}
          </div>
        </div>

        <input
          placeholder="Search item, bin, qty, date..."
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
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Bin</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Time</th>
              </tr>
            </thead>

            <tbody>
              {paginatedStock.map((s, index) => (
                <tr key={`${s.itemName}-${s.binCode}-${index}`}>
                  <td style={styles.td}>{s.itemName}</td>
                  <td style={styles.td}>{s.binCode || "-"}</td>
                  <td
                    style={{
                      ...styles.td,
                      color: Number(s.qty || 0) < 0 ? "#dc2626" : "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    {Number(s.qty || 0).toFixed(2)}

                    
                  </td>
                             <td style={styles.td}>
  {s.date
    ? String(s.date).split("T")[0]
    : "-"}
</td>


                  <td style={styles.td}>{s.time || "-"}</td>
                </tr>
              ))}

              {paginatedStock.length === 0 && (
                <tr>
                  <td colSpan={5} style={styles.empty}>
                    No stock found
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
            onClick={() => setPage(page + 1)}
            style={{
              ...styles.pageBtn,
              opacity: page === totalPages ? 0.5 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>

        {printUrl && (
          <iframe
            id="stockPrintFrame"
            src={printUrl}
            title="Stock Print Preview"
            style={styles.iframe}
          />
        )}
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "24px 36px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
  },

  h1: {
    margin: 0,
    fontSize: "36px",
    color: "#0f172a",
  },

  sub: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "16px",
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

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "22px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  listCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "24px",
  },

  formRow: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1.4fr 120px 170px 140px 160px",
    gap: "12px",
    alignItems: "center",
    marginTop: "16px",
  },

  input: {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    background: "#fff",
  },

  qtyInput: {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },

  dateInput: {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  timeInput: {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  updateBtn: {
    padding: "13px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "15px",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },

  previewBtn: {
    padding: "10px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  printBtn: {
    padding: "10px 14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  search: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    marginBottom: "16px",
    boxSizing: "border-box",
    outline: "none",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    minWidth: "900px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
    whiteSpace: "nowrap",
    color: "#0f172a",
  },

  td: {
    padding: "13px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    whiteSpace: "nowrap",
    color: "#334155",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
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

  iframe: {
    width: "100%",
    height: "360px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    marginTop: "18px",
  },
};