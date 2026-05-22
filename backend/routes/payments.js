import express from "express";
import sql from "../db.js";
import { io } from "../server.js";
const router = express.Router();

const getActiveFiscalYear = async () => {
  const result = await sql.query(`
    SELECT TOP 1 *
    FROM fiscal_years
    WHERE status = 'OPEN'
    ORDER BY id DESC
  `);

  if (result.recordset.length === 0) {
    throw new Error("No open fiscal year found");
  }

  return result.recordset[0];
};

/* ===============================
   CREATE PAYMENT + RECEIPT
================================ */
router.post("/payments", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const { invoiceId, amount, items = [], username = "Admin" } = req.body;

    if (!invoiceId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Invalid payment data",
      });
    }

    const cash = Number(amount);
    const fiscal = await getActiveFiscalYear();

    await transaction.begin();

    const invoiceReq = new sql.Request(transaction);
    invoiceReq.input("invoiceId", sql.Int, invoiceId);

    const invoiceRes = await invoiceReq.query(`
      SELECT *
      FROM Invoices
      WHERE id = @invoiceId
    `);

    if (invoiceRes.recordset.length === 0) {
      throw new Error("Invoice not found");
    }

    const invoice = invoiceRes.recordset[0];

    const currentPaid = Number(invoice.paidAmount || 0);
    const invoiceTotal = Number(invoice.total || 0);

    if (invoiceTotal <= 0) {
      throw new Error("Invoice total must be greater than 0");
    }

    if (currentPaid >= invoiceTotal) {
      throw new Error("Invoice already paid");
    }

    const balance = invoiceTotal - currentPaid;
    const applied = Math.min(cash, balance);
    const change = Math.max(cash - applied, 0);
    const newPaid = currentPaid + applied;

    const status =
      newPaid >= invoiceTotal
        ? "Paid"
        : newPaid > 0
        ? "Partial"
        : "Unpaid";

    const receiptNumber =
      "RPT-" + Math.floor(100000 + Math.random() * 900000);

    // SAVE PAYMENT
    const payReq = new sql.Request(transaction);
    payReq.input("invoiceId", sql.Int, invoiceId);
    payReq.input("amount", sql.Decimal(10, 2), applied);
    payReq.input("cash", sql.Decimal(10, 2), cash);
    payReq.input("applied", sql.Decimal(10, 2), applied);
    payReq.input("change", sql.Decimal(10, 2), change);
    payReq.input("receipt", sql.NVarChar, receiptNumber);
    payReq.input("fiscalId", sql.Int, fiscal.id);
    payReq.input("username", sql.NVarChar, username);

    await payReq.query(`
      INSERT INTO Payments (
        invoiceId,
        amount,
        cash,
        applied,
        [change],
        receiptNumber,
        fiscal_year_id,
        username
      )
      VALUES (
        @invoiceId,
        @amount,
        @cash,
        @applied,
        @change,
        @receipt,
        @fiscalId,
        @username
      )
    `);

    // ✅ SAVE TO CASH ACCOUNT LEDGER
    const cashAccountReq = new sql.Request(transaction);

    const cashAccountRes = await cashAccountReq.query(`
      SELECT TOP 1 id
      FROM Accounts
      WHERE accountCode = 'CASH'
        AND isActive = 1
    `);

    if (cashAccountRes.recordset.length === 0) {
      throw new Error("Cash account not found");
    }

    const cashAccountId = cashAccountRes.recordset[0].id;

    const ledgerReq = new sql.Request(transaction);
    ledgerReq.input("accountId", sql.Int, cashAccountId);
    ledgerReq.input("amount", sql.Decimal(18, 2), applied);
    ledgerReq.input("sourceId", sql.Int, invoiceId);
    ledgerReq.input("referenceNumber", sql.NVarChar, receiptNumber);
    ledgerReq.input(
      "description",
      sql.NVarChar,
      `Invoice payment ${invoice.invoiceNumber || receiptNumber}`
    );
    ledgerReq.input("username", sql.NVarChar, username);

    await ledgerReq.query(`
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
        'INVOICE_PAYMENT',
        @sourceId,
        @referenceNumber,
        @description,
        @username
      )
    `);

    // DELIVERY CHECK
    const delCheckReq = new sql.Request(transaction);
    delCheckReq.input("invoiceId", sql.Int, invoiceId);

    const deliveryRes = await delCheckReq.query(`
      SELECT *
      FROM Deliveries
      WHERE invoiceId = @invoiceId
    `);

    let deliveryId = null;
    let deliveryNumber = null;

    if (deliveryRes.recordset.length === 0) {
      deliveryNumber =
        "DLV-" + Math.floor(100000 + Math.random() * 900000);

      const createDelReq = new sql.Request(transaction);
      createDelReq.input("invoiceId", sql.Int, invoiceId);
      createDelReq.input("deliveryNumber", sql.NVarChar, deliveryNumber);

      const insertDelivery = await createDelReq.query(`
        INSERT INTO Deliveries (
          invoiceId,
          deliveryNumber,
          status
        )
        OUTPUT INSERTED.id
        VALUES (
          @invoiceId,
          @deliveryNumber,
          'Pending'
        )
      `);

      deliveryId = insertDelivery.recordset[0].id;

      for (const item of items) {
        if (!item.name || !item.quantity) continue;

        const itemReq = new sql.Request(transaction);
        itemReq.input("deliveryId", sql.Int, deliveryId);
        itemReq.input("name", sql.NVarChar, item.name);
        itemReq.input("qty", sql.Int, item.quantity);

        await itemReq.query(`
          INSERT INTO DeliveryItems (
            deliveryId,
            name,
            quantity
          )
          VALUES (
            @deliveryId,
            @name,
            @qty
          )
        `);
      }
    } else {
      deliveryId = deliveryRes.recordset[0].id;
      deliveryNumber = deliveryRes.recordset[0].deliveryNumber;
    }

    const deliveryStatus = status === "Paid" ? "Pending" : "Ready";

    const updateDelReq = new sql.Request(transaction);
    updateDelReq.input("invoiceId", sql.Int, invoiceId);
    updateDelReq.input("status", sql.NVarChar, deliveryStatus);

    await updateDelReq.query(`
      UPDATE Deliveries
      SET status = @status
      WHERE invoiceId = @invoiceId
    `);

    const updateInvReq = new sql.Request(transaction);
    updateInvReq.input("invoiceId", sql.Int, invoiceId);
    updateInvReq.input("paid", sql.Decimal(10, 2), newPaid);
    updateInvReq.input("status", sql.NVarChar, status);

    await updateInvReq.query(`
      UPDATE Invoices
      SET
        paidAmount = @paid,
        status = @status
      WHERE id = @invoiceId
    `);


    

     


    await transaction.commit();
io.emit("dashboardUpdated");
io.emit("salesUpdated");
    res.json({
      success: true,
      receiptNumber,
      deliveryNumber,
      deliveryId,
      invoiceTotal,
      cashReceived: cash,
      amountPaidNow: applied,
      paidAmount: newPaid,
      change,
      status,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    console.error("PAYMENT ERROR:", err);

    res.status(400).json({
      message: err.message,
    });
  }
});

/* ===============================
   RECEIPTS LIST
================================ */
/* ===============================
   RECEIPT DETAIL / REPRINT
================================ */
router.get("/receipts/:receiptNumber", async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    console.log("DETAIL RECEIPT:", receiptNumber);

    const result = await sql.query`
      SELECT
        p.receiptNumber,
        p.amount,
        p.cash,
        p.applied,
        p.[change],
        p.paymentDate,
        p.username AS cashier,

        i.invoiceNumber,
        i.customerName,
        i.subtotal,
        i.taxRate,
        i.taxAmount,
        i.total,
        i.orderId
      FROM Payments p
      JOIN Invoices i ON i.id = p.invoiceId
      WHERE p.receiptNumber = ${receiptNumber}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    const r = result.recordset[0];

    const itemsResult = await sql.query`
      SELECT
        itemName AS name,
        qty AS quantity,
        price
      FROM OrderItems
      WHERE orderId = ${r.orderId}
    `;

    res.json({
      ...r,
      items: itemsResult.recordset,
    });
  } catch (err) {
    console.log("RECEIPT DETAIL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});


/* ===============================
   RECEIPTS LIST
================================ */
router.get("/receipts", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT
        p.receiptNumber,
        i.invoiceNumber,
        i.customerName,

        p.amount,
        ISNULL(p.cash, p.amount) AS cash,
        ISNULL(p.applied, p.amount) AS applied,
        ISNULL(p.[change], 0) AS [change],

        p.paymentDate,
        p.username AS cashier,

        i.subtotal,
        i.taxRate,
        i.taxAmount,
        i.total,
        i.orderId
      FROM Payments p
      JOIN Invoices i ON i.id = p.invoiceId
      ORDER BY p.id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log("RECEIPTS LIST ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});
export default router;