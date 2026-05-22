import express from "express";
import sql from "../db.js";

const router = express.Router();

// ✅ DASHBOARD
router.get("/dashboard", async (req, res) => {
  try {
    const result = await sql.query(`
SELECT
  ISNULL((
    SELECT SUM(amount)
    FROM Payments
  ), 0) AS totalSales,

  ISNULL((
    SELECT SUM(i.total - i.paidAmount)
    FROM Invoices i
    WHERE i.total > i.paidAmount
  ), 0) AS unpaid,

  (
    SELECT COUNT(*)
    FROM Deliveries
    WHERE status = 'Pending'
  ) AS pendingDeliveries,

  (
    SELECT COUNT(*)
    FROM Deliveries
    WHERE status = 'Ready'
  ) AS readyDeliveries,

  (
    SELECT COUNT(*)
    FROM Deliveries
    WHERE status = 'Delivered'
  ) AS delivered

    `);

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ TOP PRODUCTS
router.get("/top-products", async (req, res) => {
  try {
    const result = await sql.query(`
    SELECT TOP 5  oi.productName,
        SUM(oi.quantity) as totalSold
      FROM OrderItems oi
      
      GROUP BY oi.productName
      ORDER BY totalSold DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✅ STOCK LEVELS

// ✅ STOCK LEVELS
router.get("/stock-levels", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT 
        DB_NAME() AS databaseName,
        COUNT(*) AS totalProducts
      FROM STOCK
    `);

    console.log("DB CHECK 👉", result.recordset);

    const stock = await sql.query(`
        SELECT TOP 10
        itemName AS itemName,
        ISNULL(qty, 0) AS qty
      FROM STOCK
      ORDER BY qty ASC
    `);

    console.log("STOCK 👉", stock.recordset);

    res.json(stock.recordset);
  } catch (err) {
    console.error("STOCK ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});
export default router;