import { useEffect, useState } from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2";
import logo from "../assets/logo.png";

type LangType = keyof typeof translations;

const Header: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);

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
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const handleLanguageChange = () => {
      setLang((localStorage.getItem("lang") as LangType) || "en");
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);
const handleLogout = async () => {
  await saveAuditLog({
    moduleName: "Authentication",
    submenuName: "Logout",
    actionType: "LOGOUT",
  });

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("username");

  navigate("/login");
};
  return (
    <div className="header">
      <div className="logo" >
       <img
    src={logo}
    alt="ERP Logo"
    
  />
   <h2 >SysSoftERP</h2>

      </div>

 

      <div className="header-right">
        {t("welcome", "Welcome")}, {user?.username || "Guest"}

        <button
          className="logout-btn"
         onClick={handleLogout}
        >
          {t("logout", "Logout")}
        </button>
      </div>
    </div>
    
  );
};

export default Header;
const styles: Record<string, React.CSSProperties> = {


  logo: {
    marginBottom: "2px",
  },

logoBox: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: "0px",
},

logoImage: {
  width: "48px",
  height: "48px",
  objectFit: "contain",
  marginBottom: "0px",
},


};