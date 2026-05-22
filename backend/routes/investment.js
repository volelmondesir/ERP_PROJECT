import express from "express";
import sql from "../db.js";

const router = express.Router();

// POST OWNER INVESTMENT
router.post("/investment", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      amount,
      description,
      entryDate,
      createdBy = "Admin",
    } = req.body;

    const value = Number(amount || 0);

    if (value <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    // CASH ACCOUNT
    const cash = await sql.query`
      SELECT TOP 1 *
      FROM Accounts
      WHERE accountCode = 'CASH'
    `;

    // INVEST ACCOUNT
    const invest = await sql.query`
      SELECT TOP 1 *
      FROM Accounts
      WHERE accountCode = 'INVEST'
    `;

    if (
      cash.recordset.length === 0 ||
      invest.recordset.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "CASH or INVEST account missing",
      });
    }

    const cashAcc = cash.recordset[0];
    const investAcc = invest.recordset[0];

    await transaction.begin();

    // GENERATE JOURNAL NO
    const next = await new sql.Request(transaction)
      .query(`
        SELECT ISNULL(MAX(id),0)+1 AS nextId
        FROM JournalEntries
      `);

    const journalNo =
      "INV-" +
      String(
        next.recordset[0].nextId
      ).padStart(5, "0");

    // CREATE JOURNAL HEADER
    const header = await new sql.Request(transaction)
      .input(
        "journalNo",
        sql.NVarChar,
        journalNo
      )
      .input(
        "entryDate",
        sql.NVarChar,
        entryDate
      )
      .input(
        "description",
        sql.NVarChar,
        description ||
          "Owner cash investment"
      )
      .input(
        "totalDebit",
        sql.Decimal(18, 2),
        value
      )
      .input(
        "totalCredit",
        sql.Decimal(18, 2),
        value
      )
      .input(
        "createdBy",
        sql.NVarChar,
        createdBy
      )
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

    const journal =
      header.recordset[0];

    // =====================
    // JOURNAL LINE 1
    // CASH DEBIT
    // =====================

    await new sql.Request(transaction)
      .input(
        "journalEntryId",
        sql.Int,
        journal.id
      )
      .input(
        "accountId",
        sql.Int,
        cashAcc.id
      )
      .input(
        "accountCode",
        sql.NVarChar,
        cashAcc.accountCode
      )
      .input(
        "accountName",
        sql.NVarChar,
        cashAcc.accountName
      )
      .input(
        "debit",
        sql.Decimal(18, 2),
        value
      )
      .input(
        "credit",
        sql.Decimal(18, 2),
        0
      )
      .input(
        "description",
        sql.NVarChar,
        "Cash injected into business"
      )
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

    // =====================
    // JOURNAL LINE 2
    // INVEST CREDIT
    // =====================

    await new sql.Request(transaction)
      .input(
        "journalEntryId",
        sql.Int,
        journal.id
      )
      .input(
        "accountId",
        sql.Int,
        investAcc.id
      )
      .input(
        "accountCode",
        sql.NVarChar,
        investAcc.accountCode
      )
      .input(
        "accountName",
        sql.NVarChar,
        investAcc.accountName
      )
      .input(
        "debit",
        sql.Decimal(18, 2),
        0
      )
      .input(
        "credit",
        sql.Decimal(18, 2),
        value
      )
      .input(
        "description",
        sql.NVarChar,
        "Owner capital investment"
      )
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

    // =====================
    // LEDGER CASH
    // =====================

    await new sql.Request(transaction)
      .input(
        "accountId",
        sql.Int,
        cashAcc.id
      )
      .input(
        "amount",
        sql.Decimal(18, 2),
        value
      )
      .input(
        "referenceNumber",
        sql.NVarChar,
        journalNo
      )
      .input(
        "description",
        sql.NVarChar,
        "Cash injected into business"
      )
      .input(
        "username",
        sql.NVarChar,
        createdBy
      )
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
          'INVESTMENT',
          @referenceNumber,
          @description,
          @username
        )
      `);

    // =====================
    // LEDGER INVEST
    // =====================

    await new sql.Request(transaction)
      .input(
        "accountId",
        sql.Int,
        investAcc.id
      )
      .input(
        "amount",
        sql.Decimal(18, 2),
        value
      )
      .input(
        "referenceNumber",
        sql.NVarChar,
        journalNo
      )
      .input(
        "description",
        sql.NVarChar,
        "Owner capital investment"
      )
      .input(
        "username",
        sql.NVarChar,
        createdBy
      )
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
          'INVESTMENT',
          @referenceNumber,
          @description,
          @username
        )
      `);

    await transaction.commit();

    res.json({
      success: true,
      message:
        "Investment posted ✅",
      data: journal,
    });

  } catch (err) {

    try {
      await transaction.rollback();
    } catch {}

    console.log(
      "INVESTMENT ERROR 👉",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;