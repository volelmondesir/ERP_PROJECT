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
      beneficiaire_name,
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
         beneficiaire_name,
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
         ${beneficiaire_name || ""},
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
router.put("/cheque/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      amount,
      beneficiaire_name,
      reason,
      department,
      requester,
      bank_id,
    } = req.body;

    const result = await sql.query`
      UPDATE cheque_requests
      SET
        date = ${date},
        amount = ${Number(amount)},
        beneficiaire_name = ${beneficiaire_name || ""},
        reason = ${reason || ""},
        department = ${department || ""},
        requester = ${requester || ""},
        bank_id = ${bank_id ? Number(bank_id) : null}
      OUTPUT INSERTED.*
      WHERE id = ${Number(id)}
    `;

    res.json({
      success: true,
      message: "Cheque updated ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.error("UPDATE CHEQUE ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// GET CHEQUES
router.get("/cheques", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT 
        c.*,
        b.name AS bank_name
      FROM cheque_requests c
      LEFT JOIN banks b ON c.bank_id = b.id
      ORDER BY c.id DESC
    `);

    console.log("CHEQUES 👉", result.recordset);

    return res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    console.error("GET CHEQUES ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
const getARAging = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        o.id,
        o.customerName,
        o.invoiceNumber,
        o.createdAt AS invoiceDate,

        COALESCE(
          o.dueDate,
          DATE_ADD(o.createdAt, INTERVAL 30 DAY)
        ) AS dueDate,

        COALESCE(o.total, o.grandTotal, 0) AS totalAmount,

        COALESCE(pay.paidAmount, 0) AS paidAmount

      FROM orders o

      LEFT JOIN (
        SELECT
          invoiceNumber,
          SUM(amount) AS paidAmount
        FROM ar_payments
        GROUP BY invoiceNumber
      ) pay
        ON pay.invoiceNumber = o.invoiceNumber

      WHERE
        COALESCE(o.total, o.grandTotal, 0)
        -
        COALESCE(pay.paidAmount, 0) > 0

      ORDER BY dueDate ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.log("AR AGING ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Failed to load AR aging",
      error: err.message,
    });
  }
};
router.get("/aging", getARAging);
// GET AR AGING
router.get("/aging2", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT
        o.id,
        o.customerName,
        o.invoiceNumber,
        o.createdAt AS invoiceDate,

        ISNULL(
          o.dueDate,
          DATEADD(day, 30, o.createdAt)
        ) AS dueDate,

        ISNULL(o.total, 0) AS totalAmount,

        ISNULL(pay.paidAmount, 0) AS paidAmount

      FROM orders o

      LEFT JOIN (
        SELECT
          invoiceNumber,
          SUM(amount) AS paidAmount
        FROM ar_payments
        GROUP BY invoiceNumber
      ) pay
        ON pay.invoiceNumber = o.invoiceNumber

      WHERE
        ISNULL(o.total, 0) - ISNULL(pay.paidAmount, 0) > 0

      ORDER BY dueDate ASC
    `);

    return res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    console.error("AR AGING ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
export default router;