import express from "express";
import sql from "../db.js";

const router = express.Router();

// GET ALL ACCOUNTS + BALANCE
router.get("/", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT
        a.id,
        a.accountCode,
        a.accountName,
        ISNULL(SUM(
          CASE
            WHEN l.transactionType = 'IN' THEN l.amount
            WHEN l.transactionType = 'OUT' THEN -l.amount
            ELSE 0
          END
        ), 0) AS balance
      FROM Accounts a
      LEFT JOIN AccountLedger l ON l.accountId = a.id
      GROUP BY a.id, a.accountCode, a.accountName
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// GET HISTORY
router.get("/:code/history", async (req, res) => {
  try {
    const { code } = req.params;

    const acc = await sql.query`
      SELECT id FROM Accounts WHERE accountCode = ${code}
    `;

    if (acc.recordset.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    const accountId = acc.recordset[0].id;

    const history = await sql.query`
      SELECT TOP 100 *
      FROM AccountLedger
      WHERE accountId = ${accountId}
      ORDER BY id DESC
    `;

    res.json({ history: history.recordset });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// GET HISTORY GL
router.get("/:code/historygl", async (req, res) => {
  try {
    const { code } = req.params;

    const acc = await sql.query`
      SELECT id, accountCode, accountName
      FROM Accounts
      WHERE accountCode = ${code}
    `;

    if (acc.recordset.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    const account = acc.recordset[0];

    const result = await sql.query`
      SELECT
        l.id,
        l.accountId,
        l.transactionType,
        l.amount,
        l.sourceType,
        l.referenceNumber,
        l.description,
        l.username,
        l.createdAt,

        CASE
          WHEN l.sourceType = 'REVERSAL'
            OR l.referenceNumber LIKE 'REV-%'
          THEN 1 ELSE 0
        END AS isReversal,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM AccountLedger r
            WHERE r.accountId = l.accountId
              AND r.sourceType = 'REVERSAL'
              AND r.referenceNumber = 'REV-' + ISNULL(l.referenceNumber, CAST(l.id AS NVARCHAR(50)))
          )
          THEN 1 ELSE 0
        END AS isAlreadyReversed

      FROM AccountLedger l
      WHERE l.accountId = ${account.id}
      ORDER BY l.id ASC
    `;

    // Running balance nan Node.js pou evite SQL Server version problem
    let balance = 0;

    const rowsAsc = result.recordset.map((r) => {
      const type = String(r.transactionType || "").toUpperCase();

      if (type === "IN") {
        balance += Number(r.amount || 0);
      } else if (type === "OUT") {
        balance -= Number(r.amount || 0);
      }

      return {
        ...r,
        runningBalance: balance,
        isReversal: Number(r.isReversal) === 1,
        isAlreadyReversed: Number(r.isAlreadyReversed) === 1,
      };
    });

    res.json({
      success: true,
      account,
      history: rowsAsc.reverse(),
    });
  } catch (err) {
    console.log("GL HISTORY ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});


// REVERSE TRANSACTION
router.post("/reverse", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const { transactionId, username = "Admin" } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction id required",
      });
    }

    await transaction.begin();

    const original = await new sql.Request(transaction)
      .input("id", sql.Int, Number(transactionId))
      .query(`
        SELECT *
        FROM AccountLedger
        WHERE id = @id
      `);

    if (original.recordset.length === 0) {
      throw new Error("Transaction not found");
    }

    const t = original.recordset[0];

    const originalRef = t.referenceNumber || String(t.id);
    const reverseRef = "REV-" + originalRef;

    if (
      t.sourceType === "REVERSAL" ||
      String(t.referenceNumber || "").startsWith("REV-")
    ) {
      throw new Error("Cannot reverse a reversal transaction");
    }

    const check = await new sql.Request(transaction)
      .input("accountId", sql.Int, t.accountId)
      .input("reverseRef", sql.NVarChar, reverseRef)
      .query(`
        SELECT id
        FROM AccountLedger
        WHERE accountId = @accountId
          AND referenceNumber = @reverseRef
      `);

    if (check.recordset.length > 0) {
      throw new Error("Transaction already reversed");
    }

    const reverseType =
      String(t.transactionType || "").toUpperCase() === "IN"
        ? "OUT"
        : "IN";

    await new sql.Request(transaction)
      .input("accountId", sql.Int, t.accountId)
      .input("transactionType", sql.NVarChar, reverseType)
      .input("amount", sql.Decimal(18, 2), Number(t.amount || 0))
      .input("sourceType", sql.NVarChar, "REVERSAL")
      .input("referenceNumber", sql.NVarChar, reverseRef)
      .input("description", sql.NVarChar, `Reversal of ${originalRef}`)
      .input("username", sql.NVarChar, username)
      .query(`
        INSERT INTO AccountLedger
        (
          accountId,
          transactionType,
          amount,
          sourceType,
          referenceNumber,
          description,
          username
        )
        VALUES
        (
          @accountId,
          @transactionType,
          @amount,
          @sourceType,
          @referenceNumber,
          @description,
          @username
        )
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: "Transaction reversed ✅",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    console.log("REVERSE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
export default router;