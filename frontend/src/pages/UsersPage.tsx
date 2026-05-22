import { useState, useEffect } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "/api";

const UsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  useEffect(() => {
  
    saveAuditLog({
  
    moduleName: "Settings",
  
      submenuName: "ChangeUser",
  
      actionType: "VIEW PAGE",
  
    });
  
  }, []);
  // ✅ LOAD USERS
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    axios
      .get(`${API}/users/users`)
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));
  };

  // 🔑 OPEN PROMPT
  const openPrompt = (userId: number) => {
    setSelectedUser(userId);
    setShowPrompt(true);
  };

  // ✅ SAVE PASSWORD
 // ✅ SAVE PASSWORD
const handleSave = async () => {

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  if (!password || !selectedUser) {
    alert("Enter password");
    return;
  }

  try {

    await axios.put(
      `${API}/users/${selectedUser}/password`,
      {
        password,
        currentUser: currentUser.username,
      }
    );

    alert("Password updated ✅");

    setShowPrompt(false);

    setPassword("");

    showToast(
      "Password updated ✅",
      "success"
    );

  } catch (err: any) {

    alert(
      err.response?.data?.message ||
      err.response?.data ||
      "Error ❌"
    );
  }
};

  // ❌ DELETE USER
  const handleDelete = async (id: number) => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (currentUser.id === id) {
      alert("You can't delete yourself ❌");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:5000/users/${id}`);

      alert("User deleted ✅");

      // 🔥 UPDATE UI
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert("Delete failed ❌");
      showToast("Something went wrong ❌", "error");
    }
  };

  // ❌ CANCEL
  const handleCancel = () => {
    setShowPrompt(false);
    setPassword("");
  };
const showToast = (msg: string, type: "success" | "error" = "success") => {
  setToast({ msg, type });

  setTimeout(() => {
    setToast(null);
  }, 3000);
};
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👤 Users</h2>
{toast && (
  <div
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      padding: "12px 20px",
      borderRadius: "6px",
      color: "#fff",
      background: toast.type === "success" ? "#2ecc71" : "#e74c3c",
      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      zIndex: 9999,
      animation: "fadeIn 0.3s ease"
    }}
  >
    {toast.msg}
  </div>
)}
 <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Username</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={styles.td}>{u.id}</td>
              <td style={styles.td}>{u.username}</td>
              <td style={styles.td}> {u.role}</td>

              <td style={styles.actionsCell}>
                <button
                  style={styles.editBtn}
                  onClick={() => openPrompt(u.id)}
                >
                  🔑 Change
                </button>

               
                <button
  style={{
    ...styles.deleteBtn,

    opacity:
      String(u.username).toLowerCase() === "admin" 
        ? 0.5
        : 1,

    cursor:
      String(u.username).toLowerCase() === "admin"
        ? "not-allowed"
        : "pointer",
  }}

  disabled={
    String(u.username).toLowerCase() === "admin"
  }

  onClick={() => handleDelete(u.id)}
>
  
   🗑 Delete
</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
</div>
      {/* 🔥 MODAL */}
      {showPrompt && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Change Password</h3>

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              style={styles.input}
              autoFocus
            />

            <div style={styles.modalActions}>
              <button style={styles.okBtn} onClick={handleSave}>
                OK
              </button>
              <button style={styles.cancelBtn} onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#5b0303",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    gap: "14px",
    flexWrap: "wrap",
    
  },

  title: {
    margin: 0,
    fontSize: "36px",
    color: "#0f172a",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "18px",
  },

  secondaryBtn: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  search: {
    width: "100%",
    maxWidth: "520px",
    padding: "16px",
    fontSize: "18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    outline: "none",
    marginBottom: "22px",
  },

  infoRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },

  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "18px",
    color: "#0f172a",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    color: "#0f172a",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 16px",
    borderTop: "1px solid #e2e8f0",
    color: "#334155",
    whiteSpace: "nowrap",
  },

  tdBold: {
    padding: "14px",
    borderTop: "1px solid #e2e8f0",
    color: "#0f172a",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
    borderTop: "1px solid #e2e8f0",
  },

  roleBadge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: "bold",
    fontSize: "14px",
  },

  actionsCell: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  editBtn: {
    padding: "9px 12px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  deleteBtn: {
    padding: "9px 12px",
    border: "none",
    borderRadius: "10px",
    background: "#ef4444",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    padding: "14px 22px",
    borderRadius: "12px",
    color: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    zIndex: 9999,
    fontWeight: "bold",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9998,
    padding: "20px",
  },

  modal: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
  },

  modalTitle: {
    margin: 0,
    fontSize: "26px",
    color: "#0f172a",
  },

  modalSub: {
    margin: "8px 0 16px",
    color: "#64748b",
    fontSize: "16px",
  },

  input: {
    width: "100%",
    padding: "14px",
    marginTop: "10px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "17px",
    outline: "none",
    boxSizing: "border-box",
  },

  modalActions: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },

  okBtn: {
    padding: "12px 18px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  cancelBtn: {
    padding: "12px 18px",
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
