import express from "express";
import sql from "mssql";
import { io } from "../server.js";
const router = express.Router();

/* =========================================
   GET DELIVERY DATA BY RCP / DLV / INV
   ✅ InvoiceItems columns:
      productName
      quantity
========================================= */


router.get("/deliveries/:ref", async (req, res) => {
  try {
    const ref = req.params.ref.trim();

    // =========================================
    // GET RECEIPT + INVOICE HEADER
    // =========================================

    const headerResult = await sql.query`
      SELECT
        i.id AS invoiceId,
        i.orderId,
        i.invoiceNumber,
        i.customerName,
        p.receiptNumber,
        d.deliveryNumber,
        d.status
      FROM Payments p
      JOIN Invoices i
        ON p.invoiceId = i.id
      LEFT JOIN Deliveries d
        ON d.invoiceId = i.id
      WHERE p.receiptNumber = ${ref}
    `;

    if (headerResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    const header = headerResult.recordset[0];

    // =========================================
    // GET ITEMS FROM OrderItems
    // =========================================

    const itemsResult = await sql.query`
      SELECT
        oi.productName AS itemName,
        oi.quantity AS receiptQty,

        ISNULL(bt.deliveredQty, 0) AS deliveredQty,

        oi.quantity - ISNULL(bt.deliveredQty, 0)
          AS remainingQty

      FROM OrderItems oi

      OUTER APPLY
      (
        SELECT
          ISNULL(SUM(qty), 0) AS deliveredQty
        FROM BinTransactions
        WHERE orderNumber = ${header.receiptNumber}
          AND itemName = oi.productName
      ) bt

      WHERE oi.orderId = ${header.orderId}
    `;

    // =========================================
    // RESPONSE
    // =========================================
io.emit("dashboardUpdated");
    res.json({
      success: true,

      data: itemsResult.recordset,

      header: {
        receiptNumber: header.receiptNumber,
        invoiceNumber: header.invoiceNumber,
        customerName: header.customerName,
        deliveryNumber: header.deliveryNumber,
        status: header.status || "Pending",
      },
    });

  } catch (err) {
    console.log("DELIVERY LOAD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
/* =========================================
   GET BIN TRANSACTIONS
========================================= */
router.get("/bin-transactions", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        id,
        deliveryNumber,
        orderNumber,
        itemName,
        binCode,
        qty,
        [date],
        [hour],
        userCode,
        createdAt
      FROM BinTransactions
      ORDER BY id DESC
    `;
io.emit("dashboardUpdated");
    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    console.log("LOAD BIN TRANSACTIONS ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


/* =========================================
   CONFIRM DELIVERY
   Inverse Assign Item:
   Assign = Stock.qty + qty
   Delivery = Stock.qty - qty
========================================= */
router.post("/delivery/remove-from-bin", async (req, res) => {
  const transaction = new sql.Transaction();

  try {

    const {
      deliveryNumber,
      rcpNumber,
      orderNumber,
      itemName,
      binCode,
      qty,
      userCode = "Admin",
    } = req.body;

    const receiptNumber =
      String(rcpNumber || orderNumber || "").trim();

    const cleanItemName =
      String(itemName || "").trim();

    const amount =
      Number(qty || 0);

    if (
      !receiptNumber ||
      !cleanItemName ||
      !binCode ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "RCP #, item, bin and qty required",
      });
    }

    const cleanBin =
      String(binCode)
        .split(" - ")[0]
        .trim();

    const finalDeliveryNumber =
      deliveryNumber ||
      "DLV-" +
        Math.floor(
          100000 + Math.random() * 900000
        );

    const now = new Date();

    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const hour =
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    await transaction.begin();

    // =========================
    // 1. GET INVOICE + ORDER
    // =========================

    const receiptResult =
      await new sql.Request(transaction)
        .input(
          "receiptNumber",
          sql.NVarChar,
          receiptNumber
        )
        .query(`
          SELECT
            i.id AS invoiceId,
            i.orderId,
            p.receiptNumber
          FROM Payments p
          JOIN Invoices i
            ON p.invoiceId = i.id
          WHERE
            LTRIM(RTRIM(p.receiptNumber))
            =
            LTRIM(RTRIM(@receiptNumber))
        `);

    if (
      receiptResult.recordset.length === 0
    ) {
      throw new Error("RCP not found");
    }

    const invoiceId =
      receiptResult.recordset[0].invoiceId;

    const orderId =
      receiptResult.recordset[0].orderId;

    // =========================
    // 2. GET ITEM QTY
    // =========================

    const rcpQtyResult =
      await new sql.Request(transaction)
        .input(
          "orderId",
          sql.Int,
          orderId
        )
        .input(
          "itemName",
          sql.NVarChar,
          cleanItemName
        )
        .query(`
          SELECT
            ISNULL(SUM(quantity),0)
            AS receiptQty
          FROM OrderItems
          WHERE
            orderId = @orderId
            AND
            LOWER(LTRIM(RTRIM(productName)))
            =
            LOWER(LTRIM(RTRIM(@itemName)))
        `);

    const receiptQty =
      Number(
        rcpQtyResult.recordset[0]
          .receiptQty || 0
      );

    if (receiptQty <= 0) {
      throw new Error(
        "Item not found on this RCP"
      );
    }

    // =========================
    // 3. DELIVERED QTY
    // =========================

    const deliveredResult =
      await new sql.Request(transaction)
        .input(
          "receiptNumber",
          sql.NVarChar,
          receiptNumber
        )
        .input(
          "itemName",
          sql.NVarChar,
          cleanItemName
        )
        .query(`
          SELECT
            ISNULL(SUM(qty),0)
            AS deliveredQty
          FROM BinTransactions
          WHERE
            LTRIM(RTRIM(orderNumber))
            =
            LTRIM(RTRIM(@receiptNumber))
            AND
            LOWER(LTRIM(RTRIM(itemName)))
            =
            LOWER(LTRIM(RTRIM(@itemName)))
        `);

    const deliveredQty =
      Number(
        deliveredResult.recordset[0]
          .deliveredQty || 0
      );

    const remainingQty =
      receiptQty - deliveredQty;

    if (amount > remainingQty) {
      throw new Error(
        "Qty exceeds remaining qty. Remaining: " +
          remainingQty
      );
    }

    // =========================
    // 4. CHECK BIN STOCK
    // =========================

    const binStockResult =
      await new sql.Request(transaction)
        .input(
          "itemName",
          sql.NVarChar,
          cleanItemName
        )
        .input(
          "binCode",
          sql.NVarChar,
          cleanBin
        )
        .query(`
          SELECT TOP 1 qty
          FROM Stock
          WHERE
            LOWER(LTRIM(RTRIM(itemName)))
            =
            LOWER(LTRIM(RTRIM(@itemName)))
            AND
            LTRIM(RTRIM(binCode))
            =
            LTRIM(RTRIM(@binCode))
        `);

    if (
      binStockResult.recordset.length === 0
    ) {
      throw new Error(
        "Item not found in this bin"
      );
    }

    const binQty =
      Number(
        binStockResult.recordset[0]
          .qty || 0
      );

    if (binQty < amount) {
      throw new Error(
        "Not enough qty in this bin. Available: " +
          binQty
      );
    }

    // =========================
    // 5. UPDATE STOCK
    // =========================

    await new sql.Request(transaction)
      .input(
        "itemName",
        sql.NVarChar,
        cleanItemName
      )
      .input(
        "binCode",
        sql.NVarChar,
        cleanBin
      )
      .input(
        "qty",
        sql.Decimal(18,2),
        amount
      )
      .input(
        "date",
        sql.NVarChar,
        today
      )
      .input(
        "time",
        sql.NVarChar,
        hour
      )
      .query(`
        UPDATE Stock
        SET
          qty = qty - @qty,
          [date] = @date,
          [time] = @time,
          updatedAt = GETDATE()
        WHERE
          LOWER(LTRIM(RTRIM(itemName)))
          =
          LOWER(LTRIM(RTRIM(@itemName)))
          AND
          LTRIM(RTRIM(binCode))
          =
          LTRIM(RTRIM(@binCode))
      `);

    // =========================
    // 6. SAVE TRANSACTION
    // =========================

    await new sql.Request(transaction)
      .input(
        "deliveryNumber",
        sql.NVarChar,
        finalDeliveryNumber
      )
      .input(
        "binCode",
        sql.NVarChar,
        cleanBin
      )
      .input(
        "orderNumber",
        sql.NVarChar,
        receiptNumber
      )
      .input(
        "itemName",
        sql.NVarChar,
        cleanItemName
      )
      .input(
        "qty",
        sql.Decimal(18,2),
        amount
      )
      .input(
        "userCode",
        sql.NVarChar,
        userCode
      )
      .input(
        "date",
        sql.NVarChar,
        today
      )
      .input(
        "hour",
        sql.NVarChar,
        hour
      )
      .query(`
        INSERT INTO BinTransactions
        (
          deliveryNumber,
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
          @deliveryNumber,
          @binCode,
          @orderNumber,
          @itemName,
          @qty,
          @userCode,
          @date,
          @hour
        )
      `);

    // =========================
    // 7. CHECK IF COMPLETE
    // =========================

    const remainingResult =
      await new sql.Request(transaction)
        .input(
          "orderId",
          sql.Int,
          orderId
        )
        .input(
          "receiptNumber",
          sql.NVarChar,
          receiptNumber
        )
        .query(`
          SELECT
            SUM(
              oi.quantity -
              ISNULL(bt.deliveredQty,0)
            ) AS totalRemaining
          FROM OrderItems oi

          OUTER APPLY
          (
            SELECT
              ISNULL(SUM(qty),0)
              AS deliveredQty
            FROM BinTransactions
            WHERE
              LTRIM(RTRIM(orderNumber))
              =
              LTRIM(RTRIM(@receiptNumber))
              AND
              LOWER(LTRIM(RTRIM(itemName)))
              =
              LOWER(LTRIM(RTRIM(oi.productName)))
          ) bt

          WHERE
            oi.orderId = @orderId
        `);

    const totalRemaining =
      Number(
        remainingResult.recordset[0]
          .totalRemaining || 0
      );

    if (totalRemaining <= 0) {

      await new sql.Request(transaction)
        .input(
          "invoiceId",
          sql.Int,
          invoiceId
        )
        .input(
          "deliveryNumber",
          sql.NVarChar,
          finalDeliveryNumber
        )
        .query(`
          UPDATE Deliveries
          SET
            status = 'Delivered',
            deliveryNumber = @deliveryNumber
          WHERE invoiceId = @invoiceId
        `);
    }

    await transaction.commit();
io.emit("dashboardUpdated");
    res.json({
      success: true,
      message:
        "Delivery confirmed successfully",
      deliveryNumber:
        finalDeliveryNumber,
    });

  } catch (err) {

    try {
      await transaction.rollback();
    } catch {}

    console.log(
      "CONFIRM DELIVERY ERROR 👉",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


/* =========================================
   UPDATE DELIVERY STATUS
========================================= */
router.put("/delivery/delivered/:deliveryNumber", async (req, res) => {
  try {
    const { deliveryNumber } = req.params;

    await sql.query`
      UPDATE Deliveries
      SET status = 'Delivered'
      WHERE deliveryNumber = ${deliveryNumber}
    `;
io.emit("dashboardUpdated");
    res.json({
      success: true,
      message: "Delivery marked as delivered",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
router.get("/deliveries/:receiptNumber", async (req, res) => {
  try {
    const receiptNumber = req.params.receiptNumber;

    const paymentResult = await sql.query`
      SELECT *
      FROM Payments
      WHERE receiptNumber = ${receiptNumber}
    `;

    if (paymentResult.recordset.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const payment = paymentResult.recordset[0];

    const invoiceResult = await sql.query`
      SELECT *
      FROM Invoices
      WHERE id = ${payment.invoiceId}
    `;

    if (invoiceResult.recordset.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const invoice = invoiceResult.recordset[0];

    const itemsResult = await sql.query`
      SELECT
        productName AS itemName,
        quantity AS receiptQty,
        0 AS deliveredQty,
        quantity AS remainingQty
      FROM OrderItems
      WHERE orderId = ${invoice.orderId}
    `;
io.emit("dashboardUpdated");
    res.json({
      success: true,
      data: itemsResult.recordset,
      header: {
        receiptNumber: payment.receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        orderId: invoice.orderId,
      },
    });
  } catch (err) {
    console.log("DELIVERY ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/delivery-items/:receiptNumber", async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    const result = await sql.query`
      SELECT
        p.receiptNumber,
        p.paymentDate,

        i.id AS invoiceId,
        i.invoiceNumber,
        i.customerName,
        i.orderId,

        oi.id AS itemId,
        oi.productName AS itemName,
        oi.quantity AS receiptQty,

        ISNULL(bt.deliveredQty, 0) AS deliveredQty,
        oi.quantity - ISNULL(bt.deliveredQty, 0) AS remainingQty

      FROM Payments p

      INNER JOIN Invoices i
        ON p.invoiceId = i.id

      INNER JOIN OrderItems oi
        ON i.orderId = oi.orderId

      OUTER APPLY (
        SELECT ISNULL(SUM(qty), 0) AS deliveredQty
        FROM BinTransactions
        WHERE orderNumber = p.receiptNumber
          AND itemName = oi.productName
      ) bt

      WHERE p.receiptNumber = ${receiptNumber}
    `;
io.emit("dashboardUpdated");
    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    console.log("LOAD DELIVERY ITEMS ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ✅ GET DELIVERY
router.get("/delivery", async (req, res) => {

  try {

    const result = await sql.query(`
      SELECT
    p.receiptNumber,
    p.paymentDate,
    i.id AS invoiceId,
    i.invoiceNumber,
    i.customerName,
    i.orderId,
    oi.id AS itemId,
    oi.productName,
    oi.quantity
FROM Payments p
INNER JOIN Invoices i
    ON p.invoiceId = i.id
INNER JOIN OrderItems oi
    ON i.orderId = oi.orderId
    `);
io.emit("dashboardUpdated");
    res.json(result.recordset);

  } catch (err) {

    console.error("GET STOCK ERROR:", err);

    res.status(500).send("Error loading stock");
  }
});
export default router;
