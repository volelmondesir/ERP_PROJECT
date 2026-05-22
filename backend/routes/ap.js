

import express from "express";
import sql from "../db.js";
const router = express.Router();
/* ===============================
   ACCOUNT PAYABLE PAYMENT
   Payment Account IN
   Cash Account OUT
================================ */
router.post("/", async (req, res) => {
  const transaction = new sql.Transaction();
  try {
    const {
      date,
      description,
      amount,
      username = "Admin",
    } = req.body;
    if (!date || !description || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Invalid AP transaction data",
      });
    }
    const value = Number(amount);
    await transaction.begin();
    const accReq = new sql.Request(transaction);
    const accRes = await accReq.query(`
      SELECT
        id,
        UPPER(LTRIM(RTRIM(accountCode))) AS accountCode
      FROM Accounts
      WHERE UPPER(LTRIM(RTRIM(accountCode))) IN ('CASH', 'PAYMENT')
        AND isActive = 1
    `);
    const cashAccount = accRes.recordset.find(
      (a) => a.accountCode === "CASH"
    );
    const paymentAccount = accRes.recordset.find(
      (a) => a.accountCode === "PAYMENT"
    );
    if (!cashAccount) {
      throw new Error("Cash account not found");
    }
    if (!paymentAccount) {
      throw new Error("Payment account not found");
    }
    const referenceNumber =
      "AP-" + Math.floor(100000 + Math.random() * 900000);
    // ✅ PAYMENT ACCOUNT IN
    const paymentReq = new sql.Request(transaction);
    paymentReq.input("accountId", sql.Int, paymentAccount.id);
    paymentReq.input("amount", sql.Decimal(18, 2), value);
    paymentReq.input("sourceType", sql.NVarChar, "ACCOUNT_PAYABLE");
    paymentReq.input("referenceNumber", sql.NVarChar, referenceNumber);
    paymentReq.input("description", sql.NVarChar, description);
    paymentReq.input("username", sql.NVarChar, username);
    paymentReq.input("createdAt", sql.DateTime, new Date(date));
    await paymentReq.query(`
      INSERT INTO AccountLedger (
        accountId,
        transactionType,
        amount,
        sourceType,
        referenceNumber,
        description,
        username,
        createdAt
      )
      VALUES (
        @accountId,
        'IN',
        @amount,
        @sourceType,
        @referenceNumber,
        @description,
        @username,
        @createdAt
      )
    `);
    // ✅ CASH ACCOUNT OUT
    const cashReq = new sql.Request(transaction);
    cashReq.input("accountId", sql.Int, cashAccount.id);
    cashReq.input("amount", sql.Decimal(18, 2), value);
    cashReq.input("sourceType", sql.NVarChar, "ACCOUNT_PAYABLE");
    cashReq.input("referenceNumber", sql.NVarChar, referenceNumber);
    cashReq.input("description", sql.NVarChar, description);
    cashReq.input("username", sql.NVarChar, username);
    cashReq.input("createdAt", sql.DateTime, new Date(date));
    await cashReq.query(`
      INSERT INTO AccountLedger (
        accountId,
        transactionType,
        amount,
        sourceType,
        referenceNumber,
        description,
        username,
        createdAt
      )
      VALUES (
        @accountId,
        'OUT',
        @amount,
        @sourceType,
        @referenceNumber,
        @description,
        @username,
        @createdAt
      )
    `);
    await transaction.commit();
    res.json({
      success: true,
      referenceNumber,
      message: "Account payable transaction saved",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}
    console.log("AP ERROR:", err);
    res.status(500).json({
      message: err.message,
    });
  }
});
/* ===============================
   GET AP SUPPLIER INVOICES
================================ */
router.get("/supplier-invoices", async (req, res) => {
  try {
    const result = await sql.query(`
  SELECT
        si.id,
        si.poId,
        po.poNumber,
        si.invoiceNumber,
        si.supplier,
        si.total,
        si.paidAmount,
        si.status,
        si.username,
        si.createdAt
      FROM SupplierInvoices si
      LEFT JOIN PurchaseOrders po
        ON po.id = si.poId
      ORDER BY si.id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log("GET AP INVOICES ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   PAY SUPPLIER INVOICE
   Cash OUT / Payment Account OUT
================================ */
router.post("/pay-supplier", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      supplierInvoiceId,
      amount,
      method = "Cash",
      note = "",
      username = "Admin",
    } = req.body;

    if (!supplierInvoiceId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid payment data" });
    }

    const payAmount = Number(amount);

    await transaction.begin();

    const invReq = new sql.Request(transaction);
    invReq.input("id", sql.Int, Number(supplierInvoiceId));

    const invRes = await invReq.query(`
      SELECT *
      FROM SupplierInvoices
      WHERE id = @id
    `);

    if (invRes.recordset.length === 0) {
      throw new Error("Supplier invoice not found");
    }

    const invoice = invRes.recordset[0];

    const total = Number(invoice.total || 0);
    const paid = Number(invoice.paidAmount || 0);
    const balance = total - paid;

    if (balance <= 0) {
      throw new Error("Invoice already paid");
    }

    if (payAmount > balance) {
      throw new Error("Payment cannot exceed invoice balance");
    }

    const newPaid = paid + payAmount;

    const newStatus =
      newPaid >= total ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid";

    const paymentReq = new sql.Request(transaction);
    paymentReq.input("supplierInvoiceId", sql.Int, invoice.id);
    paymentReq.input("invoiceNumber", sql.NVarChar, invoice.invoiceNumber);
    paymentReq.input("supplier", sql.NVarChar, invoice.supplier);
    paymentReq.input("amount", sql.Decimal(18, 2), payAmount);
    paymentReq.input("method", sql.NVarChar, method);
    paymentReq.input("note", sql.NVarChar, note);
    paymentReq.input("username", sql.NVarChar, username);

    await paymentReq.query(`
      INSERT INTO SupplierPayments (
        supplierInvoiceId,
        invoiceNumber,
        supplier,
        amount,
        method,
        note,
        username
      )
      VALUES (
        @supplierInvoiceId,
        @invoiceNumber,
        @supplier,
        @amount,
        @method,
        @note,
        @username
      )
    `);

    const updateReq = new sql.Request(transaction);
    updateReq.input("id", sql.Int, invoice.id);
    updateReq.input("paidAmount", sql.Decimal(18, 2), newPaid);
    updateReq.input("status", sql.NVarChar, newStatus);

    await updateReq.query(`
      UPDATE SupplierInvoices
      SET paidAmount = @paidAmount,
          status = @status
      WHERE id = @id
    `);

    const accReq = new sql.Request(transaction);
    const accRes = await accReq.query(`
      SELECT id, accountCode
      FROM Accounts
      WHERE accountCode IN ('CASH', 'PAYMENT')
        AND isActive = 1
    `);

    const cashAccount = accRes.recordset.find((a) => a.accountCode === "CASH");
    const paymentAccount = accRes.recordset.find((a) => a.accountCode === "PAYMENT");

    if (!cashAccount) throw new Error("Cash account not found");
    if (!paymentAccount) throw new Error("Payment account not found");

    const referenceNumber =
      "AP-PAY-" + Math.floor(100000 + Math.random() * 900000);

    // CASH OUT
    const cashLedgerReq = new sql.Request(transaction);
    cashLedgerReq.input("accountId", sql.Int, cashAccount.id);
    cashLedgerReq.input("amount", sql.Decimal(18, 2), payAmount);
    cashLedgerReq.input("sourceId", sql.Int, invoice.id);
    cashLedgerReq.input("referenceNumber", sql.NVarChar, referenceNumber);
    cashLedgerReq.input("description", sql.NVarChar, `Paid supplier invoice ${invoice.invoiceNumber}`);
    cashLedgerReq.input("username", sql.NVarChar, username);

    await cashLedgerReq.query(`
      INSERT INTO AccountLedger (
        accountId,
        transactionType,
        amount,
        sourceType,
        sourceId,
        referenceNumber,
        description,
        username
      )
      VALUES (
        @accountId,
        'OUT',
        @amount,
        'SUPPLIER_PAYMENT',
        @sourceId,
        @referenceNumber,
        @description,
        @username
      )
    `);

    // PAYMENT OUT = AP liability reduce
    const payLedgerReq = new sql.Request(transaction);
    payLedgerReq.input("accountId", sql.Int, paymentAccount.id);
    payLedgerReq.input("amount", sql.Decimal(18, 2), payAmount);
    payLedgerReq.input("sourceId", sql.Int, invoice.id);
    payLedgerReq.input("referenceNumber", sql.NVarChar, referenceNumber);
    payLedgerReq.input("description", sql.NVarChar, `Reduce AP for ${invoice.invoiceNumber}`);
    payLedgerReq.input("username", sql.NVarChar, username);

    // PAYMENT ACCOUNT
await payLedgerReq.query(`
  INSERT INTO AccountLedger (
    accountId,
    transactionType,
    amount,
    sourceType,
    sourceId,
    referenceNumber,
    description,
    username
  )
  VALUES (
    @accountId,
    'IN',
    @amount,
    'SUPPLIER_PAYMENT',
    @sourceId,
    @referenceNumber,
    @description,
    @username
  )
`);

    await transaction.commit();

    res.json({
      success: true,
      referenceNumber,
      invoiceNumber: invoice.invoiceNumber,
      total,
      paidAmount: newPaid,
      balance: total - newPaid,
      status: newStatus,
      message: "Supplier payment completed",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    console.log("PAY SUPPLIER ERROR:", err);

    res.status(500).json({
      message: err.message || "Payment failed",
    });
  }
});
// GET /api/ap/aging

router.get("/aging", async (req, res) => {

  try {

    const [rows] = await db.query(`

      SELECT

        p.id,

        COALESCE(v.vendorName, p.vendorName, 'Unknown Vendor') AS vendorName,

        p.poNumber,

        COALESCE(p.billNumber, p.invoiceNumber, '') AS billNumber,

        p.poDate,

        p.dueDate,

        COALESCE(p.totalAmount, p.grandTotal, 0) AS totalAmount,

        COALESCE(pay.paidAmount, 0) AS paidAmount

      FROM purchase_orders p

      LEFT JOIN vendors v

        ON v.id = p.vendorId

      LEFT JOIN (

        SELECT

          poNumber,

          SUM(amount) AS paidAmount

        FROM ap_payments

        GROUP BY poNumber

      ) pay

        ON pay.poNumber = p.poNumber

      WHERE COALESCE(p.totalAmount, p.grandTotal, 0) - COALESCE(pay.paidAmount, 0) > 0

      ORDER BY p.dueDate ASC

    `);

    res.json({

      success: true,

      data: rows,

    });

  } catch (err) {

    console.error("AP AGING ERROR 👉", err);

    res.status(500).json({

      success: false,

      message: "Failed to load AP aging",

      error: err.message,

    });

  }

})
export default router;