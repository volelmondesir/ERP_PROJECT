import express from "express";
import sql from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const result = await sql.query`SELECT * FROM Products`;
  res.json(result.recordset);
});

export default router;