import { useEffect, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "/api";

const CompanySettingsPage = () => {
  const [form, setForm] = useState({
    companyName: "",
    address: "",
    phone: "",
    footerMessage: "",
  });

  const [saving, setSaving] = useState(false);

  const loadCompany = async () => {
    try {
      const res = await axios.get(`${API}/company`);
      const data = res.data?.data;

      if (data) {
        setForm({
          companyName: data.companyName || "",
          address: data.address || "",
          phone: data.phone || "",
          footerMessage: data.footerMessage || "",
        });
      }
    } catch (err: any) {
      console.log("LOAD COMPANY ERROR 👉", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const saveCompany = async () => {
    try {
      setSaving(true);

      await axios.post(`${API}/company/company`, form);

      alert("Saved ✅");
    } catch (err: any) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Company Settings</h1>

        <input
          name="companyName"
          placeholder="Company Name"
          value={form.companyName}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="address"
          placeholder="Address"
          value={form.address}
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

        <textarea
          name="footerMessage"
          placeholder="Footer Message (receipt, cheque...)"
          value={form.footerMessage}
          onChange={handleChange}
          style={styles.textarea}
        />

        <button onClick={saveCompany} style={styles.saveBtn}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default CompanySettingsPage;
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "18px",
    width: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },
  title: {
    margin: 0,
    marginBottom: "10px",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
  },
  textarea: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    minHeight: "80px",
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
};