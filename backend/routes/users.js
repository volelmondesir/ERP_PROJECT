import express from "express";
import sql from "mssql";
import bcrypt from "bcryptjs";
const router = express.Router();
import { io } from "../server.js";

import os from "os";

const getLocalIPAddress = () => {

  const interfaces = os.networkInterfaces();

  for (const interfaceName in interfaces) {

    const networkInterface = interfaces[interfaceName];

    for (const net of networkInterface) {

      const isIPv4 = net.family === "IPv4";

      const isLocalhost = net.internal === false;

      if (isIPv4 && isLocalhost) {
        return net.address;
      }
    }
  }

  return "UNKNOWN";
};
// ✅ METE SA ANWO ROUTE DYNAMIC YO
router.get("/audit-log", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT
        id,
        username,
        fullName,
        moduleName,
        submenuName,
        actionType,
        ipAddress,
        computerName,
        browserInfo,
        createdAt
      FROM UserAuditLogs
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log("GET AUDIT LOGS ERROR 👉", err);

    res.status(500).json({
      message: "Failed to load audit logs",
    });
  }
});

// ✅ GET USERS (NO DUPLICATE)
router.get("/", async (req, res) => {
  try {
    const pool = await sql.connect();

    const result = await pool.request().query(`
      SELECT DISTINCT id, username, role
      FROM users
      ORDER BY username
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading users");
  }
});

router.get("/users", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT id, username , role FROM users
    `;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ✅ GET PERMISSIONS (SAFE)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const pool = await sql.connect();

    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT permission 
        FROM user_permissions 
        WHERE user_id = @userId
      `);

    const permissions = result.recordset.map(r => r.permission);

    res.json(permissions);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading permissions");
  }
});


// ✅ SAVE PERMISSIONS (SAFE)
router.post("/", async (req, res) => {
  try {
    const { userId, permissions } = req.body;

    const pool = await sql.connect();

    // 🔥 DELETE OLD
    await pool.request()
      .input("userId", sql.Int, userId)
      .query(`DELETE FROM user_permissions WHERE user_id = @userId`);

    // 🔥 INSERT NEW
    for (let perm of permissions) {
      await pool.request()
        .input("userId", sql.Int, userId)
        .input("perm", sql.VarChar, perm)
        .query(`
          INSERT INTO user_permissions (user_id, permission)
          VALUES (@userId, @perm)
        `);
    }

    res.json({ message: "Saved" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving permissions");
  }
});
router.post("/register", async (req, res) => {
  const {fullName, username, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await new sql.Request()
      .input("fullName", sql.NVarChar, fullName)

      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashedPassword)
      .query("INSERT INTO Users (fullName,username, password) VALUES (@fullName,@username, @password)");

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

//GET ALL PERMISSIONS
router.get("/permissions", async (req, res) => {
  const result = await sql.query`SELECT * FROM Permissions`;
  res.json(result.recordset);
});
//GET ROLE PERMISSIONS
router.get("/roles/:id/permissions", async (req, res) => {
  const { id } = req.params;

  const result = await sql.query`
    SELECT p.id, p.module, p.action
    FROM RolePermissions rp
    JOIN Permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = ${id}
  `;

  res.json(result.recordset);
});
//UPDATE ROLE PERMISSIONS
router.post("/roles/:id/permissions", async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  // delete old
  await sql.query`
    DELETE FROM RolePermissions WHERE role_id = ${id}
  `;

  // insert new
  for (let pid of permissions) {
    await sql.query`
      INSERT INTO RolePermissions (role_id, permission_id)
      VALUES (${id}, ${pid})
    `;
  }

  res.json({ message: "Updated ✅" });



  });



  router.get("/audit-log/clean", async (req, res) => {
  try {

    const {
      moduleName = "",
      actionType = "",
      days = "0",
    } = req.query;

    const request = new sql.Request();

    request.input(
      "moduleName",
      sql.NVarChar,
      String(moduleName).trim()
    );

    request.input(
      "actionType",
      sql.NVarChar,
      `%${String(actionType).trim()}%`
    );

    request.input(
      "days",
      sql.Int,
      Number(days || 0)
    );

    const result = await request.query(`
      DELETE FROM UserAuditLogs
      WHERE
      (
        @moduleName = ''
        OR moduleName = @moduleName
      )

      AND
      (
        @actionType = '%%'
        OR actionType LIKE @actionType
      )

      AND
      (
        @days = 0
        OR
        CAST(createdAt AS DATETIME)
        < DATEADD(DAY, @days, GETDATE())
      )
    `);

    res.json({
      success: true,
      rowsDeleted: result.rowsAffected?.[0] || 0,
    });

  } catch (err) {

    console.log("CLEAN AUDIT LOG ERROR 👉", err);

    res.status(500).json({
      message: err.message || "Failed to clean logs",
    });
  }
});
// TEMPLATE TO ROLE

router.post("/roles/:roleId/apply-template/:templateId", async (req, res) => {
  const { roleId, templateId } = req.params;

  // ❌ DELETE OLD
  await sql.query`
    DELETE FROM RolePermissions WHERE role_id = ${roleId}
  `;

  // ✅ INSERT TEMPLATE PERMISSIONS
  await sql.query`
    INSERT INTO RolePermissions (role_id, permission_id)
    SELECT ${roleId}, permission_id
    FROM TemplatePermissions
    WHERE template_id = ${templateId}
  `;

  res.json({ success: true });
});

// 🔥 GET TEMPLATES
router.get("/templates", async (req, res) => {
  const result = await sql.query`SELECT * FROM PermissionTemplates`;
  res.json(result.recordset);
});

// 🔥 GET ROLE PERMISSIONS
router.get("/roles/:roleId/permissions", async (req, res) => {
  const { roleId } = req.params;

  const result = await sql.query`
    SELECT p.id, p.module, p.action
    FROM RolePermissions rp
    JOIN Permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = ${roleId}
  `;

  res.json(result.recordset);
});
// DELETE USER
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await sql.query`
      DELETE FROM user_permissions WHERE user_id = ${id}
    `;

    await sql.query`
      DELETE FROM users WHERE id = ${id}
    `;

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting user");
  }
});
// 🔑 CHANGE PASSWORD
// 🔑 CHANGE PASSWORD
// 🔑 CHANGE PASSWORD
router.put("/users/:id/password", async (req, res) => {
  const { id } = req.params;
  const { password, currentUser } = req.body;

  try {

    // ✅ GET TARGET USER
    const userResult = await sql.query`
      SELECT username
      FROM users
      WHERE id = ${id}
    `;

    if (userResult.recordset.length === 0) {
      return res.status(404).send("User not found");
    }

    const targetUser = userResult.recordset[0];

    // ✅ ONLY ADMIN HIMSELF CAN CHANGE ADMIN PASSWORD
    if (
      String(targetUser.username).toLowerCase() === "admin" &&
      String(currentUser).toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message:
          "Only master admin can change this password",
      });
    }

    // ✅ HASH PASSWORD
    const hash = await bcrypt.hash(password, 10);

    // ✅ UPDATE
    await sql.query`
      UPDATE users
      SET password = ${hash}
      WHERE id = ${id}
    `;

    res.send("Password updated ✅");

  } catch (err) {

    console.error(err);

    res.status(500).send("Error ❌");
  }
});
//
router.post("/change-password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    const hash = await bcrypt.hash(newPassword, 10);

    await sql.query`
      UPDATE users
      SET password = ${hash}
      WHERE id = ${userId}
    `;

    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
  }
});
router.post("/audit-log", async (req, res) => {

  try {

    const {

      username,
      fullName,
      moduleName,
      submenuName,
      actionType,
      computerName,
      browserInfo,

    } = req.body;

    // GET USER IP ADDRESS
    const ipAddressxx =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "UNKNOWN";
const pcNamexx = os.hostname() + navigator.platform;
const pcName =
  os.hostname() +
  "|" +
  req.body.computerName;
// Logic to filter for the local IPv4 address
const ipAddress = getLocalIPAddress();

const ipAddressxxx =
  req.headers["x-forwarded-for"]?.split(",")[0] ||
  req.socket.remoteAddress ||
  req.ip|| ipAddresslocal;

const cleanIp = String(ipAddress)
  .replace("::ffff:", "");

const finalIp =
  cleanIp === "::1" ||
  cleanIp === "127.0.0.1"
    ? `${cleanIp} || LOCALHOST`
    : `${cleanIp} || ONLINE`;

    await sql.query`
      INSERT INTO UserAuditLogs (

        username,
        fullName,
        moduleName,
        submenuName,
        actionType,
        ipAddress,
        computerName,
        browserInfo

      )
      VALUES (

        ${username},
        ${fullName},
        ${moduleName},
        ${submenuName},
        ${actionType},
        ${ipAddress},
        ${pcName},
        ${browserInfo}

      )
    `;
io.emit("auditLogUpdated");
    res.json({
      success: true,
      message: "Audit log saved"
    });

  } catch (err) {

    console.log("AUDIT LOG ERROR 👉", err);

    res.status(500).json({
      message: "Audit log failed"
    });
  }
});

export default router;