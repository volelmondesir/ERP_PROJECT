import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import glogo from "../assets/glogo.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const socket = io("http://localhost:5000");

type Production = {
  productionCode: string;
  machineStart: number;
  date: string;
  qtyProduced: number;
};

const API = "http://localhost:5000/api";

export default function MgmDashboardPage() {
    const [company, setCompany] = useState<any>(null);
  const [data, setData] = useState<Production[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, avg: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [printUrl, setPrintUrl] = useState("");

  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const itemsPerPage = 3;

const colors = [
  // Blues & Cyans
  "#2563eb", // Blue
  // Oranges, Yellows, & Reds
  "#f59e0b", // Amber
  "#ef4444", // Red
   "#65a30d", // Olive
  "#f97316", // Orange
  "#059669", // Dark Teal
  "#e11d48", // Rose
  
  "#0891b2", // Aqua
  "#eab308", // Bright Yellow
   "#8b5cf6", // Violet
  "#ca8a04", // Mustard
    "#14b8a6", // Teal
  "#fb923c"  ,// Light Orange
  "#06b6d4", // Cyan
  // Purples & Pinks
  "#9333ea", // Purple
  "#10b981", // Mint
  "#0ea5e9", // Sky
  "#a855f7", // Fuchsia
 
    "#db2777", // Bright Pink
  "#7c3aed", // Deep Purple

  "#701a75", // Dark Plum
  "#c084fc", // Light Lavender

    "#22c55e", // Emerald
  "#0284c7", // Ocean
  "#6366f1", // Indigo
  
  // Greens & Teals
  "#16a34a", // Green

  "#dc2626", // Dark Red
  "#84cc16", // Lime

 


  
  

  
];



  const getColor = (index: number) => colors[index % colors.length];

  const loadData = async () => {
    try {
      const res = await axios.get(`${API}/production/dashboard`);
      const d = res.data;

      setData(d.productionData || []);
      setStats({
        total: d.totalProduced || 0,
        today: d.todayProduced || 0,
        avg: d.avgDaily || 0,
      });
    } catch (err) {
      console.error("Error loading dashboard:", err);
    }
  };

{/** useEffect(() => {
   // loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []); */}
 

  useEffect(() => {
    loadData();
  const refreshProductionReport = () => {
    console.log("Production report refreshed 🔥");
      loadData();
  };

  //socket.on("dashboardUpdated", refreshProductionReport);
  socket.on("productionUpdated", refreshProductionReport);

  return () => {
   // socket.off("dashboardUpdated", refreshProductionReport);
    socket.off("productionUpdated", refreshProductionReport);
  };
}, []);

  useEffect(() => {
    loadCompany();
    return () => {
      if (printUrl) URL.revokeObjectURL(printUrl);
    };
  }, [printUrl]);
  const loadCompany = async () => {
    try {
      const companyRes = await axios.get(`${API}/company`);
      setCompany(companyRes.data?.data || companyRes.data);
    } catch (err) {
      console.log("COMPANY LOAD ERROR 👉", err);
    }
  };
  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));

  const currentData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const viewProduction = async (code: string) => {
    try {
      setSelectedCode(code);

      const res = await fetch(`${API}/production/${code}`);
      let html = await res.text();

      const printCss = `
        <style>
          @page {
            size: auto;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }

          body {
            padding: 40px 60px;
          }

          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
            }

            body {
              padding: 40px 60px !important;
            }
          }
        </style>
      `;

      if (html.includes("</head>")) {
        html = html.replace("</head>", `${printCss}</head>`);
      } else {
        html = `${printCss}${html}`;
      }

      if (printUrl) URL.revokeObjectURL(printUrl);

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      setPrintUrl(url);
    } catch (err) {
      console.error("VIEW ERROR:", err);
      alert("Preview failed");
    }
  };

  const handlePrint = () => {
    const iframe = printFrameRef.current;

    if (!iframe?.contentWindow) {
      alert("Preview not ready");
      return;
    }

    iframe.contentWindow.focus();

    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 300);
  };

  const closePreview = () => {
    setSelectedCode(null);

    if (printUrl) {
      URL.revokeObjectURL(printUrl);
      setPrintUrl("");
    }
  };

  return (
  <div style={styles.page}>
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Manufacturing Dashboard</h1>
          <p style={styles.subtitle}>
            Production analytics and print preview
          </p>
        </div>

       <div
  style={{
    ...styles.status,
    color: stats.today > 0 ? "#16a34a" : "#dc2626",
    boxShadow:
      stats.today > 0
        ? "0 0 12px #16a34a"
        : "0 0 12px #dc2626",
    padding: "8px 16px",
    borderRadius: "999px",
    background:
      stats.today > 0
        ? "rgba(22,163,74,0.08)"
        : "rgba(220,38,38,0.08)",
    transition: "0.3s ease",
  }}
>
  ● {stats.today > 0 ? "Active" : "No Production"}
</div>
      </div>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Total Production</span>
          <b style={{ ...styles.kpiNumber, color: "#2563eb" }}>
            {stats.total.toLocaleString()}
          </b>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Today</span>
          <b style={{ ...styles.kpiNumber, color: "#16a34a" }}>
            {stats.today.toLocaleString()}
          </b>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Avg Daily</span>
          <b style={{ ...styles.kpiNumber, color: "#9333ea" }}>
            {stats.avg.toLocaleString()}
          </b>
        </div>
      </div>

      <div style={styles.chartBox}>
        <h3 style={styles.sectionTitle}>Production Chart</h3>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <div
            style={{
              width: Math.max(data.length * 45, 500),
              height: 280,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="0%" barGap={0}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="productionCode"
                  interval={0}
                  angle={-90}
                  textAnchor="end"
                  height={70}
                  tick={{
                    fontSize: 9,
                    fontWeight: "bold",
                    fill: "#334155",
                  }}
                />

                <YAxis />

               <Tooltip
  contentStyle={{
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 25px rgba(42, 15, 15, 0.12)",
    whiteSpace: "pre-line"

  }}
  formatter={(value) => [
    value,
    "Qty  ",
  ]}
  labelFormatter={(label) => {
    const item = data.find(
      (d) => d.productionCode === label
    );

   return `
 Code : ${label}
Date : ${item?.date?.split("T")[0]}
`;
  }}
/>

                <Bar
                  dataKey="qtyProduced"
                  radius={[8, 8, 0, 0]}
                  barSize={15}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <h3 style={styles.sectionTitle}></h3>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Machine Counter</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={5} style={styles.empty}>
                  No data
                </td>
              </tr>
            ) : (
              currentData.map((p, i) => (
                <tr key={i}>
                  <td style={styles.tdBold}>
                    <span
                      style={{
                        ...styles.codeBadge,
                        background: getColor(
                          (currentPage - 1) * itemsPerPage + i
                        ),
                      }}
                    >
                      {p.productionCode}
                    </span>
                  </td>

                  <td style={styles.td}>{p.machineStart ?? "N/A"}</td>
                  <td style={styles.td}>{p.date.split("T")[0]}</td>
                  <td style={styles.amount}>{p.qtyProduced}</td>

                  <td style={styles.td}>
                    <button
                      onClick={() => viewProduction(p.productionCode)}
                      style={styles.viewBtn}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        <button
          style={styles.pageBtn}
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          Prev
        </button>

        <b>
          Page {currentPage} / {totalPages}
        </b>

        <button
          style={styles.pageBtn}
          onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {selectedCode && printUrl && (
        <div style={styles.previewBox}>
          <div style={styles.previewHeader}>
          <div style={styles.previewTitleBox}>

  <div>
 

  </div>
</div>

            <div>
              <button style={styles.printBtn} onClick={handlePrint}>
                Print
              </button>

              <button style={styles.closeBtn} onClick={closePreview}>
                Close
              </button>
            </div>
          </div>

          <iframe
            ref={printFrameRef}
            title="production-print-preview"
            src={printUrl}
            width="100%"
            height="520"
            style={styles.iframe}
          />
        </div>
      )}
    </div>
  </div>
);
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "0px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    background: "#fff",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  title: {
    margin: 0,
    fontSize: "38px",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: "6px",
    color: "#64748b",
    fontSize: "16px",
  },

  status: {
    fontWeight: "bold",
    fontSize: "18px",
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "18px",
    marginBottom: "25px",
  },
kpiCard: {
  background: "linear-gradient(135deg, #ffffff, #f8fafc)",
  border: "1px solid #dbeafe",
  borderRadius: "24px",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "0px",
  boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  transition: "0.3s ease",
  cursor: "pointer",
},

kpiLabel: {
  fontSize: "20px",
  fontWeight: 400,
  color: "#475569",
},

kpiNumber: {
  fontSize: "38px",
  fontWeight: 700,
  letterSpacing: "-1px",
},
  chartBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "25px",
  },

  sectionTitle: {
    color: "#0f172a",
  },

  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    background: "#f1f5f9",
    padding: "14px",
    textAlign: "left",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
  },

  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontWeight: "bold",
  },

  codeBadge: {
    color: "#fff",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    display: "inline-block",
    boxShadow: "0 6px 14px rgba(15,23,42,0.18)",
  },

  amount: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#16a34a",
    fontWeight: "bold",
  },

  empty: {
    padding: "25px",
    textAlign: "center",
    color: "#64748b",
  },

  viewBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  pagination: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
  },

  pageBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#e2e8f0",
    padding: "9px 15px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  previewBox: {
    marginTop: "25px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  printBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },

  closeBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "white",
    padding: "9px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  iframe: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "white",
  },
  
};