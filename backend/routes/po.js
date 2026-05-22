import express from "express";
import sql from "../db.js";

const router = express.Router();

/* CREATE PO */
router.post("/", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      supplier,
      poDate,
      comment = "",
      items = [],
      username = "Admin",
    } = req.body;

    if (!supplier || !poDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid PO data" });
    }

    const poNumber = "PO-" + Math.floor(100000 + Math.random() * 900000);

    await transaction.begin();

    const poReq = new sql.Request(transaction);
    poReq.input("poNumber", sql.NVarChar, poNumber);
    poReq.input("supplier", sql.NVarChar, supplier);
    poReq.input("poDate", sql.DateTime, new Date(poDate));
    poReq.input("comment", sql.NVarChar, comment);
    poReq.input("username", sql.NVarChar, username);

    const poResult = await poReq.query(`
      INSERT INTO PurchaseOrders (
        poNumber,
        supplier,
        poDate,
        comment,
        username
      )
      OUTPUT INSERTED.id
      VALUES (
        @poNumber,
        @supplier,
        @poDate,
        @comment,
        @username
      )
    `);

    const poId = poResult.recordset[0].id;

    for (const item of items) {
      const itemReq = new sql.Request(transaction);

      itemReq.input("poId", sql.Int, poId);
      itemReq.input("materialName", sql.NVarChar, item.materialName);
      itemReq.input("quantity", sql.Decimal(18, 2), Number(item.quantity));
      itemReq.input("unit", sql.NVarChar, item.unit);
      itemReq.input("price", sql.Decimal(18, 2), Number(item.price || 0));
      itemReq.input("note", sql.NVarChar, item.note || "");

      await itemReq.query(`
        INSERT INTO PurchaseOrderItems (
          poId,
          materialName,
          quantity,
          unit,
          price,
          note
        )
        VALUES (
          @poId,
          @materialName,
          @quantity,
          @unit,
          @price,
          @note
        )
      `);
    }

    await transaction.commit();

    res.json({
      success: true,
      poId,
      poNumber,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    console.log("PO CREATE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* GET PO BY NUMBER */
router.get("/number/:poNumber", async (req, res) => {
  try {
    const poNumber = req.params.poNumber.trim();

    const poReq = new sql.Request();
    poReq.input("poNumber", sql.NVarChar, poNumber);

    const poRes = await poReq.query(`
      SELECT *
      FROM PurchaseOrders
      WHERE LTRIM(RTRIM(poNumber)) = @poNumber
    `);

    if (poRes.recordset.length === 0) {
      return res.status(404).json({ message: "PO not found" });
    }

    const po = poRes.recordset[0];

    const itemReq = new sql.Request();
    itemReq.input("poId", sql.Int, po.id);

    const itemsRes = await itemReq.query(`
      SELECT *
      FROM PurchaseOrderItems
      WHERE poId = @poId
    `);

    res.json({
      ...po,
      items: itemsRes.recordset,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* GET ALL PO */
router.get("/", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT *
      FROM PurchaseOrders
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post("/from-po", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const { poId, supplier, amount, items = [], username = "Admin" } = req.body;

    if (!poId || !supplier || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid PO invoice data" });
    }

    const invoiceNumber =
      "AP-INV-" + Math.floor(100000 + Math.random() * 900000);

    await transaction.begin();

    const invReq = new sql.Request(transaction);
    invReq.input("poId", sql.Int, poId);
    invReq.input("invoiceNumber", sql.NVarChar, invoiceNumber);
    invReq.input("supplier", sql.NVarChar, supplier);
    invReq.input("total", sql.Decimal(18, 2), Number(amount));
    invReq.input("username", sql.NVarChar, username);

    const invRes = await invReq.query(`
      INSERT INTO SupplierInvoices (
        poId,
        invoiceNumber,
        supplier,
        total,
        paidAmount,
        status,
        username
      )
      OUTPUT INSERTED.id
      VALUES (
        @poId,
        @invoiceNumber,
        @supplier,
        @total,
        0,
        'Unpaid',
        @username
      )
    `);

    const invoiceId = invRes.recordset[0].id;

    for (const item of items) {
      const itemReq = new sql.Request(transaction);

      itemReq.input("invoiceId", sql.Int, invoiceId);
      itemReq.input("name", sql.NVarChar, item.materialName || "");
      itemReq.input("quantity", sql.Decimal(18, 2), Number(item.quantity || 0));
      itemReq.input("unit", sql.NVarChar, item.unit || "");
      itemReq.input("price", sql.Decimal(18, 2), Number(item.price || 0));
      itemReq.input("note", sql.NVarChar, item.note || "");

      await itemReq.query(`
        INSERT INTO SupplierInvoiceItems (
          invoiceId,
          name,
          quantity,
          unit,
          price,
          note
        )
        VALUES (
          @invoiceId,
          @name,
          @quantity,
          @unit,
          @price,
          @note
        )
      `);
    }

    const accReq = new sql.Request(transaction);

    const accRes = await accReq.query(`
      SELECT TOP 1 id
      FROM Accounts
      WHERE accountCode = 'PAYMENT'
        AND isActive = 1
    `);

    if (accRes.recordset.length === 0) {
      throw new Error("Payment account not found");
    }

    const paymentAccountId = accRes.recordset[0].id;

    {/**
      const ledgerReq = new sql.Request(transaction);
    ledgerReq.input("accountId", sql.Int, paymentAccountId);
    ledgerReq.input("amount", sql.Decimal(18, 2), Number(amount));
    ledgerReq.input("sourceId", sql.Int, invoiceId);
    ledgerReq.input("referenceNumber", sql.NVarChar, invoiceNumber);
    ledgerReq.input("description", sql.NVarChar, `Supplier invoice ${invoiceNumber}`);
    ledgerReq.input("username", sql.NVarChar, username);

    await ledgerReq.query(`
      INSERT INTO AccountLedger (
        accountId,
        transactionType,
        amount,
        sourceType,
        sourceId,
        referenceNumber,
        description,
        username
      )
      VALUES (
        @accountId,
        'IN',
        @amount,
        'SUPPLIER_INVOICE',
        @sourceId,
        @referenceNumber,
        @description,
        @username
      )
    `);
      
      */}
    

    await transaction.commit();

    res.json({
      success: true,
      invoiceNumber,
      invoiceId,
      message: "Supplier invoice created"
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    console.log("FROM PO ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
});
// =========================
// 📦 SAVE RECEPTION
// =========================
router.post("/receptions", async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    const {
      receptionNumber,
      poId,
      poNumber,
      supplier,
      status,
      comment = "",
      username = "Admin",
      items = [],
    } = req.body;

    if (!receptionNumber || !poId || !poNumber || !supplier || !status) {
      return res.status(400).json({ message: "Missing reception data" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No reception items" });
    }

    await transaction.begin();

    const recReq = new sql.Request(transaction);
    recReq.input("receptionNumber", sql.NVarChar, receptionNumber);
    recReq.input("poId", sql.Int, Number(poId));
    recReq.input("poNumber", sql.NVarChar, poNumber);
    recReq.input("supplier", sql.NVarChar, supplier);
    recReq.input("status", sql.NVarChar, status);
    recReq.input("comment", sql.NVarChar, comment);
    recReq.input("username", sql.NVarChar, username);

    const recResult = await recReq.query(`
      INSERT INTO Receptions (
        receptionNumber,
        poId,
        poNumber,
        supplier,
        status,
        comment,
        username
      )
      OUTPUT INSERTED.id
      VALUES (
        @receptionNumber,
        @poId,
        @poNumber,
        @supplier,
        @status,
        @comment,
        @username
      )
    `);

    const receptionId = recResult.recordset[0].id;

    for (const item of items) {
      const orderedQty = Number(item.orderedQty || 0);
      const alreadyReceived = Number(item.alreadyReceived || 0);
      const receivedQty = Number(item.receivedQty || 0);
      const poItemId = Number(item.poItemId || 0);

      if (receivedQty <= 0) continue;

      if (!poItemId) {
        throw new Error(`${item.materialName}: missing PO item id`);
      }

      if (alreadyReceived + receivedQty > orderedQty) {
        throw new Error(`${item.materialName}: received qty is too high`);
      }

      const itemReq = new sql.Request(transaction);
      itemReq.input("receptionId", sql.Int, receptionId);
      itemReq.input("poItemId", sql.Int, poItemId);
      itemReq.input("materialName", sql.NVarChar, item.materialName);
      itemReq.input("orderedQty", sql.Decimal(18, 2), orderedQty);
      itemReq.input("receivedQty", sql.Decimal(18, 2), receivedQty);
      itemReq.input("unit", sql.NVarChar, item.unit || "");

      await itemReq.query(`
        INSERT INTO ReceptionItems (
          receptionId,
          poItemId,
          materialName,
          orderedQty,
          receivedQty,
          unit
        )
        VALUES (
          @receptionId,
          @poItemId,
          @materialName,
          @orderedQty,
          @receivedQty,
          @unit
        )
      `);

      const updateItemReq = new sql.Request(transaction);
      updateItemReq.input("poItemId", sql.Int, poItemId);
      updateItemReq.input("receivedQty", sql.Decimal(18, 2), receivedQty);

      await updateItemReq.query(`
        UPDATE PurchaseOrderItems
        SET receivedQty = ISNULL(receivedQty, 0) + @receivedQty
        WHERE id = @poItemId
      `);
    }

    await transaction.commit();

    res.json({
      success: true,
      receptionId,
      receptionNumber,
      status,
      message: "Reception saved",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}

    console.log("RECEPTION ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Reception failed",
    });
  }
});

router.get("/number/:poNumber", async (req, res) => {
  try {
    const poNumber = req.params.poNumber.trim();

    const poReq = new sql.Request();
    poReq.input("poNumber", sql.NVarChar, poNumber);

    const poRes = await poReq.query(`
      SELECT *
      FROM PurchaseOrders
      WHERE LTRIM(RTRIM(poNumber)) = @poNumber
    `);

    if (poRes.recordset.length === 0) {
      return res.status(404).json({ message: "PO not found" });
    }

    const po = poRes.recordset[0];

    const itemReq = new sql.Request();
    itemReq.input("poId", sql.Int, po.id);

    const itemsRes = await itemReq.query(`
      SELECT
        poi.*,
        ISNULL(poi.receivedQty, 0) AS alreadyReceived
      FROM PurchaseOrderItems poi
      WHERE poi.poId = @poId
    `);

    res.json({
      ...po,
      items: itemsRes.recordset,
    });
  } catch (err) {
    console.log("GET PO ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/supplier-invoices", async (req, res) => {
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
        si.createdAt
      FROM SupplierInvoices si
      LEFT JOIN PurchaseOrders po ON po.id = si.poId
      ORDER BY si.id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get("/items/:poId", async (req, res) => {
  try {
    const poId = Number(req.params.poId);

    const result = await sql.query`
      SELECT
        id,
        materialName,
        quantity,
        unit,
        price,
        note
      FROM PurchaseOrderItems
      WHERE poId = ${poId}
    `;

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/receivings", async (req, res) => {
  try {

    const result = await sql.query(`
      SELECT *
      FROM Receptions
      ORDER BY createdAt DESC
    `);

    res.json(result.recordset);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Error loading receivings",
    });
  }
});


router.get("/receivings/:receptionNumber", async (req, res) => {
  try {
    const { receptionNumber } = req.params;

    const result = await sql.query`
      SELECT
        r.id,
        r.receptionNumber,
        r.poId,
        r.poNumber,
        r.supplier,
        r.status,
        r.comment,
        r.username,
        r.createdAt,

        i.materialName,
        i.quantity,
        i.receivedQty,
        i.unit,
        i.price,
        i.note

      FROM Receptions r

      LEFT JOIN PurchaseOrderItems i
        ON r.poId = i.poId

      WHERE r.receptionNumber = ${receptionNumber}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Reception not found",
      });
    }

    // ✅ HEADER
    const header = {
      id: result.recordset[0].id,

      receptionNumber:
        result.recordset[0].receptionNumber,

      poId:
        result.recordset[0].poId,

      poNumber:
        result.recordset[0].poNumber,

      supplier:
        result.recordset[0].supplier,

      // 🔥 STATUS AP RETE MENM JAN LI TE SAVE NAN DB
      status:
        result.recordset[0].status,

      comment:
        result.recordset[0].comment,

      username:
        result.recordset[0].username,

      createdAt:
        result.recordset[0].createdAt,
    };

    // ✅ ITEMS
    const items = result.recordset.map((r) => {
      const orderedQty = Number(r.quantity || 0);

      const receivedQty = Number(r.receivedQty || 0);

      // 🔥 DIFFERENCE / REMAIN
      const remainQty =
        orderedQty - receivedQty;

      return {
        materialName: r.materialName,

        quantity: orderedQty,

        receivedQty,

        remainQty,

        unit: r.unit,

        price: r.price,

        note: r.note,
      };
    });

    // ✅ RETURN
    res.json({
      ...header,
      items,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});
export default router;