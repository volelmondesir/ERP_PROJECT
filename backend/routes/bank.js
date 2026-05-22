import express from "express";
import sql from "../db.js";
import bcrypt from "bcryptjs";
const router = express.Router();

// SET BANK
router.post("/banks", async (req, res) => {
  try {
    console.log("BODY 👉", req.body);

    const { name, account_number } = req.body;

    if (!name || !account_number) {
      return res.status(400).json({ message: "Missing data ❌" });
    }

    const result = await sql.query`
      INSERT INTO banks (name, account_number)
      OUTPUT INSERTED.*
      VALUES (${name}, ${account_number})
    `;

    console.log("INSERTED 👉", result.recordset);

    res.json({ message: "Bank added ✅", data: result.recordset[0] });

  } catch (err) {
    console.error("SQL ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});
// GET BANK
router.get("/banks", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT id, name, account_number FROM banks
    `;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ACCOUNTS
router.get("/accounts", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        id,
        accountCode,
        accountName AS name,
        accountType AS type,
        balance
      FROM Accounts
      WHERE isActive = 1
      ORDER BY accountName
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
/* =========================
   🔐 1. SET / UPDATE PIN
========================= */


/* 🔐 SET PIN */


router.post("/set-pin", async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ message: "Missing data" });
    }

    if (pin.length < 4) {
      return res.status(400).json({ message: "PIN too short" });
    }

    // 🔐 HASH PIN
    const hash = await bcrypt.hash(pin, 10);

    await sql.query`
      UPDATE users
      SET pin_hash = ${hash}
      WHERE username = ${username}
    `;

    res.json({ message: "PIN encrypted & saved 🔐" });

  } catch (err) {
    console.error("ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});
/* =========================
   🔐 2. VERIFY PIN
========================= */
router.post("/verify-pin", async (req, res) => {
  try {
    const { username, pin } = req.body;

    const result = await sql.query`
      SELECT pin_hash FROM users WHERE username = ${username}
    `;

    const user = result.recordset[0];

    console.log("USER 👉", user);
    console.log("PIN 👉", pin);

    if (!user || !user.pin_hash) {
      return res.status(400).json({ message: "PIN not set ❌" });
    }

    const hash = String(user.pin_hash); // 🔥 FORCE STRING

    const isMatch = await bcrypt.compare(pin, hash);

    console.log("MATCH 👉", isMatch);

    if (isMatch) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Wrong PIN ❌" });
    }

  } catch (err) {
    console.error("ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE BANK
router.put("/banks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, account_number } = req.body;

    if (!name || !account_number) {
      return res.status(400).json({
        success: false,
        message: "Bank name and account number required ❌",
      });
    }

    const result = await sql.query`
      UPDATE banks
      SET
        name = ${name},
        account_number = ${account_number}
      OUTPUT INSERTED.*
      WHERE id = ${Number(id)}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bank not found ❌",
      });
    }

    return res.json({
      success: true,
      message: "Bank updated ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.error("UPDATE BANK ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// DELETE BANK
router.delete("/banks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql.query`
      DELETE FROM banks
      OUTPUT DELETED.*
      WHERE id = ${Number(id)}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bank not found ❌",
      });
    }

    return res.json({
      success: true,
      message: "Bank deleted ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.error("DELETE BANK ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
export default router;