import React, { useState } from "react";
import { saveAuditLog } from "../utils/tempLog2"; 
const PricePage: React.FC = () => {
  const [products] = useState([
    "Laptop",
    "Phone",
    "Tablet",
  ]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");

  const handleAdd = () => {
    console.log({
      product: selectedProduct,
      price,
      date,
    });
  };

  const handleUpdate = () => {
    console.log("Update price");
  };

  return (
    <div>
      <h2>Product Pricing</h2>

      <select onChange={(e) => setSelectedProduct(e.target.value)}>
        <option>Select Product</option>
        {products.map((p, i) => (
          <option key={i}>{p}</option>
        ))}
      </select>
      <br />

      <input
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <br />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <br />

      <button onClick={handleAdd}>Add Price</button>
      <button onClick={handleUpdate}>Update Price</button>
    </div>
  );
};

export default PricePage;