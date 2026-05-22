import { useEffect, useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

const LicensePage = () => {
  const [license, setLicense] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
 
  
 const daysRemaining =  Number(license?.daysRemaining || 0);
const isBlocked = Boolean(license?.isBlocked);

const canCreateTrial = !license?.id;

const canExtend = Boolean(license?.id);

const canBlock = Boolean(license?.id) && !isBlocked;

const canUnblock = Boolean(license?.id) && isBlocked;
 const [form, setForm] = useState({
  companyName: "",
  adminPassword: "",
  adminKey: "",
  months: "6",
  licenseKey:""
});

 const loadStatus = async () => {
  try {
    const res = await axios.get(`${API}/license/status`);
    setLicense(res.data || null);
  } catch (err: any) {
    setLicense(null);
    console.log("LICENSE STATUS 👉", err.response?.data || err.message);
  }
};
  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
  if (
    license?.id &&
    !license?.isBlocked &&
    daysRemaining > 0 &&
    daysRemaining <= 31
  ) {
    setShowWarning(true);
  }
}, [license, daysRemaining]);
const createLicense = async () => {
if (!form.companyName || !form.adminKey) {
  alert("Company name and admin key required");
  return;
}
  try {
    setLoading(true);

   const res = await axios.post(`${API}/license/create-trial`, {
  companyName: form.companyName,
  months: Number(form.months || 6),
  adminKey: form.adminKey,
});
    alert(res.data.message || "License created");
    loadStatus();
  } catch (err: any) {
    alert(err.response?.data?.message || "Create failed");
  } finally {
    setLoading(false);
  }
};
const blockLicense = async () => {
  if (!form.adminKey) {
    alert("Enter admin key");
    return;
  }

  if (!confirm("Block this license?")) return;

  try {
    setLoading(true);

    const res = await axios.post(`${API}/license/block`, {
      adminKey: form.adminKey,
    });

    alert(res.data.message || "License blocked ✅");
    loadStatus();

  } catch (err: any) {
    alert(err.response?.data?.message || "Block failed");
  } finally {
    setLoading(false);
  }
};
const unblockLicense = async () => {
  if (!form.adminKey) {
    alert("Enter admin key");
    return;
  }

  try {
    setLoading(true);

    const res = await axios.post(`${API}/license/unblock`, {
      adminKey: form.adminKey,
    });

    alert(res.data.message || "License unblocked ✅");
    loadStatus();

  } catch (err: any) {
    alert(err.response?.data?.message || "Unblock failed");
  } finally {
    setLoading(false);
  }
};

const extendLicense = async () => {
  if (!form.adminKey) {
    alert("Enter admin key");
    return;
  }

  try {
    setLoading(true);

    const res = await axios.post(`${API}/license/extend`, {
      adminKey: form.adminKey,
      months: Number(form.months || 6),
    });

    alert(res.data.message || "License extended ✅");
    loadStatus();

  } catch (err: any) {
    alert(err.response?.data?.message || "Extend failed");
  } finally {
    setLoading(false);
  }

};

  const expired =
    license?.endDate && new Date() > new Date(license.endDate);

 const active =
  license?.isActive &&
  !license?.isBlocked &&
  !expired;


const remainingColor =
  daysRemaining <= 0
    ? "#dc2626"
    : daysRemaining <= 31
    ? "#f59e0b"
    : "#16a34a";
 return (
  <div style={styles.page}>
    {showWarning && (
  <div style={styles.overlay}>
    <div style={styles.warningBox}>
      <h2 style={styles.warningTitle}>
        ⚠️ License Warning
      </h2>

      <p style={styles.warningText}>
        Your ERP license will expire in{" "}
        <b>{daysRemaining} days</b>.
      </p>

      <p style={styles.warningSub}>
        Please renew your license to avoid system interruption.
      </p>

      <button
        onClick={() => setShowWarning(false)}
        style={styles.warningBtn}
      >
        OK
      </button>
    </div>
  </div>
)}
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>License Management</h1>
        <p style={styles.sub}>
          Manage ERP trial, activation, blocking, and renewal
        </p>
      </div>

      <button onClick={loadStatus} style={styles.refreshBtn}>
        Refresh
      </button>
    </div>

    <div style={styles.grid}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>License Status</h2>

        <div style={styles.statusBox}>
          <span
            style={{
              ...styles.statusDot,
              background: active ? "#16a34a" : "#dc2626",
              boxShadow: active ? "0 0 8px #16a34a" : "0 0 8px #dc2626",
            }}
          />

          <b style={{ color: active ? "#16a34a" : "#dc2626" }}>
            {active ? "Active" : "BLOCKED / EXPIRED"}
          </b>
        </div>

        <p>
          <b>Company:</b> {license?.companyName || "-"}
        </p>

        <p>
          <b>License Key:</b> {license?.licenseKey || "-"}
        </p>

        <p>
          <b>Start:</b>{" "}
          {license?.startDate
            ? new Date(license.startDate).toLocaleDateString()
            : "-"}
        </p>

        <p>
          <b>End:</b>{" "}
          {license?.endDate
            ? new Date(license.endDate).toLocaleDateString()
            : "-"}
        </p>

        <p>
          <b>Active:</b> {active ? "Yes" : "No"}
        </p>

        <p>
          <b>Total Days:</b> {license?.totalDays || 0}
        </p>

        <div style={{ marginTop: 14 }}>
          <div style={styles.statusBox}>
            <span
              style={{
                ...styles.statusDot,
                background: "#dc2626",
                boxShadow: "0 0 8px #dc2626",
              }}
            />

            <b style={{ color: "#dc2626" }}>
              {license?.daysUsed || 0} days used
            </b>
          </div>

          <div
            style={{
              ...styles.statusBox,
              marginTop: 12,
            }}
          >
            <span
              style={{
                ...styles.statusDot,
                background: remainingColor,
                boxShadow: `0 0 8px ${remainingColor}`,
              }}
            />

            <b style={{ color: remainingColor }}>
              {daysRemaining} days remaining
            </b>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Create Trial License</h2>

        <input
          placeholder="Company Name"
          value={form.companyName}
          onChange={(e) =>
            setForm({
              ...form,
              companyName: e.target.value,
            })
          }
          style={styles.input}
        />

        <input
          placeholder="License Key"
          value={form.licenseKey}
          onChange={(e) =>
            setForm({
              ...form,
              licenseKey: e.target.value,
            })
          }
          style={styles.input}
        />

        <button
          onClick={createLicense}
          disabled={loading || !canCreateTrial}
          style={{
            ...styles.saveBtn,
            opacity: loading || !canCreateTrial ? 0.5 : 1,
            cursor: loading || !canCreateTrial ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saving..." : "Create 6 Months Trial"}
        </button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Reseller Control</h2>

        <input
          type="password"
          placeholder="Reseller PassKey"
          autoComplete="new-password"
          value={form.adminKey}
          onChange={(e) =>
            setForm({
              ...form,
              adminKey: e.target.value,
            })
          }
          style={styles.input}
        />

        <input
          type="number"
          placeholder="Months"
          value={form.months}
          onChange={(e) =>
            setForm({
              ...form,
              months: e.target.value,
            })
          }
          style={styles.input}
        />

        <button
          onClick={extendLicense}
          disabled={loading || !canExtend}
          style={{
            ...styles.extendBtn,
            opacity: loading || !canExtend ? 0.5 : 1,
            cursor: loading || !canExtend ? "not-allowed" : "pointer",
          }}
        >
         Extend License
        </button>

        <button
          onClick={blockLicense}
          disabled={loading || !canBlock}
          style={{
            ...styles.blockBtn,
            opacity: loading || !canBlock ? 0.5 : 1,
            cursor: loading || !canBlock ? "not-allowed" : "pointer",
          }}
        >
         Block License
        </button>

        <button
          onClick={unblockLicense}
          disabled={loading || !canUnblock}
          style={{
            ...styles.unblockBtn,
            opacity: loading || !canUnblock ? 0.5 : 1,
            cursor: loading || !canUnblock ? "not-allowed" : "pointer",
          }}
        >
         Unblock License
        </button>
      </div>
    </div>
  </div>
);}
export default LicensePage;

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

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "22px",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  cardTitle: {
    margin: "0 0 10px",
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

statusBox: {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "16px 18px",
  borderRadius: 18,
  border: "1px solid #dbe3ee",
  background: "#f8fafc",
},
 statusDot: {
  width: 18,
  height: 18,
  borderRadius: "50%",
  display: "inline-block",
},
  saveBtn: {
    padding: "13px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  extendBtn: {
    padding: "13px",
    background: "#eb9c25",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  blockBtn: {
    padding: "13px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  unblockBtn: {
    padding: "13px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  overlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
},

warningBox: {
  width: 460,
  background: "#fff",
  borderRadius: 28,
  padding: 30,
  boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
  textAlign: "center",
},

warningTitle: {
  margin: 0,
  fontSize: 32,
  color: "#f59e0b",
},

warningText: {
  fontSize: 22,
  color: "#0f172a",
  marginTop: 18,
},

warningSub: {
  fontSize: 16,
  color: "#64748b",
},

warningBtn: {
  marginTop: 20,
  padding: "13px 35px",
  border: "none",
  borderRadius: 14,
  background: "#2563eb",
  color: "#fff",
  fontSize: 18,
  fontWeight: "bold",
  cursor: "pointer",
},

};