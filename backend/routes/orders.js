import express from "express";
import sql from "mssql";
import { io } from "../server.js";
const router = express.Router();

// =====================================================
// ADD ORDER
// =====================================================

router.post("/orders", async (req, res) => {

  const pool =
    await sql.connect();

  const transaction =
    new sql.Transaction(pool);

  try {

    await transaction.begin();

    const {
      username,
      customerName,
      items,
      taxRate = 0,
      paidAmount = 0
    } = req.body;

    console.log(
      "ITEMS RECEIVED:",
      items
    );

    // =================================================
    // VALIDATION
    // =================================================

    if (!customerName) {

      await transaction.rollback();
io.emit("auditLogUpdated", {
  moduleName: "Order Entry",
  submenuName: "Orders",
  actionType: `CREATE ORDER: ${invoiceNumber}`,
  username,
});
      return res.status(400).json({
        error: "Customer name required"
      });
    }

    if (
      !items ||
      items.length === 0
    ) {

      await transaction.rollback();

      return res.status(400).json({
        error: "No items provided"
      });
    }

    // =================================================
    // CALCULATE TOTALS
    // =================================================

    let subtotal = 0;

    items.forEach((item) => {

      const qty =
        Number(item.qty) || 0;

      const price =
        Number(item.price) || 0;

      subtotal += qty * price;
    });

    const safeTaxRate =
      Number(taxRate) || 0;

    const taxAmount =
      subtotal *
      (safeTaxRate / 100);

    const total =
      subtotal + taxAmount;

    const safePaidAmount =
      Number(paidAmount) || 0;

    const balance =
      total - safePaidAmount;

    // =================================================
    // GET FISCAL YEAR
    // =================================================

    const fiscalRequest =
      new sql.Request(transaction);

    const fiscalResult =
      await fiscalRequest.query(`
        SELECT TOP 1 id
        FROM fiscal_years
        ORDER BY id DESC
      `);

    const fiscalYearId =
      fiscalResult.recordset[0]?.id;

    if (!fiscalYearId) {

      throw new Error(
        "No fiscal year found"
      );
    }

    // =================================================
    // GENERATE INVOICE NUMBER
    // =================================================

    const invoiceNumber =
     "INV-" + Math.floor(100000 + Math.random() * 900000);

    // =================================================
    // INSERT ORDER
    // =================================================

    const orderRequest =
      new sql.Request(transaction);

    const orderResult =
      await orderRequest

        .input(
          "customerName",
          sql.NVarChar,
          customerName
        )

        .input(
          "totalAmount",
          sql.Decimal(18, 2),
          total
        )

        .input(
          "username",
          sql.NVarChar,
          username || "Admin"
        )

        .query(`
          INSERT INTO Orders (

            customerName,
            totalAmount,
            username

          )

          OUTPUT INSERTED.id

          VALUES (

            @customerName,
            @totalAmount,
            @username

          )
        `);

    const orderId =
      orderResult.recordset[0].id;

    // =================================================
    // INSERT INVOICE
    // =================================================

    const invoiceRequest =
      new sql.Request(transaction);

    await invoiceRequest

      .input(
        "invoiceNumber",
        sql.NVarChar,
        invoiceNumber
      )

      .input(
        "orderId",
        sql.Int,
        orderId
      )

      .input(
        "customerName",
        sql.NVarChar,
        customerName
      )

      .input(
        "subtotal",
        sql.Decimal(18, 2),
        subtotal
      )

      .input(
        "taxRate",
        sql.Decimal(18, 2),
        safeTaxRate
      )

      .input(
        "taxAmount",
        sql.Decimal(18, 2),
        taxAmount
      )

      .input(
        "total",
        sql.Decimal(18, 2),
        total
      )

      .input(
        "paidAmount",
        sql.Decimal(18, 2),
        safePaidAmount
      )

      .input(
        "balance",
        sql.Decimal(18, 2),
        balance
      )

      .input(
        "fiscal_year_id",
        sql.Int,
        fiscalYearId
      )

      .input(
        "status",
        sql.NVarChar,
        balance <= 0
          ? "PAID"
          : "PENDING"
      )

      .query(`
        INSERT INTO Invoices (

          invoiceNumber,
          orderId,
          customerName,

          subtotal,
          taxRate,
          taxAmount,

          total,
          paidAmount,
          balance,

          fiscal_year_id,
          status

        )

        VALUES (

          @invoiceNumber,
          @orderId,
          @customerName,

          @subtotal,
          @taxRate,
          @taxAmount,

          @total,
          @paidAmount,
          @balance,

          @fiscal_year_id,
          @status

        )
      `);

    // =================================================
    // SAVE ITEMS + UPDATE STOCK
    // =================================================

    for (const item of items) {

      // ===============================================
      // CHECK STOCK
      // ===============================================

    // ===============================================
// CHECK STOCK
// ===============================================

const cleanItemName = String(item.itemName || "").trim();

const stockRequest = new sql.Request(transaction);

const stockResult = await stockRequest
  .input("productId", sql.Int, Number(item.productId || 0))
  .input("itemName", sql.NVarChar, cleanItemName)
  .query(`
    SELECT TOP 1 *
    FROM Items
    WHERE
      id = @productId
      OR LOWER(LTRIM(RTRIM(itemName))) =
         LOWER(LTRIM(RTRIM(@itemName)))
  `);

if (stockResult.recordset.length === 0) {
  throw new Error(`${cleanItemName} not found`);
}

const stockRow = stockResult.recordset[0];

const currentStock = Number(stockRow.qty || 0);

if (Number(item.qty) > currentStock) {
  throw new Error(`${cleanItemName} out of stock`);
}


if (Number(item.qty) > currentStock) {
  throw new Error(
    `${cleanItemName} only ${currentStock} left`
  );
}
// ===============================================
// INSERT ORDER ITEM
// ===============================================

const itemRequest = new sql.Request(transaction);

await itemRequest
  .input("orderId_item", sql.Int, orderId)
  .input("productId_item", sql.Int, Number(item.productId || stockRow.id))
  .input("productName_item", sql.NVarChar, cleanItemName)
  .input("quantity_item", sql.Int, Number(item.qty))
  .input("price_item", sql.Decimal(18, 2), Number(item.price))
  .input(
    "totalPrice_item",
    sql.Decimal(18, 2),
    Number(item.qty) * Number(item.price)
  )
  .query(`
    INSERT INTO OrderItems (
      orderId,
      productId,
      productName,
      quantity,
      price,
      totalPrice
    )
    VALUES (
      @orderId_item,
      @productId_item,
      @productName_item,
      @quantity_item,
      @price_item,
      @totalPrice_item
    )
  `);

// ===============================================
// UPDATE STOCK
// ===============================================

const updateStockRequest = new sql.Request(transaction);

await updateStockRequest
  .input("qty", sql.Int, Number(item.qty))
  .input("stockId", sql.Int, stockRow.id)
  .query(`
    UPDATE Items
    SET qty = qty - @qty
    WHERE id = @stockId
  `);

    
    
    }

    // =================================================
    // COMMIT
    // =================================================

    await transaction.commit();
io.emit("dashboardUpdated");
io.emit("salesUpdated");
    res.json({

      success: true,

      message:
        "Order created successfully",

      orderId,

      invoiceNumber,

      subtotal,

      taxAmount,

      total,

      balance
    });

  } catch (err) {

    console.error(
      "ORDER ERROR:",
      err
    );

    try {

      await transaction.rollback();

    } catch {}

    res.status(500).json({
      error:
        err.message
    });
  }
});

// =====================================================
// GET SINGLE INVOICE
// =====================================================

router.get(
  "/invoices/:invoiceNumber",
  async (req, res) => {

    try {

      const {
        invoiceNumber
      } = req.params;

      // ===============================================
      // GET INVOICE + CASHIER
      // ===============================================

      const invoiceResult =
        await sql.query`

          SELECT

            i.*,
            o.username

          FROM Invoices i

          LEFT JOIN Orders o
            ON i.orderId = o.id

          WHERE i.invoiceNumber =
            ${invoiceNumber}
        `;

      if (
        invoiceResult.recordset.length === 0
      ) {

        return res.status(404).json({
          error:
            "Invoice not found"
        });
      }

      const invoice =
        invoiceResult.recordset[0];

      // ===============================================
      // GET ITEMS
      // ===============================================

      const itemsResult =
        await sql.query`

          SELECT

            productId,
            productName,
            quantity,
            price

          FROM OrderItems

          WHERE orderId =
            ${invoice.orderId}
        `;

      // ===============================================
      // RESPONSE
      // ===============================================

      res.json({

        id:
          invoice.id,

        invoiceNumber:
          invoice.invoiceNumber,

        customerName:
          invoice.customerName,

        subtotal:
          invoice.subtotal,

        taxRate:
          invoice.taxRate,

        taxAmount:
          invoice.taxAmount,

        total:
          invoice.total,

        paidAmount:
          invoice.paidAmount,

        balance:
          invoice.balance,

        status:
          invoice.status,

        username:
          invoice.username,

        items:
          itemsResult.recordset.map(
            item => ({

              productId:
                item.productId,

              name:
                item.productName,

              quantity:
                item.quantity,

              price:
                item.price
            })
          )
      });

    } catch (err) {

      console.error(
        "GET INVOICE ERROR:",
        err
      );

      res.status(500).json({
        error:
          err.message
      });
    }
  }
);

// =====================================================
// GET ALL INVOICES
// =====================================================

router.get(
  "/invoices",
  async (req, res) => {

    try {

      const result =
        await sql.query(`

          SELECT

            i.id,
            i.invoiceNumber,
            i.customerName,
            i.total,
            i.status,
            i.paidAmount,
            i.balance,

            o.username

          FROM Invoices i

          LEFT JOIN Orders o
            ON i.orderId = o.id

          ORDER BY i.id DESC
        `);

      res.json(
        result.recordset
      );

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error:
          err.message
      });
    }
  }
);

// =====================================================
// GET RECEIPT
// =====================================================

router.get(
  "/receipts/:receiptNumber",
  async (req, res) => {

    try {

      const {
        receiptNumber
      } = req.params;

      // ===============================================
      // PAYMENT
      // ===============================================

      const paymentResult =
        await sql.query`

          SELECT *

          FROM Payments

          WHERE receiptNumber =
            ${receiptNumber}
        `;

      if (
        paymentResult.recordset.length === 0
      ) {

        return res.status(404).json({
          error:
            "Receipt not found"
        });
      }

      const payment =
        paymentResult.recordset[0];

      // ===============================================
      // INVOICE + CASHIER
      // ===============================================

      const invoiceResult =
        await sql.query`

          SELECT

            i.*,
            o.username

          FROM Invoices i

          INNER JOIN Orders o
            ON i.orderId = o.id

          WHERE i.id =
            ${payment.invoiceId}
        `;

      if (
        invoiceResult.recordset.length === 0
      ) {

        return res.status(404).json({
          error:
            "Invoice not found"
        });
      }

      const invoice =
        invoiceResult.recordset[0];

      // ===============================================
      // ITEMS
      // ===============================================

      const itemsResult =
        await sql.query`

          SELECT

            productName,
            quantity,
            price

          FROM OrderItems

          WHERE orderId =
            ${invoice.orderId}
        `;

      // ===============================================
      // RESPONSE
      // ===============================================

      res.json({

        receiptNumber:
          payment.receiptNumber,

        paymentDate:
          payment.paymentDate,

        invoiceNumber:
          invoice.invoiceNumber,

        customerName:
          invoice.customerName,

        cashier:
          invoice.username,

        subtotal:
          invoice.subtotal,

        taxRate:
          invoice.taxRate,

        taxAmount:
          invoice.taxAmount,

        total:
          invoice.total,

        paidAmount:
          payment.amount,

        balance:
          invoice.balance,

        status:
          invoice.status,

        items:
          itemsResult.recordset.map(
            item => ({

              name:
                item.productName,

              quantity:
                item.quantity,

              price:
                item.price
            })
          )
      });

    } catch (err) {

      console.log(
        "RECEIPT ERROR 👉",
        err
      );

      res.status(500).json({
        error:
          err.message
      });
    }
  }
);

router.get("/receiptsxx", async (req, res) => {
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
router.get("/receipts", async (req, res) => {

  try {

    const result = await sql.query`

      SELECT

        p.receiptNumber,
        p.paymentDate,
        p.amount,

        i.invoiceNumber,
        i.customerName,

        o.username AS cashier

      FROM Payments p

      INNER JOIN Invoices i
        ON p.invoiceId = i.id

      INNER JOIN Orders o
        ON i.orderId = o.id

      ORDER BY p.id DESC
    `;

    res.json(result.recordset);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: err.message
    });
  }
});
export default router;