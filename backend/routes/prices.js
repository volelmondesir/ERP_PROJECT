import express from "express";
import sql from "../db.js";

const router = express.Router();
app.post("/prices", async (req, res) => {
  try {
    const { productId, price, date } = req.body;

    await sql.query`
      INSERT INTO Prices (productId, price, createdAt)
      VALUES (${productId}, ${price}, ${date})
    `;

    res.send("Price added");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.put("/prices/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { price } = req.body;

    await sql.query`
      UPDATE Prices
      SET price = ${price}
      WHERE productId = ${productId}
    `;

    res.send("Price updated");
  } catch (err) {
    res.status(500).send(err.message);
  }
});
export default router;