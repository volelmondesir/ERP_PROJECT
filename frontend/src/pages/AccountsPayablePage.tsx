import { useEffect, useState } from "react";
import { translations } from "../translations/translations";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;

const AccountsPayablePage = () => {
  const [bills] = useState<any[]>([
    { supplier: "ABC Corp", total: 800, paid: 300 },
  ]);

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

  return (
    <div style={styles.container}>
  
<h2>💸 {t("accountpayable", "Account Payable")}</h2>
<p>

  {t(

    "manageposupplierinvoices",

    "Manage PO supplier invoices and payments"

  )}

</p>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>{t("supplier", "Supplier")}</th>
            <th>{t("total", "Total")}</th>
            <th>{t("paid", "Paid")}</th>
            <th>{t("balance", "Balance")}</th>
          </tr>
        </thead>

        <tbody>
          {bills.map((b, i) => (
            <tr key={i}>
              <td>{b.supplier}</td>
              <td>${b.total}</td>
              <td>${b.paid}</td>
              <td>${b.total - b.paid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountsPayablePage;

const styles: any = {
  container: {
    padding: "20px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
};