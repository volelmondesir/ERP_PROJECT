import express from "express";
import sql from "mssql";
import bcrypt from "bcryptjs";
const router = express.Router();
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


export default router;