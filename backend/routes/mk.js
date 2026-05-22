// routes/mk.js

import express from "express";
import sql from "../db.js";

const router = express.Router();


// 💲 UPDATE ITEM PRICE
router.post("/update-price", async (req, res) => {
  try {
    const { itemName, price } = req.body;

    if (!itemName || price <= 0) {
      return res.status(400).json({
        message: "Invalid data",
      });
    }

    const oldResult = await sql.query`
      SELECT TOP 1 *
      FROM ItemPrices
      WHERE itemName = ${itemName}
      ORDER BY id DESC
    `;

    const oldPrice = oldResult.recordset[0]?.price || 0;

    await sql.query`
      INSERT INTO ItemPrices (itemName, price)
      VALUES (${itemName}, ${price})
    `;

    await sql.query`
      INSERT INTO PriceHistory (itemName, oldPrice, newPrice)
      VALUES (${itemName}, ${oldPrice}, ${price})
    `;

    res.json({
      message: "Price updated ✅",
    });
  } catch (err) {
    console.error("PRICE ERROR:", err);
    res.status(500).send("Save failed");
  }
});


// 📜 GET PRICE HISTORY
router.get("/price-history", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT *
      FROM PriceHistory
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading history");
  }
});


// =========================
// REPORTS LIST
// =========================
router.get("/list", async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      const today = new Date().toISOString().split("T")[0];
      startDate = today;
      endDate = today;
    }

   const result = await sql.query(`
  SELECT
    i.id,
    i.invoiceNumber,
    i.customerName,

    ISNULL(p.username, 'N/A') AS cashier,

    ISNULL(p.receiptNumber, '-') AS receiptNumber,

    i.total,
    i.status,
    i.createdAt

  FROM Invoices i

  OUTER APPLY (
    SELECT TOP 1
      username,
      receiptNumber
    FROM Payments
    WHERE Payments.invoiceId = i.id
    ORDER BY Payments.id DESC
  ) p

  WHERE i.total > 0
    AND i.paidAmount >= i.total
    AND i.createdAt >= '${startDate} 00:00:00'
    AND i.createdAt <= '${endDate} 23:59:59'

  ORDER BY i.id DESC
`);

    res.json(result.recordset);
  } catch (err) {
    console.log("LIST ERROR:", err);
    res.status(500).send(err.message);
  }
});


// =========================
// REPORT SUMMARY
// =========================
router.get("/summary", async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      const today = new Date().toISOString().split("T")[0];
      startDate = today;
      endDate = today;
    }

    const totalSalesResult = await sql.query(`
      SELECT
        ISNULL(SUM(i.total), 0) AS totalSales
      FROM Invoices i
      WHERE i.total > 0
        AND i.paidAmount >= i.total
        AND i.createdAt >= '${startDate} 00:00:00'
        AND i.createdAt <= '${endDate} 23:59:59'
    `);

    const paidResult = await sql.query(`
      SELECT
        COUNT(*) AS paidInvoices
      FROM Invoices i
      WHERE i.total > 0
        AND i.paidAmount >= i.total
        AND i.createdAt >= '${startDate} 00:00:00'
        AND i.createdAt <= '${endDate} 23:59:59'
    `);

    const unpaidResult = await sql.query(`
  SELECT
    COUNT(*) AS unpaidInvoices
  FROM Invoices i
  WHERE (
      i.paidAmount < i.total
      OR (i.total = 0 AND i.paidAmount = 0)
    )
    AND i.createdAt >= '${startDate} 00:00:00'
    AND i.createdAt <= '${endDate} 23:59:59'
`);

    const ordersResult = await sql.query(`
      SELECT
        COUNT(*) AS totalOrders
      FROM Orders o
      WHERE o.createdAt >= '${startDate} 00:00:00'
        AND o.createdAt <= '${endDate} 23:59:59'
    `);

    res.json({
      totalSales: totalSalesResult.recordset[0].totalSales,
      paidInvoices: paidResult.recordset[0].paidInvoices,
      unpaidInvoices: unpaidResult.recordset[0].unpaidInvoices,
      totalOrders: ordersResult.recordset[0].totalOrders,
    });
  } catch (err) {
    console.log("SUMMARY ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});


// =========================
// SALES BY CASHIER
// =========================
router.get("/cashiers", async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      const today = new Date().toISOString().split("T")[0];
      startDate = today;
      endDate = today;
    }

    const result = await sql.query(`
      SELECT
        p.username AS cashier,
        SUM(i.total) AS totalSales
      FROM Payments p
      INNER JOIN Invoices i
        ON p.invoiceId = i.id
      WHERE i.total > 0
        AND i.paidAmount >= i.total
        AND i.createdAt >= '${startDate} 00:00:00'
        AND i.createdAt <= '${endDate} 23:59:59'
      GROUP BY p.username
      ORDER BY totalSales DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log("CASHIERS ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});
router.get("/items", async (req, res) => {
  try {

    const result = await sql.query(`
      SELECT
        i.id,
        i.itemName,
        i.itemCode,
        i.barcode,
        i.qty,
        i.createdDate,

        ISNULL(p.price, 0) AS price

      FROM Items i

      LEFT JOIN (
        SELECT
          itemName,
          price,
          ROW_NUMBER() OVER (
            PARTITION BY itemName
            ORDER BY createdAt DESC
          ) AS rn
        FROM ItemPrices
      ) p
      ON i.itemName = p.itemName
      AND p.rn = 1

      ORDER BY i.id DESC
    `);

    res.json(result.recordset);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Failed to load items"
    });
  }
});

export default router;