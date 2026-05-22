import React, { useEffect, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const API = "http://localhost:5000/api";

type TopProduct = {
  name: string;
  totalSold: number;
};

type StockLevel = {
  itemName: string;
  qty: number;
};

const DashboardCharts: React.FC = () => {

  const [topProducts, setTopProducts] =
    useState<TopProduct[]>([]);

  const [stockLevels, setStockLevels] =
    useState<StockLevel[]>([]);

  const [loading, setLoading] =
    useState(true);

  // 🔄 LOAD DATA
  useEffect(() => {

    loadCharts();

  }, []);

  const loadCharts = async () => {

    try {

      // 🔥 TOP PRODUCTS
      const topRes =
        await axios.get(
          `${API}/top-products`
        );

      // 📦 STOCK
      const stockRes =
        await axios.get(
          `${API}/stock-levels`
        );

      setTopProducts(
        topRes.data || []
      );

      setStockLevels(
        stockRes.data || []
      );

    } catch (err) {

      console.error(
        "Chart error:",
        err
      );

    } finally {

      setLoading(false);
    }
  };

  // ⏳ LOADING
  if (loading) {

    return (
      <div style={{ padding: 20 }}>
        Loading charts...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 30,
        padding: 20
      }}
    >

      {/* 🔥 TOP SELLERS */}
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.1)"
        }}
      >

        <h3>
          🔥 Top 5 Best Sellers
        </h3>

        <ResponsiveContainer
          width="100%"
          height={300}
        >

          <BarChart
            data={topProducts}
          >

            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="name"
            />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="totalSold"
            />

          </BarChart>

        </ResponsiveContainer>
      </div>

      {/* 📦 STOCK LEVEL */}
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.1)"
        }}
      >

        <h3>
          📦 Stock Levels
        </h3>

        <ResponsiveContainer
          width="100%"
          height={300}
        >

          <BarChart
            data={stockLevels}
          >

            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="itemName"
            />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="qty"
            />

          </BarChart>

        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardCharts;