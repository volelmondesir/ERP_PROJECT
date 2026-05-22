import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;
const API = "http://localhost:5000/api";

const initialForm = {
  id: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  balance: "",
  status: "active",
};

const CustomerPage = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
const [history, setHistory] = useState<any[]>([]);

const [page, setPage] = useState(1);

const pageSize = 5;

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (
      (translations[lang] as Record<string, string>)?.[key] ||
      fallback
    );
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang((localStorage.getItem("lang") as LangType) || "en");
    };

    handleLanguageChange();

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API}/ar/customers`);
      setCustomers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD CUSTOMERS ERROR 👉", err.response?.data || err.message);
      setCustomers([]);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

;

const filtered = useMemo(() => {
  const q = search.toLowerCase();

 return customers.filter(
      (c) =>
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

const totalPages = Math.ceil(filtered.length / pageSize) || 1;

const paginatedHistory = filtered.slice(
  (page - 1) * pageSize,
  page * pageSize
);





  const saveCustomer = async () => {
    if (saving) return;

    if (!form.name.trim()) {
      alert("Customer name required");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await axios.put(`${API}/ar/customer/${form.id}`, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          balance: Number(form.balance || 0),
          status: form.status,
        });

        alert("Customer updated ✅");
      } else {
        await axios.post(`${API}/ar/customer`, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          balance: Number(form.balance || 0),
          status: form.status,
        });

        alert("Customer saved ✅");
      }

      setForm(initialForm);
      setEditing(false);
      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const editCustomer = (c: any) => {
    setForm({
      id: c.id,
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      balance: c.balance || "",
      status: c.status || "active",
    });

    setEditing(true);
  };

  const deleteCustomer = async (id: number) => {
    if (!confirm("Delete this customer?")) return;

    try {
      await axios.delete(`${API}/ar/customer/${id}`);
      alert("Customer deleted ✅");
      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const clearForm = () => {
    setForm(initialForm);
    setEditing(false);
  };

  return (
  <div style={styles.page}>
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>{t("customers", "Customers")}</h1>

        <p style={styles.sub}>
          {t(
            "arcustomermanagement",
            "Accounts Receivable customer management"
          )}
        </p>
      </div>

      <button onClick={loadCustomers} style={styles.refreshBtn}>
        {t("refresh", "Refresh")}
      </button>
    </div>

    <div style={styles.layout}>
      <div style={styles.formCard}>
        <h2>
          {editing
            ? t("editcustomer", "Edit Customer")
            : t("newcustomer", "New Customer")}
        </h2>

        <input
          name="name"
          placeholder={t("customername", "Customer name")}
          value={form.name}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="phone"
          placeholder={t("phone", "Phone")}
          value={form.phone}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="email"
          placeholder={t("email", "Email")}
          value={form.email}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="address"
          placeholder={t("address", "Address")}
          value={form.address}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="balance"
          type="number"
          placeholder={t("openingbalance", "Opening balance")}
          value={form.balance}
          onChange={handleChange}
          style={styles.input}
        />

        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          style={styles.input}
        >
          <option value="active">{t("active", "Active")}</option>
          <option value="inactive">{t("inactive", "Inactive")}</option>
        </select>

        <button
          onClick={saveCustomer}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving
            ? t("saving", "Saving...")
            : editing
            ? t("updatecustomer", "Update Customer")
            : t("savecustomer", "Save Customer")}
        </button>

        <button onClick={clearForm} style={styles.clearBtn}>
          {t("clear", "Clear")}
        </button>
      </div>

      <div style={styles.listCard}>
        <input
          placeholder={t(
            "searchcustomer",
            "Search ref, description, type, user..."
          )}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={styles.search}
        />

        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t("id", "ID")}</th>
                <th style={styles.th}>{t("name", "Name")}</th>
                <th style={styles.th}>{t("phone", "Phone")}</th>
                <th style={styles.th}>{t("email", "Email")}</th>
                <th style={styles.th}>{t("balance", "Balance")}</th>
                <th style={styles.th}>{t("status", "Status")}</th>
                <th style={styles.th}>{t("action", "Action")}</th>
              </tr>
            </thead>

            <tbody>
              {paginatedHistory.map((c) => (
                <tr key={c.id}>
                  <td style={styles.td}>CUS-{c.id}</td>

                  <td style={styles.td}>{c.name}</td>

                  <td style={styles.td}>{c.phone}</td>

                  <td style={styles.td}>{c.email}</td>

                  <td
                    style={{
                      ...styles.td,
                      color: "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    ${Number(c.balance || 0).toFixed(2)}
                  </td>

                  <td style={styles.td}>
                    {c.status === "active"
                      ? t("active", "Active")
                      : t("inactive", "Inactive")}
                  </td>

                  <td style={styles.td}>
                    <button
                      onClick={() => editCustomer(c)}
                      style={styles.editBtn}
                    >
                      {t("edit", "Edit")}
                    </button>

                    <button
                      onClick={() => deleteCustomer(c.id)}
                      style={styles.deleteBtn}
                    >
                      {t("delete", "Delete")}
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedHistory.length === 0 && (
                <tr>
                  <td colSpan={7} style={styles.empty}>
                    {t("nocustomersfound", "No customers found")}
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
            {t("prev", "Prev")}
          </button>

          <span style={styles.pageText}>
            {t("page", "Page")} {page} {t("of", "of")} {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            style={{
              ...styles.pageBtn,
              opacity: page === totalPages ? 0.5 : 1,
              cursor: page === totalPages
                ? "not-allowed"
                : "pointer",
            }}
          >
            {t("next", "Next")}
          </button>
        </div>
      </div>
    </div>
  </div>
);
};

export default CustomerPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
    width: "100%",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
  },

  h1: {
    fontSize: "38px",
    margin: 0,
    fontWeight: 500,
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

  layout: {
    display: "flex",
    gap: "22px",
    width: "100%",
    maxWidth: "1220px",
    alignItems: "flex-start",
  },

  formCard: {
    width: "360px",
    flex: "0 0 360px",
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    boxSizing: "border-box",
  },

  listCard: {
    width: "760px",
    maxWidth: "760px",
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },

  search: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "17px",
    marginBottom: "16px",
  },

  tableScroll: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "1050px",
    minWidth: "1050px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "16px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "15px",
    whiteSpace: "nowrap",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },

  saveBtn: {
    padding: "12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  clearBtn: {
    padding: "12px",
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  editBtn: {
    padding: "8px 12px",
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  deleteBtn: {
    padding: "8px 12px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
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
};