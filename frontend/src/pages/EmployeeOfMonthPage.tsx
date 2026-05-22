import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { translations } from "../translations/translations";
import medal from "../assets/medal.png";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api";

const EmployeeOfMonthPage = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);
const [activeFiscal, setActiveFiscal] = useState<any>(null);

  const pageSize = 5;

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
  };

const loadActiveFiscal = async () => {
  try {
    const res = await axios.get(`${API}/hr/employeeofmonth/active-fiscal`);

    if (Array.isArray(res.data) && res.data.length > 0) {
      setActiveFiscal(res.data[0]);
    } else if (res.data?.fiscalYear) {
      setActiveFiscal(res.data.fiscalYear);
    } else {
      setActiveFiscal(res.data);
    }
  } catch (err: any) {
    console.log("LOAD ACTIVE FISCAL ERROR 👉", err.response?.data || err.message);
    setActiveFiscal(null);
  }
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

  const getUsername = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.username || "Admin";
    } catch {
      return "Admin";
    }
  };

  const loadEmployees = async () => {
    const res = await axios.get(`${API}/hr/employees`);
    setEmployees(Array.isArray(res.data) ? res.data : res.data?.data || []);
  };

  const loadRecords = async () => {
    const res = await axios.get(`${API}/hr/employeeofmonth`);
    setRecords(Array.isArray(res.data) ? res.data : []);
    setPage(1);
  };

  useEffect(() => {
    loadEmployees();
    loadRecords();
    loadActiveFiscal();
  }, []);

  const months = [
    "",
    t("january", "January"),
    t("february", "February"),
    t("march", "March"),
    t("april", "April"),
    t("may", "May"),
    t("june", "June"),
    t("july", "July"),
    t("august", "August"),
    t("september", "September"),
    t("october", "October"),
    t("november", "November"),
    t("december", "December"),
  ];
const currentMonth = months[new Date().getMonth() + 1];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return records.filter((r) =>
      String(r.employeeCode || "").toLowerCase().includes(q) ||
      String(r.firstName || "").toLowerCase().includes(q) ||
      String(r.lastName || "").toLowerCase().includes(q) ||
      String(r.department || "").toLowerCase().includes(q) ||
      String(r.position || "").toLowerCase().includes(q) ||
      String(r.yearName || "").toLowerCase().includes(q) ||
      String(r.comment || "").toLowerCase().includes(q)
    );
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selectedEmployee = employees.find(
    (e) => String(e.id) === String(employeeId)
  );

  const saveEmployeeOfMonth = async () => {
    if (!employeeId || rating <= 0) {
      alert(
        t(
          "fillemployeeofmonthfields",
          "Fill employee and rating"
        )
      );
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/hr/employeeofmonth`, {
        employeeId: Number(employeeId),
        rating,
        comment,
        createdBy: getUsername(),
      });

      alert(t("saved", "Saved"));

      setEmployeeId("");
      setRating(0);
      setComment("");

      loadRecords();
    } catch (err: any) {
      console.log("SAVE EMPLOYEE OF MONTH ERROR 👉", err.response?.data || err);
      alert(err.response?.data?.message || t("savefailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };


const previewRecord = (r: any) => {
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);

  const doc = new jsPDF("portrait", "mm", "letter");
  const monthLabel = months[Number(r.monthNumber)] || "-";

  doc.setFillColor(250, 250, 245);
  doc.rect(0, 0, 216, 279, "F");

  // MEDAL CENTER TOP
  doc.addImage(medal, "PNG", 88, 12, 40, 40);

  // EMPLOYEE PHOTO
  if (r.photoUrl) {
    try {
      doc.addImage(
        `http://localhost:5000${r.photoUrl}`,
        "JPEG",
        83,
        58,
        50,
        50
      );
    } catch (err) {
      console.log("PHOTO LOAD ERROR 👉", err);

      doc.setFillColor(226, 232, 240);
      doc.circle(108, 83, 24, "F");
    }
  } else {
    doc.setFillColor(226, 232, 240);
    doc.circle(108, 83, 24, "F");

    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);

    doc.text(
      `${String(r.firstName || "E").charAt(0)}${String(r.lastName || "").charAt(0)}`,
      108,
      90,
      { align: "center" }
    );
  }

  // TITLE
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);

  doc.text(
    t("employeeofthemonth", "Employee of the Month"),
    108,
    122,
    { align: "center" }
  );

  // INFO
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);

  doc.text(`${t("employee", "Employee")}: ${r.firstName} ${r.lastName}`, 35, 145);
  doc.text(`${t("code", "Code")}: ${r.employeeCode || "-"}`, 35, 160);
  doc.text(`${t("department", "Department")}: ${r.department || "-"}`, 35, 175);
  doc.text(`${t("position", "Position")}: ${r.position || "-"}`, 35, 190);
  doc.text(`${t("fiscalyear", "Fiscal Year")}: ${r.yearName || "-"}`, 35, 205);
  doc.text(`${t("month", "Month")}: ${monthLabel}`, 35, 220);

  // RATING
  doc.text(`${t("rating", "Rating")}:`, 35, 238);
const drawStar = (
  cx: number,
  cy: number,
  outerRadius = 4,
  innerRadius = 1.8
) => {
  const points: [number, number][] = [];

  for (let i = 0; i < 10; i++) {
    // Removed quotes from -Math.PI
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;

    points.push([
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
    ]);
  }

  doc.setFillColor(245, 158, 11);
  doc.setDrawColor(245, 158, 11);

  // doc.lines uses relative coordinates for subsequent points
  doc.lines(
    points.slice(1).map(([x, y], i) => [
      x - points[i][0],
      y - points[i][1],
    ]),
    points[0][0], // Start X
    points[0][1], // Start Y
    [1, 1],       // Scale
    "F",          // Style: Fill
    true          // Closed path
  );
};

  const ratingValue = Math.min(5, Math.max(0, Number(r.rating || 0)));

  for (let i = 0; i < ratingValue; i++) {
    drawStar(65 + i * 10, 236);
  }

  // COMMENT
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${t("comment", "Comment")}: ${r.comment || "-"}`, 35, 252);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  //const lines = doc.splitTextToSize(r.comment || "-", 145);
  //doc.text(lines.slice(0, 2), 35, 260);

  // SIGNATURE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);

  doc.line(35, 270, 95, 270);
  doc.text("HR Signature", 43, 276);

  doc.line(125, 270, 185, 270);
  doc.text("Date", 146, 276);

  const blob = doc.output("blob");
  setPdfUrl(URL.createObjectURL(blob));
};
  const printPDF = () => {
    const iframe = document.getElementById("employeeMonthFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>
          
     

             <p>  {t("employeeofthemonth", "Employee of the Month")}</p>
          </h1>

          <p style={styles.sub}>
            {t(
              "employeeofthemonthsubtitle",
              "Select top employee by active fiscal year and rating"
            )}
          </p>
        </div>

        <button onClick={loadRecords} style={styles.refreshBtn}>
          {t("refresh", "Refresh")}
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>
            {t("newemployeeofthemonth", "New Employee of the Month")}
          </h2>

          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            style={styles.input}
          >
            <option value="">{t("selectemployee", "Select Employee")}</option>

            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employeeCode} - {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>

          <div style={styles.starBox}>
            <span style={styles.starLabel}>{t("rating", "Rating")}</span>

            <div style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((index) => (
                <span
                  key={index}
                  onClick={() => setRating(index)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.15)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                  style={{
                    color: index <= rating ? "#facc15" : "#e1ddcb",
                    fontSize: "34px",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {selectedEmployee && (
            <div style={styles.employeePreview}>
              <b>
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </b>
              <span>{selectedEmployee.department || "-"}</span>
              <span>{selectedEmployee.position || "-"}</span>
            </div>
          )}

          <button
            onClick={saveEmployeeOfMonth}
            disabled={saving}
            style={{
              ...styles.saveBtn,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("saving", "Saving...") : t("save", "Save")}
          </button>
        </div>

        <div style={styles.commentCard}>
          <h2 style={styles.cardTitle}>{t("comment", "Comment")}</h2>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("employeecomment", "Write performance comment...")}
            style={styles.commentArea}
          />

          <div style={styles.commentInfo}>
            <div
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    color: "#16a34a",
    fontSize: 18
  }}
>
<span>{t("active", "Active")}</span>

  <div
    style={{
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#16a34a",
      boxShadow: "0 0 12px #16a34a"
    }}
  />
</div>
            <b>{t("fiscalyear", "Fiscal Year")}</b>
           <span>
  {activeFiscal?.yearName ||
    activeFiscal?.year_label ||
    activeFiscal?.yearLabel ||
    "-"}
</span>
          </div>

          <div style={styles.commentInfo}>
            <b>{t("month", "Month")}</b>
           <span>{currentMonth}</span>
          </div>
        </div>
      </div>

      <div style={styles.listCard}>
        <input
          placeholder={t(
            "searchemployeeofthemonth",
            "Search employee, department, fiscal year, comment..."
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
                <th style={styles.th}>{t("employee", "Employee")}</th>
                <th style={styles.th}>{t("department", "Department")}</th>
                <th style={styles.th}>{t("position", "Position")}</th>
                <th style={styles.th}>{t("fiscalyear", "Fiscal Year")}</th>
                <th style={styles.th}>{t("month", "Month")}</th>
                <th style={styles.th}>{t("rating", "Rating")}</th>
                <th style={styles.th}>{t("comment", "Comment")}</th>
                <th style={styles.th}>{t("action", "Action")}</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((r) => {
                const monthLabel = months[Number(r.monthNumber)] || "-";

                return (
                  <tr key={r.id}>
                    <td style={styles.td}>
                      {r.firstName} {r.lastName}
                    </td>

                    <td style={styles.td}>{r.department || "-"}</td>
                    <td style={styles.td}>{r.position || "-"}</td>
                    <td style={styles.td}>{r.yearName || "-"}</td>
                    <td style={styles.td}>{monthLabel}</td>

                    <td style={styles.td}>
                      <span style={styles.stars}>
                        {"★".repeat(Number(r.rating || 0))}
                        {"☆".repeat(5 - Number(r.rating || 0))}
                      </span>
                    </td>

                    <td style={styles.td}>{r.comment || "-"}</td>

                    <td style={styles.td}>
                      <button
                        onClick={() => previewRecord(r)}
                        style={styles.previewBtn}
                      >
                        {t("preview", "Preview")}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} style={styles.empty}>
                    {t(
                      "noemployeeofthemonthfound",
                      "No employee of the month found"
                    )}
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

        {pdfUrl && (
          <div style={styles.previewBox}>
            <div style={styles.previewHeader}>
              <h2 style={{ margin: 0 }}>
                {t(
                  "employeeofthemonthpreview",
                  "Employee of the Month Preview"
                )}
              </h2>

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
              id="employeeMonthFrame"
              src={pdfUrl}
              width="100%"
              height="560"
              style={styles.iframe}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeOfMonthPage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  h1: {
    margin: 0,
    fontSize: "34px",
    color: "#0f172a",
  },

  sub: {
    marginTop: "8px",
    color: "#64748b",
  },

  refreshBtn: {
    padding: "11px 18px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "22px",
  },

  formCard: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  commentCard: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  listCard: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  cardTitle: {
    margin: "0 0 10px",
    color: "#0f172a",
  },

  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "15px",
  },

  starBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px",
  },

  starLabel: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "bold",
    color: "#334155",
  },

  starRow: {
    display: "flex",
    gap: "6px",
  },

  employeePreview: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#1e3a8a",
  },

  commentArea: {
    width: "100%",
    minHeight: "130px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "15px",
    resize: "vertical",
  },

  commentInfo: {
    marginTop: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#334155",
  },

  saveBtn: {
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
  },

  search: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    marginBottom: "18px",
  },

  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px",
    textAlign: "left",
    fontSize: "14px",
    color: "#334155",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },

  stars: {
    color: "#f59e0b",
    fontSize: "20px",
    letterSpacing: "1px",
  },

  previewBtn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
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
    marginTop: "18px",
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

  previewBox: {
    marginTop: "24px",
    background: "#fff",
    borderRadius: "18px",
    padding: "18px",
    border: "1px solid #e2e8f0",
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  printBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  closeBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#fff",
  },
};