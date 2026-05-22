import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

const ICStockLevelPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 5;

  const loadStock = async () => {
    try {
      const res = await axios.get(`${API}/ic/inventory/stock-level`);
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setItems(rows);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD STOCK ERROR 👉", err.response?.data || err.message);
      setItems([]);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const getStockColor = (qty: number) => {
    if (qty < 250) return "#dc2626"; // wouj
    if (qty < 500) return "#f59e0b"; // jòn
    return "#16a34a"; // vèt
  };

  const getStockLabel = (qty: number) => {
    if (qty < 250) return "Low";
    if (qty < 500) return "Warning";
    return "Good";
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return items.filter((item) =>
      String(item.itemCode || "").toLowerCase().includes(q) ||
      String(item.itemName || "").toLowerCase().includes(q) ||
      String(item.quantity || "").includes(q)
    );
  }, [items, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const maxQty = Math.max(...filtered.map((i) => Number(i.quantity || 0)), 1);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Inventory Stock Level</h1>
          <p style={styles.sub}>Monitor stock status and low inventory levels</p>
        </div>

        <button onClick={loadStock} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <input
        placeholder="Search item code, name, quantity..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        style={styles.search}
      />

      <div style={styles.chartCard}>
        <h2 style={styles.cardTitle}>Stock Level Chart</h2>

        <div style={styles.chart}>
          {filtered.slice(0, 10).map((item) => {
            const qty = Number(item.quantity || 0);
            const width = Math.max((qty / maxQty) * 100, 3);

            return (
              <div key={item.id} style={styles.chartRow}>
                <div style={styles.chartLabel}>
                  {item.itemName || item.itemCode}
                </div>

                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${width}%`,
                      background: getStockColor(qty),
                    }}
                  >
                    {qty}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.legend}>
          <span><b style={{ color: "#16a34a" }}>●</b> 500+ Good</span>
          <span><b style={{ color: "#f59e0b" }}>●</b> Under 500 Warning</span>
          <span><b style={{ color: "#dc2626" }}>●</b> Under 250 Low</span>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
             
              <th style={styles.th}>Item Name</th>
              <th style={styles.th}>Quantity</th>
         
              <th style={styles.th}>Status</th>
            
            </tr>
          </thead>

          <tbody>
            {paginated.map((item) => {
              const qty = Number(item.quantity || 0);

              return (
                <tr key={item.id}>
                
                  <td style={styles.td}>{item.itemName}</td>

                  <td
                    style={{
                      ...styles.td,
                      color: getStockColor(qty),
                      fontWeight: "bold",
                    }}
                  >
                    {qty}
                  </td>

                

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        background: getStockColor(qty),
                      }}
                    >
                      {getStockLabel(qty)}
                    </span>
                  </td>

                  <td style={styles.td}>
                  
                  </td>
                </tr>
              );
            })}

            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} style={styles.empty}>
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
    </div>
  );
};

export default ICStockLevelPage;

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
  chartCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "22px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  },
  cardTitle: {
    margin: "0 0 14px",
    fontSize: "20px",
    color: "#0f172a",
  },
  chart: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  chartRow: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    alignItems: "center",
    gap: "12px",
  },
  chartLabel: {
    fontSize: "14px",
    color: "#334155",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  barTrack: {
    height: "28px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: "10px",
    borderRadius: "999px",
    transition: "width 0.3s ease",
  },
  legend: {
    display: "flex",
    gap: "18px",
    marginTop: "16px",
    color: "#475569",
    fontSize: "14px",
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
  badge: {
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
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
};