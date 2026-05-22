import express from "express";
import sql from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

const SECRET = "mysecretkey";




// =========================
// ✅ LOGIN (FIXED 🔥)
// =========================
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("Login request received with username:", username); // Log username for debugging

  try {
    // Query to find the user by username
    const result = await new sql.Request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM Users WHERE username = @username");

    // If no user found
    if (result.recordset.length === 0) {
      console.log("User not found.");
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.recordset[0];

    // Verify if the password matches the hashed password in database
    const isMatch = await bcrypt.compare(password, user.password);
    

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // ✅ JWT TOKEN
   const token = jwt.sign(
  { id: user.id, username: user.username },
  SECRET,
  { expiresIn: "1h" }
);
    res.json({
      message: "Login OK",
      token,
      user: {
        username: user.username
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// =========================
// ✅ REGISTER
// =========================
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await new sql.Request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashedPassword)
      .query("INSERT INTO Users (username, password) VALUES (@username, @password)");

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



export default router;