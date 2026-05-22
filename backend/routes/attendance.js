import express from "express";
import sql from "../db.js";

const router = express.Router();

// ==============================
// CALCULATE HOURS
// ==============================
const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return {
      totalHours: 0,
      overtimeHours: 0,
    };
  }

  const [inHour, inMin] = String(checkIn)
    .split(":")
    .map(Number);

  const [outHour, outMin] = String(checkOut)
    .split(":")
    .map(Number);

  let inMinutes = inHour * 60 + inMin;
  let outMinutes = outHour * 60 + outMin;

  // SHIFT OVERNIGHT
  if (outMinutes < inMinutes) {
    outMinutes += 24 * 60;
  }

  const totalHours = Number(
    ((outMinutes - inMinutes) / 60).toFixed(2)
  );

  const overtimeHours =
    totalHours > 8
      ? Number((totalHours - 8).toFixed(2))
      : 0;

  return {
    totalHours,
    overtimeHours,
  };
};

// ==============================
// GET ALL ATTENDANCE
// ==============================
router.get("/attendance", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM Attendance
      ORDER BY id DESC
    `;

    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    console.log("GET ATTENDANCE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// CREATE ATTENDANCE
// ==============================
router.post("/attendance", async (req, res) => {
  try {
    console.log("BODY 👉", req.body);

    const {
      employeeId,
      employeeCode,
      employeeName,
      department,
      attendanceDate,
      checkIn,
      checkOut,
      status,
      note,
    } = req.body;

    // VALIDATION
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee required",
      });
    }

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message: "Attendance date required",
      });
    }

    // HOURS
    const { totalHours, overtimeHours } =
      calculateHours(checkIn, checkOut);

    // INSERT
    const result = await sql.query`
      INSERT INTO Attendance
      (
        employeeId,
        employeeCode,
        employeeName,
        department,
        attendanceDate,
        checkIn,
        checkOut,
        totalHours,
        overtimeHours,
        status,
        note
      )
      OUTPUT INSERTED.*
      VALUES
      (
        ${Number(employeeId)},
        ${employeeCode || ""},
        ${employeeName || ""},
        ${department || ""},
        ${attendanceDate},
        ${checkIn || ""},
        ${checkOut || ""},
        ${totalHours},
        ${overtimeHours},
        ${status || "Present"},
        ${note || ""}
      )
    `;

    res.status(201).json({
      success: true,
      message: "Attendance saved ✅",
      data: result.recordset[0],
    });

  } catch (err) {
    console.log("CREATE ATTENDANCE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// UPDATE ATTENDANCE
// ==============================
router.put("/attendance/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      attendanceDate,
      checkIn,
      checkOut,
      status,
      note,
    } = req.body;

    const { totalHours, overtimeHours } =
      calculateHours(checkIn, checkOut);

    const result = await sql.query`
      UPDATE Attendance
      SET
        attendanceDate = ${attendanceDate},
        checkIn = ${checkIn || ""},
        checkOut = ${checkOut || ""},
        totalHours = ${totalHours},
        overtimeHours = ${overtimeHours},
        status = ${status || "Present"},
        note = ${note || ""}
      OUTPUT INSERTED.*
      WHERE id = ${Number(id)}
    `;

    res.json({
      success: true,
      message: "Attendance updated ✅",
      data: result.recordset[0],
    });

  } catch (err) {
    console.log("UPDATE ATTENDANCE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// DELETE ATTENDANCE
// ==============================
router.delete("/attendance/:id", async (req, res) => {
  try {
    await sql.query`
      DELETE FROM Attendance
      WHERE id = ${Number(req.params.id)}
    `;

    res.json({
      success: true,
      message: "Attendance deleted ✅",
    });

  } catch (err) {
    console.log("DELETE ATTENDANCE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;