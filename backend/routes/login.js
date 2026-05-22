import express from "express";
import sql from "mssql";
import { io } from "../server.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth.js";
import { checkPermission } from "../middleware/permissions.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const userResult = await sql.query`
      SELECT *
      FROM users
      WHERE username = ${username}
    `;

    if (userResult.recordset.length === 0) {
      return res.status(401).json({
        message: "Invalid username",
      });
    }

    const user = userResult.recordset[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    // ✅ LOAD USER PERMISSIONS
    const permissionsResult = await sql.query`
      SELECT permission
      FROM user_permissions
      WHERE user_id = ${user.id}
    `;

    const permissions =
      permissionsResult.recordset.map(
        (p) => p.permission
      );

    // ✅ TOKEN
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      "secretkey",
      {
        expiresIn: "1d",
      }
    );

    res.json({
      success: true,

      token,

      user: {
        id: user.id,
        username: user.username,
            fullName: user.fullName,
      },

      permissions,
    });

  } catch (err) {
    console.log("LOGIN ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
export default router;