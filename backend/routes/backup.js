import express from "express";
import sql from "../db.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// ✅ BACKUP DATABASE
router.post("/backup-db", async (req, res) => {

  try {

    // ✅ BACKUP FOLDER
    const folder = "C:\\SysSoftBackups";

    // ✅ CREATE FOLDER IF NOT EXISTS
    if (!fs.existsSync(folder)) {

      fs.mkdirSync(folder, {
        recursive: true
      });
    }

    // ✅ DATE FORMAT
    const now = new Date();

    const timestamp =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      "-" +
      String(now.getMinutes()).padStart(2, "0") +
      "-" +
      String(now.getSeconds()).padStart(2, "0");

    // ✅ FILE NAME
    const file =
      `SysSoftERP_${timestamp}.bak`;

    // ✅ FULL PATH
    const backupPath =
      path.join(folder, file);

    console.log("Starting database backup...");

    // ✅ SQL BACKUP
    await sql.query(`
      BACKUP DATABASE SysSoftERP
      TO DISK = '${backupPath}'
      WITH
      FORMAT,
      INIT,
      NAME = 'SysSoft ERP Full Backup',
      SKIP,
      NOREWIND,
      NOUNLOAD,
      STATS = 10
    `);

    console.log("DB BACKUP CREATED ✅");

    return res.json({
      success: true,
      message: "Database backup completed ✅",
      file,
      path: backupPath
    });

  } catch (err) {

    console.log("BACKUP ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: "Backup failed ❌"
    });
  }
});

export default router;