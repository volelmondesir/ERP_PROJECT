import express from "express";
import sql from "../db.js";

const router = express.Router();

const generateVendorCode = async () => {
  const result = await sql.query`
    SELECT ISNULL(MAX(id), 0) + 1 AS nextId
    FROM Vendeurs
  `;

  const nextId = result.recordset[0].nextId;
  return `VEN-${String(nextId).padStart(5, "0")}`;
};

// GET VENDORS
router.get("/vendors", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM Vendeurs
      ORDER BY id DESC
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE VENDOR
router.post("/vendor", async (req, res) => {
  try {
    const { vendorName, phone, email, address } = req.body;

    if (!vendorName) {
      return res.status(400).json({
        success: false,
        message: "Vendor name is required",
      });
    }

    const vendorCode = await generateVendorCode();

    const result = await sql.query`
      INSERT INTO Vendeurs
      (
        vendorCode,
        vendorName,
        phone,
        email,
        address
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${vendorCode},
        ${vendorName},
        ${phone || ""},
        ${email || ""},
        ${address || ""}
      )
    `;

    res.status(201).json({
      success: true,
      message: "Vendor saved ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE VENDOR
router.put("/vendor/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorName, phone, email, address, isActive } = req.body;

    const result = await sql.query`
      UPDATE Vendeurs
      SET
        vendorName = ${vendorName},
        phone = ${phone || ""},
        email = ${email || ""},
        address = ${address || ""},
        isActive = ${isActive === false ? 0 : 1}
      OUTPUT INSERTED.*
      WHERE id = ${Number(id)}
    `;

    res.json({
      success: true,
      message: "Vendor updated ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE / DISABLE VENDOR
router.delete("/vendor/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await sql.query`
      UPDATE Vendeurs
      SET isActive = 0
      WHERE id = ${Number(id)}
    `;

    res.json({ success: true, message: "Vendor disabled ✅" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// GET ACTIVE VENDORS
router.get("/vendors-active", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT id, vendorCode, vendorName
      FROM Vendeurs
      WHERE isActive = 1
      ORDER BY vendorName
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ASSIGN CUSTOMER TO VENDOR
router.post("/vendor-customer", async (req, res) => {
  try {
    const { vendorId, customerId } = req.body;

    if (!vendorId || !customerId) {
      return res.status(400).json({
        success: false,
        message: "Vendor and customer required",
      });
    }

    const exists = await sql.query`
      SELECT id
      FROM VendorCustomers
      WHERE vendorId = ${Number(vendorId)}
      AND customerId = ${Number(customerId)}
    `;

    if (exists.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Customer already assigned to this vendor",
      });
    }

    const result = await sql.query`
      INSERT INTO VendorCustomers
      (vendorId, customerId)
      OUTPUT INSERTED.*
      VALUES
      (${Number(vendorId)}, ${Number(customerId)})
    `;

    res.status(201).json({
      success: true,
      message: "Customer assigned ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ASSIGNMENTS
router.get("/vendor-customers", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        vc.id,
        vc.vendorId,
        vc.customerId,
        vc.createdAt,
        v.vendorCode,
        v.vendorName,
        c.name AS customerName,
        c.phone,
        c.email
      FROM VendorCustomers vc
      INNER JOIN Vendeurs v ON vc.vendorId = v.id
      INNER JOIN customers c ON vc.customerId = c.id
      ORDER BY vc.id DESC
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE ASSIGNMENT
router.delete("/vendor-customer/:id", async (req, res) => {
  try {
    await sql.query`
      DELETE FROM VendorCustomers
      WHERE id = ${Number(req.params.id)}
    `;

    res.json({ success: true, message: "Assignment removed ✅" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;