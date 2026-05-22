import sql from "../db.js";

export const checkLicense = async (
  req,
  res,
  next
) => {
  try {
    const result = await sql.query(`
      SELECT TOP 1 *
      FROM Licenses
      ORDER BY id DESC
    `);

    if (result.recordset.length === 0) {
      return res.status(403).json({
        message: "No license",
      });
    }

    const lic = result.recordset[0];

    const expired =
      new Date(lic.endDate) < new Date();

    if (lic.isBlocked || expired) {
      return res.status(403).json({
        message: "License expired",
      });
    }

    next();
  } catch (err) {
    console.log(err);

    res.status(500).send("License check failed");
  }
};