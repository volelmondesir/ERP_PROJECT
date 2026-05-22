import { useEffect, useState } from "react";
import axios from "axios";

export default function OrderEntryDashboard() {
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    axios.get("http://localhost:5000/api/dashboard")
      .then(res => setStats(res.data));
  }, []);

  return (
    <div>
      <h2>Order Entry Dashboard</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div>📦 Orders: {stats.totalOrders || 0}</div>
        <div>💰 Sales: {stats.totalSales || 0}</div>
        <div>🚚 Pending: {stats.pendingDeliveries || 0}</div>
      </div>
    </div>
  );
}