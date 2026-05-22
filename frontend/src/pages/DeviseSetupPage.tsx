import React, { useEffect, useState,useMemo } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "/api";

type Devise = {
  id: number;
  name: string;
  rate: number;
  injectedAmount: number;
  createdAt?: string;
};

const DeviseSetupPage: React.FC = () => {
  const [devises, setDevises] = useState<Devise[]>([]);
  const [history, setHistory] = useState<any[]>([]);
 
const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [injectedAmount, setInjectedAmount] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const perPage = 5;


  const filteredHistory = useMemo(() => {
  const q = search.toLowerCase();

  return history.filter((h) =>
  
    String(h.name || "").toLowerCase().includes(q) ||
    String(h.oldRate || "").toLowerCase().includes(q) ||
    String(h.newRate|| "").toLowerCase().includes(q)||
     String(h.createdAt|| "").toLowerCase().includes(q)
  );
}, [history, search]);

const totalPages0 = Math.ceil(filteredHistory.length / perPage) || 1;

const paginatedHistory = filteredHistory.slice(
  (page - 1) * perPage,
  page * perPage
);

  const loadDevises = async () => {
    const res = await axios.get(`${API}/devises`);
    setDevises(res.data || []);
  };

  const loadHistory = async () => {
    const res = await axios.get(`${API}/devises/history/list`);
    setHistory(res.data || []);
  };

  useEffect(() => {
    loadDevises();
    loadHistory();
  }, []);

 const saveDevise = async () => {
  if (!name || !rate) {
    alert("Non devise ak taux obligatwa");
    return;
  }

  const payload = {
    name,
    rate: Number(rate),
    injectedAmount:
      injectedAmount === ""
        ? undefined
        : Number(injectedAmount),
  };

  try {
    if (editId) {
      await axios.put(`${API}/devises/${editId}`, payload);
      alert("Devise updated");
    } else {
      if (!injectedAmount) {
        alert("Cash injected obligatwa pou new devise");
        return;
      }

      await axios.post(`${API}/devises`, {
        name,
        rate: Number(rate),
        injectedAmount: Number(injectedAmount),
      });

      alert("Devise saved");
    }

    setName("");
    setRate("");
    setInjectedAmount("");
    setEditId(null);

    loadDevises();
    loadHistory();
  } catch (err: any) {
    console.log("SAVE DEVISE ERROR 👉", err.response?.data || err);
    alert(err.response?.data || "Save failed");
  }
};
  const editDevise = (d: Devise) => {
    setEditId(d.id);
    setName(d.name);
    setRate(String(d.rate));
    setInjectedAmount(String(d.injectedAmount));
  };

  const deleteDevise = async (id: number) => {
    if (!confirm("Delete this devise?")) return;

    await axios.delete(`${API}/devises/${id}`);
    loadDevises();
  };

  const start = (page - 1) * perPage;
  const paged = devises.slice(start, start + perPage);
  const totalPages = Math.ceil(devises.length / perPage);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Setup Currency</h1>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.subTitle}>
            {editId ? "Edit Currency" : "New Currency"}
          </h2>

          <input
            placeholder="Currency Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />

          <input
            type="number"
            placeholder="Rate"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            style={styles.input}
          />

          <input
            type="number"
            placeholder="Cash injected"
            value={injectedAmount}
            onChange={(e) => setInjectedAmount(e.target.value)}
            style={styles.input}
          />

          <button onClick={saveDevise} style={styles.saveBtn}>
            {editId ? "Update" : "Save"}
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.subTitle}>Liste Devise</h2>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Currency</th>
                  <th style={styles.th}>Rate</th>
                  <th style={styles.th}>Cash Available</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {paged.map((d) => (
                  <tr key={d.id}>
                    <td style={styles.td}>
                      <span
                        style={
                          d.name === "USD"
                            ? styles.badgeUSD
                            : styles.badgeCAD
                        }
                      >
                        {d.name}
                      </span>
                    </td>

                    <td style={{ ...styles.td, ...styles.rate }}>
                      {d.rate}
                    </td>

                    <td style={{ ...styles.td, ...styles.amount }}>
                      HTG ${Number(d.injectedAmount).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      <div style={styles.actionBox}>
                        <button
                          onClick={() => editDevise(d)}
                          style={styles.editBtn}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteDevise(d.id)}
                          style={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {paged.length === 0 && (
                  <tr>
                    <td colSpan={4} style={styles.empty}>
                      No devise found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.pagination}>
            <button
              style={{
                ...styles.pageBtn,
                opacity: page === 1 ? 0.5 : 1,
                cursor: page === 1 ? "not-allowed" : "pointer",
              }}
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>

            <span style={styles.pageText}>
              Page {page} / {totalPages || 1}
            </span>

            <button
              style={{
                ...styles.pageBtn,
                opacity: page === totalPages || totalPages === 0 ? 0.5 : 1,
                cursor:
                  page === totalPages || totalPages === 0
                    ? "not-allowed"
                    : "pointer",
              }}
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
<input
  placeholder="Search currency, old Rate, new Rate"
  value={search}
  onChange={(e) => {
    setSearch(e.target.value);
    setPage(1);
  }}
  style={styles.search}
/>
      <div style={styles.historyCard}>
        <h2 style={styles.subTitle}>History Taux</h2>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Currency</th>
                <th style={styles.th}>Old Rate</th>
                <th style={styles.th}>New Rate</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>

            <tbody>
          {paginatedHistory.map((h,i) => (
                <tr key={i}>
                  <td style={styles.td}>
                    <span
                      style={
                        h.name === "USD"
                          ? styles.badgeUSD
                          : styles.badgeCAD
                      }
                    >
                      {h.name}
                    </span>
                  </td>

                  <td style={styles.td}>{h.oldRate}</td>
                  <td style={styles.td}>{h.newRate}</td>

                  <td style={styles.td}>
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}

            {paginatedHistory.length === 0 && (
                <tr>
                  <td colSpan={4} style={styles.empty}>
                    No history found
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
    Page {page} of {totalPages0}
  </span>

  <button
    disabled={page === totalPages0}
    onClick={() => setPage(page + 1)}
    style={{
      ...styles.pageBtn,
      opacity: page === totalPages0 ? 0.5 : 1,
      cursor: page === totalPages0 ? "not-allowed" : "pointer",
    }}
  >
    Next
  </button>
</div>
      </div>
    </div>
  );
};

export default DeviseSetupPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },

  title: {
    margin: "0 0 22px",
    fontSize: "34px",
    fontWeight: "bold",
    color: "#0f172a",
  },
 search: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
     background: "white",
    outline: "none",
    marginBottom: "18px",
    boxSizing: "border-box",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "380px minmax(0,1fr)",
    gap: "24px",
    marginBottom: "24px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 10px 35px rgba(15,23,42,0.08)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },

  historyCard: {
    background: "#fff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 10px 35px rgba(15,23,42,0.08)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },

  subTitle: {
    margin: "0 0 18px",
    fontSize: "22px",
    fontWeight: 600,
    color: "#0f172a",
  },

  input: {
    width: "100%",
    padding: "15px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    marginBottom: "14px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  },

  saveBtn: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "14px",
    background: "#16a34a",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "720px",
  },

  th: {
    background: "#f8fafc",
    padding: "16px",
    textAlign: "left",
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: "15px",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "15px 16px",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "15px",
    whiteSpace: "nowrap",
  },

  empty: {
    padding: "24px",
    textAlign: "center",
    color: "#64748b",
  },

  amount: {
    color: "#16a34a",
    fontWeight: "bold",
    fontSize: "16px",
  },

  rate: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  actionBox: {
    display: "flex",
    gap: "10px",
  },

  editBtn: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#f59e0b",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  deleteBtn: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  pagination: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
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

  badgeUSD: {
   
    background: "#dcfce7",
    color: "#16a34a",
    padding: "5px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
    display: "inline-block",
  },

  badgeCAD: {
   
     background: "#dbeafe",
    color: "#2563eb",
    padding: "5px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
    display: "inline-block",
  },
   

};