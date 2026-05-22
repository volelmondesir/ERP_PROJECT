import express from "express";
import sql from "../db.js";

const router = express.Router();

// POST CHEQUE
router.post("/cheque", async (req, res) => {
  console.log("BODY 👉", req.body);

  try {
    const {
      date,
      amount,
      beneficiaire_id,
      reason,
      department,
      requester,
      fraud_flag,
      fraud_note,
      bank_id,
    } = req.body;

    // ✅ VALIDATION
    if (!date || !amount || !beneficiaire_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields ❌",
      });
    }

    // ✅ DEFAULT VALUES
    const safeFraudFlag = fraud_flag ?? false;
    const safeFraudNote = fraud_note ?? "";

    // 🔢 CONVERT TYPES
    const safeAmount = Number(amount);
    const safeBankId = bank_id ? Number(bank_id) : null;
    const safeBeneficiaire = Number(beneficiaire_id);

    // 🔥 INSERT QUERY
    const result = await sql.query`
      INSERT INTO cheque_requests
      (
        date,
        amount,
        beneficiaire_id,
        reason,
        department,
        requester,
        fraud_flag,
        fraud_note,
        bank_id
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${date},
        ${safeAmount},
        ${safeBeneficiaire},
        ${reason || ""},
        ${department || ""},
        ${requester || ""},
        ${safeFraudFlag},
        ${safeFraudNote},
        ${safeBankId}
      )
    `;

    console.log("INSERTED 👉", result.recordset);

    // ✅ SUCCESS RESPONSE (JSON TOUJOU)
    return res.status(201).json({
      success: true,
      message: "Cheque saved successfully ✅",
      data: result.recordset[0],
    });

  } catch (err) {
    console.error("SQL ERROR 👉", err);

    // ❗ TOUJOU VOYE JSON (pa janm text)
    return res.status(500).json({
      success: false,
      message: err.message || "Server error ❌",
    });
  }
});
// GET CHEQUE
router.get("/cheques", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT 
        c.*,
        b.name AS bank_name,
        ben.name AS beneficiaire_name
      FROM cheque_requests c
      LEFT JOIN banks b ON c.bank_id = b.id
      LEFT JOIN beneficiaire ben ON c.beneficiaire_id = ben.id
      ORDER BY c.id DESC
    `);

    // 🔥 CLEAN DATA
    const clean = result.recordset.map((r) => ({
      ...r,
      beneficiaire_name: Array.isArray(r.beneficiaire_name)
        ? r.beneficiaire_name.find((v) => v) || ""
        : r.beneficiaire_name || "",
    }));

    console.log("CLEAN 👉", clean);

    res.json(clean);const text = await res.text();
console.log("RAW RESPONSE 👉", text);



  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// Approve
router.post('/check-request/approve/:id', async (req, res) => {
  const { approver } = req.body;
  await sql.query`
    UPDATE check_requests 
    SET status='APPROVED', approved_by=${approver}
    WHERE id=${req.params.id}
  `;
  res.send("Approved");
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

export default router;