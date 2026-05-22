import React, { useState } from "react";
import { saveAuditLog } from "../utils/tempLog2"; 
const ProductPage: React.FC = () => {
  const [productCode] = useState("PRD-" + Date.now());
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();

    const product = {
      productCode,
      name,
      date,
    };

    console.log(product);
  };

  return (
    <div>
      <h2>Create Product</h2>

      <form onSubmit={handleSubmit}>
        <input value={productCode} readOnly />
        <br />

        <input
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <br />

        <button type="submit">Save Product</button>
      </form>
    </div>
  );
};

export default ProductPage;