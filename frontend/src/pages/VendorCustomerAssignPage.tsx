import { useEffect, useMemo, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";

const VendorCustomerAssignPage = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  


const loadVendors = async () => {
    try {
      const res = await axios.get(`${API}/mk/vendors`);
      setVendors(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD CUSTOMER ERROR 👉", err.response?.data || err.message);
      setVendors([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API}/ar/customers`);
     setCustomers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD ACCOUNTS ERROR 👉", err.response?.data || err.message);
      setCustomers([]);
    }
  };
const loadAssignments = async () => {
  try {
    const res = await axios.get(`${API}/mk/vendor-customers`);

    console.log("ASSIGNMENTS RAW 👉", res.data);

    const rows = Array.isArray(res.data)
      ? res.data
      : res.data?.data || [];

    setAssignments(rows);
  } catch (err: any) {
    console.log("LOAD ASSIGNMENTS ERROR 👉", err.response?.data || err.message);
    setAssignments([]);
  }
};

  useEffect(() => {
    loadVendors();
    loadAssignments();
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return assignments.filter((a) =>
      String(a.vendorCode || "").toLowerCase().includes(q) ||
      String(a.vendorName || "").toLowerCase().includes(q) ||
      String(a.customerName || "").toLowerCase().includes(q) ||
      String(a.phone || "").toLowerCase().includes(q)
    );
  }, [assignments, search]);

  const assignCustomer = async () => {
    if (!vendorId || !customerId) {
      alert("Select vendor and customer");
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/mk/vendor-customer`, {
        vendorId: Number(vendorId),
        customerId: Number(customerId),
      });

      alert("Customer assigned ✅");
      setCustomerId("");
     loadVendors();
    loadAssignments();
    loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Assign failed");
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (id: number) => {
    if (!confirm("Remove this assignment?")) return;

    try {
      await axios.delete(`${API}/mk/vendor-customer/${id}`);
      alert("Removed ✅");
     loadVendors();
    loadAssignments();
    loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Remove failed");
    }
  };
const refreshAll = () => {
  loadVendors();
  loadCustomers();
  loadAssignments();
};
  return (
    
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Vendor Customer Assignment</h1>
          <p style={styles.sub}>Assign customers to vendor codes</p>
        </div>

        <button onClick={ refreshAll} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>Assign Customer</h2>
<select
  value={vendorId}
  onChange={(e) => setVendorId(e.target.value)}
  style={styles.input}
>
  <option value="">Select Vendor</option>

  {vendors.length > 0 ? (
    vendors.map((v: any) => (
      <option key={v.id} value={v.id}>
        {v.vendorCode} — {v.vendorName}
      </option>
    ))
  ) : (
    <option disabled>No vendors found</option>
  )}
</select>

         <select
  value={customerId}
  onChange={(e) => setCustomerId(e.target.value)}
  style={styles.input}
>
  <option value="">Select Customer</option>

  {customers.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name} — {c.phone || "No phone"}
    </option>
  ))}
</select>
          <button onClick={assignCustomer} disabled={saving} style={styles.saveBtn}>
            {saving ? "Saving..." : "Assign Customer"}
          </button>
        </div>

        <div style={styles.listCard}>
          <input
            placeholder="Search vendor/customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.search}
          />

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Vendor Code</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td style={styles.td}>{a.vendorCode}</td>
                    <td style={styles.td}>{a.vendorName}</td>
                    <td style={styles.td}>{a.customerName}</td>
                    <td style={styles.td}>{a.phone || "-"}</td>
                    <td style={styles.td}>{a.email || "-"}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => removeAssignment(a.id)}
                        style={styles.deleteBtn}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={styles.empty}>
                      No assignment found
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

export default VendorCustomerAssignPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
    overflowX: "hidden",
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
    display: "grid",
    gridTemplateColumns: "360px minmax(0, 1fr)",
    gap: "22px",
    width: "100%",
    maxWidth: "100%",
  },
  formCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    minWidth: 0,
  },
  listCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
  },
  cardTitle: {
    margin: "0 0 8px",
  },
  input: {
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
    maxWidth: "100%",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
  },
  table: {
    width: "max-content",
    minWidth: "950px",
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
  saveBtn: {
    padding: "12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
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
};