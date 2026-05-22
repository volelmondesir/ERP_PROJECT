import express from "express";
import sql from "../db.js";

const router = express.Router();

// ================= ACTIVE FISCAL YEAR =================
const getActiveFiscalYear = async () => {
  const result = await sql.query(`
    SELECT TOP 1 *
    FROM FiscalYears
    WHERE isActive = 1
    ORDER BY id DESC
  `);

  return result.recordset[0];
};

// ================= CREATE INVOICE =================
router.post("/invoices", async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).send("orderId required");
    }

    // 🔒 CHECK EXISTING
    const existing = await sql.query`
      SELECT id, invoiceNumber
      FROM Invoices
      WHERE orderId = ${orderId}
    `;

    if (existing.recordset.length > 0) {
      return res.json(existing.recordset[0]);
    }

    // ================= GET ORDER =================
    const orderRes = await sql.query`
      SELECT *
      FROM Orders
      WHERE id = ${orderId}
    `;

    if (!orderRes.recordset.length) {
      return res.status(404).send("Order not found");
    }

    const order = orderRes.recordset[0];

    // ================= GET FISCAL YEAR =================
    const fiscal = await getActiveFiscalYear();

    if (!fiscal) {
      return res.status(400).send("No active fiscal year");
    }

    // ================= GET ORDER ITEMS =================
    const itemsRes = await sql.query`
      SELECT 
        oi.productId,
        oi.quantity,
        oi.price,
        p.name
      FROM OrderItems oi
      LEFT JOIN Products p
        ON oi.productId = p.id
      WHERE oi.orderId = ${orderId}
    `;

    const items = itemsRes.recordset;

    // ================= SUBTOTAL =================
    let subtotal = 0;

    items.forEach((item) => {
      subtotal +=
        Number(item.price) *
        Number(item.quantity);
    });

    // ================= TAX =================
    const taxRes = await sql.query(`
      SELECT TOP 1 taxRate
      FROM TaxSettings
      WHERE isActive = 1
      ORDER BY id DESC
    `);

    const taxRate =
      Number(taxRes.recordset[0]?.taxRate || 0);

    const taxAmount =
      (subtotal * taxRate) / 100;

    // ================= TOTAL =================
    const total = subtotal + taxAmount;

    // ================= INVOICE NUMBER =================
    const now = new Date();

    const datePart =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const random =
      Math.floor(1000 + Math.random() * 9000);

    const invoiceNumber =
      `IVN-${datePart}-${random}`;

    // ================= INSERT INVOICE =================
    const insertRes = await sql.query`
      INSERT INTO Invoices (
        invoiceNumber,
        orderId,
        customerName,
        subtotal,
        taxRate,
        taxAmount,
        total,
        paidAmount,
        status,
        fiscal_year_id
      )

      OUTPUT INSERTED.id

      VALUES (
        ${invoiceNumber},
        ${orderId},
        ${order.customerName},
        ${subtotal},
        ${taxRate},
        ${taxAmount},
        ${total},
        0,
        'UNPAID',
        ${fiscal.id}
      )
    `;

    const invoiceId =
      insertRes.recordset[0].id;

    // ================= SAVE INVOICE ITEMS =================
    for (const item of items) {
      await sql.query`
        INSERT INTO InvoiceItems (
          invoiceId,
          name,
          quantity,
          price
        )

        VALUES (
          ${invoiceId},
          ${item.name},
          ${item.quantity},
          ${item.price}
        )
      `;
    }

    // ================= RESPONSE =================
    res.json({
      id: invoiceId,
      invoiceNumber,
      customerName: order.customerName,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      paidAmount: 0,
      fiscalYear: fiscal.year_label
    });

  } catch (err) {
    console.error("INVOICE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// ================= GET ALL INVOICES =================
router.get("/invoices", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT
        id,
        invoiceNumber,
        customerName,
        subtotal,
        taxRate,
        taxAmount,
        total,
        paidAmount,
        status
      FROM Invoices
      ORDER BY id DESC
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error("SQL ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// ================= GET INVOICE BY ORDER =================
router.get("/invoices/by-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await sql.query`
      SELECT *
      FROM Invoices
      WHERE orderId = ${orderId}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    res.json(result.recordset[0]);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ================= GET FULL INVOICE =================
router.get("/invoice-full/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    // ================= GET INVOICE =================
    const invRes = await sql.query`
      SELECT *
      FROM Invoices
      WHERE id = ${id}
    `;

    const invoice = invRes.recordset[0];

    if (!invoice) {
      return res.status(404).send("Invoice not found");
    }

    // ================= GET ITEMS =================
    const itemsRes = await sql.query`
      SELECT
        name,
        quantity,
        price
      FROM InvoiceItems
      WHERE invoiceId = ${id}
    `;

    invoice.items =
      itemsRes.recordset || [];

    console.log("INVOICE 👉", invoice);
    console.log("ITEMS 👉", invoice.items);

    res.json(invoice);

  } catch (err) {
    console.error("INVOICE FULL ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// ================= UPDATE INVOICE =================
router.put("/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { items } = req.body;

    // ================= GET ORDER ID =================
    const invoiceRes = await sql.query`
      SELECT orderId
      FROM Invoices
      WHERE id = ${id}
    `;

    if (!invoiceRes.recordset.length) {
      return res.status(404).send("Invoice not found");
    }

    const orderId =
      invoiceRes.recordset[0].orderId;

    // ================= RECALCULATE =================
    let subtotal = 0;

    for (const item of items) {

      subtotal +=
        Number(item.price) *
        Number(item.quantity);

      // UPDATE ORDER ITEMS
      await sql.query`
        UPDATE OrderItems
        SET
          quantity = ${item.quantity},
          price = ${item.price}
        WHERE
          orderId = ${orderId}
          AND productId = ${item.productId}
      `;
    }

    // ================= TAX =================
    const taxRes = await sql.query(`
      SELECT TOP 1 *
      FROM TaxSettings
      WHERE isActive = 1
      ORDER BY id DESC
    `);

    let taxRate = 0;
    let taxAmount = 0;

    if (taxRes.recordset.length > 0) {
      taxRate =
        Number(taxRes.recordset[0].taxRate || 0);

      taxAmount =
        (subtotal * taxRate) / 100;
    }

    const total = subtotal + taxAmount;

    // ================= UPDATE INVOICE =================
    await sql.query`
      UPDATE Invoices
      SET
        subtotal = ${subtotal},
        taxRate = ${taxRate},
        taxAmount = ${taxAmount},
        total = ${total}
      WHERE id = ${id}
    `;

    // ================= DELETE OLD ITEMS =================
    await sql.query`
      DELETE FROM InvoiceItems
      WHERE invoiceId = ${id}
    `;

    // ================= INSERT NEW ITEMS =================
    for (const item of items) {
      await sql.query`
        INSERT INTO InvoiceItems (
          invoiceId,
          name,
          quantity,
          price
        )

        VALUES (
          ${id},
          ${item.name},
          ${item.quantity},
          ${item.price}
        )
      `;
    }

    res.send("Invoice updated");

  } catch (err) {
    console.error("UPDATE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

export default router;