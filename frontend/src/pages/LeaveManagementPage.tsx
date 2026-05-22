import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api/hr";

const initialForm = {
  id: "",
  employeeId: "",
  employeeCode: "",
  employeeName: "",
  leaveType: "Vacation Leave",
  startDate: "",
  endDate: "",
  totalDays: "",
  reason: "",
};

const LeaveManagementPage = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState<any>(initialForm);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const loadLeaves = async () => {
    try {
      const res = await axios.get(`${API}/leave`);
      setLeaves(res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD LEAVES ERROR 👉", err.response?.data || err.message);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`);
      setEmployees(res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD EMPLOYEES ERROR 👉", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    loadLeaves();
    loadEmployees();
  }, []);

  const calcDays = (start: string, end: string) => {
    if (!start || !end) return "";

    const s = new Date(start);
    const e = new Date(end);

    const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return diff > 0 ? String(diff) : "";
  };

  const handleChange = (e: any) => {
    const updated = {
      ...form,
      [e.target.name]: e.target.value,
    };

    if (e.target.name === "startDate" || e.target.name === "endDate") {
      updated.totalDays = calcDays(updated.startDate, updated.endDate);
    }

    setForm(updated);
  };

  const handleEmployee = (id: string) => {
    const emp = employees.find((e) => String(e.id) === String(id));

    if (!emp) return;

    setForm({
      ...form,
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
    });
  };

  const saveLeave = async () => {
    if (saving) return;

    if (!form.employeeId) {
      alert("Select employee");
      return;
    }

    if (!form.startDate || !form.endDate) {
      alert("Select start and end date");
      return;
    }

    if (!form.totalDays) {
      alert("Invalid date range");
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/leave`, {
        employeeId: Number(form.employeeId),
        employeeCode: form.employeeCode,
        employeeName: form.employeeName,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        totalDays: Number(form.totalDays),
        reason: form.reason,
      });

      alert("Leave request saved ✅");
      setForm(initialForm);
      loadLeaves();
    } catch (err: any) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const approveLeave = async (id: number) => {
    if (!confirm("Approve this leave request?")) return;

    try {
      await axios.put(`${API}/leave/${id}/approve`);
      alert("Leave approved ✅");
      loadLeaves();
    } catch (err: any) {
      alert(err.response?.data?.message || "Approve failed");
    }
  };

  const rejectLeave = async (id: number) => {
    if (!confirm("Reject this leave request?")) return;

    try {
      await axios.put(`${API}/leave/${id}/reject`);
      alert("Leave rejected ✅");
      loadLeaves();
    } catch (err: any) {
      alert(err.response?.data?.message || "Reject failed");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return leaves.filter((l) =>
      String(l.employeeName || "").toLowerCase().includes(q) ||
      String(l.employeeCode || "").toLowerCase().includes(q) ||
      String(l.leaveType || "").toLowerCase().includes(q) ||
      String(l.status || "").toLowerCase().includes(q)
    );
  }, [leaves, search]);

  const getStatusStyle = (status: string) => {
    if (status === "Approved") return { background: "#dcfce7", color: "#16a34a" };
    if (status === "Rejected") return { background: "#fee2e2", color: "#dc2626" };
    return { background: "#fef3c7", color: "#d97706" };
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Leave Management</h1>
          <p style={styles.sub}>Employee leave request and approval management</p>
        </div>

        <button onClick={loadLeaves} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>New Leave Request</h2>

          <select value={form.employeeId} onChange={(e) => handleEmployee(e.target.value)} style={styles.input}>
            <option value="">Select Employee</option>

            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employeeCode} - {e.firstName} {e.lastName}
              </option>
            ))}
          </select>

          <select name="leaveType" value={form.leaveType} onChange={handleChange} style={styles.input}>
            <option>Vacation Leave</option>
            <option>Sick Leave</option>
            <option>Emergency Leave</option>
            <option>Maternity Leave</option>
            <option>Paternity Leave</option>
            <option>Unpaid Leave</option>
            <option>Annual Leave</option>
          </select>

          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="date"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="number"
            name="totalDays"
            placeholder="Total days"
            value={form.totalDays}
            readOnly
            style={{ ...styles.input, background: "#f8fafc" }}
          />

          <textarea
            name="reason"
            placeholder="Reason"
            value={form.reason}
            onChange={handleChange}
            style={styles.textarea}
          />

          <button onClick={saveLeave} disabled={saving} style={styles.saveBtn}>
            {saving ? "Saving..." : "Save Leave Request"}
          </button>
        </div>

        <div style={styles.listCard}>
          <input
            placeholder="Search employee, leave type, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.search}
          />

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Leave Type</th>
                  <th style={styles.th}>Start</th>
                  <th style={styles.th}>End</th>
                  <th style={styles.th}>Days</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td style={styles.td}>
                      <b>{l.employeeName}</b>
                      <div style={styles.smallText}>{l.employeeCode}</div>
                    </td>

                    <td style={styles.td}>{l.leaveType}</td>

                    <td style={styles.td}>{l.startDate ? String(l.startDate).slice(0, 10) : "-"}</td>

                    <td style={styles.td}>{l.endDate ? String(l.endDate).slice(0, 10) : "-"}</td>

                    <td style={styles.td}>{l.totalDays}</td>

                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...getStatusStyle(l.status) }}>
                        {l.status || "Pending"}
                      </span>
                    </td>

                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      {(l.status || "Pending") === "Pending" ? (
                        <>
                          <button onClick={() => approveLeave(l.id)} style={styles.approveBtn}>
                            Approve
                          </button>

                          <button onClick={() => rejectLeave(l.id)} style={styles.rejectBtn}>
                            Reject
                          </button>
                        </>
                      ) : (
                        <span style={styles.smallText}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={styles.empty}>
                      No leave request found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagementPage;

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

  cardTitle: {
    margin: "0 0 8px",
    color: "#0f172a",
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

  smallText: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "4px",
  },

  badge: {
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-block",
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
    marginTop: "8px",
  },

  approveBtn: {
    padding: "8px 12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  rejectBtn: {
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
};