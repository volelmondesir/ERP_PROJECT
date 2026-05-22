import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
 import { saveAuditLog } from "../utils/tempLog2";   
const AddUserPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAddUser = async () => {
    try {
      const response = await axios.post("http://localhost:5000/users/add", {
        username,
        password,
      });
      console.log(response.data);
      navigate("/users/manage");  // Redireksyonnen sou manage users
    } catch (err) {
      setError("Failed to add user. Please try again.");
    }
  };

  return (
    <div style={{ width: "300px", margin: "0 auto", padding: "20px" }}>
      <h2>Add User</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", padding: "8px", margin: "10px 0" }}
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "8px", margin: "10px 0" }}
        />
      </div>
      <button
        onClick={handleAddUser}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#3498db",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Add User
      </button>
    </div>
  );
};

export default AddUserPage;