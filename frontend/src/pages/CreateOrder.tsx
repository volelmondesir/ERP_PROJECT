import { useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
export default function CreateOrder() {
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<any[]>([]);

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const handleChange = (i: number, field: string, value: any) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const handleSubmit = async () => {
    await axios.post("http://localhost:5000/orders", {
      customerName,
      items
    });

    alert("Order created ✅");
  };

  return (
    <div>
      <h2>Create Order</h2>

      <input
        placeholder="Customer Name"
        value={customerName}
        onChange={e => setCustomerName(e.target.value)}
      />

      <button onClick={addItem}>+ Add Item</button>

      {items.map((item, i) => (
        <div key={i}>
          <input
            placeholder="Product ID"
            onChange={e => handleChange(i, "productId", e.target.value)}
          />

          <input
            type="number"
            placeholder="Qty"
            onChange={e => handleChange(i, "quantity", e.target.value)}
          />
        </div>
      ))}

      <button onClick={handleSubmit}>Save</button>
    </div>
  );
}