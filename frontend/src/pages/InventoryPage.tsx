import React, { useEffect, useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);

  const fetchInventory = async () => {
    const res = await axios.get("http://localhost:5000/inventory");
    setItems(res.data);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div>
      <h2>Inventory</h2>

      <table border={1}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>Stock</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.product}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryPage;