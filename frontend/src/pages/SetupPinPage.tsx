import { useEffect, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const SetupPinPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
const API = "/api";
  // 🔥 LOAD USERS
  useEffect(() => {
  fetchUsers();
     
  }, []);

 useEffect(() => {
  
    saveAuditLog({
  
    moduleName: "Settings",
  
      submenuName: "Set Pin",
  
      actionType: "VIEW PAGE",
  
    });
  
  }, []);
    const fetchUsers = () => {
    axios
      .get(`${API}/users/users`)
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));
  };

  // 🔐 SAVE PIN
  const handleSave = async () => {
    if (!selectedUser) {
      return alert("Select user ❗");
    }

    if (pin.length < 4) {
      return alert("PIN must be at least 4 digits");
    }

    if (pin !== confirmPin) {
      return alert("PINs do not match ❌");
    }

    const res = await fetch(`${API}/pin/set-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: selectedUser,
        pin: pin,
      }),
    });
 await saveAuditLog({
        moduleName: "Settings",
        submenuName: "Set Pin",
        actionType: `CREATE PIN`,
      });
    const data = await res.json();

    alert(data.message || "Saved 🔥");

    setPin("");
    setConfirmPin("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>🔐 Setup User PIN</h2>

        {/* 👤 USER SELECT */}
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          style={styles.input}
        >
          <option value="">-- Select User --</option>
          {users.map((u) => (
            <option key={u.id} value={u.username}>
              {u.username}
            </option>
          ))}
        </select>

        {/* 🔢 PIN */}
        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={styles.input}
        />

        {/* 🔁 CONFIRM */}
        <input
          type="password"
          placeholder="Confirm PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          style={styles.input}
        />

        {/* 💾 SAVE */}
        <button onClick={handleSave} style={styles.button}>
          Save PIN
        </button>
      </div>
    </div>
  );
};

export default SetupPinPage;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    width: "350px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px",
    background: "#0984e3",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};