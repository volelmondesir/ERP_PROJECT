import React, { useEffect, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";

const BinTransactionPage = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API}/bin-transactions`
      );

      setTransactions(
        res.data?.data || []
      );

    } catch (err: any) {

      console.log(
        "LOAD BIN TRANSACTIONS ERROR 👉",
        err.response?.data || err.message
      );

      setTransactions([]);

    } finally {
      setLoading(false);
    }
  };

  // 🔍 FILTER
  const filtered = transactions.filter((t) => {

    const text = search.toLowerCase();

    return (
      t.itemName?.toLowerCase().includes(text) ||
      t.binCode?.toLowerCase().includes(text) ||
      t.orderNumber?.toLowerCase().includes(text) ||
      t.userCode?.toLowerCase().includes(text)
    );
  });

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          📦 Bin Transactions
        </h1>

        <button
          onClick={loadTransactions}
          style={styles.refreshBtn}
        >
          Refresh
        </button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search item, bin, receipt..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        style={styles.search}
      />

      {/* TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>

          <thead>
            <tr>
              <th style={styles.th}>Receipt #</th>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Bin</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Hour</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  style={styles.loading}
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={styles.empty}
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              filtered.map((row, index) => (
                <tr key={index}>
                  <td style={styles.td}>
                    {row.orderNumber}
                  </td>

                  <td style={styles.td}>
                    {row.itemName}
                  </td>

                  <td style={styles.td}>
                    {row.binCode}
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color: "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    {Number(row.qty).toFixed(2)}
                  </td>

                  <td style={styles.td}>
                    {row.userCode}
                  </td>

                  <td style={styles.td}>
                    {row.date}
                  </td>

                  <td style={styles.td}>
                    {row.hour}
                  </td>
                </tr>
              ))
            )}

          </tbody>

        </table>
      </div>
    </div>
  );
};

export default BinTransactionPage;

// 🎨 STYLES
const styles: any = {

  page: {
    padding: "20px",
    background: "#f5f6fa",
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  title: {
    margin: 0,
    color: "#1e293b",
  },

  refreshBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  search: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    outline: "none",
  },

  tableWrapper: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    background: "#f1f5f9",
    padding: "14px",
    textAlign: "left",
    color: "#334155",
    fontSize: "14px",
  },

  td: {
    padding: "14px",
    borderTop: "1px solid #f1f5f9",
    fontSize: "14px",
    color: "#1e293b",
  },

  loading: {
    padding: "30px",
    textAlign: "center",
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#94a3b8",
  },
};