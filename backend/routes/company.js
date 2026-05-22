import express from "express";
import sql from "../db.js";

const router = express.Router();


// GET COMPANY SETTINGS
router.get("/", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT TOP 1 *
      FROM CompanySettings
      ORDER BY id DESC
    `;

    res.json({
      success: true,
      data: result.recordset[0] || null,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// SAVE / UPDATE COMPANY
router.post("/company", async (req, res) => {
  try {
    const { companyName, address, phone, footerMessage } = req.body;

    await sql.query`
      DELETE FROM CompanySettings
    `;

    const result = await sql.query`
      INSERT INTO CompanySettings
      (companyName, address, phone, footerMessage)
      OUTPUT INSERTED.*
      VALUES
      (${companyName}, ${address}, ${phone}, ${footerMessage})
    `;

    res.json({
      success: true,
      message: "Company settings saved ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});



export default router;