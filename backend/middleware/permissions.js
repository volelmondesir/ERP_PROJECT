import sql from "mssql";

export const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      // 🔐 VERIFYE USER NAN TOKEN
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized ❌" });
      }

      const result = await sql.query`
        SELECT 1
        FROM RolePermissions rp
        JOIN Permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ${req.user.role_id}
        AND p.module = ${module}
        AND p.action = ${action}
      `;

      if (result.recordset.length === 0) {
        return res.status(403).json({ message: "Access denied ❌" });
      }

      next();
    }  catch (err) {
  console.log("PERMISSIONS ERROR 👉", err);

  res.status(500).json({
    success: false,
    message: err.message,
  });
}
  };
};