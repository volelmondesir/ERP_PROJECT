import React, { useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
type Row = {
  productionCode: string;
  machineStart: number;
  qty: number;
  date: string;
};

const getTodayDate = () => {
  return new Date(
    new Date().getTime() - new Date().getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];
};

const ProductionPage: React.FC = () => {
  const generateCode = () => {
    return "PRD-" + Math.floor(100000 + Math.random() * 900000);
  };

  const [rows, setRows] = useState<Row[]>([
    {
      productionCode: generateCode(),
      machineStart: 0,
      qty: 0,
      date: getTodayDate(),
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [savedCode, setSavedCode] = useState("");

  const updateRow = <K extends keyof Row>(
    index: number,
    field: K,
    value: Row[K]
  ) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handleSave = async () => {
    if (saving) return;

    try {
      const invalidRow = rows.find(
        (r) => !r.productionCode || !r.date
      );

      if (invalidRow) {
        alert("Please fill all required fields");
        return;
      }

      setSaving(true);

      for (const r of rows) {
        await axios.post("http://localhost:5000/api/production", {
          productionCode: r.productionCode,
          machineStart: Number(r.machineStart) || 0,
          qtyProduced: Number(r.qty) || 0,
          date: r.date,
        });

        setSavedCode(r.productionCode);
      }

      alert("Saved successfully ✅");

      setRows([
        {
          productionCode: generateCode(),
          machineStart: 0,
          qty: 0,
          date: getTodayDate(),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Error saving ❌");
    } finally {
      setSaving(false);
    }
  };

  const printPDF = () => {
    const iframe = document.getElementById("pdfFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Production Entry</h1>
            <p style={styles.subtitle}>
              Manufacturing production entry and print preview
            </p>
          </div>

          <div style={styles.badge}>
            ERP / MFG
          </div>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>Production Code</p>
            <h2 style={styles.summaryValue}>
              {rows[0]?.productionCode}
            </h2>
          </div>

          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>Machine Start</p>
            <h2 style={styles.summaryValueGreen}>
              {rows[0]?.machineStart ?? 0}
            </h2>
          </div>

          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>Date</p>
            <h2 style={styles.summaryValueBlue}>
              {rows[0]?.date}
            </h2>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Production Information</h2>
              <p style={styles.cardSubtitle}>
                Enter machine start and production date
              </p>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>Production Code</th>
                  <th style={styles.th}>Machine Start</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.tdCode}>
                      {r.productionCode}
                    </td>

                    <td style={styles.td}>
                      <input
                        type="number"
                        value={r.machineStart}
                        onChange={(e) =>
                          updateRow(
                            i,
                            "machineStart",
                            Number(e.target.value)
                          )
                        }
                        style={styles.input}
                      />
                    </td>

                    <td style={styles.td}>
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) =>
                          updateRow(i, "date", e.target.value)
                        }
                        style={styles.input}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.actions}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...styles.saveButton,
                background: saving ? "#94a3b8" : "#16a34a",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "💾 Save"}
            </button>

            <button
              onClick={printPDF}
              disabled={!savedCode}
              style={{
                ...styles.printButton,
                opacity: savedCode ? 1 : 0.5,
                cursor: savedCode ? "pointer" : "not-allowed",
              }}
            >
              🖨 Print
            </button>
          </div>
        </div>

        {savedCode && (
          <div style={styles.previewCard}>
            <div style={styles.previewHeader}>
              <div>
                <h2 style={styles.cardTitle}>Production Preview</h2>
                <p style={styles.cardSubtitle}>
                  Preview for code: <b>{savedCode}</b>
                </p>
              </div>

              <button
                onClick={printPDF}
                style={styles.smallPrintButton}
              >
                Print Preview
              </button>
            </div>

            <iframe
              id="pdfFrame"
              src={`http://localhost:5000/api/production/${savedCode}`}
              width="100%"
              height="420"
              style={styles.iframe}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionPage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: "28px",
  },

  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },

  title: {
    margin: 0,
    fontSize: "46px",
    fontWeight: 800,
    color: "#0f172a",
  },

  subtitle: {
    margin: "8px 0 0",
    fontSize: "18px",
    color: "#64748b",
  },

  badge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "10px 18px",
    borderRadius: "999px",
    fontWeight: 800,
    border: "1px solid #bfdbfe",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },

  summaryCard: {
    background: "#fff",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },

  summaryLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "16px",
    fontWeight: 600,
  },

  summaryValue: {
    margin: "8px 0 0",
    color: "#0f172a",
    fontSize: "30px",
    fontWeight: 800,
    wordBreak: "break-word",
  },

  summaryValueGreen: {
    margin: "8px 0 0",
    color: "#16a34a",
    fontSize: "34px",
    fontWeight: 800,
  },

  summaryValueBlue: {
    margin: "8px 0 0",
    color: "#2563eb",
    fontSize: "30px",
    fontWeight: 800,
  },

  card: {
    background: "#fff",
    borderRadius: "24px",
    boxShadow: "0 16px 35px rgba(15, 23, 42, 0.1)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },

  cardHeader: {
    padding: "22px",
    borderBottom: "1px solid #e2e8f0",
  },

  cardTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 800,
    color: "#0f172a",
  },

  cardSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  tableWrap: {
    overflowX: "auto",
    padding: "18px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "720px",
  },

  thead: {
    background: "#dbeafe",
  },

  th: {
    textAlign: "left",
    padding: "16px",
    fontSize: "16px",
    fontWeight: 800,
    color: "#0f172a",
  },

  tr: {
    borderTop: "1px solid #e2e8f0",
  },

  td: {
    padding: "16px",
    fontSize: "16px",
  },

  tdCode: {
    padding: "16px",
    fontSize: "17px",
    fontWeight: 800,
    color: "#1d4ed8",
  },

  input: {
    width: "100%",
    height: "44px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    padding: "0 14px",
    fontSize: "16px",
    outline: "none",
    background: "#f8fafc",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "20px",
    borderTop: "1px solid #e2e8f0",
  },

  saveButton: {
    color: "#fff",
    border: "none",
    padding: "12px 26px",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: 800,
    transition: "0.2s ease",
  },

  printButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "12px 26px",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: 800,
    transition: "0.2s ease",
  },

  previewCard: {
    background: "#fff",
    borderRadius: "24px",
    boxShadow: "0 16px 35px rgba(15, 23, 42, 0.1)",
    border: "1px solid #e2e8f0",
    padding: "20px",
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },

  smallPrintButton: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "12px",
    fontWeight: 800,
    cursor: "pointer",
  },

  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "18px",
    background: "#fff",
  },
};