import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo.png";
import { saveAuditLog } from "../utils/tempLog2";
const API = "http://localhost:5000/api";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warningDays, setWarningDays] = useState<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      navigate("/dashboard");
    }
  }, [navigate]);

 const handleLogin = async () => {
  if (!username.trim() || !password.trim()) {
    alert("Please enter username and password");
    return;
  }

  try {
    setLoading(true);

    const res = await axios.post(`${API}/login`, {
      username,
      password,
    });



const data = res.data;

localStorage.setItem("token", data.token);

localStorage.setItem(
  "user",
  JSON.stringify({
    ...data.user,
    permissions: data.permissions || [],
  })
);

localStorage.setItem("username", data.user.username);

await saveAuditLog({
  moduleName: "Authentication",
  submenuName: "Login",
  actionType: "LOGIN",
});

const licenseRes = await axios.get(`${API}/license/status`);

    const license = licenseRes.data;
    const daysRemaining = Number(license?.daysRemaining || 0);

    if (license?.isBlocked || daysRemaining <= 0) {
      navigate("/settings/license");
      return;
    }

    if (daysRemaining <= 31) {
      setWarningDays(daysRemaining);
      return;
    }

    navigate("/dashboard");
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    alert(err?.response?.data?.message || "Login failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={styles.container}>

      {warningDays !== null && (
        <div style={styles.overlay}>
          <div style={styles.warningBox}>
            <h2 style={styles.warningTitle}>
              ⚠️ License Warning
            </h2>

            <p style={styles.warningText}>
              Your ERP license will expire in{" "}
              <b>{warningDays} days</b>.
            </p>

            <p style={styles.warningSub}>
              Please renew your license to avoid system interruption.
            </p>

            <button
              onClick={() => navigate("/dashboard")}
              style={styles.warningBtn}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={styles.card}>
        <div style={styles.logoBox}>
          <img src={logo} alt="ERP Logo" style={styles.logoImage} />

          <h1 style={styles.appName}>SysSoftERP</h1>

          <h2 style={styles.title}>Welcome Back</h2>

          <p style={styles.subtitle}>Sign in to continue</p>
        </div>

        <div style={styles.inputBox}>
          <span style={styles.icon}>👤</span>

          <input
            placeholder="Username"
            value={username}
            onFocus={() => setFocused("username")}
            onBlur={() => setFocused(null)}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              ...styles.input,
              ...(focused === "username" ? styles.inputFocus : {}),
            }}
          />
        </div>

        <div style={styles.inputBox}>
          <span style={styles.icon}>🔒</span>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              ...styles.input,
              ...(focused === "password" ? styles.inputFocus : {}),
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.8 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <span style={styles.spinner}></span>
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

const styles: Record<string, React.CSSProperties> = {

  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e272e, #2f3640)",
    padding: "20px",
  },

  card: {
    background: "#fff",
    padding: "34px",
    borderRadius: "18px",
    width: "90%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
  },

  logoBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "8px",
  },

  logoImage: {
    width: "58px",
    height: "58px",
    objectFit: "contain",
    marginBottom: "6px",
  },

  appName: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a",
  },

  title: {
    margin: "18px 0 0",
    fontSize: "26px",
    fontWeight: 700,
    color: "#1e293b",
  },

  subtitle: {
    margin: "6px 0 8px",
    fontSize: "14px",
    color: "#64748b",
  },

  inputBox: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  icon: {
    position: "absolute",
    left: "14px",
    fontSize: "16px",
    zIndex: 1,
  },

  input: {
    width: "100%",
    padding: "14px 14px 14px 44px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    fontSize: "16px",
    outline: "none",
    transition: "0.2s ease",
  },

  inputFocus: {
    border: "2px solid #3b82f6",
    background: "#fff",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.18)",
  },

  button: {
    padding: "14px",
    background: "#1e88e5",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "17px",
    fontWeight: 700,
    transition: "0.2s ease",
    marginTop: "8px",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  },

  spinner: {
    width: "20px",
    height: "20px",
    border: "3px solid rgba(255,255,255,0.4)",
    borderTop: "3px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  overlay: {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999999,
},

warningBox: {
  width: "460px",
  background: "#ffffff",
  borderRadius: "28px",
  padding: "32px",
  boxShadow: "0 25px 70px rgba(0,0,0,0.45)",
  textAlign: "center",
},

warningTitle: {
  margin: 0,
  fontSize: "32px",
  color: "#f59e0b",
  fontWeight: 800,
},

warningText: {
  fontSize: "22px",
  color: "#0f172a",
  marginTop: "18px",
},

warningSub: {
  fontSize: "16px",
  color: "#64748b",
  marginTop: "10px",
},

warningBtn: {
  marginTop: "22px",
  padding: "14px 38px",
  border: "none",
  borderRadius: "14px",
  background: "#2563eb",
  color: "#fff",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
},

};