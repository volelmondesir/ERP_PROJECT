import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "/api";

type HistoryItem = {
  oldRate: number;
  newRate: number;
  oldStatus: boolean | number;
  newStatus: boolean | number;
  changedBy: string;
  changedAt: string;
};

const TaxPage: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [taxRate, setTaxRate] = useState("");
  const [savedTax, setSavedTax] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const savingRef = useRef(false);
  const togglingRef = useRef(false);
  useEffect(() => {
  
    saveAuditLog({
  
    moduleName: "Settings",
  
      submenuName: "Tax",
  
      actionType: "VIEW PAGE",
  
    });
  
  }, []);
  const fetchTax = async () => {
    try {
      const res = await axios.get(`${API}/tax`);
      const data = res.data?.data || res.data || {};

      setTaxRate(String(data.taxRate || 0));
      setIsActive(Boolean(data.isActive));
      setSavedTax(Number(data.taxRate || 0));
    } catch (err: any) {
      console.log("LOAD TAX ERROR 👉", err.response?.data || err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/tax/history`);
      setHistory(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("HISTORY ERROR 👉", err.response?.data || err.message);
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchTax();
    fetchHistory();
  }, []);

  const handleUpdate = async () => {
    if (savingRef.current) return;

    const newRate = Number(taxRate || 0);

    if (!taxRate) {
      alert("Enter tax");
      return;
    }

    if (newRate === savedTax) {
      alert("No tax rate change");
      return;
    }

    try {
      savingRef.current = true;
      setSaving(true);

      await axios.post(`${API}/tax/update`, {
        taxRate: newRate,
        isActive,
        user: "Admin",
      });
 await saveAuditLog({
        moduleName: "Settings",
        submenuName: "Tax",
        actionType: `CREATE TAX: ${newRate}%`,
      });
      alert("Tax updated ✅");
      await fetchTax();
      await fetchHistory();
    } catch (err: any) {
      console.log("UPDATE ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Update failed ❌");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleToggle = async (newStatus: boolean) => {
    if (togglingRef.current) return;
    if (newStatus === isActive) return;

    const oldStatus = isActive;

    try {
      togglingRef.current = true;
      setToggling(true);
      setIsActive(newStatus);

      await axios.put(`${API}/tax/status`, {
        isActive: newStatus,
        user: "Admin",
      });

      await fetchTax();
      await fetchHistory();
    } catch (err: any) {
      console.log("TOGGLE ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Toggle failed ❌");
      setIsActive(oldStatus);
    } finally {
      togglingRef.current = false;
      setToggling(false);
    }
  };

  const amount = 100;
  const currentTax = Number(taxRate || savedTax || 0);
  const taxValue = isActive ? (amount * currentTax) / 100 : 0;
  const total = amount + taxValue;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>TCA Tax Configuration</h1>
          <p style={styles.sub}>Manage tax status, rate, preview, and audit history.</p>
        </div>

        <button onClick={() => { fetchTax(); fetchHistory(); }} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Tax Setup</h2>

          <label style={styles.toggleRow}>
            <input
              type="checkbox"
              checked={isActive}
              disabled={toggling}
              onChange={(e) => handleToggle(e.target.checked)}
              style={styles.checkbox}
            />
            Enable TCA
          </label>

          <div style={styles.statusRow}>
            <b>Status:</b>
            <span style={{ ...styles.statusText, color: isActive ? "#16a34a" : "#dc2626" }}>
              {isActive ? "Active" : "Inactive"}
            </span>
            <span
              style={{
                ...styles.dot,
                background: isActive ? "#16a34a" : "#dc2626",
                boxShadow: isActive ? "0 0 8px #16a34a" : "0 0 8px #dc2626",
              }}
            />
          </div>

          <input
            type="number"
            placeholder="Tax %"
            value={taxRate}
            disabled={!isActive || saving}
            onChange={(e) => setTaxRate(e.target.value)}
            style={{
              ...styles.input,
              background: isActive ? "#fff" : "#f1f5f9",
            }}
          />

          <button
            onClick={handleUpdate}
            disabled={!isActive || saving}
            style={{
              ...styles.saveBtn,
              opacity: !isActive || saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Update Tax"}
          </button>

          {!isActive && <p style={styles.warning}>⚠️ Tax is currently disabled</p>}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Preview</h2>

          <div style={styles.previewBox}>
            <div style={styles.previewLine}>
              <span>Amount</span>
              <b>${amount.toFixed(2)}</b>
            </div>

            <div style={styles.previewLine}>
              <span>Tax</span>
              <b>${taxValue.toFixed(2)}</b>
            </div>

            <div style={styles.totalLine}>
              <span>Total</span>
              <b>${total.toFixed(2)}</b>
            </div>
          </div>

          <p style={styles.currentTax}>
            Current Tax:{" "}
            <b style={{ color: isActive ? "#16a34a" : "#94a3b8" }}>
              {currentTax}%
            </b>
          </p>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Tax History</h2>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Old Rate</th>
                <th style={styles.th}>New Rate</th>
                <th style={styles.th}>Old Status</th>
                <th style={styles.th}>New Status</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>

            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td style={styles.td}>{Number(h.oldRate || 0)}%</td>
                  <td style={styles.td}>{Number(h.newRate || 0)}%</td>
                  <td style={styles.td}>{Number(h.oldStatus) === 1 ? "Active" : "Inactive"}</td>
                  <td style={styles.td}>{Number(h.newStatus) === 1 ? "Active" : "Inactive"}</td>
                  <td style={styles.td}>{h.changedBy || "-"}</td>
                  <td style={styles.td}>
                    {h.changedAt ? new Date(h.changedAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}

              {history.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.empty}>
                    No history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaxPage;

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
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
    fontWeight: 600,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "22px",
    marginBottom: "22px",
  },
  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },
  cardTitle: {
    margin: "0 0 16px",
    fontSize: "22px",
    color: "#0f172a",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  statusText: {
    fontWeight: "bold",
  },
  dot: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    marginBottom: "14px",
  },
  saveBtn: {
    width: "100%",
    padding: "13px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  warning: {
    margin: "14px 0 0",
    color: "#dc2626",
    fontWeight: "bold",
  },
  previewBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    background: "#f8fafc",
  },
  previewLine: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "17px",
  },
  totalLine: {
    display: "flex",
    justifyContent: "space-between",
    padding: "14px 0 4px",
    fontSize: "22px",
    fontWeight: "bold",
    color: "#0f172a",
  },
  currentTax: {
    marginTop: "14px",
    color: "#475569",
  },
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse",
  },
  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },
};