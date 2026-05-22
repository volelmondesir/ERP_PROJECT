import express from "express";
import sql from "../db.js";
import puppeteer from "puppeteer";

const router = express.Router();

// ==============================
// GET PAYROLL
// ==============================
router.get("/payroll", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT *
      FROM Payroll
      ORDER BY id DESC
    `;

    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    console.log("GET PAYROLL ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// CREATE PAYROLL
// ==============================
router.post("/payroll", async (req, res) => {
  try {
    const {
      employeeId,
      employeeCode,
      employeeName,
      department,
      position,
      payrollMonth,
      basicSalary,
      overtimeAmount,
      bonusAmount,
      deductionAmount,
      taxAmount,
      paymentStatus,
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee required",
      });
    }

    const basic = Number(basicSalary || 0);
    const overtime = Number(overtimeAmount || 0);
    const bonus = Number(bonusAmount || 0);
    const deduction = Number(deductionAmount || 0);
    const tax = Number(taxAmount || 0);

    const grossSalary = basic + overtime + bonus;
    const netSalary = grossSalary - deduction - tax;

    const result = await sql.query`
      INSERT INTO Payroll (
        employeeId,
        employeeCode,
        employeeName,
        department,
        position,
        payrollMonth,
        basicSalary,
        overtimeAmount,
        bonusAmount,
        deductionAmount,
        taxAmount,
        grossSalary,
        netSalary,
        paymentStatus
      )
      OUTPUT INSERTED.*
      VALUES (
        ${Number(employeeId)},
        ${employeeCode || ""},
        ${employeeName || ""},
        ${department || ""},
        ${position || ""},
        ${payrollMonth || ""},
        ${basic},
        ${overtime},
        ${bonus},
        ${deduction},
        ${tax},
        ${grossSalary},
        ${netSalary},
        ${paymentStatus || "Pending"}
      )
    `;

    res.status(201).json({
      success: true,
      message: "Payroll saved ✅",
      data: result.recordset[0],
    });

  } catch (err) {
    console.log("CREATE PAYROLL ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// GENERATE PAYROLL FOR ALL ACTIVE EMPLOYEES
// ==============================
router.post("/payroll/generate-all", async (req, res) => {
  try {
    const {
      payrollMonth,
      overtimeAmount = 0,
      bonusAmount = 0,
      deductionAmount = 0,
      taxAmount = 0,
      paymentStatus = "Pending",
    } = req.body;

    if (!payrollMonth) {
      return res.status(400).json({
        success: false,
        message: "Payroll month required",
      });
    }

    // Check si mwa sa deja generate
    const checkResult = await sql.query`
      SELECT COUNT(*) AS total
      FROM Payroll
      WHERE payrollMonth = ${payrollMonth}
    `;

    const existingCount = checkResult.recordset[0].total;

    if (existingCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Payroll pou mwa ${payrollMonth} fèt deja.`,
      });
    }

    const employees = await sql.query`
      SELECT *
      FROM Employees
      WHERE UPPER(status) = 'ACTIVE'
      ORDER BY id
    `;

    if (employees.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active employees found",
      });
    }

    let created = 0;
    let skipped = 0;

    for (const emp of employees.recordset) {
      const exists = await sql.query`
        SELECT id
        FROM Payroll
        WHERE employeeId = ${emp.id}
        AND payrollMonth = ${payrollMonth}
      `;

      if (exists.recordset.length > 0) {
        skipped++;
        continue;
      }

      const basic = Number(emp.salary || 0);
      const overtime = Number(overtimeAmount || 0);
      const bonus = Number(bonusAmount || 0);
      const deduction = Number(deductionAmount || 0);
      const tax = Number(taxAmount || 0);

      const grossSalary = basic + overtime + bonus;
      const netSalary = grossSalary - deduction - tax;

      await sql.query`
        INSERT INTO Payroll (
          employeeId,
          employeeCode,
          employeeName,
          department,
          position,
          payrollMonth,
          basicSalary,
          overtimeAmount,
          bonusAmount,
          deductionAmount,
          taxAmount,
          grossSalary,
          netSalary,
          paymentStatus
        )
        VALUES (
          ${emp.id},
          ${emp.employeeCode || ""},
          ${`${emp.firstName || ""} ${emp.lastName || ""}`.trim()},
          ${emp.department || ""},
          ${emp.position || ""},
          ${payrollMonth},
          ${basic},
          ${overtime},
          ${bonus},
          ${deduction},
          ${tax},
          ${grossSalary},
          ${netSalary},
          ${paymentStatus}
        )
      `;

      created++;
    }

    res.json({
      success: true,
      message: `Payroll generated ✅ Created: ${created}, Skipped: ${skipped}`,
      created,
      skipped,
    });

  } catch (err) {
    console.log("GENERATE ALL PAYROLL ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// UPDATE PAYROLL
// ==============================
router.put("/payroll/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      payrollMonth,
      basicSalary,
      overtimeAmount,
      bonusAmount,
      deductionAmount,
      taxAmount,
      paymentStatus,
    } = req.body;

    const basic = Number(basicSalary || 0);
    const overtime = Number(overtimeAmount || 0);
    const bonus = Number(bonusAmount || 0);
    const deduction = Number(deductionAmount || 0);
    const tax = Number(taxAmount || 0);

    const grossSalary = basic + overtime + bonus;
    const netSalary = grossSalary - deduction - tax;

    const result = await sql.query`
      UPDATE Payroll
      SET
        payrollMonth = ${payrollMonth || ""},
        basicSalary = ${basic},
        overtimeAmount = ${overtime},
        bonusAmount = ${bonus},
        deductionAmount = ${deduction},
        taxAmount = ${tax},
        grossSalary = ${grossSalary},
        netSalary = ${netSalary},
        paymentStatus = ${paymentStatus || "Pending"}
      OUTPUT INSERTED.*
      WHERE id = ${Number(id)}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    res.json({
      success: true,
      message: "Payroll updated ✅",
      data: result.recordset[0],
    });

  } catch (err) {
    console.log("UPDATE PAYROLL ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// DELETE PAYROLL
// ==============================
router.delete("/payroll/:id", async (req, res) => {
  try {
    await sql.query`
      DELETE FROM Payroll
      WHERE id = ${Number(req.params.id)}
    `;

    res.json({
      success: true,
      message: "Payroll deleted ✅",
    });

  } catch (err) {
    console.log("DELETE PAYROLL ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// PAYROLL PREVIEW SINGLE PDF
// ==============================
router.get("/payroll-preview/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql.query`
      SELECT TOP 1
        p.*,
        c.companyName,
        c.address,
        c.phone,
        c.footerMessage
      FROM Payroll AS p
      CROSS JOIN (
        SELECT TOP 1 *
        FROM CompanySettings
        ORDER BY id DESC
      ) AS c
      WHERE p.id = ${id}
    `;

    const rows = result.recordset;

    if (!rows.length) {
      return res.status(404).send("Payroll not found");
    }

    const p = rows[0];

    const gross =
      Number(p.basicSalary || 0) +
      Number(p.overtimeAmount || 0) +
      Number(p.bonusAmount || 0);

    const net =
      gross -
      Number(p.deductionAmount || 0) -
      Number(p.taxAmount || 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { box-sizing: border-box; }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #111827;
          }

          .slip {
            padding: 30px;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #ddd;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }

          .header h1 {
            margin: 0;
            font-size: 28px;
          }

          .header h2 {
            margin: 10px 0 5px;
          }

          .header p {
            margin: 3px 0;
            font-size: 13px;
          }

          .row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
            font-size: 15px;
          }

          .gross {
            color: #2563eb;
            font-weight: bold;
          }

          .net {
            color: #16a34a;
            font-size: 22px;
            font-weight: bold;
          }

          .footer {
            margin-top: 18px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
          }

          .signature {
            margin-top: 50px;
            text-align: right;
          }

          .signature div {
            width: 220px;
            border-bottom: 2px solid #111;
            margin-left: auto;
          }

          .signature p {
            margin: 8px 0 0;
          }
        </style>
      </head>

      <body>
        <div class="slip">
          <div class="header">
            <h1>${p.companyName || "SysSoftERP"}</h1>
            <p>${p.address || ""}</p>
            <p>${p.phone || ""}</p>

            <h2>Fich de Paie</h2>
            <p>${p.payrollMonth || ""}</p>
          </div>

          <div class="row">
            <b>Employee</b>
            <span>${p.employeeName || ""}</span>
          </div>

          <div class="row">
            <b>Department</b>
            <span>${p.department || ""}</span>
          </div>

          <div class="row">
            <b>Position</b>
            <span>${p.position || ""}</span>
          </div>

          <div class="row">
            <b>Basic Salary</b>
            <span>$${Number(p.basicSalary || 0).toFixed(2)}</span>
          </div>

          <div class="row">
            <b>Overtime</b>
            <span>$${Number(p.overtimeAmount || 0).toFixed(2)}</span>
          </div>

          <div class="row">
            <b>Bonus</b>
            <span>$${Number(p.bonusAmount || 0).toFixed(2)}</span>
          </div>

          <div class="row">
            <b>Deduction</b>
            <span>$${Number(p.deductionAmount || 0).toFixed(2)}</span>
          </div>

          <div class="row">
            <b>Tax</b>
            <span>$${Number(p.taxAmount || 0).toFixed(2)}</span>
          </div>

          <div class="row gross">
            <b>Gross Salary</b>
            <span>$${gross.toFixed(2)}</span>
          </div>

          <div class="row net">
            <b>Net Salary</b>
            <span>$${net.toFixed(2)}</span>
          </div>

          <div class="footer">
            ${p.footerMessage || ""}
          </div>

          <div class="signature">
            <div></div>
            <p>HR Signature</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="payroll-${p.employeeName || id}.pdf"`
    );

    res.send(pdf);

  } catch (err) {
    console.log("PAYROLL PREVIEW PDF ERROR 👉", err);
    res.status(500).send("PDF error");
  }
});

// ==============================
// PAYROLL PREVIEW ALL PDF
// ==============================
router.get("/payroll-preview-all", async (req, res) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).send("Month required");
    }

    const result = await sql.query`
      SELECT
        p.*,
        c.companyName,
        c.address,
        c.phone,
        c.footerMessage
      FROM Payroll AS p
      CROSS JOIN (
        SELECT TOP 1 *
        FROM CompanySettings
        ORDER BY id DESC
      ) AS c
      WHERE p.payrollMonth = ${month}
      ORDER BY p.employeeName ASC
    `;

    const rows = result.recordset;

    if (!rows.length) {
      return res.status(404).send("No payroll found for this month");
    }

    const slips = rows.map((p) => {
      const gross =
        Number(p.basicSalary || 0) +
        Number(p.overtimeAmount || 0) +
        Number(p.bonusAmount || 0);

      const net =
        gross -
        Number(p.deductionAmount || 0) -
        Number(p.taxAmount || 0);

      return `
        <div class="slip">
          <h1>${p.companyName || ""}</h1>
          <p>${p.address || ""}</p>
          <p>${p.phone || ""}</p>

          <h2>Fich de Paie</h2>
          <p>${p.payrollMonth || ""}</p>

          <div class="row"><b>Employee</b><span>${p.employeeName || ""}</span></div>
          <div class="row"><b>Department</b><span>${p.department || ""}</span></div>
          <div class="row"><b>Position</b><span>${p.position || ""}</span></div>
          <div class="row"><b>Basic Salary</b><span>$${Number(p.basicSalary || 0).toFixed(2)}</span></div>
          <div class="row"><b>Overtime</b><span>$${Number(p.overtimeAmount || 0).toFixed(2)}</span></div>
          <div class="row"><b>Bonus</b><span>$${Number(p.bonusAmount || 0).toFixed(2)}</span></div>
          <div class="row"><b>Deduction</b><span>$${Number(p.deductionAmount || 0).toFixed(2)}</span></div>
          <div class="row"><b>Tax</b><span>$${Number(p.taxAmount || 0).toFixed(2)}</span></div>
          <div class="row gross"><b>Gross Salary</b><span>$${gross.toFixed(2)}</span></div>
          <div class="row net"><b>Net Salary</b><span>$${net.toFixed(2)}</span></div>

          <div class="signature">
            <div></div>
            <p>HR Signature</p>
          </div>
        </div>
      `;
    }).join("");

    const html = `
      <html>
      <head>
        <style>
          body {
            font-family: Arial;
            margin: 0;
            padding: 0;
          }

          .slip {
            page-break-after: always;
            padding: 30px;
          }

          .slip:last-child {
            page-break-after: auto;
          }

          h1, h2, p {
            text-align: center;
            margin: 4px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #ddd;
            padding: 9px 0;
          }

          .gross {
            color: #2563eb;
            font-weight: bold;
          }

          .net {
            color: #16a34a;
            font-size: 20px;
            font-weight: bold;
          }

          .signature {
            margin-top: 50px;
            text-align: right;
          }

          .signature div {
            width: 220px;
            border-bottom: 2px solid #111;
            margin-left: auto;
          }
        </style>
      </head>

      <body>
        ${slips}
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
      displayHeaderFooter: false,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="payroll-${month}.pdf"`
    );

    res.send(pdf);

  } catch (err) {
    console.log("PDF ERROR 👉", err);
    res.status(500).send("PDF error");
  }
});

export default router;