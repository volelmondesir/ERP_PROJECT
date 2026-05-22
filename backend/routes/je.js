import express from "express";
import sql from "../db.js";

const router = express.Router();

const generateJournalNo = async () => {
  const result = await sql.query`
    SELECT ISNULL(MAX(id), 0) + 1 AS nextId
    FROM JournalEntries
  `;

  return `JE-${String(result.recordset[0].nextId).padStart(5, "0")}`;
};

// GET ALL JOURNAL ENTRIES
router.get("/journal-entries", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM JournalEntries
      ORDER BY id DESC
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    console.log("GET JOURNAL ENTRIES ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// GET ONE JOURNAL ENTRY WITH LINES
router.get("/journal-entry/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const header = await sql.query`
      SELECT *
      FROM JournalEntries
      WHERE id = ${Number(id)}
    `;

    if (header.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    const lines = await sql.query`
      SELECT *
      FROM JournalEntryLines
      WHERE journalEntryId = ${Number(id)}
      ORDER BY id
    `;

    res.json({
      success: true,
      data: {
        header: header.recordset[0],
        lines: lines.recordset,
      },
    });
  } catch (err) {
    console.log("GET JOURNAL ENTRY ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// CREATE + POST JOURNAL ENTRY
router.post("/journal-entry", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      entryDate,
      description,
      createdBy = "Admin",
      lines = [],
    } = req.body;

    if (!entryDate) {
      return res.status(400).json({
        success: false,
        message: "Entry date required",
      });
    }

    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 journal lines required",
      });
    }

    const cleanLines = lines
      .map((line) => ({
        accountId: Number(line.accountId || 0),
        accountCode: line.accountCode || "",
        accountName: line.accountName || "",
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        description: line.description || description || "",
      }))
      .filter((line) => line.accountId && (line.debit > 0 || line.credit > 0));

    const totalDebit = cleanLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = cleanLines.reduce((sum, l) => sum + l.credit, 0);

    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      return res.status(400).json({
        success: false,
        message: "Total debit must equal total credit",
      });
    }

    await transaction.begin();

    const next = await new sql.Request(transaction).query(`
      SELECT ISNULL(MAX(id), 0) + 1 AS nextId
      FROM JournalEntries
    `);

    const journalNo = `JE-${String(next.recordset[0].nextId).padStart(5, "0")}`;

    const header = await new sql.Request(transaction)
      .input("journalNo", sql.NVarChar, journalNo)
      .input("entryDate", sql.NVarChar, entryDate)
      .input("description", sql.NVarChar, description || "")
      .input("totalDebit", sql.Decimal(18, 2), totalDebit)
      .input("totalCredit", sql.Decimal(18, 2), totalCredit)
      .input("createdBy", sql.NVarChar, createdBy)
      .query(`
        INSERT INTO JournalEntries
        (
          journalNo,
          entryDate,
          description,
          totalDebit,
          totalCredit,
          status,
          createdBy
        )
        OUTPUT INSERTED.*
        VALUES
        (
          @journalNo,
          @entryDate,
          @description,
          @totalDebit,
          @totalCredit,
          'Posted',
          @createdBy
        )
      `);

    const journal = header.recordset[0];

    for (const line of cleanLines) {
      await new sql.Request(transaction)
        .input("journalEntryId", sql.Int, journal.id)
        .input("accountId", sql.Int, line.accountId)
        .input("accountCode", sql.NVarChar, line.accountCode)
        .input("accountName", sql.NVarChar, line.accountName)
        .input("debit", sql.Decimal(18, 2), line.debit)
        .input("credit", sql.Decimal(18, 2), line.credit)
        .input("description", sql.NVarChar, line.description)
        .query(`
          INSERT INTO JournalEntryLines
          (
            journalEntryId,
            accountId,
            accountCode,
            accountName,
            debit,
            credit,
            description
          )
          VALUES
          (
            @journalEntryId,
            @accountId,
            @accountCode,
            @accountName,
            @debit,
            @credit,
            @description
          )
        `);

      if (line.debit > 0) {
        await new sql.Request(transaction)
          .input("accountId", sql.Int, line.accountId)
          .input("amount", sql.Decimal(18, 2), line.debit)
          .input("referenceNumber", sql.NVarChar, journalNo)
          .input("description", sql.NVarChar, line.description)
          .input("username", sql.NVarChar, createdBy)
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
              'IN',
              @amount,
              'JOURNAL',
              @referenceNumber,
              @description,
              @username
            )
          `);
      }

      if (line.credit > 0) {
        await new sql.Request(transaction)
          .input("accountId", sql.Int, line.accountId)
          .input("amount", sql.Decimal(18, 2), line.credit)
          .input("referenceNumber", sql.NVarChar, journalNo)
          .input("description", sql.NVarChar, line.description)
          .input("username", sql.NVarChar, createdBy)
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
              'OUT',
              @amount,
              'JOURNAL',
              @referenceNumber,
              @description,
              @username
            )
          `);
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Journal transaction posted ✅",
      data: journal,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    console.log("JOURNAL TRANSACTION ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;