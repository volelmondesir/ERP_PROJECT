import React, { useState, useEffect } from "react";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000";
const ChequeRequestPage = () => {
 
const [beneficiaires, setBeneficiaires] = useState([]);
const [form, setForm] = useState({
  date: "",
  amount: "",
  beneficiaire_id: "",
  reason: "",
  department: "",
  requester: "",
  fraud_flag: false,
  fraud_note: "",
});

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
useEffect(() => {
  fetch("http://localhost:5000/api/beneficiaire")
    .then(res => res.json())
    .then(data => setBeneficiaires(data));
}, []);
 const handleSubmit = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/cheque", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const text = await res.text(); // 🔥 pa json dirèk

    console.log("RAW RESPONSE 👉", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Server pa voye JSON");
    }

    if (!res.ok) {
      throw new Error(data.message);
    }

    alert("Saved successfully 🔥");

  } catch (err: any) {
    console.error(err);
    alert(err.message);
  }
};

  return (
    <div style={styles.card}>
      <h2>Demande de Chèque</h2>

      <div style={styles.row}>
        <input type="date" name="date" onChange={handleChange} />
        <input placeholder="Montant" name="amount" onChange={handleChange} />
      </div>

      <input
        placeholder="Bénéficiaire"
        name="payee"
        onChange={handleChange}
        style={styles.input}
      />

      <input
        placeholder="Raison"
        name="reason"
        onChange={handleChange}
        style={styles.input}
      />

      <div style={styles.row}>
        <input
          placeholder="Département"
          name="department"
          onChange={handleChange}
        />
        <input
          placeholder="Demandeur"
          name="requester"
          onChange={handleChange}
        />
        <select name="beneficiaire_id" onChange={handleChange}>
  <option value="">Select Beneficiaire</option>

  {beneficiaires.map((b: any) => (
    <option key={b.id} value={b.id}>
      {b.name}
    </option>
  ))}
</select>
<label>
  <input
    type="checkbox"
    name="fraud_flag"
    onChange={(e) =>
      setForm({ ...form, fraud_flag: e.target.checked })
    }
  />
  Fraud Case
</label>
      </div>

      <button onClick={handleSubmit} style={styles.button}>
        Save
      </button>
      {form.fraud_flag && (
  <input
    placeholder="Explain fraud case"
    name="fraud_note"
    onChange={handleChange}
    style={styles.input}
  />
)}
    </div>
    
  );
};

export default ChequeRequestPage;

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  row: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },

  input: {
    width: "100%",
    marginBottom: "10px",
    padding: "8px",
  },

  button: {
    padding: "10px",
    background: "#0fbcf9",
    border: "none",
    color: "#fff",
    borderRadius: "6px",
  },
};