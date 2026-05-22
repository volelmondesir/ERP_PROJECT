// routes/ic.js

import express from "express";
import sql from "../db.js";

const router = express.Router();


// ✅ SAVE IC TO STOCK
// ✅ SAVE / UPDATE STOCK
// ✅ SAVE / UPDATE STOCK
// UPDATE STOCK
router.post("/ic", async (req, res) => {
  try {
    const { itemName, qty, date, time, binCode } = req.body;

    if (!itemName || Number(qty || 0) <= 0) {
      return res.status(400).json({
        message: "Item and qty required",
      });
    }

    const result = await sql.query`
      INSERT INTO Stock
      (
        itemName,
        qty,
        date,
        time,
        binCode
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${itemName},
        ${Number(qty)},
        ${date},
        ${time},
        ${binCode || ""}
      )
    `;

    res.json({
      success: true,
      message: "Stock updated ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.log("UPDATE STOCK ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }

});
// GET INVENTORY STOCK LEVEL
router.get("/inventory/stock-level", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT 
        itemName,
        SUM(qty) AS quantity,
        MAX(createdDate) AS lastUpdate
      FROM items
      GROUP BY itemName
      ORDER BY itemName
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
    router.get("/stock", async (req, res) => {

  try {

    const result = await sql.query(`
      SELECT *
      FROM Stock
      ORDER BY time DESC
    `);

    res.json(result.recordset);

  } catch (err) {

    console.error("GET STOCK ERROR:", err);

    res.status(500).send("Error loading stock");
  }
});
 router.get("/items", async (req, res) => {

  try {

    const result = await sql.query(`
      SELECT *
      FROM items
      
    `);

    res.json(result.recordset);

  } catch (err) {

    console.error("GET STOCK ERROR:", err);

    res.status(500).send("Error loading stock");
  }
});
    
router.get("/items-with-stock", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        i.id,
        i.itemName,
        ISNULL(SUM(i.qty), 0) AS qtyOnHand
       FROM [ERP_DB].[dbo].[Items] i
      LEFT JOIN [ERP_DB].[dbo].[Stock] s
        ON LTRIM(RTRIM(s.itemName)) = LTRIM(RTRIM(i.itemName))
      GROUP BY
        i.id,
        i.itemName
      ORDER BY i.itemName
    `;

   res.json(result.recordset); 
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ✅ GET STOCK
router.get("/stock", async (req, res) => {

  try {

    const result = await sql.query(`
      SELECT *
      FROM Stock
      ORDER BY id DESC
    `);

    res.json(result.recordset);

  } catch (err) {

    console.error("GET STOCK ERROR:", err);

    res.status(500).send("Error loading stock");
  }
});
// ✅ UPDATE STOCK
router.put("/stock-update", async (req, res) => {

  try {

    const {
      itemName,
      qty,
      date,
      time,
      binCode
    } = req.body;
  console.log("PUT ROUTE WORKING ✅");
  console.log(req.body);
    // CHECK EXISTING
    const existing = await sql.query`
      SELECT TOP 1 *
      FROM Stock
      WHERE
        itemName = ${itemName}
        AND binCode = ${binCode}
    `;

    // EXISTS
    if (existing.recordset.length > 0) {

      const currentQty =
        Number(existing.recordset[0].qty);
const cleanBin =
  String(binCode)
    .split(" - ")[0]
    .trim();
      const newQty =
        currentQty + Number(qty);

      await sql.query`
        UPDATE Stock
        SET
          qty = ${newQty},
          [date] = ${date},
          [time] = ${time},
          updatedAt = GETDATE()
        WHERE
          itemName = ${itemName}
          AND binCode = ${cleanBin}
      `;

    } else {

      // INSERT NEW
      await sql.query`
        INSERT INTO Stock
        (
          itemName,
          qty,
          [date],
          [time],
          binCode
        )
        VALUES
        (
          ${itemName},
          ${qty},
          ${date},
          ${time},
          ${binCode}
        )
      `;
    }

    // RETURN UPDATED STOCK
    const stock = await sql.query`
      SELECT *
      FROM Stock
      ORDER BY id DESC
    `;

    res.json({
      success: true,
      message: "Stock updated ✅",
      data: stock.recordset
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ✅ UPDATE ITEM QTY
router.put("/items/:id/qty", async (req, res) => {
  try {

    const { id } = req.params;
    const { qty } = req.body;

    console.log("UPDATE QTY:", id, qty);

    await sql.query`
      UPDATE Items
      SET qty = ${Number(qty)}
      WHERE id = ${id}
    `;

    res.json({
      message: "Qty updated ✅"
    });

  } catch (err) {

    console.log("UPDATE QTY ERROR 👉", err);

    res.status(500).json({
      message: "Update failed"
    });
  }
});
// GET ITEMS FROM STOCK
router.get("/inventory/items", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT DISTINCT itemName
      FROM Stock
      ORDER BY itemName
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// SAVE INVENTORY FICHE
router.post("/inventory/fiche", async (req, res) => {
  try {
    const { itemName, qty, note, ficheDate } = req.body;

    if (!itemName || !qty || !ficheDate) {
      return res.status(400).json({
        success: false,
        message: "Item, qty and date required",
      });
    }

    const result = await sql.query`
      INSERT INTO InventoryFiche
      (
        itemName,
        qty,
        note,
        ficheDate
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${itemName},
        ${Number(qty)},
        ${note || ""},
        ${ficheDate}
      )
    `;

    res.status(201).json({
      success: true,
      message: "Inventory fiche saved ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

//GET INVENTORY GROUPS BY DATE
// GET INVENTORY GROUPS BY FICHE DATE
router.get("/inventory/groups", async (req, res) => {
  try {
    const result = await sql.query(`
     SELECT
        CONVERT(VARCHAR(10), CAST(ficheDate AS DATETIME), 23) AS inventoryDate,
        'INV-' + REPLACE(CONVERT(VARCHAR(10), CAST(ficheDate AS DATETIME), 23), '-', '') AS trxRef,
        COUNT(*) AS itemCount,
        SUM(qty) AS totalQty,
        MAX(createdAt) AS lastCreatedAt
      FROM InventoryFiche
      GROUP BY CAST(ficheDate AS DATETIME)
      ORDER BY CAST(ficheDate AS DATETIME) DESC
    `);

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    console.error("INVENTORY GROUP ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// GET INVENTORY LINES FOR ONE FICHE DATE
router.get("/inventory/groups/:date", async (req, res) => {
  try {
    const { date } = req.params;

    const result = await sql.query`
      SELECT
        id,
        itemName,
        qty,
        note,
        ficheDate,
        createdAt
      FROM InventoryFiche
      WHERE CAST(ficheDate AS DATETIME) = ${date}
      ORDER BY itemName
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    console.error("INVENTORY LINES ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
router.get("/items-price", async (req, res) => {
  try {
    const result = await sql.query(`
    SELECT
    i.id,
    i.itemName,
    i.itemCode,
    i.barcode,
    i.qty,
    i.createdDate,

    ISNULL(
        lastPrice.newPrice,
        ISNULL(basePrice.price, 0)
    ) AS price

FROM Items i

OUTER APPLY (
    SELECT TOP 1
        ip.price
    FROM ItemPrices ip
    WHERE ip.itemName = i.itemName
    ORDER BY ip.createdAt DESC, ip.id DESC
) basePrice

OUTER APPLY (
    SELECT TOP 1
        ph.newPrice
    FROM PriceHistory ph
    WHERE ph.itemName = i.itemName
    ORDER BY ph.changedAt DESC, ph.id DESC
) lastPrice

ORDER BY i.id DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log("LOAD ITEMS ERROR 👉", err);
    res.status(500).json({ message: "Failed to load items" });
  }
});

export default router;