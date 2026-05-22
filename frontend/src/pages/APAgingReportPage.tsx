import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "/api";

type APAgingRow = {
  id?: number;
  vendorName: string;
  poNumber: string;
  billNumber?: string;
  poDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
};

const APAgingReportPage: React.FC = () => {
  const [rows, setRows] = useState<APAgingRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAPAging();
  }, []);

  const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;

  const loadAPAging = async () => {
    try {
      const res = await axios.get(`${API}/ap/aging`);
      setRows(res.data?.data || []);
    } catch (err) {
      console.log("AP AGING LOAD ERROR 👉", err);
      setRows([]);
    }
  };

  const getDaysPastDue = (dueDate: string) => {
    if (!dueDate) return 0;

    const today = new Date();
    const due = new Date(dueDate);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diff = today.getTime() - due.getTime();

    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const agingRows = useMemo(() => {
    return rows.map((row) => {
      const totalAmount = Number(row.totalAmount || 0);
      const paidAmount = Number(row.paidAmount || 0);
      const balance = totalAmount - paidAmount;
      const daysPastDue = getDaysPastDue(row.dueDate);

      return {
        ...row,
        balance,
        daysPastDue,
        current: daysPastDue <= 0 ? balance : 0,
        bucket1_30: daysPastDue >= 1 && daysPastDue <= 30 ? balance : 0,
        bucket31_60: daysPastDue >= 31 && daysPastDue <= 60 ? balance : 0,
        bucket61_90: daysPastDue >= 61 && daysPastDue <= 90 ? balance : 0,
        bucket90Plus: daysPastDue > 90 ? balance : 0,
      };
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();

    return agingRows.filter(
      (row) =>
        String(row.vendorName || "").toLowerCase().includes(q) ||
        String(row.poNumber || "").toLowerCase().includes(q) ||
        String(row.billNumber || "").toLowerCase().includes(q)
    );
  }, [agingRows, search]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (sum, row) => {
        sum.totalAmount += Number(row.totalAmount || 0);
        sum.paidAmount += Number(row.paidAmount || 0);
        sum.balance += Number(row.balance || 0);
        sum.current += Number(row.current || 0);
        sum.bucket1_30 += Number(row.bucket1_30 || 0);
        sum.bucket31_60 += Number(row.bucket31_60 || 0);
        sum.bucket61_90 += Number(row.bucket61_90 || 0);
        sum.bucket90Plus += Number(row.bucket90Plus || 0);
        return sum;
      },
      {
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
        current: 0,
        bucket1_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucket90Plus: 0,
      }
    );
  }, [filteredRows]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>AP Aging Report</h1>
            <p style={styles.subtitle}>Vendor payable aging balances</p>
          </div>

          <button onClick={loadAPAging} style={styles.secondaryBtn}>
            Refresh
          </button>
        </div>

        <input
          placeholder="Search vendor, PO, bill..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        <div style={styles.infoRow}>
          <div style={styles.infoBox}>
            <span>Total Payable</span>
            <strong>{money(totals.balance)}</strong>
          </div>

          <div style={styles.infoBox}>
            <span>Current</span>
            <strong>{money(totals.current)}</strong>
          </div>

          <div style={styles.infoBox}>
            <span>Over 90 Days</span>
            <strong>{money(totals.bucket90Plus)}</strong>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>PO #</th>
                <th style={styles.th}>Bill #</th>
                <th style={styles.th}>PO Date</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Paid</th>
                <th style={styles.th}>Balance</th>
                <th style={styles.th}>Days</th>
                <th style={styles.th}>Current</th>
                <th style={styles.th}>1-30</th>
                <th style={styles.th}>31-60</th>
                <th style={styles.th}>61-90</th>
                <th style={styles.th}>90+</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={14} style={styles.empty}>
                    No AP aging records found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row.id || index}>
                    <td style={styles.td}>{row.vendorName}</td>
                    <td style={styles.td}>{row.poNumber}</td>
                    <td style={styles.td}>{row.billNumber || "-"}</td>
                    <td style={styles.td}>{String(row.poDate || "").split("T")[0]}</td>
                    <td style={styles.td}>{String(row.dueDate || "").split("T")[0]}</td>
                    <td style={styles.td}>{money(row.totalAmount)}</td>
                    <td style={styles.td}>{money(row.paidAmount)}</td>
                    <td style={styles.tdBold}>{money(row.balance)}</td>
                    <td style={styles.td}>{row.daysPastDue}</td>
                    <td style={styles.td}>{money(row.current)}</td>
                    <td style={styles.td}>{money(row.bucket1_30)}</td>
                    <td style={styles.td}>{money(row.bucket31_60)}</td>
                    <td style={styles.td}>{money(row.bucket61_90)}</td>
                    <td style={styles.tdDanger}>{money(row.bucket90Plus)}</td>
                  </tr>
                ))
              )}

              {filteredRows.length > 0 && (
                <tr>
                  <td style={styles.totalTd} colSpan={5}>
                    TOTAL
                  </td>
                  <td style={styles.totalTd}>{money(totals.totalAmount)}</td>
                  <td style={styles.totalTd}>{money(totals.paidAmount)}</td>
                  <td style={styles.totalTd}>{money(totals.balance)}</td>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}>{money(totals.current)}</td>
                  <td style={styles.totalTd}>{money(totals.bucket1_30)}</td>
                  <td style={styles.totalTd}>{money(totals.bucket31_60)}</td>
                  <td style={styles.totalTd}>{money(totals.bucket61_90)}</td>
                  <td style={styles.totalTd}>{money(totals.bucket90Plus)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default APAgingReportPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    maxWidth: "1300px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    gap: "14px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "36px",
    color: "#0f172a",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "18px",
  },

  secondaryBtn: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  search: {
    width: "100%",
    maxWidth: "420px",
    padding: "16px",
    fontSize: "18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    outline: "none",
    marginBottom: "22px",
  },

  infoRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },

  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "18px",
  },

  tableWrap: {
    overflowX: "auto",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "15px",
    minWidth: "1300px",
  },

  th: {
    background: "#f1f5f9",
    padding: "14px",
    textAlign: "left",
    color: "#0f172a",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px",
    borderTop: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },

  tdBold: {
    padding: "13px",
    borderTop: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
    fontWeight: "bold",
    color: "#0f172a",
  },

  tdDanger: {
    padding: "13px",
    borderTop: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
    fontWeight: "bold",
    color: "#dc2626",
  },

  totalTd: {
    padding: "14px",
    borderTop: "2px solid #0f172a",
    fontWeight: "bold",
    background: "#f8fafc",
    whiteSpace: "nowrap",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
    borderTop: "1px solid #e2e8f0",
  },
};