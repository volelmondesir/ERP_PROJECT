//import dotenv from "dotenv";
import express from "express";
import sql from "../db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

//dotenv.config();

const router = express.Router();

const SECRET_KEY = crypto
  .createHash("sha256")
  .update(process.env.LICENSE_SECRET || "SYS_SOFT_SECRET_KEY_2026")
  .digest();

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    SECRET_KEY,
    iv
  );

  let encrypted = cipher.update(
    String(text),
    "utf8",
    "hex"
  );

  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
};

const decrypt = (value) => {
  if (!value) return "";

  const text = String(value);

  if (!text.includes(":")) {
    return text;
  }

  const [ivHex, encrypted] = text.split(":");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    SECRET_KEY,
    Buffer.from(ivHex, "hex")
  );

  let decrypted = decipher.update(
    encrypted,
    "hex",
    "utf8"
  );

  decrypted += decipher.final("utf8");

  return decrypted;
};

function addMonthsToDate(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months || 6));
  return d;
}

function generateLicenseKey(companyName = "SYS") {
  const random = crypto.randomBytes(16).toString("hex");

  return `SYS-${companyName
    .substring(0, 3)
    .toUpperCase()}-${random}`;
}

const verifyAdminPassword = async (adminKey) => {
  if (!adminKey) return false;

  const result = await sql.query`
    SELECT TOP 1 *
    FROM Users
    WHERE username = 'admin'
  `;

  if (result.recordset.length === 0) return false;

  const user = result.recordset[0];

  return await bcrypt.compare(adminKey, user.password);
};

// ==============================
// GET LICENSE STATUS
// ==============================

router.get("/status", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT TOP 1 *
      FROM Licenses
      ORDER BY id DESC
    `);

    if (result.recordset.length === 0) {
      return res.json({
        active: false,
        expired: false,
        message: "No license found",
      });
    }

    const raw = result.recordset[0];

    const companyName = decrypt(raw.companyName);
    const licenseKey = decrypt(raw.licenseKey);
    const startDateText = decrypt(raw.startDate);
    const endDateText = decrypt(raw.endDate);

    const startDate = new Date(startDateText);
    const endDate = new Date(endDateText);
    const now = new Date();
if (
  isNaN(startDate.getTime()) ||
  isNaN(endDate.getTime())
) {
  return res.status(500).json({
    active: false,
    expired: true,
    message: "Invalid license data",
  });
}
    const expired = endDate < now;

    const active =
      !expired &&
      !raw.isBlocked &&
      raw.isActive;

    const totalDays = Math.max(
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      0
    );

    const daysRemaining = Math.max(
      Math.ceil(
        (endDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      0
    );

    const daysUsed = Math.max(
      totalDays - daysRemaining,
      0
    );

    res.json({
      ...raw,
      companyName,
      licenseKey,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      expired,
      active,
      totalDays,
      daysUsed,
      daysRemaining,
    });

  } catch (err) {
    console.log("STATUS ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Server error",
    });
  }
});

// ==============================
// CREATE TRIAL
// ==============================

router.post("/create-trial", async (req, res) => {
  try {
    const {
      companyName,
      months,
      adminKey
    } = req.body || {};

    if (!companyName) {
      return res.status(400).json({
        message: "Company name is required",
      });
    }

    const validAdmin =
      await verifyAdminPassword(adminKey);

    if (!validAdmin) {
      return res.status(401).json({
        message: "Invalid admin password",
      });
    }

    const addMonths =
      Number(months || 6);

    const startDate =
      new Date();

    const endDate =
      addMonthsToDate(startDate, addMonths);

    const licenseKey =
      generateLicenseKey(companyName);

    await sql.query`
      INSERT INTO Licenses (
        companyName,
        licenseKey,
        startDate,
        endDate,
        isBlocked,
        isActive
      )
      VALUES (
        ${encrypt(companyName)},
        ${encrypt(licenseKey)},
        ${encrypt(startDate.toISOString())},
        ${encrypt(endDate.toISOString())},
        0,
        1
      )
    `;

    res.json({
      message: "Trial created",
      licenseKey,
    });

  } catch (err) {
    console.log("CREATE TRIAL ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Server error",
    });
  }
});

// ==============================
// BLOCK LICENSE
// ==============================

router.post("/block", async (req, res) => {
  try {
    const { adminKey } = req.body || {};

    const valid =
      await verifyAdminPassword(adminKey);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid admin key",
      });
    }

    await sql.query`
      UPDATE Licenses
      SET isBlocked = 1
    `;

    res.json({
      message: "License blocked ✅",
    });

  } catch (err) {
    console.log("BLOCK ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Block failed",
    });
  }
});

// ==============================
// UNBLOCK LICENSE
// ==============================

router.post("/unblock", async (req, res) => {
  try {
    const { adminKey } = req.body || {};

    const valid =
      await verifyAdminPassword(adminKey);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid admin key",
      });
    }

    await sql.query`
      UPDATE Licenses
      SET isBlocked = 0
    `;

    res.json({
      message: "License unblocked ✅",
    });

  } catch (err) {
    console.log("UNBLOCK ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Unblock failed",
    });
  }
});

// ==============================
// EXTEND LICENSE
// ==============================

router.post("/extend", async (req, res) => {
  try {
    const {
      months,
      adminKey
    } = req.body || {};

    const valid =
      await verifyAdminPassword(adminKey);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid admin key",
      });
    }

    const result = await sql.query(`
      SELECT TOP 1 *
      FROM Licenses
      ORDER BY id DESC
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "No license found",
      });
    }

    const lic =
      result.recordset[0];

    const currentEndDate =
      new Date(decrypt(lic.endDate));

    const newEndDate =
      addMonthsToDate(currentEndDate, Number(months || 6));

    await sql.query`
      UPDATE Licenses
      SET endDate = ${encrypt(newEndDate.toISOString())}
      WHERE id = ${lic.id}
    `;

    res.json({
      message: "License extended ✅",
      endDate: newEndDate,
    });

  } catch (err) {
    console.log("EXTEND ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Extend failed",
    });
  }
});

export default router;