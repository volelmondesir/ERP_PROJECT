import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;
const API = "http://localhost:5000/api";

const initialForm = {
  id: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  department: "",
  position: "",
  salary: "",
  hireDate: "",
  status: "active",
  photoUrl: "",
  qrCode : ""
};

const EmployeePage = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState<any>(initialForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
const [photo, setPhoto] = useState<File | null>(null);
const [badgeUrl, setBadgeUrl] = useState("");
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
  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API}/hr/employees`);
      setEmployees(Array.isArray(res.data) ? res.data: res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD EMPLOYEES ERROR 👉", err.response?.data || err.message);
      setEmployees([]);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);


  



  const filteredHistory = useMemo(() => {
  const q = search.toLowerCase();
return employees.filter((e) =>
      String(e.employeeCode || "").toLowerCase().includes(q) ||
      String(e.firstName || "").toLowerCase().includes(q) ||
      String(e.lastName || "").toLowerCase().includes(q) ||
      String(e.phone || "").toLowerCase().includes(q) ||
      String(e.email || "").toLowerCase().includes(q) ||
      String(e.department || "").toLowerCase().includes(q) ||
      String(e.position || "").toLowerCase().includes(q)
    );
  }, [employees, search]);



const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;

const paginatedHistory = filteredHistory.slice(
  (page - 1) * pageSize,
  page * pageSize
);




// ✅ REGEX HELPERS
const onlyLetters = (value: string) =>
  value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "");

const onlyPhone = (value: string) =>
  value.replace(/[^0-9]/g, "").slice(0, 11);

const onlyEmail = (value: string) =>
  value.replace(/[^a-zA-Z0-9@._-]/g, "").toLowerCase();

const onlyAddress = (value: string) =>
  value.replace(/[^a-zA-Z0-9À-ÿ\s.,#'/-]/g, "");

const onlyMoney = (value: string) => {
  let cleaned = value.replace(/[^0-9.]/g, "");

  const parts = cleaned.split(".");

  if (parts.length > 2) {
    cleaned =
      parts[0] + "." + parts.slice(1).join("");
  }

  return cleaned;
};

const cleanText = (value: string) =>
  value.replace(/[^a-zA-Z0-9À-ÿ\s.,#'/-]/g, "");

// ✅ HANDLE CHANGE
const handleChange = (e: any) => {
  const { name, value } = e.target;

  let cleanValue = value;

  // ✅ FIRST NAME / LAST NAME
  if (
    name === "firstName" ||
    name === "lastName"
  ) {
    cleanValue = onlyLetters(value);
  }

  // ✅ PHONE
  if (name === "phone") {
    cleanValue = onlyPhone(value);
  }

  // ✅ EMAIL
  if (name === "email") {
    cleanValue = onlyEmail(value);
  }

  // ✅ ADDRESS
  if (name === "address") {
    cleanValue = onlyAddress(value);
  }

  // ✅ DEPARTMENT / POSITION
  if (
    name === "department" ||
    name === "position"
  ) {
    cleanValue = cleanText(value);
  }

  // ✅ SALARY
  if (name === "salary") {
    cleanValue = onlyMoney(value);
  }

  setForm({
    ...form,
    [name]: cleanValue,
  });
};



// ✅ SAVE EMPLOYEE FIXE

const saveEmployee = async () => {
  if (saving) return;

  // ✅ REQUIRED
  if (
    !form.firstName.trim() ||
    !form.lastName.trim()
  ) {
    alert(
      "First name and last name required"
    );

    return;
  }

  // ✅ EMAIL VALIDATION
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    form.email &&
    !emailRegex.test(form.email)
  ) {
    alert(
      t(
        "invalidemail",
        "Invalid email address"
      )
    );

    return;
  }

const cleanPhone = String(form.phone || "").replace(/\D/g, "");

console.log("PHONE RAW 👉", form.phone);
console.log("PHONE CLEAN 👉", cleanPhone);
console.log("PHONE LENGTH 👉", cleanPhone.length);

const phoneRegex = /^509[0-9]{8}$/;

if (cleanPhone && !phoneRegex.test(cleanPhone)) {
  alert("Phone must be like 50934430403");
  return;
}

  try {
    setSaving(true);

    const fd = new FormData();

    fd.append(
      "firstName",
      form.firstName
    );

    fd.append(
      "lastName",
      form.lastName
    );

    fd.append(
      "phone",
      form.phone
    );

    fd.append(
      "email",
      form.email
    );

    fd.append(
      "address",
      form.address
    );

    fd.append(
      "department",
      form.department
    );

    fd.append(
      "position",
      form.position
    );

    fd.append(
      "salary",
      String(Number(form.salary || 0))
    );

    fd.append(
      "hireDate",
      form.hireDate || ""
    );

    fd.append(
      "status",
      form.status
    );

    fd.append(
      "oldPhotoUrl",
      form.photoUrl || ""
    );

    // ✅ PHOTO
    if (photo) {
      fd.append("photo", photo);
    }

    // ✅ UPDATE
if (editing) {
  await axios.put(`${API}/hr/employee/${form.id}`, fd);
  alert("Employee updated ✅");
} else {
  await axios.post(`${API}/hr/employee`, fd);
  alert("Employee saved ✅");
}

clearForm();
loadEmployees();

    clearForm();
    loadEmployees();

  } catch (err: any) {

    console.log(
      "SAVE EMPLOYEE ERROR 👉",
      err.response?.data || err.message
    );

    alert(
      err.response?.data?.message ||
      "Save failed"
    );

  } finally {

    setSaving(false);
  }
};

  const editEmployee = (emp: any) => {
    
    setForm({
      id: emp.id,
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      phone: emp.phone || "",
      email: emp.email || "",
      address: emp.address || "",
      department: emp.department || "",
      position: emp.position || "",
      salary: emp.salary || "",
      hireDate: emp.hireDate ? String(emp.hireDate).slice(0, 10) : "",
      status: emp.status || "active",
      photoUrl: emp.photoUrl || "",
      qrCode: emp.qrCode || "",
    });

    setEditing(true);
  };

  const deleteEmployee = async (id: number) => {
    if (!confirm("Delete this employee?")) return;

    try {
      await axios.delete(`${API}/hr/employee/${id}`);
      alert("Employee deleted ✅");
      loadEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const clearForm = () => {
  setForm(initialForm);
  setPhoto(null);
  setEditing(false);

  const fileInput = document.getElementById(
    "employeePhoto"
  ) as HTMLInputElement;

  if (fileInput) {
    fileInput.value = "";
  }
};
  const toDataURL = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise<string>((resolve) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(reader.result as string);
    };

    reader.readAsDataURL(blob);
  });
};
const previewBadge = async (emp: any) => {
  try {
    const qrRes = await axios.get(`${API}/hr/employee/${emp.id}/qr`);
    const qrImage = qrRes.data?.data;

    const doc = new jsPDF("portrait", "mm", [86, 54]);

    // HEADER
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 54, 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("EMPLOYEE BADGE", 8, 8);

    // PHOTO
    if (emp.photoUrl) {
      const imageUrl = `http://localhost:5000${emp.photoUrl}`;

      const imageData = await toDataURL(imageUrl);

      doc.addImage(
        imageData,
        "JPEG",
        5,
        16,
        18,
        18
      );
    }

    // TEXT
    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `${emp.firstName} ${emp.lastName}`,
      25,
      20
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    doc.text(`Code: ${emp.employeeCode}`, 25, 26);
    doc.text(`Dept: ${emp.department || "-"}`, 25, 31);
    doc.text(`Position: ${emp.position || "-"}`, 25, 36);

    // QR
    if (qrImage) {
      doc.addImage(qrImage, "PNG", 35, 38, 14, 14);
    }

    doc.setFontSize(6);
    doc.text("Scan QR for employee info", 5, 50);

    if (badgeUrl) URL.revokeObjectURL(badgeUrl);

    const blob = doc.output("blob");
    setBadgeUrl(URL.createObjectURL(blob));

  } catch (err: any) {
    alert(err.response?.data?.message || "Badge preview failed");
  }
};

 return (
  <div style={styles.page}>
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>{t("employees", "Employees")}</h1>
        <p style={styles.sub}>
          {t("hremployeemanagement", "Human Resources employee management")}
        </p>
      </div>

      <button onClick={loadEmployees} style={styles.refreshBtn}>
        {t("refresh", "Refresh")}
      </button>
    </div>

    <div style={styles.layout}>
      <div style={styles.formCard}>
        <h2 style={styles.cardTitle}>
          {editing
            ? t("editemployee", "Edit Employee")
            : t("newemployee", "New Employee")}
        </h2>

        <input
          id="employeePhoto"
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          style={styles.input}
        />

        <input
          name="firstName"
          placeholder={t("firstname", "First name")}
          value={form.firstName}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="lastName"
          placeholder={t("lastname", "Last name")}
          value={form.lastName}
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
          name="department"
          placeholder={t("department", "Department")}
          value={form.department}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="position"
          placeholder={t("position", "Position")}
          value={form.position}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="salary"
          type="number"
          placeholder={t("salary", "Salary")}
          value={form.salary}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="hireDate"
          type="date"
          value={form.hireDate}
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
          <option value="terminated">{t("terminated", "Terminated")}</option>
        </select>

        <button onClick={saveEmployee} disabled={saving} style={styles.saveBtn}>
          {saving
            ? t("saving", "Saving...")
            : editing
            ? t("updateemployee", "Update Employee")
            : t("saveemployee", "Save Employee")}
        </button>

        <button onClick={clearForm} style={styles.clearBtn}>
          {t("clear", "Clear")}
        </button>
      </div>

      <div style={styles.listCard}>
        <input
          placeholder={t(
            "searchemployee",
            "Search ref, description, type, user..."
          )}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={styles.search}
        />

        <div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t("code", "Code")}</th>
                  <th style={styles.th}>{t("employee", "Employee")}</th>
                  <th style={styles.th}>{t("phone", "Phone")}</th>
                  <th style={styles.th}>{t("email", "Email")}</th>
                  <th style={styles.th}>{t("department", "Department")}</th>
                  <th style={styles.th}>{t("position", "Position")}</th>
                  <th style={styles.th}>{t("salary", "Salary")}</th>
                  <th style={styles.th}>{t("status", "Status")}</th>
                  <th style={styles.th}>{t("action", "Action")}</th>
                </tr>
              </thead>

              <tbody>
                {paginatedHistory.map((emp) => (
                  <tr key={emp.id}>
                    <td style={styles.td}>{emp.employeeCode}</td>
                    <td style={styles.td}>
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td style={styles.td}>{emp.phone || "-"}</td>
                    <td style={styles.td}>{emp.email || "-"}</td>
                    <td style={styles.td}>{emp.department || "-"}</td>
                    <td style={styles.td}>{emp.position || "-"}</td>
                    <td
                      style={{
                        ...styles.td,
                        color: "#16a34a",
                        fontWeight: "bold",
                      }}
                    >
                      ${Number(emp.salary || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background:
                            emp.status === "active"
                              ? "#16a34a"
                              : emp.status === "terminated"
                              ? "#dc2626"
                              : "#64748b",
                        }}
                      >
                        {emp.status === "active"
                          ? t("active", "Active")
                          : emp.status === "terminated"
                          ? t("terminated", "Terminated")
                          : t("inactive", "Inactive")}
                      </span>
                    </td>

                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => previewBadge(emp)}
                        style={styles.badgeBtn}
                      >
                        {t("badge", "Badge")}
                      </button>

                      <button
                        onClick={() => editEmployee(emp)}
                        style={styles.editBtn}
                      >
                        {t("edit", "Edit")}
                      </button>

                      <button
                        onClick={() => deleteEmployee(emp.id)}
                        style={styles.deleteBtn}
                      >
                        {t("delete", "Delete")}
                      </button>
                    </td>
                  </tr>
                ))}

                {paginatedHistory.length === 0 && (
                  <tr>
                    <td colSpan={9} style={styles.empty}>
                      {t("noemployeesfound", "No employees found")}
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

          {badgeUrl && (
            <div style={styles.previewBox}>
              <div style={styles.previewHeader}>
                <h3 style={{ margin: 0 }}>
                  {t("employeebadgepreview", "Employee Badge Preview")}
                </h3>

                <button
                  onClick={() => {
                    const iframe = document.getElementById(
                      "badgeFrame"
                    ) as HTMLIFrameElement;
                    iframe?.contentWindow?.print();
                  }}
                  style={styles.printBtn}
                >
                  {t("print", "Print")}
                </button>
              </div>

              <iframe
                id="badgeFrame"
                src={badgeUrl}
                width="100%"
                height="360"
                style={styles.iframe}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default EmployeePage;

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
    fontSize: "38px",
    fontWeight: 500,
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
  cardTitle: {
    margin: "0 0 8px",
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
    fontSize: "16px",
    marginBottom: "16px",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },
  table: {
    width: "1200px",
    minWidth: "1200px",
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
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },
  badgeBtn: {
  padding: "8px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "8px",
},

previewBox: {
  marginTop: "18px",
  background: "#fff",
  borderRadius: "14px",
  padding: "14px",
  border: "1px solid #e2e8f0",
},

previewHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
},

printBtn: {
  padding: "9px 14px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
},

iframe: {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
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