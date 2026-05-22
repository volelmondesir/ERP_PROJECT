import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api/hr";

const EmployeeHistoryPage = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
const [currentPage, setCurrentPage] = useState(1);

const rowsPerPage = 4;

  // LOAD HISTORY
  const loadHistory = async () => {
    try {
      const res = await axios.get(
        `${API}/employee-history`
      );

      setHistory(res.data?.data || []);

    } catch (err: any) {
      console.log(
        err.response?.data || err.message
      );
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // FILTER
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return history.filter((h) =>
      String(h.employeeName || "")
        .toLowerCase()
        .includes(q) ||

      String(h.actionType || "")
        .toLowerCase()
        .includes(q) ||

      String(h.changedBy || "")
        .toLowerCase()
        .includes(q)
    );
  }, [history, search]);
const totalPages = Math.ceil(
  filtered.length / rowsPerPage
);

const startIndex =
  (currentPage - 1) * rowsPerPage;

const paginatedData =
  filtered.slice(
    startIndex,
    startIndex + rowsPerPage
  );
  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>
            Employee History
          </h1>

          <p style={styles.sub}>
            Employee activity and audit history
          </p>
        </div>

        <button
          onClick={loadHistory}
          style={styles.refreshBtn}
        >
          Refresh
        </button>
      </div>

      {/* CARD */}
      <div style={styles.card}>
        {/* SEARCH */}
        <input
          placeholder="Search employee, action, user..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={styles.search}
        />

        {/* TABLE */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  Employee
                </th>

                <th style={styles.th}>
                  Action
                </th>

                <th style={styles.th}>
                  Old Value
                </th>

                <th style={styles.th}>
                  New Value
                </th>

                <th style={styles.th}>
                  User
                </th>

                <th style={styles.th}>
                  Date
                </th>
              </tr>
            </thead>

            <tbody>
             {paginatedData.map((h) => (
                <tr key={h.id}>
                  <td style={styles.td}>
                    <div>
                      <b>
                        {h.employeeName}
                      </b>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {h.employeeCode}
                      </div>
                    </div>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,

                        background:
                          h.actionType ===
                          "Salary Update"
                            ? "#dbeafe"
                            : h.actionType ===
                              "Department Transfer"
                            ? "#dcfce7"
                            : h.actionType ===
                              "Status Change"
                            ? "#fee2e2"
                            : "#e2e8f0",

                        color:
                          h.actionType ===
                          "Salary Update"
                            ? "#2563eb"
                            : h.actionType ===
                              "Department Transfer"
                            ? "#16a34a"
                            : h.actionType ===
                              "Status Change"
                            ? "#dc2626"
                            : "#334155",
                      }}
                    >
                      {h.actionType}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {h.oldValue}
                  </td>

                  <td style={styles.td}>
                    {h.newValue}
                  </td>

                  <td style={styles.td}>
                    {h.changedBy}
                  </td>

                  <td style={styles.td}>
                    {new Date(
                      h.changedAt
                    ).toLocaleString()}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={styles.empty}
                  >
                    No history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
     
        </div>
             <div style={styles.pagination}>
  <button
    disabled={currentPage === 1}
    onClick={() =>
      setCurrentPage(
        currentPage - 1
      )
    }
    style={{
      ...styles.pageBtn,
      opacity:
        currentPage === 1
          ? 0.5
          : 1,
    }}
  >
    Prev
  </button>

  <span style={styles.pageText}>
    Page {currentPage} of{" "}
    {totalPages || 1}
  </span>

  <button
    disabled={
      currentPage === totalPages ||
      totalPages === 0
    }
    onClick={() =>
      setCurrentPage(
        currentPage + 1
      )
    }
    style={{
      ...styles.pageBtn,
      opacity:
        currentPage === totalPages
          ? 0.5
          : 1,
    }}
  >
    Next
  </button>
</div>
      </div>
    </div>
  );
};

export default EmployeeHistoryPage;

const styles: any = {
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
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow:
      "0 18px 45px rgba(15,23,42,0.10)",
  },

  search: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    marginBottom: "18px",
    boxSizing: "border-box",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    minWidth: "1000px",
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
    padding: "14px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    whiteSpace: "nowrap",
    color: "#334155",
  },

  badge: {
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-block",
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
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
  cursor: "pointer",
},

pageText: {
  fontWeight: "bold",
  color: "#334155",
},
};