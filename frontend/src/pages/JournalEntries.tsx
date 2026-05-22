import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;
const API = "http://localhost:5000/api";

const initialLine = {
  accountId: "",
  accountCode: "",
  accountName: "",
  debit: "",
  credit: "",
  description: "",
};

const JournalEntriesPage = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [entryDate, setEntryDate] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<any[]>([
    { ...initialLine },
    { ...initialLine },
  ]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
const [history, setHistory] = useState<any[]>([]);

const [page, setPage] = useState(1);

const pageSize = 5;
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
  const loadAccounts = async () => {
    try {
      const res = await axios.get(`${API}/accounts`);
      setAccounts(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD ACCOUNTS ERROR 👉", err.response?.data || err.message);
    }
  };

  const loadJournals = async () => {
    try {
      const res = await axios.get(`${API}/journal-entries`);
      setJournals(res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD JOURNALS ERROR 👉", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadJournals();
  }, []);






  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];

    if (field === "accountId") {
      const acc = accounts.find((a) => String(a.id) === String(value));

      updated[index] = {
        ...updated[index],
        accountId: acc?.id || "",
        accountCode: acc?.accountCode || "",
        accountName: acc?.accountName || "",
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      if (field === "debit" && Number(value || 0) > 0) {
        updated[index].credit = "";
      }

      if (field === "credit" && Number(value || 0) > 0) {
        updated[index].debit = "";
      }
    }

    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, { ...initialLine }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      alert("At least 2 lines required");
      return;
    }

    setLines(lines.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce(
    (sum, l) => sum + Number(l.debit || 0),
    0
  );

  const totalCredit = lines.reduce(
    (sum, l) => sum + Number(l.credit || 0),
    0
  );

  const isBalanced =
    Number(totalDebit.toFixed(2)) === Number(totalCredit.toFixed(2)) &&
    totalDebit > 0;

  const saveJournal = async () => {
    if (saving) return;

    if (!entryDate) {
      alert("Entry date required");
      return;
    }

    if (!description.trim()) {
      alert("Description required");
      return;
    }

    if (!isBalanced) {
      alert("Total debit must equal total credit");
      return;
    }

    const cleanLines = lines.filter(
      (l) => l.accountId && (Number(l.debit || 0) > 0 || Number(l.credit || 0) > 0)
    );

    if (cleanLines.length < 2) {
      alert("At least 2 valid lines required");
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/journal-entry`, {
        entryDate,
        description,
        createdBy: "Admin",
        lines: cleanLines,
      });

      alert("Journal entry posted ✅");

      setEntryDate("");
      setDescription("");
      setLines([{ ...initialLine }, { ...initialLine }]);
      loadJournals();
      loadAccounts();
    } catch (err: any) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return journals.filter((j) =>
      String(j.journalNo || "").toLowerCase().includes(q) ||
      String(j.description || "").toLowerCase().includes(q) ||
      String(j.createdBy || "").toLowerCase().includes(q) ||
      String(j.status || "").toLowerCase().includes(q)
    );
  }, [journals, search]);
const totalPages = Math.ceil(journals.length / pageSize) || 1;

const paginatedHistory = journals.slice(
  (page - 1) * pageSize,
  page * pageSize
);
 return (
  <div style={styles.page}>
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>
          {t("journalentries", "Journal Entries")}
        </h1>

        <p style={styles.sub}>
          {t(
            "journalentriessubtitle",
            "Create balanced debit and credit accounting entries"
          )}
        </p>
      </div>

      <button onClick={loadJournals} style={styles.refreshBtn}>
        {t("refresh", "Refresh")}
      </button>
    </div>

    <div style={styles.layout}>
      <div style={styles.formCard}>
        <h2 style={styles.cardTitle}>
          {t("newjournalentry", "New Journal Entry")}
        </h2>

        <input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          style={styles.input}
        />

        <textarea
          placeholder={t("journaldescription", "Journal description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={styles.textarea}
        />

        <div style={styles.totalsBox}>
          <div>
            <span>{t("totaldebit", "Total Debit")}</span>
            <b style={{ color: "#16a34a" }}>${totalDebit.toFixed(2)}</b>
          </div>

          <div>
            <span>{t("totalcredit", "Total Credit")}</span>
            <b style={{ color: "#dc2626" }}>${totalCredit.toFixed(2)}</b>
          </div>

          <div>
            <span>{t("status", "Status")}</span>
            <b style={{ color: isBalanced ? "#16a34a" : "#dc2626" }}>
              {isBalanced
                ? t("balanced", "Balanced")
                : t("notbalanced", "Not Balanced")}
            </b>
          </div>
        </div>

        {lines.map((line, index) => (
          <div key={index} style={styles.lineCard}>
            <div style={styles.lineHeader}>
              <b>
                {t("line", "Line")} {index + 1}
              </b>

              <button onClick={() => removeLine(index)} style={styles.removeBtn}>
                {t("remove", "Remove")}
              </button>
            </div>

            <select
              value={line.accountId}
              onChange={(e) => updateLine(index, "accountId", e.target.value)}
              style={styles.input}
            >
              <option value="">{t("selectaccount", "Select Account")}</option>

              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountCode} - {a.accountName}
                </option>
              ))}
            </select>

            <div style={styles.amountGrid}>
              <input
                type="number"
                placeholder={t("debit", "Debit")}
                value={line.debit}
                onChange={(e) => updateLine(index, "debit", e.target.value)}
                style={styles.input}
              />

              <input
                type="number"
                placeholder={t("credit", "Credit")}
                value={line.credit}
                onChange={(e) => updateLine(index, "credit", e.target.value)}
                style={styles.input}
              />
            </div>

            <input
              placeholder={t("linedescription", "Line description")}
              value={line.description}
              onChange={(e) => updateLine(index, "description", e.target.value)}
              style={styles.input}
            />
          </div>
        ))}

        <button onClick={addLine} style={styles.addBtn}>
          + {t("addline", "Add Line")}
        </button>

        <button onClick={saveJournal} disabled={saving} style={styles.saveBtn}>
          {saving
            ? t("posting", "Posting...")
            : t("postjournalentry", "Post Journal Entry")}
        </button>
      </div>

      <div style={styles.listCard}>
        <input
          placeholder={t(
            "searchjournal",
            "Search ref, description, type, user..."
          )}
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
                <th style={styles.th}>{t("date", "Date")}</th>
                <th style={styles.th}>{t("journalnumber", "Journal #")}</th>
                <th style={styles.th}>{t("description", "Description")}</th>
                <th style={styles.th}>{t("debit", "Debit")}</th>
                <th style={styles.th}>{t("credit", "Credit")}</th>
                <th style={styles.th}>{t("status", "Status")}</th>
                <th style={styles.th}>{t("user", "User")}</th>
              </tr>
            </thead>

            <tbody>
              {paginatedHistory.map((j) => (
                <tr key={j.id}>
                  <td style={styles.td}>
                    {j.entryDate ? String(j.entryDate).slice(0, 10) : "-"}
                  </td>

                  <td style={styles.td}>{j.journalNo}</td>
                  <td style={styles.td}>{j.description}</td>

                  <td style={{ ...styles.td, color: "#16a34a", fontWeight: "bold" }}>
                    ${Number(j.totalDebit || 0).toFixed(2)}
                  </td>

                  <td style={{ ...styles.td, color: "#dc2626", fontWeight: "bold" }}>
                    ${Number(j.totalCredit || 0).toFixed(2)}
                  </td>

                  <td style={styles.td}>
                    <span style={styles.badge}>{j.status}</span>
                  </td>

                  <td style={styles.td}>{j.createdBy || "-"}</td>
                </tr>
              ))}

              {paginatedHistory.length === 0 && (
                <tr>
                  <td colSpan={7} style={styles.empty}>
                    {t("nojournalentriesfound", "No journal entries found")}
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
            {t("prev", "Prev")}
          </button>

          <span style={styles.pageText}>
            {t("page", "Page")} {page} {t("of", "of")} {totalPages}
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
            {t("next", "Next")}
          </button>
        </div>
      </div>
    </div>
  </div>
);
};

export default JournalEntriesPage;

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
    gridTemplateColumns: "460px minmax(0, 1fr)",
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
    minHeight: "80px",
    resize: "vertical",
    outline: "none",
  },

  totalsBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
  },

  lineCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  lineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  amountGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  addBtn: {
    padding: "12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
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

  removeBtn: {
    padding: "6px 10px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
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
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    minWidth: "950px",
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

  badge: {
    background: "#dcfce7",
    color: "#16a34a",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
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
};