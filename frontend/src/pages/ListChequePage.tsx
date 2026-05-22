import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;
const API = "http://localhost:5000/api";

const initialEdit = {
  id: "",
  date: "",
  beneficiaire_name: "",
  amount: "",
  reason: "",
  requester: "",
  department: "",
  bank_id: "",
};

const ListChequePage = () => {
  const [cheques, setCheques] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | null>(null);
const [pin, setPin] = useState("");
const [pinAction, setPinAction] = useState<null | { type: string, data: any }>(null);
  const pageSize = 5;

  const loadBanks = async () => {
    try {
      const res = await axios.get(`${API}/bank/banks`);
      setBanks(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setBanks([]);
    }
  };
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
  
const verifyPin = async () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const res = await axios.post(`${API}/bank/verify-pin`, {
      username: user.username || "Admin",
      pin,
    });

    if (res.data?.success) {
      handleAfterPin();
      setPin("");
      setPinAction(null);
    } else {
      alert("Wrong PIN ❌");
    }
  } catch (err: any) {
    alert(err.response?.data?.message || "PIN failed");
  }
};

const handleAfterPin = () => {
  if (!pinAction) return;

  if (pinAction.type === "preview") {
    previewCheque(pinAction.data);
  }

  if (pinAction.type === "edit") {
    startEdit(pinAction.data);
  }

  if (pinAction.type === "delete") {
    deleteCheque(pinAction.data.id);
  }
};
  const loadCheques = async () => {
    try {
      const res = await axios.get(`${API}/ar/cheques`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setCheques(data);
    } catch (err: any) {
      console.log("LOAD CHEQUES ERROR 👉", err.response?.data || err.message);
      setCheques([]);
    }
  };

  useEffect(() => {
    loadBanks();
    loadCheques();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return cheques.filter((c) =>
      String(c.id || "").includes(q) ||
      String(c.beneficiaire_name || "").toLowerCase().includes(q) ||
      String(c.requester || "").toLowerCase().includes(q) ||
      String(c.department || "").toLowerCase().includes(q) ||
      String(c.bank_name || "").toLowerCase().includes(q)
    );
  }, [cheques, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const numberToWords = (num: number) => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convert = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
      if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred ${convert(n % 100)}`.trim();
      if (n < 1000000) return `${convert(Math.floor(n / 1000))} Thousand ${convert(n % 1000)}`.trim();
      return String(n);
    };

    const integer = Math.floor(num);
    const cents = Math.round((num - integer) * 100);

    let words = integer === 0 ? "Zero Dollars" : `${convert(integer)} Dollars`;
    if (cents > 0) words += ` and ${cents}/100`;

    return `${words} Only`;
  };

  const previewCheque = (c: any) => {
    const doc = new jsPDF("landscape", "mm", "letter");

    const amount = Number(c.amount || 0);
    const words = numberToWords(amount);
    const bank = banks.find((b) => String(b.id) === String(c.bank_id));

    // Real bank-style check background
    doc.setFillColor(244, 250, 255);
    doc.rect(0, 0, 280, 100, "F");

    doc.setDrawColor(40, 80, 120);
    doc.setLineWidth(0.7);
    doc.rect(8, 8, 264, 82);

    // Top bank area
    doc.setFillColor(220, 235, 245);
    doc.rect(8, 8, 264, 18, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(bank?.name || c.bank_name || "BANK NAME", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(bank?.account_number ? `Account: ${bank.account_number}` : "Account: __________", 15, 30);

    // Logo placeholder
    doc.setDrawColor(30, 90, 140);
    doc.circle(250, 17, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("LOGO", 243, 19);

    // Check number
    doc.setFontSize(10);
    doc.text(`Check #: ${c.id || ""}`, 220, 32);

    // Date
    doc.setFontSize(12);
    doc.text("DATE", 210, 42);
    doc.line(225, 43, 260, 43);
    doc.text(String(c.date || "").slice(0, 10), 228, 41);

    // Payee
    doc.text("PAY TO THE ORDER OF", 15, 50);
    doc.line(65, 51, 190, 51);
    doc.text(c.beneficiaire_name || "", 68, 49);

    // Amount box
    doc.rect(205, 47, 55, 13);
    doc.setFont("helvetica", "bold");
    doc.text(`$ ${amount.toFixed(2)}`, 212, 56);

    // Amount words
    doc.setFont("helvetica", "normal");
    doc.line(15, 66, 260, 66);
    doc.text(words, 18, 64);

    // Memo / requester / dept
    doc.text("MEMO", 15, 80);
    doc.line(32, 81, 90, 81);
    doc.text(c.reason || "", 34, 79);

    doc.text("Requester:", 95, 80);
    doc.text(c.requester || "", 123, 80);

    doc.text("Dept:", 95, 88);
    doc.text(c.department || "", 112, 88);

    // Signature
    doc.line(195, 80, 260, 80);
    doc.text("Authorized Signature", 205, 87);

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const blob = doc.output("blob");
    setPdfUrl(URL.createObjectURL(blob));
  };

  const printPDF = () => {
    const iframe = document.getElementById("chequeFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  const startEdit = (c: any) => {
    setEditing({
      id: c.id,
      date: String(c.date || "").slice(0, 10),
      beneficiaire_name: c.beneficiaire_name || "",
      amount: c.amount || "",
      reason: c.reason || "",
      requester: c.requester || "",
      department: c.department || "",
      bank_id: c.bank_id || "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

 const updateCheque = async () => {
  try {
    await axios.put(`${API}/ar/cheque/${editing.id}`, {
      date: editing.date,
      amount: Number(editing.amount),
      beneficiaire_name: editing.beneficiaire_name,
      reason: editing.reason,
      requester: editing.requester,
      department: editing.department,
      bank_id: editing.bank_id ? Number(editing.bank_id) : null,
    });

    alert("Updated ✅");
    setEditing(null);
    loadCheques();
  } catch (err: any) {
    console.log("UPDATE ERROR 👉", err.response?.data || err.message);
    alert(err.response?.data?.message || "Update failed");
  }
};

  const deleteCheque = async (id: number) => {
    if (!confirm("Delete this cheque?")) return;

    try {
      await axios.delete(`${API}/ar/cheque/${id}`);
      alert("Deleted ✅");
      loadCheques();
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

return (
  <div style={styles.container}>
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>{t("cheques", "Cheques")}</h1>
        <p style={styles.sub}>
          {t("chequesubtitle", "Search, preview, edit and reprint cheques")}
        </p>
      </div>

      <button onClick={loadCheques} style={styles.refreshBtn}>
        {t("refresh", "Refresh")}
      </button>
    </div>

    <input
      placeholder={t("search", "Search...")}
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
            <th style={styles.th}>{t("id", "ID")}</th>
            <th style={styles.th}>{t("bank", "Bank")}</th>
            <th style={styles.th}>{t("beneficiaire", "Beneficiaire")}</th>
            <th style={styles.th}>{t("amount", "Amount")}</th>
            <th style={styles.th}>{t("date", "Date")}</th>
            <th style={styles.th}>{t("requester", "Requester")}</th>
            <th style={styles.th}>{t("action", "Action")}</th>
          </tr>
        </thead>

        <tbody>
          {paginated.map((c) => (
            <tr key={c.id}>
              <td style={styles.td}>CHK-{c.id}</td>
              <td style={styles.td}>{c.bank_name || "-"}</td>
              <td style={styles.td}>{c.beneficiaire_name}</td>
              <td style={{ ...styles.td, color: "#16a34a", fontWeight: "bold" }}>
                ${Number(c.amount || 0).toFixed(2)}
              </td>
              <td style={styles.td}>{String(c.date || "").slice(0, 10)}</td>
              <td style={styles.td}>{c.requester}</td>
              <td style={styles.td}>
             <td style={styles.actionTd}>
  <button
    onClick={() => setPinAction({ type: "preview", data: c })}
    style={styles.previewBtn}
  >
    {t("preview", "Preview")}
  </button>

  <button
    onClick={() => setPinAction({ type: "edit", data: c })}
    style={styles.editBtn}
  >
    {t("edit", "Edit")}
  </button>

  <button
    onClick={() => setPinAction({ type: "delete", data: c })}
    style={styles.deleteBtn}
  >
    {t("delete", "Delete")}
  </button>
</td>
              </td>
            </tr>
          ))}

          {paginated.length === 0 && (
            <tr>
              <td colSpan={7} style={styles.empty}>
                {t("nochequesfound", "No cheques found")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div style={styles.pagination}>
      <button disabled={page === 1} onClick={() => setPage(page - 1)} style={styles.pageBtn}>
        {t("prev", "Prev")}
      </button>

      <span style={styles.pageText}>
        {t("page", "Page")} {page} {t("of", "of")} {totalPages}
      </span>

      <button disabled={page === totalPages} onClick={() => setPage(page + 1)} style={styles.pageBtn}>
        {t("next", "Next")}
      </button>
    </div>

    {editing && (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <h2>{t("editcheque", "Edit Cheque")}</h2>

          <select
            value={editing.bank_id}
            onChange={(e) => setEditing({ ...editing, bank_id: e.target.value })}
            style={styles.input}
          >
            <option value="">{t("selectbank", "Select Bank")}</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.account_number}
              </option>
            ))}
          </select>

          <input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} style={styles.input} />
          <input placeholder={t("beneficiaire", "Beneficiaire")} value={editing.beneficiaire_name} onChange={(e) => setEditing({ ...editing, beneficiaire_name: e.target.value })} style={styles.input} />
          <input type="number" placeholder={t("amount", "Amount")} value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} style={styles.input} />
          <input placeholder={t("reason", "Reason")} value={editing.reason} onChange={(e) => setEditing({ ...editing, reason: e.target.value })} style={styles.input} />
          <input placeholder={t("requester", "Requester")} value={editing.requester} onChange={(e) => setEditing({ ...editing, requester: e.target.value })} style={styles.input} />
          <input placeholder={t("department", "Department")} value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} style={styles.input} />

          <div style={styles.modalActions}>
            <button onClick={updateCheque} style={styles.saveBtn}>
              {t("save", "Save")}
            </button>
            <button onClick={cancelEdit} style={styles.cancelBtn}>
              {t("cancel", "Cancel")}
            </button>
          </div>
        </div>
      </div>
    )}

    {pdfUrl && (
      <div style={styles.previewBox}>
        <div style={styles.previewHeader}>
          <h2 style={{ margin: 0 }}>{t("chequepreview", "Cheque Preview")}</h2>

          <div>
            <button onClick={printPDF} style={styles.printBtn}>
              {t("print", "Print")}
            </button>
            <button onClick={closePDF} style={styles.closeBtn}>
              {t("close", "Close")}
            </button>
          </div>
        </div>

        <iframe
          id="chequeFrame"
          src={pdfUrl}
          width="100%"
          height="480"
          style={styles.iframe}
        />
      </div>
    )}

    {pinAction && (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <h3>{t("enterpinsecure", "Enter PIN 🔐")}</h3>

          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={t("enterpin", "Enter PIN")}
            style={styles.input}
          />

          <div style={styles.modalActions}>
            <button onClick={verifyPin} style={styles.saveBtn}>
              {t("confirm", "Confirm")}
            </button>

            <button onClick={() => setPinAction(null)} style={styles.cancelBtn}>
              {t("cancel", "Cancel")}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

export default ListChequePage;

const styles: any = {
 container: {
  minHeight: "100vh",
  padding: "22px 32px",
  background: "#f4f7fb",
  fontFamily: "Arial, sans-serif",
},

h1: {
  fontSize: "34px",
  margin: 0,
  fontWeight: 500,
},

sub: {
  color: "#64748b",
  fontSize: "16px",
  marginTop: "8px",
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

search: {
  width: "100%",
  padding: "14px 18px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  fontSize: "17px",
  margin: "14px 0 20px",
  outline: "none",
  background: "#fff",
},

th: {
  background: "#eef2f7",
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "16px",
},

td: {
  padding: "12px 16px",
  borderTop: "1px solid #e2e8f0",
  fontSize: "15px",
},

previewBtn: {
  padding: "8px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "6px",
  fontSize: "14px",
},

editBtn: {
  padding: "8px 12px",
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "6px",
  fontSize: "14px",
},

deleteBtn: {
  padding: "8px 12px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "14px",
},
 
  previewBox: {
    marginTop: "26px",
    background: "#fff",
    borderRadius: "20px",
    padding: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  printBtn: {
    padding: "12px 18px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "10px",
  },
  closeBtn: {
    padding: "12px 18px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    background: "#fff",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  modal: {
    width: "420px",
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },
  modalActions: {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    background: "#64748b",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
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
  actionTd: {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  flexWrap: "nowrap",
},
};
