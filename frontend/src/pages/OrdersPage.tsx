import { useEffect, useState } from "react";
import axios from "axios";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    axios.get("http://localhost:5000/orders")
      .then(res => setOrders(res.data));
  }, []);

  return (
    <div>
      <h2>Orders</h2>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
          </tr>
        </thead>

        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.customerName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}