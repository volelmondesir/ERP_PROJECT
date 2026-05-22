import express from "express";
import sql from "../db.js";
import multer from "multer";
import path from "path";
import QRCode from "qrcode";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/employees");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const generateEmployeeCode = async () => {
  const result = await sql.query`
    SELECT ISNULL(MAX(id), 0) + 1 AS nextId
    FROM Employees
  `;

  return `EMP-${String(result.recordset[0].nextId).padStart(5, "0")}`;
};

// GET EMPLOYEES
router.get("/employees", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM Employees
      ORDER BY id DESC
    `;

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE EMPLOYEE WITH PHOTO
// CREATE EMPLOYEE WITH PHOTO
router.post("/employee", upload.single("photo"), async (req, res) => {
  try {
    console.log("BODY 👉", req.body);
    console.log("FILE 👉", req.file);

    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      department,
      position,
      salary,
      hireDate,
      status,
    } = req.body || {};

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    const employeeCode = await generateEmployeeCode();
    const qrCode = employeeCode;
    const photoUrl = req.file ? `/uploads/employees/${req.file.filename}` : "";

    const safeHireDate =
      hireDate && hireDate.trim() !== "" ? new Date(hireDate) : null;

    const result = await sql.query`
      INSERT INTO Employees
      (
        employeeCode,
        firstName,
        lastName,
        phone,
        email,
        address,
        department,
        position,
        salary,
        hireDate,
        status,
        photoUrl,
        qrCode
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${employeeCode},
        ${firstName},
        ${lastName},
        ${phone || ""},
        ${email || ""},
        ${address || ""},
        ${department || ""},
        ${position || ""},
        ${Number(salary || 0)},
        ${safeHireDate},
        ${status || "active"},
        ${photoUrl},
        ${qrCode}
      )
    `;

    return res.status(201).json({
      success: true,
      message: "Employee saved ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.error("CREATE EMPLOYEE ERROR 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// UPDATE EMPLOYEE WITH OPTIONAL PHOTO
router.put(
  "/employee/:id",
  upload.single("photo"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const current = await sql.query`
        SELECT TOP 1 *
        FROM Employees
        WHERE id = ${Number(id)}
      `;

      if (current.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      const old = current.recordset[0];

      const {
        firstName,
        lastName,
        phone,
        email,
        address,
        department,
        position,
        salary,
        hireDate,
        status,
        oldPhotoUrl,
      } = req.body;

      const photoUrl = req.file
        ? `/uploads/employees/${req.file.filename}`
        : oldPhotoUrl || old.photoUrl || "";

      const result = await sql.query`
        UPDATE Employees
        SET
          firstName = ${firstName},
          lastName = ${lastName},
          phone = ${phone || ""},
          email = ${email || ""},
          address = ${address || ""},
          department = ${department || ""},
          position = ${position || ""},
          salary = ${Number(salary || 0)},
          hireDate = ${hireDate || null},
          status = ${status || "active"},
          photoUrl = ${photoUrl}
        OUTPUT INSERTED.*
        WHERE id = ${Number(id)}
      `;

      if (Number(old.salary || 0) !== Number(salary || 0)) {
        await sql.query`
          INSERT INTO EmployeeHistory
          (
            employeeId,
            employeeCode,
            employeeName,
            actionType,
            oldValue,
            newValue,
            changedBy
          )
          VALUES
          (
            ${old.id},
            ${old.employeeCode},
            ${old.firstName + " " + old.lastName},
            ${"Salary Update"},
            ${String(old.salary || 0)},
            ${String(salary || 0)},
            ${"Admin"}
          )
        `;
      }

      if (String(old.department || "") !== String(department || "")) {
        await sql.query`
          INSERT INTO EmployeeHistory
          (
            employeeId,
            employeeCode,
            employeeName,
            actionType,
            oldValue,
            newValue,
            changedBy
          )
          VALUES
          (
            ${old.id},
            ${old.employeeCode},
            ${old.firstName + " " + old.lastName},
            ${"Department Transfer"},
            ${old.department || ""},
            ${department || ""},
            ${"Admin"}
          )
        `;
      }

      res.json({
        success: true,
        message: "Employee updated ✅",
        data: result.recordset[0],
      });
    } catch (err) {
      console.log("UPDATE EMPLOYEE ERROR 👉", err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);
// DELETE EMPLOYEE
router.delete("/employee/:id", async (req, res) => {
  try {
    await sql.query`
      DELETE FROM Employees
      WHERE id = ${Number(req.params.id)}
    `;

    res.json({ success: true, message: "Employee deleted ✅" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET QR IMAGE
router.get("/employee/:id/qr", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT TOP 1 *
      FROM Employees
      WHERE id = ${Number(req.params.id)}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const emp = result.recordset[0];

    const qrData = JSON.stringify({
      id: emp.id,
      code: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      position: emp.position,
    });

    const qrImage = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      data: qrImage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get("/employee-history", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM EmployeeHistory
      ORDER BY changedAt DESC
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

router.get("/leave", async (req, res) => {
  try {

    const result = await sql.query`
      SELECT *
      FROM LeaveRequests
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

router.post("/leave", async (req, res) => {
  try {

    const {
      employeeId,
      employeeCode,
      employeeName,

      leaveType,

      startDate,
      endDate,

      totalDays,

      reason,
    } = req.body;

    const result = await sql.query`
      INSERT INTO LeaveRequests
      (
        employeeId,
        employeeCode,
        employeeName,

        leaveType,

        startDate,
        endDate,

        totalDays,

        reason
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${employeeId},
        ${employeeCode},
        ${employeeName},

        ${leaveType},

        ${startDate},
        ${endDate},

        ${totalDays},

        ${reason}
      )
    `;

    res.json({
      success: true,
      message: "Leave request created ✅",
      data: result.recordset[0],
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.put("/leave/:id/approve", async (req, res) => {
  try {

    const result = await sql.query`
      UPDATE LeaveRequests
      SET
        status = 'Approved',
        approvedBy = ${"Admin"},
        approvedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = ${Number(req.params.id)}
    `;

    res.json({
      success: true,
      message: "Leave approved ✅",
      data: result.recordset[0],
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
router.put("/leave/:id/reject", async (req, res) => {
  try {

    const result = await sql.query`
      UPDATE LeaveRequests
      SET
        status = 'Rejected',
        approvedBy = ${"Admin"},
        approvedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = ${Number(req.params.id)}
    `;

    res.json({
      success: true,
      message: "Leave rejected ✅",
      data: result.recordset[0],
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// EMPLOYEE OF MONTH

router.get("/employeeofmonth", async (req, res) => {
  try {
  

    const result = await sql.query(`
   SELECT
    eom.id,
    eom.employeeId,
    eom.fiscalYearId,
    eom.monthNumber,
    eom.rating,
    eom.comment,
    eom.createdBy,
    eom.createdAt,

    e.employeeCode,
    e.firstName,
    e.lastName,
    e.department,
    e.position,
    e.photoUrl,

    fy.year_label AS yearName

FROM EmployeeOfMonth eom

INNER JOIN Employees e
ON eom.employeeId = e.id

INNER JOIN Fiscal_Years fy
ON eom.fiscalYearId = fy.id

ORDER BY eom.id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log("LOAD EMPLOYEE OF MONTH ERROR 👉", err);
    res.status(500).json({ message: "Failed to load employee of month" });
  }
});

router.get("/employeeofmonth/active-fiscal", async (req, res) => {
  try {


    const result =  await sql.query(`
      SELECT
        eom.id,
        eom.employeeId,
        eom.fiscalYearId,
        eom.monthNumber,
        eom.rating,
        eom.comment,
        eom.createdBy,
        eom.createdAt,
        e.employeeCode,
        e.firstName,
        e.lastName,
        e.department,
        e.position,
        e.photoUrl,
        fy.year_label
      FROM EmployeeOfMonth eom
      INNER JOIN Employees e ON eom.employeeId = e.id
      INNER JOIN [ERP_DB].[dbo].[fiscal_years] fy ON eom.fiscalYearId = fy.id
      WHERE fy.status = 'OPEN'
      ORDER BY eom.monthNumber DESC, eom.id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
  console.log(err);

  res.status(500).json({
    error: String(err),
    sql: err.message,
  });
}
});
router.post("/employeeofmonth", async (req, res) => {
  try {
    const { employeeId, rating, comment, createdBy } = req.body;

    if (!employeeId || !rating) {
      return res.status(400).json({
        message: "Employee and rating are required",
      });
    }

    const request = new sql.Request();

    const result = await request
      .input("employeeId", sql.Int, employeeId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar(500), comment || "")
      .input("createdBy", sql.NVarChar(100), createdBy || "Admin")
      .query(`
        DECLARE @FiscalYearId INT;
        DECLARE @MonthNumber INT;

        SET @MonthNumber = MONTH(GETDATE());

        SELECT TOP 1
          @FiscalYearId = id
        FROM Fiscal_Years
        WHERE UPPER(LTRIM(RTRIM(status))) = 'OPEN'
        ORDER BY id DESC;

        IF @FiscalYearId IS NULL
        BEGIN
          RAISERROR('No OPEN fiscal year found', 16, 1);
          RETURN;
        END;

        INSERT INTO EmployeeOfMonth
        (
          employeeId,
          fiscalYearId,
          monthNumber,
          rating,
          comment,
          createdBy
        )
        VALUES
        (
          @employeeId,
          @FiscalYearId,
          @MonthNumber,
          @rating,
          @comment,
          @createdBy
        );

        SELECT TOP 1 *
        FROM EmployeeOfMonth
        ORDER BY id DESC;
      `);

    return res.status(201).json({
      success: true,
      message: "Employee of month saved ✅",
      data: result.recordset[0],
    });
  } catch (err) {
    console.log("SAVE EMPLOYEE OF MONTH ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Failed to save employee of month",
    });
  }
});
export default router;