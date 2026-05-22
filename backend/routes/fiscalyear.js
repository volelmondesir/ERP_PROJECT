import express from "express";
import sql from "mssql";

const router = express.Router();
// ===============================
// 📊 FISCAL YEAR SYSTEM (CLEAN)
// ===============================

// 🔓 OPEN FISCAL YEAR
// ===============================
// 📊 FISCAL YEAR SYSTEM (FINAL)
// ===============================



router.post('/fiscal-year/open', async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // 🔥 1. DETERMINE YEAR AUTOMATIC
    const today = new Date();
    const month = today.getMonth(); // 0 = Jan

    const y = month >= 9
      ? today.getFullYear() + 1
      : today.getFullYear();

    // 🔥 2. CHECK SI GEN OPEN DEJA
    const check = await request.query(`
      SELECT * FROM fiscal_years WHERE status = 'OPEN'
    `);

    if (check.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "A fiscal year is already OPEN"
      });
    }

    // 🔥 3. DEFINE RANGE (Oct → Sep)
    const start = new Date(Date.UTC(y - 1, 9, 1)); // Oct 1
    const end   = new Date(Date.UTC(y, 8, 30));    // Sep 30

    // 🔥 4. INSERT FISCAL YEAR
    const fy = await request.query(`
      INSERT INTO fiscal_years (year_label, start_date, end_date, status)
      OUTPUT INSERTED.id
      VALUES (
        '${y-1}-${y}',
        '${start.toISOString()}',
        '${end.toISOString()}',
        'OPEN'
      )
    `);

    const fiscalYearId = fy.recordset[0].id;

    // 🔥 5. MONTH ORDER (Oct → Sep)
    const monthsOrder = [9,10,11,0,1,2,3,4,5,6,7,8];
    const monthNames = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    // 🔥 6. INSERT PERIODS (SAFE)
    for (let i = 0; i < 12; i++) {
      const m = monthsOrder[i];

      const yearForMonth = m >= 9 ? (y - 1) : y;

      const pStart = new Date(Date.UTC(yearForMonth, m, 1));
      const pEnd   = new Date(Date.UTC(yearForMonth, m + 1, 0));

      const monthName = monthNames[m];

      console.log("INSERT PERIOD:", monthName);

      await request.query(`
        IF NOT EXISTS (
          SELECT 1 FROM fiscal_periods
          WHERE fiscal_year_id = ${fiscalYearId}
          AND period_name = '${monthName}'
        )
        INSERT INTO fiscal_periods
        (fiscal_year_id, period_name, start_date, end_date, status)
        VALUES (
          ${fiscalYearId},
          '${monthName}',
          '${pStart.toISOString()}',
          '${pEnd.toISOString()}',
          'OPEN'
        )
      `);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Fiscal year ${y-1}-${y} created (Oct → Sep)`
    });

  } catch (err) {
    await transaction.rollback();

    console.error("ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// 🔒 CLOSE FISCAL YEAR
router.post('/fiscal-year/close/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const periods = await sql.query`
      SELECT * FROM fiscal_periods 
      WHERE fiscal_year_id = ${id} AND status = 'OPEN'
    `;

    if (periods.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Fèmen tout periods avan"
      });
    }

    await sql.query`
      UPDATE fiscal_years 
      SET status = 'CLOSED'
      WHERE id = ${id}
    `;

    res.json({
      success: true,
      message: "Fiscal year closed"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// 🔒 CLOSE PERIOD
router.post('/fiscal-period/close/:id', async (req, res) => {
  try {
    await sql.query`
      UPDATE fiscal_periods 
      SET status = 'CLOSED'
      WHERE id = ${req.params.id}
    `;

    res.json({
      success: true,
      message: "Period closed"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// 📊 GET ALL YEARS
router.get('/fiscal-years', async (req, res) => {
  try {
    const result = await sql.query`
      SELECT * FROM fiscal_years ORDER BY id DESC
    `;

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// 📅 GET PERIODS BY YEAR
router.get('/fiscal-periods/:id', async (req, res) => {
  try {
    const result = await sql.query`
      SELECT * FROM fiscal_periods
      WHERE fiscal_year_id = ${req.params.id}
      ORDER BY id
    `;

    console.log("PERIODS:", result.recordset);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
export default router;