import { useEffect, useMemo, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api/hr";

const initialForm = {
  id: "",
  employeeId: "",
  employeeCode: "",
  employeeName: "",
  department: "",
  attendanceDate: "",
  checkIn: "",
  checkOut: "",
  status: "Present",
  note: "",
};

const AttendancePage = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

const pageSize = 5;

  const loadAttendance = async () => {
    try {
      const res = await axios.get(`${API}/attendance`);
      setAttendance(res.data?.data || []);
    } catch (err: any) {
      console.log(err.response?.data || err.message);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`);
      setEmployees(res.data?.data || []);
    } catch (err: any) {
      console.log(err.response?.data || err.message);
    }
  };

  useEffect(() => {
    loadAttendance();
    loadEmployees();
  }, []);

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleEmployee = (id: string) => {
    const emp = employees.find(
      (e) => String(e.id) === id
    );

    if (!emp) return;

    setForm({
      ...form,
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName:
        `${emp.firstName} ${emp.lastName}`,
      department: emp.department || "",
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return attendance.filter((a) =>
      String(a.employeeName || "")
        .toLowerCase()
        .includes(q)
    );
  }, [attendance, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

const paginatedHistory = filtered.slice(
  (page - 1) * pageSize,
  page * pageSize
);


  const saveAttendance = async () => {
    if (saving) return;

    if (!form.employeeId) {
      alert("Select employee");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await axios.put(
          `${API}/attendance/${form.id}`,
          form
        );

        alert("Attendance updated ✅");
      } else {
        await axios.post(
          `${API}/attendance`,
          form
        );

        alert("Attendance saved ✅");
      }

      setForm(initialForm);
      setEditing(false);
      loadAttendance();

    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const editAttendance = (a: any) => {
    setForm({
      id: a.id,
      employeeId: a.employeeId,
      employeeCode: a.employeeCode,
      employeeName: a.employeeName,
      department: a.department,
      attendanceDate:
        a.attendanceDate?.slice(0, 10) || "",
      checkIn: a.checkIn || "",
      checkOut: a.checkOut || "",
      status: a.status || "Present",
      note: a.note || "",
    });

    setEditing(true);
  };

  const deleteAttendance = async (
    id: number
  ) => {
    if (
      !confirm(
        "Delete attendance?"
      )
    )
      return;

    try {
      await axios.delete(
        `${API}/attendance/${id}`
      );

      alert("Deleted ✅");

      loadAttendance();

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
            Attendance
          </h1>

          <p style={styles.sub}>
            Employee attendance management
          </p>
        </div>

        <button
          onClick={loadAttendance}
          style={styles.refreshBtn}
        >
          Refresh
        </button>
      </div>

      <div style={styles.layout}>
        {/* FORM */}
        <div style={styles.formCard}>
          <h2>
            {editing
              ? "Edit Attendance"
              : "New Attendance"}
          </h2>

          <select
            value={form.employeeId}
            onChange={(e) =>
              handleEmployee(
                e.target.value
              )
            }
            style={styles.input}
          >
            <option value="">
              Select Employee
            </option>

            {employees.map((e) => (
              <option
                key={e.id}
                value={e.id}
              >
                {e.employeeCode} -{" "}
                {e.firstName}{" "}
                {e.lastName}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="attendanceDate"
            value={form.attendanceDate}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="time"
            name="checkIn"
            value={form.checkIn}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="time"
            name="checkOut"
            value={form.checkOut}
            onChange={handleChange}
            style={styles.input}
          />

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            style={styles.input}
          >
            <option>
              Present
            </option>

            <option>
              Absent
            </option>

            <option>
              Late
            </option>

            <option>
              Half Day
            </option>

            <option>
              Leave
            </option>
          </select>

          <textarea
            name="note"
            placeholder="Note"
            value={form.note}
            onChange={handleChange}
            style={styles.textarea}
          />

          <button
            onClick={saveAttendance}
            disabled={saving}
            style={styles.saveBtn}
          >
            {saving
              ? "Saving..."
              : editing
              ? "Update Attendance"
              : "Save Attendance"}
          </button>
        </div>

        {/* LIST */}
        <div style={styles.listCard}>
       <input
  placeholder="Search ref, description, type, user..."
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
                  <th style={styles.th}>
                    Employee
                  </th>

                  <th style={styles.th}>
                    Date
                  </th>

                  <th style={styles.th}>
                    Check In
                  </th>

                  <th style={styles.th}>
                    Check Out
                  </th>

                  <th style={styles.th}>
                    Hours
                  </th>

                  <th style={styles.th}>
                    OT
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
               {paginatedHistory.map((a) => (
                  <tr key={a.id}>
                    <td style={styles.td}>
                      {a.employeeName}
                    </td>

                    <td style={styles.td}>
                      {a.attendanceDate?.slice(
                        0,
                        10
                      )}
                    </td>

                    <td style={styles.td}>
                      {a.checkIn}
                    </td>

                    <td style={styles.td}>
                      {a.checkOut}
                    </td>

                    <td style={styles.td}>
                      {a.totalHours}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          Number(
                            a.overtimeHours
                          ) > 0
                            ? "#16a34a"
                            : "#64748b",
                        fontWeight:
                          "bold",
                      }}
                    >
                      {a.overtimeHours}
                    </td>

                    <td style={styles.td}>
                      {a.status}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      <button
                        onClick={() =>
                          editAttendance(a)
                        }
                        style={
                          styles.editBtn
                        }
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteAttendance(
                            a.id
                          )
                        }
                        style={
                          styles.deleteBtn
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

           {paginatedHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={
                        styles.empty
                      }
                    >
                      No attendance found
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
    Page {page} of {totalPages}
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
    Next
  </button>
</div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
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
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    minHeight: "90px",
    resize: "vertical",
    outline: "none",
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
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
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

};