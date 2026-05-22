import express from "express";
import sql from "mssql";

const router = express.Router();

// GET PERMISSIONS

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await sql.query`
      SELECT permission
      FROM user_permissions
      WHERE user_id = ${Number(userId)}
    `;

    res.json(result.recordset.map((r) => r.permission));
  } catch (err) {
    console.log("PERMISSIONS ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
})

// SAVE PERMISSIONS
router.post("/", async (req, res) => {
  try {
    const { userId, permissions } = req.body;

    const pool = await sql.connect();

    await pool.request()
      .input("userId", sql.Int, userId)
      .query(`DELETE FROM user_permissions WHERE user_id = @userId`);

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

export default router;