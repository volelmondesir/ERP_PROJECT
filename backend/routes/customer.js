import express from "express";
import sql from "../db.js";

const router = express.Router();

// GET CUSTOMERS
router.get("/customers", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM customers
      ORDER BY id DESC
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// CREATE CUSTOMER
router.post("/customer", async (req, res) => {
  try {
    const { name, phone, email, address, balance, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const result = await sql.query`
      INSERT INTO customers
      (
        name,
        phone,
        email,
        address,
        balance,
        status
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${name},
        ${phone || ""},
        ${email || ""},
        ${address || ""},
        ${Number(balance || 0)},
        ${status || "active"}
      )
    `;

    res.status(201).json({
      success: true,
      message: "Customer saved ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// UPDATE CUSTOMER
router.put("/customer/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, balance, status } = req.body;

    const result = await sql.query`
      UPDATE customers
      SET
        name = ${name},
        phone = ${phone || ""},
        email = ${email || ""},
        address = ${address || ""},
        balance = ${Number(balance || 0)},
        status = ${status || "active"}
      OUTPUT INSERTED.*
      WHERE id = ${Number(id)}
    `;

    res.json({
      success: true,
      message: "Customer updated ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// DELETE CUSTOMER
router.delete("/customer/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await sql.query`
      DELETE FROM customers
      WHERE id = ${Number(id)}
    `;

    res.json({
      success: true,
      message: "Customer deleted ✅",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// POST CUSTOMER PAYMENT
// POST CUSTOMER PAYMENT
router.post("/customer-payment", async (req, res) => {
  try {
    const {
      customer_id,
      account_id,
      amount,
      payment_method,
      reference_no,
      note,
      cashier,
    } = req.body;

    if (!customer_id || !account_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "Customer, account and amount are required",
      });
    }

    const safeAmount = Number(amount);

    const payment = await sql.query`
      INSERT INTO customer_payments
      (
        customer_id,
        account_id,
        amount,
        payment_method,
        reference_no,
        note,
        cashier
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${Number(customer_id)},
        ${Number(account_id)},
        ${safeAmount},
        ${payment_method || "Cash"},
        ${reference_no || ""},
        ${note || ""},
        ${cashier || ""}
      )
    `;

    await sql.query`
      UPDATE customers
      SET balance = ISNULL(balance, 0) - ${safeAmount}
      WHERE id = ${Number(customer_id)}
    `;

 
// 3️⃣ UPDATE CASH ACCOUNT BALANCE
await sql.query`
  UPDATE Accounts
  SET balance = ISNULL(balance, 0) + ${safeAmount}
  WHERE accountCode = 'CASH'
`;

// 4️⃣ GET CASH ACCOUNT ID
const cashAccount = await sql.query`
  SELECT TOP 1 id
  FROM Accounts
  WHERE accountCode = 'CASH'
`;

const cashAccountId = cashAccount.recordset[0]?.id;

// 5️⃣ INSERT ACCOUNT LEDGER
await sql.query`
  INSERT INTO AccountLedger
  (
    accountId,
    transactionType,
    amount,
    sourceType,
    sourceId,
    referenceNumber,
    description,
    username
  )
  VALUES
  (
    ${cashAccountId},
    'IN',
    ${safeAmount},
    'CUSTOMER_PAYMENT',
    ${payment.recordset[0].id},
    ${reference_no || `RCP-${payment.recordset[0].id}`},
    ${`Customer payment RCP-${payment.recordset[0].id}`},
    ${cashier || "admin"}
  )
`;
    return res.status(201).json({
      success: true,
      message: "Payment saved and account updated ✅",
      data: payment.recordset[0],
    });
  } catch (err) {
    console.error("PAYMENT ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/payment-history", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        l.*,
        a.accountName
      FROM AccountLedger l
      LEFT JOIN Accounts a ON l.accountId = a.id
      WHERE l.sourceType = 'CUSTOMER_PAYMENT'
      ORDER BY l.id DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/payment-sumary", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        l.id,
        l.accountId,
        l.transactionType,
        l.amount,
        l.sourceType,
        l.sourceId,
        l.referenceNumber,
        l.description,
        l.username,
        l.createdAt,
        a.accountName,
        c.name AS customerName
      FROM AccountLedger l
      LEFT JOIN Accounts a ON l.accountId = a.id
      LEFT JOIN customer_payments p ON l.sourceId = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE l.sourceType = 'CUSTOMER_PAYMENT'
      ORDER BY l.id DESC
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/customer-payment-groups", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        c.id AS customerId,
        c.name AS customerName,
        'TRX-' + CAST(c.id AS NVARCHAR) AS trxRef,
        SUM(l.amount) AS totalPaid,
        COUNT(l.id) AS paymentCount,
        MAX(l.createdAt) AS lastPaymentDate
      FROM AccountLedger l
      INNER JOIN customer_payments p ON l.sourceId = p.id
      INNER JOIN customers c ON p.customer_id = c.id
      WHERE l.sourceType = 'CUSTOMER_PAYMENT'
      GROUP BY c.id, c.name
      ORDER BY MAX(l.createdAt) DESC
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/customer-payment-lines/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await sql.query`
      SELECT
        l.id,
        l.referenceNumber,
        l.amount,
        l.description,
        l.username,
        l.createdAt,
        a.accountName,
        c.id AS customerId,
        c.name AS customerName
      FROM AccountLedger l
      INNER JOIN customer_payments p ON l.sourceId = p.id
      INNER JOIN customers c ON p.customer_id = c.id
      LEFT JOIN Accounts a ON l.accountId = a.id
      WHERE l.sourceType = 'CUSTOMER_PAYMENT'
      AND c.id = ${Number(customerId)}
      ORDER BY l.createdAt ASC
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// GET ACCOUNTS
router.get("/accounts", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT id, name, type, balance
      FROM accounts
      WHERE type IN ('Cash', 'Bank', 'CASH', 'BANK')
      ORDER BY name
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/customer-payment-history/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await sql.query`
      SELECT
        l.id,
        l.transactionType,
        l.amount,
        l.referenceNumber,
        l.description,
        l.username,
        l.createdAt,
        a.accountName,
        c.name AS customerName
      FROM AccountLedger l
      INNER JOIN customer_payments p ON l.sourceId = p.id
      INNER JOIN customers c ON p.customer_id = c.id
      LEFT JOIN Accounts a ON l.accountId = a.id
      WHERE l.sourceType = 'CUSTOMER_PAYMENT'
      AND c.id = ${Number(customerId)}
      ORDER BY l.id DESC
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// POST CUSTOMER PAYMENT
router.post("/customer-payment", async (req, res) => {
  try {
    const {
      customer_id,
      account_id,
      amount,
      payment_method,
      reference_no,
      note,
      cashier,
    } = req.body;

    if (!customer_id || !account_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "Customer, account and amount are required",
      });
    }

    const safeAmount = Number(amount);

    const payment = await sql.query`
      INSERT INTO customer_payments
      (
        customer_id,
        account_id,
        amount,
        payment_method,
        reference_no,
        note,
        cashier
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${Number(customer_id)},
        ${Number(account_id)},
        ${safeAmount},
        ${payment_method || "Cash"},
        ${reference_no || ""},
        ${note || ""},
        ${cashier || ""}
      )
    `;

    await sql.query`
      UPDATE customers
      SET balance = ISNULL(balance, 0) - ${safeAmount}
      WHERE id = ${Number(customer_id)}
    `;

    await sql.query`
      UPDATE accounts
      SET balance = ISNULL(balance, 0) + ${safeAmount}
      WHERE id = ${Number(account_id)}
    `;

    res.status(201).json({
      success: true,
      message: "Payment saved and account updated ✅",
      data: payment.recordset[0],
    });
  } catch (err) {
    console.error("PAYMENT ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
export default router;