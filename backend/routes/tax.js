import express from "express";
import sql from "../db.js";

const router = express.Router();

// GET CURRENT TAX
router.get("/", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT TOP 1 *
      FROM TaxSettings
      ORDER BY id DESC
    `;

    if (result.recordset.length === 0) {
      return res.json({
        taxRate: 0,
        isActive: 0,
      });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.log("GET TAX ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});

// GET TAX HISTORY
router.get("/history", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM TaxHistory
      ORDER BY changedAt DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.log("HISTORY ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE TAX RATE
router.post("/update", async (req, res) => {
  try {

    const { taxRate, isActive, user } = req.body;

    const safeRate = Number(taxRate || 0);
    const safeStatus = isActive ? 1 : 0;
    const safeUser = user || "Admin";

    const current = await sql.query`
      SELECT TOP 1 *
      FROM TaxSettings
      ORDER BY id DESC
    `;

    let oldRate = 0;
    let oldStatus = 0;
    let result;

    if (current.recordset.length > 0) {

      const old = current.recordset[0];

      oldRate = Number(old.taxRate || 0);
      oldStatus = old.isActive ?  0: 1;

      if (
        oldRate === safeRate &&
        oldStatus === safeStatus
      ) {
        return res.json({
          success: true,
          message: "No changes",
          data: old,
        });
      }

      // UPDATE CURRENT TAX
      result = await sql.query`
        UPDATE TaxSettings
        SET
          taxRate = ${safeRate},
          isActive = ${safeStatus}

        OUTPUT INSERTED.*

        WHERE id = ${old.id}
      `;

    } else {

      result = await sql.query`
        INSERT INTO TaxSettings
        (
          taxRate,
          isActive
        )

        OUTPUT INSERTED.*

        VALUES
        (
          ${safeRate},
          ${safeStatus}
        )
      `;
    }

    // INSERT HISTORY
    await sql.query`
      INSERT INTO TaxHistory
      (
        oldRate,
        newRate,
        oldStatus,
        newStatus,
        changedBy,
        changedAt
      )

      VALUES
      (
        ${oldRate},
        ${safeRate},

        ${oldStatus},
        ${safeStatus},

        ${safeUser},

        GETDATE()
      )
    `;

    res.json({
      success: true,
      message: "Tax updated ✅",
      data: result.recordset[0],
    });

  } catch (err) {

    console.log("UPDATE TAX ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// TOGGLE TAX STATUS
router.put("/status", async (req, res) => {
  try {
    const { isActive, user } = req.body;

    const safeStatus = isActive ? 1 : 0;
    const safeUser = user || "Admin";

    const current = await sql.query`
      SELECT TOP 1 *
      FROM TaxSettings
      ORDER BY id DESC
    `;

    if (current.recordset.length === 0) {
      const created = await sql.query`
        INSERT INTO TaxSettings (taxRate, isActive)
        OUTPUT INSERTED.*
        VALUES (0, ${safeStatus})
      `;

      await sql.query`
        INSERT INTO TaxHistory
        (
          oldRate,
          newRate,
          oldStatus,
          newStatus,
          changedBy,
          changedAt
        )
        VALUES
        (
          0,
          0,
          0,
          ${safeStatus},
          ${safeUser},
          GETDATE()
        )
      `;


      
      return res.json({
        success: true,
        message: "Tax status created ✅",
        data: created.recordset[0],
      });
    }

    const old = current.recordset[0];
    const oldStatus = old.isActive ? 1 : 0;

    if (oldStatus === safeStatus) {
      return res.json({
        success: true,
        message: "No changes",
        data: old,
      });
    }

    const result = await sql.query`
      UPDATE TaxSettings
      SET isActive = ${safeStatus}
      OUTPUT INSERTED.*
      WHERE id = ${old.id}
    `;

    await sql.query`
      INSERT INTO TaxHistory
      (
        oldRate,
        newRate,
        oldStatus,
        newStatus,
        changedBy,
        changedAt
      )
      VALUES
      (
        ${Number(old.taxRate || 0)},
        ${Number(old.taxRate || 0)},
        ${oldStatus},
        ${safeStatus},
        ${safeUser},
        GETDATE()
      )
    `;

    res.json({
      success: true,
      message: "Status updated ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.log("STATUS ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
export default router;