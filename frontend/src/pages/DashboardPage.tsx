import { useEffect, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import medal from "../assets/medal.png";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api";

const DashboardPage = () => {
  const [employeesMonth, setEmployeesMonth] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
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

  const loadEmployeeOfMonth = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/hr/employeeofmonth/active-fiscal`);

      setEmployeesMonth(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.log("LOAD EMPLOYEE MONTH ERROR 👉", err.response?.data || err.message);
      setEmployeesMonth([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeOfMonth();
  }, []);

  const monthName = (monthNumber: any) => {
    const months: Record<number, string> = {
      1: t("january", "January"),
      2: t("february", "February"),
      3: t("march", "March"),
      4: t("april", "April"),
      5: t("may", "May"),
      6: t("june", "June"),
      7: t("july", "July"),
      8: t("august", "August"),
      9: t("september", "September"),
      10: t("october", "October"),
      11: t("november", "November"),
      12: t("december", "December"),
    };

    return months[Number(monthNumber)] || "-";
  };

  const getInitials = (emp: any) => {
    return `${String(emp.firstName || "E").charAt(0)}${String(
      emp.lastName || ""
    ).charAt(0)}`.toUpperCase();
  };

  const getRatingText = (rating: number) => {
    if (rating >= 5) return t("excellent", "Excellent");
    if (rating >= 4) return t("verygood", "Very Good");
    if (rating >= 3) return t("good", "Good");
    return t("keepimproving", "Keep Improving");
  };

  const bestEmployee = employeesMonth[0];

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <span style={styles.badge}>
            🏆 {t("activefiscalyear", "Active Fiscal Year")}
          </span>

          <h1 style={styles.h1}>⭐ {t("dashboard", "Dashboard")}</h1>

          <p style={styles.sub}>
            {t(
              "dashboardemployeesubtitle",
              "Employee of the month recognition for the active fiscal year"
            )}
          </p>
        </div>

        <button onClick={loadEmployeeOfMonth} style={styles.refreshBtn}>
          🔄 {t("refresh", "Refresh")}
        </button>
      </div>

      {loading && <div style={styles.loading}>{t("loading", "Loading...")}</div>}

      {!loading && employeesMonth.length === 0 && (
        <div style={styles.emptyCard}>
          <h2>🌟 {t("noemployeeofthemonthfound", "No employee of the month found")}</h2>
          <p>
            {t(
              "noemployeeofthemonthmessage",
              "Add employee of the month records to display them here."
            )}
          </p>
        </div>
      )}

      {!loading && bestEmployee && (
        <div style={styles.featureCard}>
          <img src={medal} alt="Medal" style={styles.medal} />

          <div style={styles.featureContent}>
            <div style={styles.avatarLarge}>
              {bestEmployee.photoUrl ? (
                <img
                  src={`http://localhost:5000${bestEmployee.photoUrl}`}
                  alt="employee"
                  style={styles.photo}
                />
              ) : (
                <span>{getInitials(bestEmployee)}</span>
              )}
            </div>

            <div>
              <h2 style={styles.featureTitle}>
                {t("employeeofthemonth", "Employee of the Month")}
              </h2>

              <h1 style={styles.featureName}>
                {bestEmployee.firstName} {bestEmployee.lastName}
              </h1>

              <p style={styles.featureSub}>
                {bestEmployee.department || "-"} • {bestEmployee.position || "-"}
              </p>

              <div style={styles.featureStars}>
                {"★".repeat(Number(bestEmployee.rating || 0))}
                {"☆".repeat(5 - Number(bestEmployee.rating || 0))}
              </div>

              <p style={styles.featureMonth}>
                {monthName(bestEmployee.monthNumber)} •{" "}
                {bestEmployee.yearName || bestEmployee.year_label || "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={styles.grid}>
        {employeesMonth.map((emp) => (
          <div key={emp.id} style={styles.card}>
            <div style={styles.cardTopBar}></div>

            <div style={styles.top}>
              <div style={styles.avatar}>
                {emp.photoUrl ? (
                  <img
                    src={`http://localhost:5000${emp.photoUrl}`}
                    alt="employee"
                    style={styles.photo}
                  />
                ) : (
                  <span>{getInitials(emp)}</span>
                )}
              </div>

              <div>
                <h2 style={styles.name}>
                  {emp.firstName} {emp.lastName}
                </h2>
                <p style={styles.position}>{emp.position || "-"}</p>
              </div>
            </div>

            <div style={styles.info}>
              <div style={styles.infoBox}>
                <span>{t("department", "Department")}</span>
                <b>{emp.department || "-"}</b>
              </div>

              <div style={styles.infoBox}>
                <span>{t("fiscalyear", "Fiscal Year")}</span>
                <b>{emp.yearName || emp.year_label || "-"}</b>
              </div>

              <div style={styles.infoBox}>
                <span>{t("month", "Month")}</span>
                <b>{monthName(emp.monthNumber)}</b>
              </div>
            </div>

            <div style={styles.ratingBox}>
              <div>
                <span style={styles.ratingLabel}>{t("rating", "Rating")}</span>

                <div style={styles.stars}>
                  {"★".repeat(Number(emp.rating || 0))}
                  {"☆".repeat(5 - Number(emp.rating || 0))}
                </div>
              </div>

              <span style={styles.ratingPill}>
                {getRatingText(Number(emp.rating || 0))}
              </span>
            </div>

            <div style={styles.commentBox}>
              <b>💬 {t("comment", "Comment")}</b>
              <p>{emp.comment || t("nocomment", "No comment")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #ecfeff 100%)",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
  },

 hero: {
 background:
  "linear-gradient(135deg, #7c5c00 0%, #b8860b 22%, #d4af37 45%, #facc15 68%, #fff4b0 100%)",
  borderRadius: "30px",
  padding: "38px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "32px",
  boxShadow: "0 30px 65px rgba(37,99,235,0.30)",
  position: "relative",
  overflow: "hidden",
 
  color: "#fffef5",
textShadow: "0 2px 8px rgba(0,0,0,0.18)",
border: "1px solid rgba(255,255,255,0.25)",
backdropFilter: "blur(10px)",
},

  badge: {
    display: "inline-block",
    background: "rgba(255,255,255,0.18)",
    padding: "8px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
    marginBottom: "14px",
  },

  h1: {
    margin: 0,
    fontSize: "42px",
    fontWeight: 800,
  },

  sub: {
    marginTop: "10px",
    fontSize: "17px",
    opacity: 0.9,
  },

  refreshBtn: {
    padding: "13px 22px",
    border: "none",
    borderRadius: "14px",
    background: "none",
    color: "#1d4ed8",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 10px 25px transparent",
  },

  loading: {
    background: "#fff",
    padding: "18px",
    borderRadius: "16px",
    color: "#64748b",
    fontWeight: "bold",
    marginBottom: "20px",
  },

  emptyCard: {
    background: "#fff",
    padding: "34px",
    borderRadius: "22px",
    color: "#334155",
    boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  },

  featureCard: {
    position: "relative",
    background: "linear-gradient(135deg, #fff7ed 0%, #fffbeb 50%, #ffffff 100%)",
    borderRadius: "26px",
    padding: "30px",
    marginBottom: "26px",
    border: "1px solid #fed7aa",
    boxShadow: "0 20px 50px rgba(245,158,11,0.18)",
    overflow: "hidden",
  },

  medal: {
    position: "absolute",
    right: "35px",
    top: "25px",
    width: "105px",
    height: "105px",
    objectFit: "contain",
    opacity: 0.95,
  },

  featureContent: {
    display: "flex",
    alignItems: "center",
    gap: "22px",
    paddingRight: "140px",
  },

  avatarLarge: {
    width: "112px",
    height: "112px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #facc15, #fb923c)",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "34px",
    fontWeight: "bold",
    overflow: "hidden",
    border: "5px solid #fff",
    boxShadow: "0 12px 30px rgba(245,158,11,0.30)",
  },

  featureTitle: {
    margin: 0,
    color: "#92400e",
    fontSize: "18px",
  },

  featureName: {
    margin: "6px 0",
    color: "#0f172a",
    fontSize: "34px",
  },

  featureSub: {
    margin: 0,
    color: "#64748b",
  },

  featureStars: {
    marginTop: "12px",
    color: "#f59e0b",
    fontSize: "32px",
    letterSpacing: "3px",
  },

  featureMonth: {
    marginTop: "8px",
    color: "#92400e",
    fontWeight: "bold",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
    gap: "24px",
  },

  card: {
    position: "relative",
    background: "#fff",
    borderRadius: "24px",
    padding: "26px",
    boxShadow: "0 20px 48px rgba(15,23,42,0.10)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },

  cardTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "7px",
    background:
  "linear-gradient(135deg, #7c5c00 0%, #b8860b 22%, #d4af37 45%, #facc15 68%, #fff4b0 100%)",
  },

  top: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px",
  },

  avatar: {
    width: "76px",
    height: "76px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #dbeafe, #c7d2fe)",
    color: "#1d4ed8",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
    fontWeight: "bold",
    overflow: "hidden",
    border: "3px solid #fff",
    boxShadow: "0 10px 22px rgba(37,99,235,0.18)",
  },

  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  name: {
    margin: 0,
    color: "#0f172a",
    fontSize: "23px",
  },

  position: {
    margin: "6px 0 0",
    color: "#64748b",
    fontWeight: 600,
  },

  info: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "18px",
  },

  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    color: "#334155",
  },

  ratingBox: {
    background: "linear-gradient(135deg, #fffbeb, #fff7ed)",
    border: "1px solid #fde68a",
    padding: "16px",
    borderRadius: "16px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  ratingLabel: {
    display: "block",
    color: "#92400e",
    fontWeight: "bold",
    marginBottom: "6px",
  },

  stars: {
    color: "#f59e0b",
    fontSize: "28px",
    letterSpacing: "2px",
  },

  ratingPill: {
    background: "#f59e0b",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
  },

  commentBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
    color: "#334155",
    minHeight: "92px",
  },
};