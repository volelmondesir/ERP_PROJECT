import express from "express";
import sql from "mssql";
import { io } from "../server.js";
const router = express.Router();

// ==============================
// GET ALL DEVISES
// ==============================
router.get("/", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM Devises
      ORDER BY id DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.log("GET DEVISES ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// ==============================
// CREATE DEVISE
// ==============================
router.post("/", async (req, res) => {
  try {
    console.log("CREATE DEVISE BODY 👉", req.body);

    const { name, rate, injectedAmount } = req.body;

    if (!name || !rate) {
      return res.status(400).send("Name and rate required");
    }

    await sql.query`
      INSERT INTO Devises (name, rate, injectedAmount)
      VALUES (${name}, ${Number(rate)}, ${Number(injectedAmount || 0)})
    `;

    res.send("Devise saved");
  } catch (err) {
    console.log("CREATE DEVISE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// ==============================
// UPDATE DEVISE
// ==============================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      rate,
      injectedAmount
    } = req.body;

    const oldRes = await sql.query`
      SELECT *
      FROM Devises
      WHERE id = ${Number(id)}
    `;

    if (oldRes.recordset.length === 0) {
      return res.status(404).send("Devise not found");
    }

    const oldDevise = oldRes.recordset[0];

    // ✅ Save history si taux chanje
    await sql.query`
  INSERT INTO DeviseRateHistory (
    deviseId,
    name,
    oldRate,
    newRate
  )
  VALUES (
    ${Number(id)},
    ${oldDevise.name},
    ${Number(oldDevise.rate)},
    ${Number(rate)}
  )
`;

    // ✅ Update devise aktyel la sèlman
    await sql.query`
      UPDATE Devises
      SET
        name = ${name},
        rate = ${Number(rate)},
        updatedAt = GETDATE()
      WHERE id = ${Number(id)}
    `;

    // ✅ Update cash la sou tout devises yo
    await sql.query`
      UPDATE Devises
      SET
        injectedAmount = ${Number(injectedAmount)},
        updatedAt = GETDATE()
    `;

    res.json({
      message: "Devise updated successfully"
    });

  } catch (err) {
    console.log("UPDATE DEVISE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});
// ==============================
// DELETE DEVISE
// ==============================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await sql.query`
      DELETE FROM Devises
      WHERE id = ${id}
    `;

    res.send("Devise deleted");
  } catch (err) {
    console.log("DELETE DEVISE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// ==============================
// RATE HISTORY
// ==============================
router.get("/history/list", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM DeviseRateHistory
      ORDER BY id DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.log("HISTORY ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// ==============================
// SAVE PURCHASE
// ==============================
router.post("/purchase", async (req, res) => {
  try {
   const {
  customerName,
  deviseId,
  deviseName,
  amountDevise,
  rate,
  totalHTG,
  cashier
} = req.body;

    if (!customerName || !deviseId || !amountDevise) {
      return res.status(400).send("Missing data");
    }

    const devRes = await sql.query`
      SELECT * FROM Devises WHERE id = ${deviseId}
    `;

    if (devRes.recordset.length === 0) {
      return res.status(404).send("Devise not found");
    }

    const devise = devRes.recordset[0];

    const injectedBefore = Number(devise.injectedAmount || 0);
    const paidAmount = Number(totalHTG || 0);

    if (paidAmount > injectedBefore) {
      return res.status(400).send("Montan injecte pa sifi");
    }

    const remainingAfter = Math.max(injectedBefore - paidAmount, 0);
    const difference = remainingAfter;

    const receiptNumber =
      "CRY-" + Math.floor(100000 + Math.random() * 900000);

    await sql.query`
      INSERT INTO DevisePurchases (
        customerName,
        receiptNumber,
        deviseId,
        deviseName,
        amountDevise,
        rate,
        totalHTG,
        injectedBefore,
        difference,
        remainingAfter,
        cashier
      )
      VALUES (
        ${customerName},
        ${receiptNumber},
        ${deviseId},
        ${deviseName},
        ${Number(amountDevise)},
        ${Number(rate)},
        ${paidAmount},
        ${injectedBefore},
        ${difference},
        ${remainingAfter},
           ${cashier}
      )
    `;
await sql.query`
  UPDATE Devises
  SET injectedAmount = ${remainingAfter},
      updatedAt = GETDATE()
`;

io.emit("currencyUpdated");
    res.json({
      message: "Purchase saved",
      receiptNumber,
      injectedBefore,
      paidAmount,
      difference,
      remainingAfter
    });

  } catch (err) {
    console.log("PURCHASE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});
router.get("/purchase/history", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT TOP 100 *
      FROM DevisePurchases
      ORDER BY id DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
router.get("/report", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await sql.query`
      SELECT *
      FROM DevisePurchases
      WHERE createdAt >= ${startDate}
    AND createdAt < DATEADD(DAY, 1, ${endDate})
      ORDER BY id DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get("/report/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

 const result = await sql.query`
  SELECT
    COUNT(*) AS totalTransactions,
    ISNULL(SUM(totalHTG), 0) AS totalHTG,
    ISNULL(SUM(CASE WHEN deviseName = 'USD' THEN amountDevise ELSE 0 END), 0) AS totalUSD,
    ISNULL(SUM(CASE WHEN deviseName = 'CAD' THEN amountDevise ELSE 0 END), 0) AS totalCAD
  FROM DevisePurchases
  WHERE createdAt >= ${startDate}
    AND createdAt < DATEADD(DAY, 1, ${endDate})
`;

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
// =========================
// SALES BY CASHIER
// =========================
router.get("/report/cashiers", async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    const result = await sql.query`
      SELECT
        ISNULL(cashier, 'N/A') AS [cashier],
        COUNT(*) AS [totalTransactions],
        ISNULL(SUM(totalHTG), 0) AS [totalSales],
        ISNULL(SUM(amountDevise), 0) AS [totalDevise]
      FROM DevisePurchases
      WHERE createdAt >= ${startDate}
        AND createdAt < DATEADD(DAY, 1, ${endDate})
      GROUP BY cashier
      ORDER BY [totalSales] DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.log("CURRENCY CASHIER ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;