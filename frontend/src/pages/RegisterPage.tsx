import { useState,useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
 import { saveAuditLog } from "../utils/tempLog2";  

const API = "/api";

const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

useEffect(() => {

  saveAuditLog({

  moduleName: "Settings",

    submenuName: "Register",

    actionType: "VIEW PAGE",

  });

}, []);
  const handleRegister = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError("Full name, username and password are required");
      return;
    }

    try {
      setError(null);

      const response = await axios.post(`${API}/users/register`, {
        fullName,
        username,
        password,
      });

      await saveAuditLog({
        moduleName: "Settings",
        submenuName: "Register",
        actionType: `CREATE USER: ${username}`,
      });

      alert(`${username} user Created ✅`);

      console.log(response.data);

      setFullName("");
      setUsername("");
      setPassword("");

      navigate("/change-user");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register User</h2>

        {error && <p style={styles.error}>{error}</p>}

        <label>Full Name:</label>
        <input
          style={styles.input}
          type="text"
          autoComplete="off"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <label>Username:</label>
        <input
          style={styles.input}
          type="text"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label>Password:</label>
        <input
          style={styles.input}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleRegister} style={styles.button}>
          Register
        </button>
      </div>
    </div>
  );
};

export default RegisterPage;

const styles: any = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "30px",
  },

  card: {
    background: "#fff",
    padding: "24px",
    borderRadius: "16px",
    width: "360px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  },

  title: {
    margin: 0,
    marginBottom: "8px",
    color: "#0f172a",
  },

  error: {
    color: "red",
    margin: 0,
  },

  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "15px",
  },

  button: {
    padding: "12px",
    background: "#0984e3",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "10px",
  },
};