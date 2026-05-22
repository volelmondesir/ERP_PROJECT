import express from "express";
import sql from "../db.js";

const router = express.Router();

// GENERATE BINS 000-999
router.post("/bins/generate", async (req, res) => {
  try {
    let created = 0;
    let skipped = 0;

    for (let i = 0; i <= 999; i++) {
      const code = String(i).padStart(3, "0");

      const exists = await sql.query`
        SELECT id FROM Bins WHERE binCode = ${code}
      `;

      if (exists.recordset.length > 0) {
        skipped++;
        continue;
      }

      await sql.query`
        INSERT INTO Bins (binCode, binName)
        VALUES (${code}, ${"BIN " + code})
      `;

      created++;
    }

    res.json({
      success: true,
      message: `Bins generated ✅ Created: ${created}, Skipped: ${skipped}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET BINS
router.get("/bins", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM Bins
      ORDER BY binCode
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ASSIGN ITEM TO BIN
router.post("/item-bin", async (req, res) => {
  try {
    const { itemId, itemName, binId, binCode, qty } = req.body;

    if (!itemId || !binId || Number(qty || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Item, bin, and qty required",
      });
    }

    const result = await sql.query`
      INSERT INTO ItemBins
      (
        itemId,
        itemName,
        binId,
        binCode,
        qty
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${Number(itemId)},
        ${itemName || ""},
        ${Number(binId)},
        ${binCode || ""},
        ${Number(qty)}
      )
    `;

    res.json({
      success: true,
      message: "Item assigned to bin ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.log("ITEM BIN ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// GET ITEM BIN ASSIGNMENTS
router.get("/item-bins", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM ItemBins
      ORDER BY id DESC
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// TRANSFER ITEM TO ANOTHER BIN
router.post("/bin-transfer", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      itemId,
      itemName,
      fromBinId,
      fromBinCode,
      toBinId,
      toBinCode,
      qty,
      createdBy = "Admin",
    } = req.body;

    const amount = Number(qty || 0);

    if (!itemId || !fromBinId || !toBinId || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Item, from bin, to bin, and qty required",
      });
    }

    if (Number(fromBinId) === Number(toBinId)) {
      return res.status(400).json({
        success: false,
        message: "From bin and To bin cannot be the same",
      });
    }

    await transaction.begin();

    const stock = await new sql.Request(transaction)
      .input("itemId", sql.Int, Number(itemId))
      .input("fromBinId", sql.Int, Number(fromBinId))
      .query(`
        SELECT ISNULL(SUM(qty), 0) AS availableQty
        FROM ItemBins
        WHERE itemId = @itemId AND binId = @fromBinId
      `);

    const availableQty = Number(stock.recordset[0].availableQty || 0);

    if (availableQty < amount) {
      throw new Error("Not enough quantity in source bin");
    }

    await new sql.Request(transaction)
      .input("itemId", sql.Int, Number(itemId))
      .input("itemName", sql.NVarChar, itemName || "")
      .input("binId", sql.Int, Number(fromBinId))
      .input("binCode", sql.NVarChar, fromBinCode || "")
      .input("qty", sql.Decimal(18, 2), -amount)
      .query(`
        INSERT INTO ItemBins (itemId, itemName, binId, binCode, qty)
        VALUES (@itemId, @itemName, @binId, @binCode, @qty)
      `);

    await new sql.Request(transaction)
      .input("itemId", sql.Int, Number(itemId))
      .input("itemName", sql.NVarChar, itemName || "")
      .input("binId", sql.Int, Number(toBinId))
      .input("binCode", sql.NVarChar, toBinCode || "")
      .input("qty", sql.Decimal(18, 2), amount)
      .query(`
        INSERT INTO ItemBins (itemId, itemName, binId, binCode, qty)
        VALUES (@itemId, @itemName, @binId, @binCode, @qty)
      `);

// ========================
// UPDATE FROM BIN
// ========================

await new sql.Request(transaction)
  .input("itemName", sql.NVarChar, itemName)
  .input("binCode", sql.NVarChar, fromBinCode)
  .input("qty", sql.Decimal(18, 2), amount)
  .query(`
    UPDATE Stock
    SET qty = qty - @qty
    WHERE
      itemName = @itemName
      AND binCode = @binCode
  `);

// ========================
// UPDATE TO BIN
// ========================

await new sql.Request(transaction)
  .input("itemName", sql.NVarChar, itemName)
  .input("binCode", sql.NVarChar, toBinCode)
  .input("qty", sql.Decimal(18, 2), amount)
  .query(`
    UPDATE Stock
    SET qty = qty + @qty
    WHERE
      itemName = @itemName
      AND binCode = @binCode
  `);
      
  
    await transaction.commit();

    res.json({
      success: true,
      message: "Item transferred ✅",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ✅ UPDATE STOCK
router.put("/stock/update2", async (req, res) => {

  try {

    const {
      itemName,
      qty,
      date,
      time,
      binCode
    } = req.body;

    // ✅ CHECK IF ITEM EXISTS
    const existing = await new sql.Request()
      .input("itemName", sql.NVarChar, itemName)
      .input("binCode", sql.NVarChar, binCode)
      .query(`
        SELECT id, qty
        FROM Stock
        WHERE
          itemName = @itemName
          AND binCode = @binCode
      `);

    // ✅ IF EXISTS = UPDATE
    if (existing.recordset.length > 0) {

      await new sql.Request()
        .input("itemName", sql.NVarChar, itemName)
        .input("binCode", sql.NVarChar, binCode)
        .input("qty", sql.Decimal(18,2), qty)
        .input("date", sql.Date, date)
        .input("time", sql.NVarChar, time)
        .query(`
          UPDATE Stock
          SET
            qty = qty + @qty,
            [date] = @date,
            [time] = @time
          WHERE
            itemName = @itemName
            AND binCode = @binCode
        `);

    } else {

      // ✅ IF NOT EXISTS = INSERT
      await new sql.Request()
        .input("itemName", sql.NVarChar, itemName)
        .input("binCode", sql.NVarChar, binCode)
        .input("qty", sql.Decimal(18,2), qty)
        .input("date", sql.Date, date)
        .input("time", sql.NVarChar, time)
        .query(`
          INSERT INTO Stock
          (
            itemName,
            binCode,
            qty,
            [date],
            [time]
          )
          VALUES
          (
            @itemName,
            @binCode,
            @qty,
            @date,
            @time
          )
        `);

    }

    res.json({
      success: true,
      message: "Stock updated ✅"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// TRANSFER ITEM TO ANOTHER BIN
router.post("/bin-transfer2", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      itemId,
      itemName,
      fromBinId,
      fromBinCode,
      toBinId,
      toBinCode,
      qty,
      createdBy = "Admin",
    } = req.body;
const now = new Date();

const nowDate =
  now.getMonth() + 1 +
  "/" +
  now.getDate() +
  "/" +
  now.getFullYear();

const nowTime = now.toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
});
    const amount = Number(qty || 0);

    if (
      !itemName ||
      !fromBinCode ||
      !toBinCode ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing transfer data",
      });
    }

    if (fromBinCode === toBinCode) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer to same bin",
      });
    }

    await transaction.begin();

    // CHECK SOURCE STOCK
    const checkStock = await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("fromBinCode", sql.NVarChar, fromBinCode)
      .query(`
        SELECT qty
        FROM Stock
        WHERE itemName = @itemName
        AND binCode = @fromBinCode
      `);

    if (checkStock.recordset.length === 0) {
      throw new Error("Source bin stock not found");
    }

    const availableQty = Number(
      checkStock.recordset[0].qty || 0
    );

    if (availableQty < amount) {
      throw new Error("Not enough quantity");
    }

    // MINUS FROM SOURCE BIN
    await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("fromBinCode", sql.NVarChar, fromBinCode)
      .input("qty", sql.Decimal(18, 2), amount)
      .input("date", sql.NVarChar, nowDate)
      .input("time", sql.NVarChar, nowTime)
      
      .query(`
        UPDATE Stock
        SET qty = qty - @qty,
        [date] = @date,
        [time] = @time
        WHERE
          itemName = @itemName
          AND binCode = @fromBinCode
      `);

    // CHECK DESTINATION BIN
    const checkDestination = await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("toBinCode", sql.NVarChar, toBinCode)
      .query(`
        SELECT id
        FROM Stock
        WHERE
          itemName = @itemName
          AND binCode = @toBinCode
      `);

    // IF EXISTS => UPDATE
    if (checkDestination.recordset.length > 0) {
      await new sql.Request(transaction)
        .input("itemName", sql.NVarChar, itemName)
        .input("toBinCode", sql.NVarChar, toBinCode)
        .input("qty", sql.Decimal(18, 2), amount)
          .input("date", sql.NVarChar, nowDate)
      .input("time", sql.NVarChar, nowTime)
        .query(`
          UPDATE Stock
          SET qty = qty + @qty ,
        [date] = @date,
        [time] = @time
          WHERE
            itemName = @itemName
            AND binCode = @toBinCode
        `);
    } else {
      // IF NOT EXISTS => INSERT
      await new sql.Request(transaction)
        .input("itemName", sql.NVarChar, itemName)
        .input("toBinCode", sql.NVarChar, toBinCode)
        .input("qty", sql.Decimal(18, 2), amount)
           .input("date", sql.NVarChar, nowDate)
      .input("time", sql.NVarChar, nowTime)
       .query(`
      INSERT INTO Stock
      (
        itemName,
        binCode,
        qty,
        [date],
        [time]
      )
      VALUES
      (
        @itemName,
        @toBinCode,
        @qty,
        @date,
        @time
      )

    `);
    }

    // SAVE TRANSFER HISTORY
    await new sql.Request(transaction)
      .input("itemId", sql.Int, Number(itemId))
      .input("itemName", sql.NVarChar, itemName)
      .input("fromBinId", sql.Int, Number(fromBinId))
      .input("fromBinCode", sql.NVarChar, fromBinCode)
      .input("toBinId", sql.Int, Number(toBinId))
      .input("toBinCode", sql.NVarChar, toBinCode)
      .input("qty", sql.Decimal(18, 2), amount)
      .input("createdBy", sql.NVarChar, createdBy)
      .query(`
        INSERT INTO BinTransfers
        (
          itemId,
          itemName,
          fromBinId,
          fromBinCode,
          toBinId,
          toBinCode,
          qty,
          createdBy
        )
        VALUES
        (
          @itemId,
          @itemName,
          @fromBinId,
          @fromBinCode,
          @toBinId,
          @toBinCode,
          @qty,
          @createdBy
        )
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: "Bin transfer completed ✅",
    });

  } catch (err) {

    try {
      await transaction.rollback();
    } catch {}

    console.log("BIN TRANSFER ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// UPDATE ITEM + BIN STOCK
router.post("/update-bin-stock", async (req, res) => {
  const transaction = new sql.Transaction();

  try {

    const {
      itemName,
      binCode,
      qty
    } = req.body;

    const amount = Number(qty || 0);

    if (!itemName || !binCode || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Item, bin and qty required",
      });
    }

    const now = new Date();

    const nowDate =
      now.getMonth() + 1 +
      "/" +
      now.getDate() +
      "/" +
      now.getFullYear();

    const nowTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    await transaction.begin();

    // UPDATE GLOBAL ITEM STOCK
    await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("qty", sql.Decimal(18,2), amount)
      .query(`
        UPDATE Item
        SET qty = qty + @qty
        WHERE itemName = @itemName
      `);

    // CHECK IF BIN STOCK EXISTS
    const existing = await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("binCode", sql.NVarChar, binCode)
      .query(`
        SELECT id
        FROM Stock
        WHERE
          itemName = @itemName
          AND binCode = @binCode
      `);

    // UPDATE EXISTING BIN
    if (existing.recordset.length > 0) {

      await new sql.Request(transaction)
        .input("itemName", sql.NVarChar, itemName)
        .input("binCode", sql.NVarChar, binCode)
        .input("qty", sql.Decimal(18,2), amount)
        .input("date", sql.NVarChar, nowDate)
        .input("time", sql.NVarChar, nowTime)
        .query(`
          UPDATE Stock
          SET
            qty = qty + @qty,
            [date] = @date,
            [time] = @time
          WHERE
            itemName = @itemName
            AND binCode = @binCode
        `);

    } else {

      // INSERT NEW BIN STOCK
      await new sql.Request(transaction)
        .input("itemName", sql.NVarChar, itemName)
        .input("binCode", sql.NVarChar, binCode)
        .input("qty", sql.Decimal(18,2), amount)
        .input("date", sql.NVarChar, nowDate)
        .input("time", sql.NVarChar, nowTime)
        .query(`
          INSERT INTO Stock
          (
            itemName,
            binCode,
            qty,
            [date],
            [time]
          )
          VALUES
          (
            @itemName,
            @binCode,
            @qty,
            @date,
            @time
          )
        `);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Bin stock updated successfully",
    });

  } catch (err) {

    try {
      await transaction.rollback();
    } catch {}

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// DELIVERY: REMOVE ITEM FROM BIN ONLY
router.post("/delivery/remove-from-bin", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      itemName,
      binCode,
      qty,
      deliveredBy = "Delivery",
    } = req.body;

    const amount = Number(qty || 0);

    if (!itemName || !binCode || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Item, bin and qty required",
      });
    }

    await transaction.begin();

    const check = await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("binCode", sql.NVarChar, binCode)
      .query(`
        SELECT TOP 1 qty
        FROM Stock
        WHERE itemName = @itemName
          AND binCode = @binCode
      `);

    if (check.recordset.length === 0) {
      throw new Error("Item not found in this bin");
    }

    const availableQty = Number(check.recordset[0].qty || 0);

    if (availableQty < amount) {
      throw new Error("Not enough qty in this bin");
    }

    await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("binCode", sql.NVarChar, binCode)
      .input("qty", sql.Decimal(18, 2), amount)
      .query(`
        UPDATE Stock
        SET qty = qty - @qty
        WHERE itemName = @itemName
          AND binCode = @binCode
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: "Bin stock updated for delivery ✅",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});// DELIVERY: REMOVE ITEM FROM BIN ONLY
router.post("/delivery/remove-from-bin", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      itemName,
      binCode,
      qty,
      deliveredBy = "Delivery",
    } = req.body;

    const amount = Number(qty || 0);

    if (!itemName || !binCode || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Item, bin and qty required",
      });
    }

    await transaction.begin();

    const check = await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("binCode", sql.NVarChar, binCode)
      .query(`
        SELECT TOP 1 qty
        FROM Stock
        WHERE itemName = @itemName
          AND binCode = @binCode
      `);

    if (check.recordset.length === 0) {
      throw new Error("Item not found in this bin");
    }

    const availableQty = Number(check.recordset[0].qty || 0);

    if (availableQty < amount) {
      throw new Error("Not enough qty in this bin");
    }

    await new sql.Request(transaction)
      .input("itemName", sql.NVarChar, itemName)
      .input("binCode", sql.NVarChar, binCode)
      .input("qty", sql.Decimal(18, 2), amount)
      .query(`
        UPDATE Stock
        SET qty = qty - @qty
        WHERE itemName = @itemName
          AND binCode = @binCode
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: "Bin stock updated for delivery ✅",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// SAVE BIN TRANSACTION HISTORY
router.post("/bin-transaction", async (req, res) => {
  try {

    const {
      binCode,
      orderNumber,
      itemName,
      qty,
      userCode = "Admin",
    } = req.body;

    if (
      !binCode ||
      !orderNumber ||
      !itemName ||
      Number(qty || 0) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Bin, order number, item and qty required",
      });
    }

    const now = new Date();

    const date =
      now.getMonth() + 1 +
      "/" +
      now.getDate() +
      "/" +
      now.getFullYear();

    const hour = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    await sql.query`
      INSERT INTO BinTransactions
      (
        binCode,
        orderNumber,
        itemName,
        qty,
        userCode,
        [date],
        [hour]
      )
      VALUES
      (
        ${binCode},
        ${orderNumber},
        ${itemName},
        ${Number(qty)},
        ${userCode},
        ${date},
        ${hour}
      )
    `;

    res.json({
      success: true,
      message: "Bin transaction saved successfully",
    });

  } catch (err) {

    console.log("BIN TRANSACTION ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;