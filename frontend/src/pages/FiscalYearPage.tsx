import React, { useEffect, useState } from "react";

const API = "http://localhost:5000/api";
import { saveAuditLog } from "../utils/tempLog2"; 
type FiscalYear = {
  id: number;
  year_label: string;
  start_date: string;
  end_date: string;
  status: string;
};

type Period = {
  id: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
};

const FiscalYearPage: React.FC = () => {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [yearSearch, setYearSearch] = useState("");
  const [periodSearch, setPeriodSearch] = useState("");
  const [periodPage, setPeriodPage] = useState(1);

  const periodsPerPage = 6;

  const loadYears = async () => {
    try {
      const res = await fetch(`${API}/fiscalyear/fiscal-years`);
      const data = await res.json();
      setYears(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error(err);
      setYears([]);
    }
  };

  const loadPeriods = async (yearId: number) => {
    try {
      const res = await fetch(`${API}/fiscalyear/fiscal-periods/${yearId}`);
      const data = await res.json();

      setPeriods(Array.isArray(data) ? data : data?.data || []);
      setPeriodPage(1);
    } catch (err) {
      console.error(err);
      setPeriods([]);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const openFiscalYear = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch(`${API}/fiscalyear/fiscal-year/open`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Open fiscal year failed");
        return;
      }

      alert(data.message || "Fiscal year opened ✅");
      loadYears();
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  const closeFiscalYear = async (id: number) => {
    if (!confirm("Close this fiscal year?")) return;

    const res = await fetch(`${API}/fiscalyear/fiscal-year/close/${id}`, {
      method: "POST",
    });

    const data = await res.json();
    alert(data.message);

    loadYears();
  };

  const closePeriod = async (id: number) => {
    if (!confirm("Close this period?")) return;

    const res = await fetch(`${API}/fiscalyear/fiscal-period/close/${id}`, {
      method: "POST",
    });

    const data = await res.json();
    alert(data.message);

    if (selectedYear) loadPeriods(selectedYear);
  };

  const filteredYears = years.filter((y) => {
    const term = yearSearch.toLowerCase();

    return (
      y.year_label?.toLowerCase().includes(term) ||
      y.status?.toLowerCase().includes(term) ||
      String(y.start_date || "").includes(term) ||
      String(y.end_date || "").includes(term)
    );
  });

  const filteredPeriods = periods.filter((p) => {
    const term = periodSearch.toLowerCase();

    return (
      p.period_name?.toLowerCase().includes(term) ||
      p.status?.toLowerCase().includes(term) ||
      String(p.start_date || "").includes(term) ||
      String(p.end_date || "").includes(term)
    );
  });

  const totalPeriodPages = Math.max(
    1,
    Math.ceil(filteredPeriods.length / periodsPerPage)
  );

  const currentPeriods = filteredPeriods.slice(
    (periodPage - 1) * periodsPerPage,
    periodPage * periodsPerPage
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Fiscal Year Management</h1>
          <p style={styles.sub}>
            Open fiscal years, view periods, and close accounting periods.
          </p>
        </div>

        <button onClick={loadYears} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.openCard}>
        <div>
          <h2 style={styles.cardTitle}>Open New Fiscal Year</h2>
          <p style={styles.cardText}>
            Create the next fiscal year automatically.
          </p>
        </div>

        <button
          onClick={openFiscalYear}
          disabled={loading}
          style={{
            ...styles.openBtn,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Opening..." : "Open Fiscal Year"}
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Fiscal Years</h2>

          <input
            placeholder="Search fiscal year..."
            value={yearSearch}
            onChange={(e) => setYearSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Year</th>
                <th style={styles.th}>Start</th>
                <th style={styles.th}>End</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>View</th>
              </tr>
            </thead>

            <tbody>
              {filteredYears.map((y) => (
                <tr key={y.id}>
                  <td style={styles.td}>{y.year_label}</td>
                  <td style={styles.td}>
                    {String(y.start_date || "").slice(0, 10)}
                  </td>
                  <td style={styles.td}>
                    {String(y.end_date || "").slice(0, 10)}
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          y.status === "OPEN" ? "#16a34a" : "#64748b",
                      }}
                    >
                      {y.status}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {y.status === "OPEN" ? (
                      <button
                        onClick={() => closeFiscalYear(y.id)}
                        style={styles.closeBtn}
                      >
                        Close
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td style={styles.td}>
                    <button
                      onClick={() => {
                        setSelectedYear(y.id);
                        loadPeriods(y.id);
                      }}
                      style={styles.viewBtn}
                    >
                      View Periods
                    </button>
                  </td>
                </tr>
              ))}

              {filteredYears.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.empty}>
                    No fiscal years found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedYear && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Periods</h2>

            <input
              placeholder="Search period..."
              value={periodSearch}
              onChange={(e) => {
                setPeriodSearch(e.target.value);
                setPeriodPage(1);
              }}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Start</th>
                  <th style={styles.th}>End</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {currentPeriods.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.period_name}</td>
                    <td style={styles.td}>
                      {String(p.start_date || "").slice(0, 10)}
                    </td>
                    <td style={styles.td}>
                      {String(p.end_date || "").slice(0, 10)}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background:
                            p.status === "OPEN" ? "#16a34a" : "#64748b",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {p.status === "OPEN" ? (
                        <button
                          onClick={() => closePeriod(p.id)}
                          style={styles.closeBtn}
                        >
                          Close
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}

                {currentPeriods.length === 0 && (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      No periods found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.pagination}>
            <button
              style={styles.pageBtn}
              disabled={periodPage === 1}
              onClick={() => setPeriodPage((p) => Math.max(p - 1, 1))}
            >
              Prev
            </button>

            <b>
              Page {periodPage} / {totalPeriodPages}
            </b>

            <button
              style={styles.pageBtn}
              disabled={periodPage === totalPeriodPages}
              onClick={() =>
                setPeriodPage((p) =>
                  p < totalPeriodPages ? p + 1 : p
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalYearPage;

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

  openCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "22px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "22px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },

  cardTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#0f172a",
  },

  cardText: {
    margin: "6px 0 0",
    color: "#64748b",
  },

  searchInput: {
    height: "44px",
    minWidth: "260px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },

  openBtn: {
    padding: "13px 18px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  tableWrap: {
    marginTop: "16px",
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

  badge: {
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
  },

  viewBtn: {
    padding: "8px 12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  closeBtn: {
    padding: "8px 12px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },

  pagination: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
  },

  pageBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#e2e8f0",
    padding: "9px 15px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};