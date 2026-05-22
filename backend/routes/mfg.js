import express from "express";
import sql from "../db.js";
import { io } from "../server.js";
const router = express.Router();
import bwipjs from "bwip-js";
// 📊 DASHBOARD
router.get("/production/dashboard", async (req, res) => {
  try {

    const stats = await sql.query(`
      SELECT
        ISNULL(SUM(qtyProduced), 0) AS totalProduced,
        ISNULL(AVG(CAST(qtyProduced AS FLOAT)), 0) AS avgDaily
      FROM Production
    `);

    const today = await sql.query(`
      SELECT
        ISNULL(SUM(qtyProduced), 0) AS todayProduced
      FROM Production
      WHERE [date] >= DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()), 0)
      AND [date] < DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()) + 1, 0)
    `);

    const data = await sql.query(`
      SELECT
        productionCode,
        machineStart,
        [date],
        qtyProduced
      FROM Production
      ORDER BY [id] DESC
    `);

    res.json({
      totalProduced: stats.recordset[0].totalProduced,
      todayProduced: today.recordset[0].todayProduced,
      avgDaily: Math.round(stats.recordset[0].avgDaily),
      productionData: data.recordset
    });

  } catch (err) {

    console.log(err);

    res.status(500).send("Dashboard error");
  }
});

// 📄 PRODUCTION DETAILS
router.get("/production/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const result = await sql.query`
      SELECT
        productionCode,
        machineStart,
        [date],
        qtyProduced
      FROM Production
      WHERE productionCode = ${code}
    `;

    const p = result.recordset[0];

    if (!p) {
      return res.send("No data found");
    }

    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: p.productionCode,
      scale: 3,
      height: 18,
      includetext: true,
      textxalign: "center"
    });

    const barcode =
      `data:image/png;base64,${png.toString("base64")}`;

    res.send(`
      <html>
        <body style="font-family:Arial;padding:40px 60px;color:#0f172a;">

          <div style="text-align:center;margin-bottom:25px;">
            <img
              src="http://localhost:3000/src/assets/glogo.png"
              style="width:90px;height:90px;object-fit:contain;margin-bottom:10px;"
            />

            <h1 style="margin:0;font-size:42px;">
              Production Details
            </h1>
          </div>

          <hr style="margin-bottom:25px;" />

          <div style="text-align:center;margin-bottom:25px;">
            <img src="${barcode}" style="width:120px;height:auto;" />
          </div>

          <p style="font-size:22px;"><b>Code:</b> ${p.productionCode}</p>
          <p style="font-size:22px;"><b>Machine:</b> ${p.machineStart}</p>
          <p style="font-size:22px;"><b>Qty:</b> ${p.qtyProduced}</p>
          <p style="font-size:22px;"><b>Date:</b> ${p.date.toISOString().split("T")[0]}</p>

        </body>
      </html>
    `);

  } catch (err) {
    console.log("PRODUCTION DETAILS ERROR:", err);
    res.status(500).send("Details error");
  }
});
// ✅ CREATE PRODUCTION - SAFE
router.post("/production", async (req, res) => {
  try {
    let {
      productionCode,
      machineStart,
      qtyProduced,
      date
    } = req.body;

    productionCode = productionCode?.toString().trim();
    machineStart = Number(machineStart) || 0;
    qtyProduced = Number(qtyProduced) || 0;

    if (!productionCode) {
      return res.status(400).json({
        message: "Production code is required"
      });
    }

    const safeDate = date
      ? new Date(`${date}T12:00:00`)
      : new Date();

    if (isNaN(safeDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date"
      });
    }

    const duplicate = await sql.query`
      SELECT id
      FROM Production
      WHERE productionCode = ${productionCode}
    `;

    if (duplicate.recordset.length > 0) {
      return res.status(409).json({
        message: "This production code already exists"
      });
    }

    await sql.query`
      INSERT INTO Production (
        productionCode,
        machineStart,
        [date],
        qtyProduced
      )
      VALUES (
        ${productionCode},
        ${machineStart},
        ${safeDate},
        ${qtyProduced}
      )
    `;

   io.emit("productionUpdated");
   // io.emit("dashboardUpdated");

    return res.json({
      message: "Production saved ✅"
    });

  } catch (err) {
    console.log("CREATE PRODUCTION ERROR 👉", err);

    return res.status(500).json({
      message: "Insert failed"
    });
  }
});// ✅ FINISHED GOODS - SAFE
router.post("/finishedgoods", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    let {
      productionCode,
      qty,
      date
    } = req.body;

    productionCode = productionCode?.toString().trim();
    qty = Number(qty);

    if (!productionCode) {
      return res.status(400).json({
        message: "Production code required"
      });
    }

    if (!qty || qty <= 0) {
      return res.status(400).json({
        message: "Qty must be greater than 0"
      });
    }

    const safeDate = date
      ? new Date(`${date}T12:00:00`)
      : new Date();

    if (isNaN(safeDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date"
      });
    }

    await transaction.begin();

    const request = new sql.Request(transaction);

    request.input("productionCode", sql.VarChar, productionCode);
    request.input("qty", sql.Int, qty);
    request.input("safeDate", sql.DateTime, safeDate);

    const productionCheck = await request.query(`
      SELECT id
      FROM Production
      WHERE productionCode = @productionCode
    `);

    if (productionCheck.recordset.length === 0) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Production not found"
      });
    }

    const duplicateCheck = await request.query(`
      SELECT id
      FROM FinishedGoods
      WHERE productionCode = @productionCode
    `);

    if (duplicateCheck.recordset.length > 0) {
      await transaction.rollback();

      return res.status(409).json({
        message: "This production code was already saved in Finished Goods"
      });
    }

    await request.query(`
      INSERT INTO FinishedGoods (
        productionCode,
        qty,
        [date]
      )
      VALUES (
        @productionCode,
        @qty,
        @safeDate
      )
    `);

    await request.query(`
      UPDATE Production
      SET qtyProduced = ISNULL(qtyProduced, 0) + @qty
      WHERE productionCode = @productionCode
    `);

    await transaction.commit();

    io.emit("productionUpdated");
   // io.emit("dashboardUpdated");

    return res.json({
      message: "Finished goods saved ✅"
    });

  } catch (err) {
    console.log("FINISHED GOODS ERROR 👉", err);

    try {
      await transaction.rollback();
    } catch {}

    return res.status(500).json({
      message: "Finished goods error"
    });
  }
});

// ✅ GET ITEMS
router.get("/itemskk", async (req, res) => {
  try {

    const result = await sql.query(`
      SELECT *
      FROM Items
      ORDER BY id DESC
    `);

    res.json(result.recordset);

  } catch (err) {

    console.log("GET ITEMS ERROR 👉", err);

    res.status(500).json({
      message: "Failed to load items"
    });
  }
});

// ✅ CREATE ITEM
router.post("/items", async (req, res) => {
  try {

    const {
      itemName,
      itemCode,
      barcode
    } = req.body;

    await sql.query`
      INSERT INTO Items (
        itemName,
        itemCode,
        barcode
      )
      VALUES (
        ${itemName},
        ${itemCode},
        ${barcode}
      )
    `;

    res.json({
      message: "Item created ✅"
    });

  } catch (err) {

    console.log(err);

    res.status(500).send("Create failed");
  }
});

// ✅ UPDATE ITEM
router.put("/items/:id", async (req, res) => {
  try {

    const { id } = req.params;

    const {
      itemName,
      itemCode,
      barcode
    } = req.body;

    await sql.query`
      UPDATE Items
      SET
        itemName = ${itemName},
        itemCode = ${itemCode},
        barcode = ${barcode}
      WHERE id = ${id}
    `;

    res.json({
      message: "Item updated ✅"
    });

  } catch (err) {

    console.log(err);

    res.status(500).send("Update failed");
  }
});

// ✅ DELETE ITEM
router.delete("/items/:id", async (req, res) => {
  try {

    const { id } = req.params;

    await sql.query`
      DELETE FROM Items
      WHERE id = ${id}
    `;

    res.json({
      message: "Item deleted ✅"
    });

  } catch (err) {

    console.log(err);

    res.status(500).send("Delete failed");
  }
});
// 📊 PRODUCTION REPORT SUMMARY
// 📊 PRODUCTION REPORT SUMMARY FROM FINISHED GOODS
// 📄 PRODUCTION REPORT LIST
router.get("/production/report/list", async (req, res) => {
  try {

    let { startDate, endDate } = req.query;

    // ✅ FIX TIMEZONE
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    const result = await sql.query`
      SELECT
        fg.id,
        fg.productionCode,
        p.machineStart,
        fg.qty AS qtyProduced,
        fg.[date]
      FROM FinishedGoods fg
      LEFT JOIN Production p
        ON fg.productionCode = p.productionCode
      WHERE fg.[date] >= ${start}
      AND fg.[date] <= ${end}
      ORDER BY fg.[date] DESC, fg.id DESC
    `;

    res.json(result.recordset);

  } catch (err) {

    console.log("PRODUCTION REPORT LIST ERROR 👉", err);

    res.status(500).json({
      message: "Production report list error"
    });
  }
});// 📊 PRODUCTION REPORT SUMMARY
router.get("/production/report/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    const result = await sql.query`
      SELECT
        COUNT(*) AS totalProductions,
        ISNULL(SUM(qty), 0) AS totalQuantity,
        ISNULL(AVG(CAST(qty AS FLOAT)), 0) AS avgProduction
      FROM FinishedGoods
      WHERE [date] >= ${start}
      AND [date] <= ${end}
    `;

    const row = result.recordset[0];

    res.json({
      totalProductions: Number(row.totalProductions) || 0,
      totalQuantity: Number(row.totalQuantity) || 0,
      avgProduction: Math.round(Number(row.avgProduction) || 0),
      completedProductions: Number(row.totalProductions) || 0,
    });
  } catch (err) {
    console.log("PRODUCTION REPORT SUMMARY ERROR 👉", err);
    res.status(500).json({ message: "Production report summary error" });
  }
});
export default router;