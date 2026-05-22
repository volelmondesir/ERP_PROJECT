import { useEffect, useMemo, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "/api";

const SetBankPage = () => {
  const [banks, setBanks] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    account_number: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const pageSize = 5;
 useEffect(() => {
  
    saveAuditLog({
  
    moduleName: "Settings",
  
      submenuName: "Set Bank",
  
      actionType: "VIEW PAGE",
  
    });
  
  }, []);
  // 🔥 LOAD BANKS
  const loadBanks = async () => {
    try {
      const res = await axios.get(`${API}/bank/banks`);

      setBanks(
        Array.isArray(res.data)
          ? res.data
          : res.data?.data || []
      );
    } catch (err) {
      console.log("BANK LOAD ERROR:", err);

      setBanks([]);
    }
  };

  useEffect(() => {
    loadBanks();
  }, []);

  // 🧠 INPUT
  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // 💾 SAVE
  const handleSave = async () => {
    try {

      if (!form.name || !form.account_number) {
        alert("Fill all fields");
        return;
      }

      if (editingId) {

        await axios.put(
          `${API}/bank/banks/${editingId}`,
          form
        );
 await saveAuditLog({
        moduleName: "Settings",
        submenuName: "Set Bank",
        actionType: `CREATE PIN`,
      });
        alert("Bank updated ✅");

      } else {

        await axios.post(
          `${API}/bank/banks`,
          form
        );

        alert("Bank added ✅");
      }

      setForm({
        name: "",
        account_number: "",
      });

      setEditingId(null);

      loadBanks();

    } catch (err) {

      console.error("SAVE ERROR 👉", err);

      alert("Something went wrong ❌");
    }
  };

  // ✏️ EDIT
  const handleEdit = (bank: any) => {

    setEditingId(bank.id);

    setForm({
      name: bank.name || "",
      account_number: bank.account_number || "",
    });
  };

  // ❌ DELETE
  const handleDelete = async (id: number) => {

    const confirmDelete = window.confirm(
      "Delete this bank?"
    );

    if (!confirmDelete) return;

    try {

      await axios.delete(
        `${API}/bank/banks/${id}`
      );

      alert("Bank deleted ✅");

      loadBanks();

    } catch (err) {

      console.log("DELETE ERROR 👉", err);

      alert("Delete failed ❌");
    }
  };

  // 🔍 SEARCH
  const filteredBanks = useMemo(() => {

    const q = search.toLowerCase();

    return banks.filter(
      (b) =>
        String(b.name || "")
          .toLowerCase()
          .includes(q) ||

        String(b.account_number || "")
          .toLowerCase()
          .includes(q)
    );

  }, [banks, search]);

  // 📄 PAGINATION
  const totalPages =
    Math.ceil(filteredBanks.length / pageSize) || 1;

  const paginatedBanks = filteredBanks.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div style={styles.page}>

      <div style={styles.layout}>

        {/* LEFT */}
        <div style={styles.leftCol}>

          <div style={styles.card}>

            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>
                  🏦 Setup Bank
                </h1>

                <p style={styles.subtitle}>
                  Create and manage banks
                </p>
              </div>
            </div>

            <input
              name="name"
              placeholder="Bank Name"
              value={form.name}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="account_number"
              placeholder="Account Number"
              value={form.account_number}
              onChange={handleChange}
              style={styles.input}
            />

            <button
              onClick={handleSave}
              style={styles.saveBtn}
            >
              {editingId
                ? "Update Bank"
                : "Add Bank"}
            </button>

          </div>
        </div>

        {/* RIGHT */}
        <div style={styles.rightCol}>

          <div style={styles.card}>

            <div style={styles.listHeader}>
              <h2 style={styles.cardTitle}>
                Bank List
              </h2>
            </div>

            <input
              placeholder="Search bank..."
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
                    <th style={styles.th}>Bank</th>
                    <th style={styles.th}>
                      Account #
                    </th>
                    <th style={styles.th}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {paginatedBanks.map((b) => (

                    <tr key={b.id}>

                      <td style={styles.td}>
                        {b.name}
                      </td>

                      <td style={styles.td}>
                        {b.account_number}
                      </td>

                      <td style={styles.td}>

                        <div style={styles.actions}>

                          <button
                            style={styles.editBtn}
                            onClick={() =>
                              handleEdit(b)
                            }
                          >
                         ✏️Edit
                          </button>

                          <button
                            style={styles.deleteBtn}
                            onClick={() =>
                              handleDelete(b.id)
                            }
                          >
                             🗑Delete
                          </button>

                        </div>

                      </td>

                    </tr>
                  ))}

                  {paginatedBanks.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={styles.empty}
                      >
                        No banks found
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>
            </div>

            {/* PAGINATION */}
            <div style={styles.pagination}>

              <button
                disabled={page === 1}
                onClick={() =>
                  setPage(page - 1)
                }
                style={{
                  ...styles.pageBtn,
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                Prev
              </button>

              <span style={styles.pageText}>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() =>
                  setPage(page + 1)
                }
                style={{
                  ...styles.pageBtn,
                  opacity:
                    page === totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SetBankPage;

const styles: any = {

  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "22px",
  },

  leftCol: {
    display: "flex",
    flexDirection: "column",
  },

  rightCol: {
    minWidth: 0,
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  header: {
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "15px",
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    marginBottom: "14px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },

  saveBtn: {
    width: "100%",
    padding: "14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },

  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "24px",
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
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    color: "#0f172a",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 16px",
    borderTop: "1px solid #e2e8f0",
    color: "#334155",
    whiteSpace: "nowrap",
  },

  actions: {
    display: "flex",
    gap: "10px",
  },

  editBtn: {
    padding: "8px 12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  deleteBtn: {
    padding: "8px 12px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
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
    cursor: "pointer",
  },

  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },
};