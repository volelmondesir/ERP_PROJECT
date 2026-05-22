import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
 import { saveAuditLog } from "../utils/tempLog2";   
import { translations } from "../translations/translations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API = "http://localhost:5000/api";
const socket = io("http://localhost:5000");
type Summary = {
  totalSales: number;
  unpaid: number;
  pendingDeliveries?: number;
  readyDeliveries?: number;
  delivered?: number;
};

type TopProduct = {
  name: string;
  totalSold: number;
};

type StockLevel = {
  itemName: string;
  qty: number;
};

type CardProps = {
  title: string;
  value: string | number;
};

type LangType = keyof typeof translations;

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#0f766e",
  "#be123c",
  "#4f46e5",
];

const TrendsPage: React.FC = () => {
  const [summary, setSummary] = useState<Summary>({
    totalSales: 0,
    unpaid: 0,
    pendingDeliveries: 0,
    readyDeliveries: 0,
    delivered: 0,
  });

  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
  };
  useEffect(() => {
  
    saveAuditLog({
  
    moduleName: "Dashboard",
  
      submenuName: "Trends",
  
      actionType: "VIEW PAGE",
  
    });
  
  }, []);
useEffect(() => {
  loadData();

  const handleLanguageChange = () => {
    setLang((localStorage.getItem("lang") as LangType) || "en");
  };

  const refreshDashboard = () => {
    loadData();
  };
socket.on("dashboardUpdated", refreshDashboard);
  window.addEventListener("languageChanged", handleLanguageChange);

  

  return () => {
    window.removeEventListener("languageChanged", handleLanguageChange);
    socket.off("dashboardUpdated", refreshDashboard);
  };
}, []);

  const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;

  const shortName = (v: any) => {
    const text = String(v || "");
    return text.length > 14 ? text.slice(0, 14) + "..." : text;
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [sum, top, stock] = await Promise.all([
        axios.get(`${API}/dash/dashboard`),
        axios.get(`${API}/dash/top-products`),
        axios.get(`${API}/ic/items`),
      ]);

      setSummary(sum.data || {});

      setTopProducts(
        Array.isArray(top.data)
          ? top.data.map((p: any) => ({
              name: p.productName || p.itemName || "Unknown",
              totalSold: Number(p.totalSold || 0),
            }))
          : []
      );

      setStockLevels(
        Array.isArray(stock.data)
          ? stock.data.map((s: any) => ({
              itemName: s.itemName || s.productName || s.name || "Unknown",
              qty: Number(s.qty ?? s.stock ?? 0),
            }))
          : []
      );
    } catch (err: any) {
      console.log("Dashboard error:", err.response?.data || err);
      alert(err.response?.data?.message || "Dashboard load failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading dashboard...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 {t("trends", "Trends")}</h1>
          <h1 style={styles.subtitle}>
            {t("erpanalyticsoverview", "ERP analytics overview")}
          </h1>
        </div>

        <button onClick={loadData} style={styles.refreshBtn}>
          {t("refresh", "Refresh")}
        </button>
      </div>

      <div style={styles.cardGrid}>
        <Card title={`💰 ${t("sales", "Sales")}`} value={money(summary.totalSales)} />
        <Card title={`❌ ${t("unpaid", "Unpaid")}`} value={money(summary.unpaid)} />
        <Card title={`🚚 ${t("pending", "Pending")}`} value={summary.pendingDeliveries || 0} />
        <Card title={`✅ ${t("delivered", "Delivered")}`} value={summary.delivered || 0} />
      </div>

      <div style={styles.chartGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>🔥 {t("top5products", "Top 5 Products")}</h3>

          {topProducts.length === 0 ? (
            <div style={styles.empty}>
              {t("notopproductdata", "No top product data")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickFormatter={shortName}
                  angle={-15}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalSold" radius={[8, 8, 0, 0]}>
                  {topProducts.map((_, index) => (
                    <Cell
                      key={`top-product-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>📦 {t("stocklevels", "Stock Levels")}</h3>

          {stockLevels.length === 0 ? (
            <div style={styles.empty}>{t("nostockdata", "No stock data")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={stockLevels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="itemName"
                  tickFormatter={shortName}
                  angle={-15}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" radius={[8, 8, 0, 0]}>
                  {stockLevels.map((item, index) => {
                    const qty = Number(item.qty || 0);

                    const color =
                      qty <= 0
                        ? "#991b1b"
                        : qty < 50
                        ? "#dc2626"
                        : qty < 200
                        ? "#f59e0b"
                        : COLORS[index % COLORS.length];

                    return (
                      <Cell
                        key={`stock-${index}`}
                        fill={color}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<CardProps> = ({ title, value }) => (
  <div style={styles.kpiCard}>
    <h4 style={styles.kpiTitle}>{title}</h4>
    <h2 style={styles.kpiValue}>{value}</h2>
  </div>
);

export default TrendsPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },

  title: {
    margin: 0,
    fontSize: "38px",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: "6px",
    color: "#64748b",
    fontSize: "18px",
  },

  refreshBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#2563eb",
    color: "white",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },

cardGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  marginBottom: "30px",
},

  kpiCard: {
    background: "#fff",
    padding: "22px",
    borderRadius: "18px",
    boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
  },

  kpiTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "18px",
  },

  kpiValue: {
    margin: "12px 0 0",
    color: "#0f172a",
    fontSize: "32px",
  },

  chartGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
  },

  chartCard: {
    background: "#fff",
    padding: "22px",
    borderRadius: "18px",
    boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
  },

  chartTitle: {
    marginTop: 0,
    color: "#0f172a",
  },

  empty: {
    height: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
  },
};