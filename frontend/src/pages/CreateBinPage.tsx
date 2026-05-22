import { useEffect, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";

const CreateBinPage = () => {
  const [binsGenerated, setBinsGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadBins = async () => {
    try {
      const res = await axios.get(`${API}/bins/bins`);

      console.log("BINS RESPONSE 👉", res.data);

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setBinsGenerated(data.length > 0);
    } catch (err: any) {
      console.log("LOAD BINS ERROR 👉", err.response?.data || err.message);
      setBinsGenerated(false);
    }
  };

  useEffect(() => {
    loadBins();
  }, []);

  const generateBins = async () => {
    if (!confirm("Generate bins 000 - 999?")) return;

    try {
      setGenerating(true);

      const res = await axios.post(`${API}/bins/bins/generate`);

      alert(res.data?.message || "Bins generated ✅");

      await loadBins();
    } catch (err: any) {
      console.log("GENERATE BINS ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Create Bin</h1>

        <p style={styles.sub}>Create warehouse storage bin</p>

        <button
          onClick={generateBins}
          disabled={generating || binsGenerated}
          style={{
            ...styles.generateBtn,
            opacity: generating || binsGenerated ? 0.5 : 1,
            cursor: generating || binsGenerated ? "not-allowed" : "pointer",
          }}
        >
          {binsGenerated
            ? "Bins Already Generated"
            : generating
            ? "Generating..."
            : "Generate Bins 000-999"}
        </button>
      </div>
    </div>
  );
};

export default CreateBinPage;
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "40px",
    fontFamily: "Arial",
  },

  card: {
    width: "100%",
    maxWidth: "500px",
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  h1: {
    margin: 0,
    fontSize: "32px",
    color: "#0f172a",
  },

  sub: {
    marginTop: "-4px",
    marginBottom: "8px",
    color: "#64748b",
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
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
    generateBtn: {
    padding: "13px 20px",
     background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};