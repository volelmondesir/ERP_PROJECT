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

export default router;