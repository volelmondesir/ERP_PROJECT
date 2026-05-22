import { useEffect, useMemo, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";

const initialForm = {
  id: "",
  vendorName: "",
  phone: "",
  email: "",
  address: "",
  isActive: true,
};

const VendorPage = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [form, setForm] = useState<any>(initialForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadVendors = async () => {
    try {
      const res = await axios.get(`${API}/mk/vendors`);
      setVendors(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD VENDORS ERROR 👉", err.response?.data || err.message);
      setVendors([]);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return vendors.filter((v) =>
      String(v.vendorCode || "").toLowerCase().includes(q) ||
      String(v.vendorName || "").toLowerCase().includes(q) ||
      String(v.phone || "").toLowerCase().includes(q) ||
      String(v.email || "").toLowerCase().includes(q)
    );
  }, [vendors, search]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const saveVendor = async () => {
    if (saving) return;

    if (!form.vendorName.trim()) {
      alert("Vendor name required");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await axios.put(`${API}/mk/vendor/${form.id}`, {
          vendorName: form.vendorName,
          phone: form.phone,
          email: form.email,
          address: form.address,
          isActive: form.isActive,
        });

        alert("Vendor updated ✅");
      } else {
        await axios.post(`${API}/mk/vendor`, {
          vendorName: form.vendorName,
          phone: form.phone,
          email: form.email,
          address: form.address,
        });

        alert("Vendor saved ✅");
      }

      setForm(initialForm);
      setEditing(false);
      loadVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const editVendor = (vendor: any) => {
    setForm({
      id: vendor.id,
      vendorName: vendor.vendorName || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      isActive: Boolean(vendor.isActive),
    });

    setEditing(true);
  };

  const disableVendor = async (id: number) => {
    if (!confirm("Disable this vendor?")) return;

    try {
      await axios.delete(`${API}/mk/vendor/${id}`);
      alert("Vendor disabled ✅");
      loadVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || "Disable failed");
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
          <h1 style={styles.h1}>Vendeurs</h1>
          <p style={styles.sub}>Create vendor with auto generated code</p>
        </div>

        <button onClick={loadVendors} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>
            {editing ? "Edit Vendor" : "New Vendor"}
          </h2>

          <input
            name="vendorName"
            placeholder="Vendor name"
            value={form.vendorName}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            name="phone"
            placeholder="Phone"
            value={form.phone}
            onChange={handleChange}
            style={styles.input}
          />

          <input
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            style={styles.input}
          />

          <textarea
            name="address"
            placeholder="Address"
            value={form.address}
            onChange={handleChange}
            style={styles.textarea}
          />

          {editing && (
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
              />
              Active
            </label>
          )}

          <button onClick={saveVendor} disabled={saving} style={styles.saveBtn}>
            {saving ? "Saving..." : editing ? "Update Vendor" : "Save Vendor"}
          </button>

          <button onClick={clearForm} style={styles.clearBtn}>
            Clear
          </button>
        </div>

        <div style={styles.listCard}>
          <input
            placeholder="Search vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.search}
          />

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td style={styles.td}>{v.vendorCode}</td>
                    <td style={styles.td}>{v.vendorName}</td>
                    <td style={styles.td}>{v.phone}</td>
                    <td style={styles.td}>{v.email}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background: v.isActive ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      <button onClick={() => editVendor(v)} style={styles.editBtn}>
                        Edit
                      </button>

                      <button
                        onClick={() => disableVendor(v.id)}
                        style={styles.deleteBtn}
                      >
                        Disable
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={styles.empty}>
                      No vendors found
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

export default VendorPage;

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
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    minHeight: "80px",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
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
    width: "1050px",
    minWidth: "1050px",
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
};