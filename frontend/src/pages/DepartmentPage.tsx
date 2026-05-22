import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;
const API = "http://localhost:5000/api/hr";

const initialForm = {
  id: "",
  departmentName: "",
  managerName: "",
  phone: "",
  email: "",
  description: "",
  status: "active",
};

const DepartmentPage = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
const [page, setPage] = useState(1);
const [history, setHistory] = useState<any[]>([]);

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
  const loadDepartments = async () => {
    try {
      const res = await axios.get(`${API}/departments`);
      setDepartments(res.data?.data || []);
    } catch (err: any) {
      console.log(err.response?.data || err.message);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return departments.filter((d) =>
      String(d.departmentName || "")
        .toLowerCase()
        .includes(q)
    );
  }, [departments, search]);



const totalPages = Math.ceil(filtered.length / pageSize) || 1;

const paginatedHistory = filtered.slice(
  (page - 1) * pageSize,
  page * pageSize
);





  const saveDepartment = async () => {
    if (saving) return;

    if (!form.departmentName.trim()) {
      alert("Department name required");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await axios.put(
          `${API}/department/${form.id}`,
          form
        );

        alert("Department updated ✅");
      } else {
        await axios.post(
          `${API}/department`,
          form
        );

        alert("Department saved ✅");
      }

      setForm(initialForm);
      setEditing(false);
      loadDepartments();
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const editDepartment = (d: any) => {
    setForm({
      id: d.id,
      departmentName:
        d.departmentName || "",
      managerName:
        d.managerName || "",
      phone: d.phone || "",
      email: d.email || "",
      description:
        d.description || "",
      status: d.status || "active",
    });

    setEditing(true);
  };

  const deleteDepartment = async (
    id: number
  ) => {
    if (
      !confirm(
        "Delete this department?"
      )
    )
      return;

    try {
      await axios.delete(
        `${API}/department/${id}`
      );

      alert("Department deleted ✅");

      loadDepartments();
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          "Delete failed"
      );
    }
  };

 return (
  <div style={styles.page}>
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>
          {t("departments", "Departments")}
        </h1>

        <p style={styles.sub}>
          {t(
            "hrdepartmentmanagement",
            "Human resources department management"
          )}
        </p>
      </div>

      <button onClick={loadDepartments} style={styles.refreshBtn}>
        {t("refresh", "Refresh")}
      </button>
    </div>

    <div style={styles.layout}>
      <div style={styles.formCard}>
        <h2>
          {editing
            ? t("editdepartment", "Edit Department")
            : t("newdepartment", "New Department")}
        </h2>

        <input
          name="departmentName"
          placeholder={t("departmentname", "Department name")}
          value={form.departmentName}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="managerName"
          placeholder={t("manager", "Manager")}
          value={form.managerName}
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

        <textarea
          name="description"
          placeholder={t("description", "Description")}
          value={form.description}
          onChange={handleChange}
          style={styles.textarea}
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
          onClick={saveDepartment}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving
            ? t("saving", "Saving...")
            : editing
            ? t("updatedepartment", "Update Department")
            : t("savedepartment", "Save Department")}
        </button>
      </div>

      <div style={styles.listCard}>
        <input
          placeholder={t(
            "searchdepartment",
            "Search ref, description, type, user..."
          )}
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
                <th style={styles.th}>{t("code", "Code")}</th>
                <th style={styles.th}>{t("department", "Department")}</th>
                <th style={styles.th}>{t("manager", "Manager")}</th>
                <th style={styles.th}>{t("status", "Status")}</th>
                <th style={styles.th}>{t("action", "Action")}</th>
              </tr>
            </thead>

            <tbody>
              {paginatedHistory.map((d) => (
                <tr key={d.id}>
                  <td style={styles.td}>{d.departmentCode}</td>
                  <td style={styles.td}>{d.departmentName}</td>
                  <td style={styles.td}>{d.managerName}</td>
                  <td style={styles.td}>
                    {d.status === "active"
                      ? t("active", "Active")
                      : t("inactive", "Inactive")}
                  </td>

                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => editDepartment(d)}
                      style={styles.editBtn}
                    >
                      {t("edit", "Edit")}
                    </button>

                    <button
                      onClick={() => deleteDepartment(d.id)}
                      style={styles.deleteBtn}
                    >
                      {t("delete", "Delete")}
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedHistory.length === 0 && (
                <tr>
                  <td colSpan={5} style={styles.empty}>
                    {t("nodepartmentsfound", "No departments found")}
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
              cursor: page === totalPages ? "not-allowed" : "pointer",
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

export default DepartmentPage;
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
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "360px minmax(0, 1fr)",
    gap: "22px",
    width: "100%",
  },

  formCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  listCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    overflow: "hidden",
  },

  input: {
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },

  textarea: {
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    minHeight: "90px",
    resize: "vertical",
  },

  search: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    marginBottom: "16px",
    boxSizing: "border-box",
  },

  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "750px",
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
    padding: "13px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    whiteSpace: "nowrap",
    color: "#334155",
  },

  saveBtn: {
    padding: "13px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "15px",
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
  },

  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },
};