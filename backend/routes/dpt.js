import express from "express";
import sql from "../db.js";

const router = express.Router();

// GET ALL
router.get("/departments", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM Departments
      ORDER BY id DESC
    `;

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// CREATE
router.post("/department", async (req, res) => {
  try {
    const {
      departmentName,
      managerName,
      phone,
      email,
      description,
      status,
    } = req.body;

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: "Department name required",
      });
    }

    const codeResult = await sql.query`
      SELECT ISNULL(MAX(id), 0) + 1 AS nextId
      FROM Departments
    `;

    const departmentCode =
      "DEP-" +
      String(codeResult.recordset[0].nextId).padStart(5, "0");

    const result = await sql.query`
      INSERT INTO Departments
      (
        departmentCode,
        departmentName,
        managerName,
        phone,
        email,
        description,
        status
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${departmentCode},
        ${departmentName},
        ${managerName || ""},
        ${phone || ""},
        ${email || ""},
        ${description || ""},
        ${status || "active"}
      )
    `;

    res.status(201).json({
      success: true,
      message: "Department created ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// UPDATE
router.put("/department/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      departmentName,
      managerName,
      phone,
      email,
      description,
      status,
    } = req.body;

    const result = await sql.query`
      UPDATE Departments
      SET
        departmentName = ${departmentName},
        managerName = ${managerName || ""},
        phone = ${phone || ""},
        email = ${email || ""},
        description = ${description || ""},
        status = ${status || "active"}
      OUTPUT INSERTED.*
      WHERE id = ${Number(id)}
    `;

    res.json({
      success: true,
      message: "Department updated ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// DELETE
router.delete("/department/:id", async (req, res) => {
  try {
    await sql.query`
      DELETE FROM Departments
      WHERE id = ${Number(req.params.id)}
    `;

    res.json({
      success: true,
      message: "Department deleted ✅",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;