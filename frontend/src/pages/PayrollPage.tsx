import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Calendar } from "primereact/calendar";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api/hr";

const initialForm = {
  id: "",
  employeeId: "",
  employeeCode: "",
  employeeName: "",
  department: "",
  position: "",
  payrollMonth: "",
  basicSalary: "",
  overtimeAmount: "",
  bonusAmount: "",
  deductionAmount: "",
  taxAmount: "",
  paymentStatus: "Pending",
};

const PayrollPage = () => {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [periodType, setPeriodType] = useState("MONTHLY");
  const [bulkPeriodType, setBulkPeriodType] = useState("MONTHLY");

  const [singleMonth, setSingleMonth] = useState<Date | null>(null);
  const [singleRange, setSingleRange] = useState<Date[] | null>(null);

  const [bulkMonth, setBulkMonth] = useState<Date | null>(null);
  const [bulkRange, setBulkRange] = useState<Date[] | null>(null);

  const [page, setPage] = useState(1);
  const [payslipUrl, setPayslipUrl] = useState("");

  const pageSize = 5;

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  const formatMonth = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const getPayrollPeriod = (
    type: string,
    month: Date | null,
    range: Date[] | null
  ) => {
    if (type === "MONTHLY") {
      if (!month) return "";
      return formatMonth(month);
    }

    if (!range || !range[0] || !range[1]) return "";

    return `${formatDate(range[0])}_to_${formatDate(range[1])}`;
  };

  const loadPayroll = async () => {
    try {
      const res = await axios.get(`${API}/payroll`);
      setPayroll(res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD PAYROLL ERROR 👉", err.response?.data || err.message);
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
    loadPayroll();
    loadEmployees();
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEmployee = (id: string) => {
    const emp = employees.find((e) => String(e.id) === String(id));
    if (!emp) return;

    setForm({
      ...form,
      employeeId: emp.id,
      employeeCode: emp.employeeCode || "",
      employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
      department: emp.department || "",
      position: emp.position || "",
      basicSalary: String(emp.salary || 0),
    });
  };

  const applySinglePeriod = (
    type: string,
    month: Date | null,
    range: Date[] | null
  ) => {
    const period = getPayrollPeriod(type, month, range);
    setForm({ ...form, payrollMonth: period });
  };

  const savePayroll = async () => {
    if (saving) return;

    if (!form.employeeId) return alert("Select employee");
    if (!form.payrollMonth) return alert("Select payroll period");

    try {
      setSaving(true);

      if (editing) {
        await axios.put(`${API}/payroll/${form.id}`, form);
        alert("Payroll updated ✅");
      } else {
        await axios.post(`${API}/payroll`, form);
        alert("Payroll saved ✅");
      }

      clearForm();
      loadPayroll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const generatePayrollAll = async () => {
    const payrollPeriod = getPayrollPeriod(
      bulkPeriodType,
      bulkMonth,
      bulkRange
    );

    if (!payrollPeriod) {
      alert("Select payroll period");
      return;
    }

    if (!confirm(`Generate payroll for all active employees for ${payrollPeriod}?`)) {
      return;
    }

    try {
      setGenerating(true);

      const res = await axios.post(`${API}/payroll/generate-all`, {
        payrollMonth: payrollPeriod,
        paymentStatus: "Pending",
      });

      alert(res.data?.message || "Payroll generated ✅");
      loadPayroll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Generate payroll failed");
    } finally {
      setGenerating(false);
    }
  };

  const previewPayroll = (p: any) => {
    setPayslipUrl(`${API}/payroll-preview/${p.id}`);
  };

  const previewPayrollAll = () => {
    const payrollPeriod = getPayrollPeriod(
      bulkPeriodType,
      bulkMonth,
      bulkRange
    );

    if (!payrollPeriod) {
      alert("Select payroll period first");
      return;
    }

    setPayslipUrl(`${API}/payroll-preview-all?month=${payrollPeriod}`);
  };

  const editPayroll = (p: any) => {
    setForm({
      id: p.id,
      employeeId: p.employeeId,
      employeeCode: p.employeeCode,
      employeeName: p.employeeName,
      department: p.department,
      position: p.position,
      payrollMonth: p.payrollMonth || "",
      basicSalary: p.basicSalary || "",
      overtimeAmount: p.overtimeAmount || "",
      bonusAmount: p.bonusAmount || "",
      deductionAmount: p.deductionAmount || "",
      taxAmount: p.taxAmount || "",
      paymentStatus: p.paymentStatus || "Pending",
    });

    setEditing(true);
  };

  const deletePayroll = async (id: number) => {
    if (!confirm("Delete payroll?")) return;

    try {
      await axios.delete(`${API}/payroll/${id}`);
      alert("Deleted ✅");
      loadPayroll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const clearForm = () => {
    setForm(initialForm);
    setSingleMonth(null);
    setSingleRange(null);
    setEditing(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return payroll.filter(
      (p) =>
        String(p.employeeName || "").toLowerCase().includes(q) ||
        String(p.payrollMonth || "").toLowerCase().includes(q) ||
        String(p.paymentStatus || "").toLowerCase().includes(q)
    );
  }, [payroll, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginatedHistory = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const basic = Number(form.basicSalary || 0);
  const overtime = Number(form.overtimeAmount || 0);
  const bonus = Number(form.bonusAmount || 0);
  const deduction = Number(form.deductionAmount || 0);
  const tax = Number(form.taxAmount || 0);
  const gross = basic + overtime + bonus;
  const net = gross - deduction - tax;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Payroll</h1>
          <p style={styles.sub}>Monthly, weekly, and bi-weekly payroll</p>
        </div>

        <button onClick={loadPayroll} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h2>{editing ? "Edit Payroll" : "New Payroll"}</h2>

          <select
            value={form.employeeId}
            onChange={(e) => handleEmployee(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employeeCode} - {e.firstName} {e.lastName}
              </option>
            ))}
          </select>

          <select
            value={periodType}
            onChange={(e) => {
              const type = e.target.value;
              setPeriodType(type);
              setSingleMonth(null);
              setSingleRange(null);
              setForm({ ...form, payrollMonth: "" });
            }}
            style={styles.input}
          >
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">1 Week</option>
            <option value="BIWEEKLY">2 Weeks</option>
          </select>

          {periodType === "MONTHLY" ? (
            <Calendar
              value={singleMonth}
              onChange={(e) => {
                const d = e.value as Date;
                setSingleMonth(d);
                applySinglePeriod(periodType, d, null);
              }}
              view="month"
              dateFormat="mm/yy"
              placeholder="Select payroll month"
              style={styles.input}
            />
          ) : (
            <Calendar
              value={singleRange}
              placeholder={
                periodType === "WEEKLY"
                  ? "Select 1 week range"
                  : "Select 2 weeks range"
              }
              onChange={(e) => {
                const r = e.value as Date[];
                setSingleRange(r);
                applySinglePeriod(periodType, null, r);
              }}
              selectionMode="range"
              readOnlyInput
              hideOnRangeSelection
              style={styles.input}
            />
          )}

          <input
            value={form.payrollMonth}
            readOnly
            placeholder="Payroll period"
            style={styles.input}
          />

          <input
            type="number"
            name="basicSalary"
            placeholder="Basic Salary"
            value={form.basicSalary}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="number"
            name="overtimeAmount"
            placeholder="Overtime"
            value={form.overtimeAmount}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="number"
            name="bonusAmount"
            placeholder="Bonus"
            value={form.bonusAmount}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="number"
            name="deductionAmount"
            placeholder="Deduction"
            value={form.deductionAmount}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            type="number"
            name="taxAmount"
            placeholder="Tax"
            value={form.taxAmount}
            onChange={handleChange}
            style={styles.input}
          />

          <select
            name="paymentStatus"
            value={form.paymentStatus}
            onChange={handleChange}
            style={styles.input}
          >
            <option>Pending</option>
            <option>Paid</option>
            <option>Cancelled</option>
          </select>

          <div style={styles.previewBox}>
            <div style={styles.previewLine}>
              <span>Gross Salary</span>
              <b>${gross.toFixed(2)}</b>
            </div>

            <div style={styles.totalLine}>
              <span>Net Salary</span>
              <b>${net.toFixed(2)}</b>
            </div>
          </div>

          <button
            onClick={savePayroll}
            disabled={saving}
            style={styles.saveBtn}
          >
            {saving ? "Saving..." : editing ? "Update Payroll" : "Save Payroll"}
          </button>

          <button onClick={clearForm} style={styles.clearBtn}>
            Clear
          </button>
        </div>

        <div style={styles.listCard}>
         <div style={styles.bulkBox}>
  <select
    value={bulkPeriodType}
    onChange={(e) => {
      const type = e.target.value;

      setBulkPeriodType(type);

      setBulkMonth(null);
      setBulkRange(null);
      setPayslipUrl("");
    }}
    style={styles.input}
  >
    <option value="MONTHLY">Monthly</option>
    <option value="WEEKLY">1 Week</option>
    <option value="BIWEEKLY">2 Weeks</option>
  </select>

  {bulkPeriodType === "MONTHLY" ? (
    <Calendar
      key="monthly-calendar"
      value={bulkMonth}
      onChange={(e) => {
        setBulkMonth(e.value as Date);
        setBulkRange(null);
      }}
      view="month"
      dateFormat="mm/yy"
      placeholder="Select month"
      style={styles.input}
    />
  ) : (
    <Calendar
      key="range-calendar"
      value={bulkRange}
      onChange={(e) => {
        setBulkRange(e.value as Date[]);
        setBulkMonth(null);
      }}
      selectionMode="range"
      readOnlyInput
      hideOnRangeSelection
      placeholder={
        bulkPeriodType === "WEEKLY"
          ? "Select 1 week"
          : "Select 2 weeks"
      }
      style={styles.input}
    />
  )}

  <button
    onClick={generatePayrollAll}
    disabled={generating}
    style={{
      ...styles.generateBtn,
      opacity: generating ? 0.7 : 1,
      cursor: generating ? "not-allowed" : "pointer",
    }}
  >
    {generating ? "Generating..." : "Generate"}
  </button>

  <button onClick={previewPayrollAll} style={styles.previewAllBtn}>
    Preview All
  </button>
</div>

          <input
            placeholder="Search employee, period, status..."
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
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Period</th>
                  <th style={styles.th}>Gross</th>
                  <th style={styles.th}>Net</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedHistory.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.employeeName}</td>
                    <td style={styles.td}>{p.payrollMonth}</td>
                    <td style={{ ...styles.td, color: "#2563eb", fontWeight: "bold" }}>
                      ${Number(p.grossSalary || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, color: "#16a34a", fontWeight: "bold" }}>
                      ${Number(p.netSalary || 0).toFixed(2)}
                    </td>
                    <td style={styles.td}>{p.paymentStatus}</td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      <button onClick={() => previewPayroll(p)} style={styles.previewBtn}>
                        Preview
                      </button>

                      <button onClick={() => editPayroll(p)} style={styles.editBtn}>
                        Edit
                      </button>

                      <button onClick={() => deletePayroll(p.id)} style={styles.deleteBtn}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {paginatedHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} style={styles.empty}>
                      No payroll found
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
              style={styles.pageBtn}
            >
              Prev
            </button>

            <span style={styles.pageText}>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={styles.pageBtn}
            >
              Next
            </button>
          </div>

          {payslipUrl && (
            <div style={styles.pdfContainer}>
              <div style={styles.pdfTop}>
                <button style={styles.closeBtn} onClick={() => setPayslipUrl("")}>
                  Close
                </button>
              </div>

              <iframe
                id="pdfFrame"
                src={payslipUrl}
                title="Payroll PDF"
                style={styles.pdfFrame}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },
pdfContainer:{
  marginTop:"20px",
  background:"#fff",
  borderRadius:"16px",
  overflow:"hidden",
  border:"1px solid #dbe2ea",
},

pdfTop:{
  display:"flex",
  justifyContent:"flex-end",
  gap:"10px",
  padding:"14px",
  background:"#f8fafc",
  borderBottom:"1px solid #e2e8f0",
},

printBtn:{
  padding:"10px 16px",
  background:"#2563eb",
  color:"#fff",
  border:"none",
  borderRadius:"10px",
  fontWeight:"bold",
  cursor:"pointer",
},

closeBtn:{
  padding:"10px 16px",
  background:"#dc2626",
  color:"#fff",
  border:"none",
  borderRadius:"10px",
  fontWeight:"bold",
  cursor:"pointer",
},

pdfFrame:{
  width:"100%",
  height:"850px",
  border:"none",
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
    gridTemplateColumns: "380px minmax(0, 1fr)",
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

  search: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    marginBottom: "16px",
    boxSizing: "border-box",
  },

  previewBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    background: "#f8fafc",
    marginTop: "4px",
  },

  previewLine: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "16px",
    color: "#334155",
  },

  totalLine: {
    display: "flex",
    justifyContent: "space-between",
    padding: "14px 0 4px",
    fontSize: "22px",
    fontWeight: "bold",
    color: "#16a34a",
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

  clearBtn: {
    padding: "13px",
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
  },

  bulkBox: {
    display: "grid",
    gridTemplateColumns: "1fr 180px 140px",
    gap: "12px",
    marginBottom: "16px",
  },

  generateBtn: {
    padding: "13px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  previewAllBtn: {
    padding: "13px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
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

  previewBtn: {
    padding: "8px 12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
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

  iframeBox: {
    marginTop: "22px",
    width: "100%",
    height: "650px",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    background: "#fff",
  },

  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
};