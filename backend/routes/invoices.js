import express from "express";
import sql from "mssql";

const router = express.Router();


// =============================
// 📄 GET ALL INVOICES
// =============================
router.get("/", async (req, res) => {

  try {

    const result = await sql.query(`

      SELECT

        i.id,
        i.invoiceNumber,
        i.customerName,

        -- ✅ USER KI FE PAYMENT
        p.username AS cashier,

        i.total,
        i.status,
        i.createdAt

      FROM Invoices i

      OUTER APPLY (

        SELECT TOP 1
          username
        FROM Payments
        WHERE Payments.invoiceId = i.id
        ORDER BY Payments.id DESC

      ) p

      -- ✅ SELMAN PAID
      WHERE i.status = 'Paid'

      ORDER BY i.id DESC
    `);

    res.json(result.recordset);

  } catch (err) {

    console.error(
      "SQL ERROR 👉",
      err
    );

    res.status(500).send(
      err.message
    );
  }
});


// =============================
// 💰 GET PAID INVOICES
// =============================
router.get("/paid", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT * FROM Invoices
      WHERE ISNULL(paidAmount,0) >= ISNULL(total,0)
      ORDER BY createdAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// =============================
// 🔎 GET BY ID (NUMBER)
// =============================
router.get("/id/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await sql.query`
      SELECT * FROM Invoices WHERE id = ${id}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    res.json(result.recordset[0]);

  } catch (err) {
    res.status(500).send(err.message);
  }
});


// =============================
// 🔎 GET BY INVOICE NUMBER (STRING)
// =============================
router.get("/number/:invoiceNumber", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    const result = await sql.query`
      SELECT * FROM Invoices WHERE invoiceNumber = ${invoiceNumber}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    res.json(result.recordset[0]);

  } catch (err) {
    res.status(500).send(err.message);
  }
});


// =============================
// ➕ CREATE INVOICE
// =============================
router.post("/", async (req, res) => {
  try {
    const { orderId } = req.body;

    // CHECK EXISTING
    const existing = await sql.query`
      SELECT * FROM Invoices WHERE orderId = ${orderId}
    `;

    if (existing.recordset.length > 0) {
      return res.status(400).send("Invoice already exists");
    }

    // GET ORDER
    const orderRes = await sql.query`
      SELECT * FROM Orders WHERE id = ${orderId}
    `;

    if (orderRes.recordset.length === 0) {
      return res.status(404).send("Order not found");
    }

    const order = orderRes.recordset[0];

    // GET ITEMS
    const itemsRes = await sql.query`
      SELECT oi.quantity, oi.price, p.name
      FROM OrderItems oi
      JOIN Products p ON oi.productId = p.id
      WHERE oi.orderId = ${orderId}
    `;

    const items = itemsRes.recordset;

    // CALCULATE
    let subtotal = 0;
    items.forEach(i => subtotal += i.price * i.quantity);

    // TAX
    const taxRes = await sql.query`
      SELECT TOP 1 taxRate, isActive FROM TaxSettings ORDER BY id DESC
    `;

    let taxRate = 0;
    let taxAmount = 0;

    if (taxRes.recordset.length > 0 && taxRes.recordset[0].isActive) {
      taxRate = taxRes.recordset[0].taxRate;
      taxAmount = (subtotal * taxRate) / 100;
    }

    const total = subtotal + taxAmount;

    const invoiceNumber = "INV-" + Date.now();

    const insert = await sql.query`
      INSERT INTO Invoices (invoiceNumber, orderId, customerName, subtotal, taxAmount, total, paidAmount, status)
      OUTPUT INSERTED.id
      VALUES (${invoiceNumber}, ${orderId}, ${order.customerName}, ${subtotal}, ${taxAmount}, ${total}, 0, 'UNPAID')
    `;

    res.json({
      id: insert.recordset[0].id,
      invoiceNumber,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      paidAmount: 0,
      status: "UNPAID"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});


// =============================
// 💳 PAY INVOICE
// =============================
router.post("/pay", async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;

    const invRes = await sql.query`
      SELECT * FROM Invoices WHERE id = ${invoiceId}
    `;

    if (invRes.recordset.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    const inv = invRes.recordset[0];

    const newPaid = Number(inv.paidAmount || 0) + Number(amount);
    const total = Number(inv.total);

    let status = "UNPAID";
    if (newPaid >= total) status = "PAID";
    else if (newPaid > 0) status = "PARTIAL";

    await sql.query`
      UPDATE Invoices
      SET paidAmount = ${newPaid},
          status = ${status}
      WHERE id = ${invoiceId}
    `;

    res.json({
      paidAmount: newPaid,
      status,
      change: Math.max(newPaid - total, 0)
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
});


router.get("/ap-inv", async (req, res) => {
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
    console.log("LOAD AP INVOICE ERROR 👉", err);
    res.status(500).json({
      message: "Failed to load AP invoices",
      error: err.message,
    });
  }
});

router.get("/:id/items", async (req, res) => {
  try {

    const { id } = req.params;

    const result = await sql.query(`
      SELECT
        id,
        invoiceId,
        name,
        quantity,
        unit,
        price,
        note
      FROM SupplierInvoiceItems
      WHERE invoiceId = ${id}
    `);

    res.json(result.recordset);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Failed to load invoice items"
    });
  }
});router.get("/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const result = await sql.query(`
      SELECT
          si.id,
          si.invoiceNumber,
          si.supplier,
          si.total,
          si.paidAmount,
          si.status,
          si.createdAt,

          sii.name,
          sii.quantity,
          sii.unit,
          sii.price,
          sii.note

      FROM SupplierInvoices si

      LEFT JOIN SupplierInvoiceItems sii
      ON si.id = sii.invoiceId

      WHERE si.id = ${id}
    `);

    res.json(result.recordset);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Failed to load invoice preview"
    });

  }

});
router.get("/ap-inv/:id", async (req, res) => {
  try {

    const { id } = req.params;

    // HEADER
    const invoice = await sql.query(`
      SELECT
        si.id,
        si.invoiceNumber,
        po.poNumber,
        si.supplier,
        si.total,
        si.paidAmount,
        si.status,
        si.createdAt
      FROM SupplierInvoices si
      LEFT JOIN PurchaseOrders po
        ON po.id = si.poId
      WHERE si.id = ${id}
    `);

    // ITEMS
const items = await sql.query(`
  SELECT
    invoiceId,
    name,
    quantity,
    unit,
    price,
    note
  FROM ERP_DB.dbo.SupplierInvoiceItems
  WHERE invoiceId = ${id}
`);

    res.json({
      invoice: invoice.recordset[0],
      items: items.recordset,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Failed"
    });
  }
});

export default router;