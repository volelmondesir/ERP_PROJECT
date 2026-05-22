import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;
const API = "/api";

type PO = {
  id: number;
  poNumber: string;
  supplier: string;
  poDate?: string;
  createdAt?: string;
  total?: number;
  items?: any[];
};

const POReportPage = () => {
  const [pos, setPos] = useState<PO[]>([]);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const perPage = 5;
 const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (
      (translations[lang] as Record<string, string>)?.[key] ||
      fallback
    );
  };
   useEffect(() => {
      const handleLanguageChange = () => {
        setLang((localStorage.getItem("lang") as LangType) || "en");
      };
  
      handleLanguageChange();
  
      window.addEventListener("languageChanged", handleLanguageChange);
  
      return () => {
        window.removeEventListener("languageChanged", handleLanguageChange);
      };
    }, []);
  
  useEffect(() => {
    setDefaultDates("today");
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadPOs();
    }
  }, [startDate, endDate]);

  const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;

  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

  const setDefaultDates = (filter: string) => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (filter === "yesterday") {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    }

    if (filter === "week") {
      start.setDate(today.getDate() - 7);
    }

    if (filter === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    if (filter === "all") {
      start = new Date("2000-01-01");
    }

    setStartDate(dateOnly(start));
    setEndDate(dateOnly(end));
  };

  const getPOTotal = (po: PO) => {
    if (po.total !== undefined && po.total !== null) {
      return Number(po.total || 0);
    }

    if (po.items && Array.isArray(po.items)) {
      return po.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.price || 0),
        0
      );
    }

    return 0;
  };

  const loadPOs = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/po`);
      const list = Array.isArray(res.data) ? res.data : [];

      const withTotals = await Promise.all(
        list.map(async (po: PO) => {
          try {
            const detail = await axios.get(
              `${API}/po/number/${encodeURIComponent(po.poNumber)}`
            );

            const fullPO = detail.data;

            return {
              ...po,
              items: fullPO.items || [],
              total: getPOTotal(fullPO),
            };
          } catch {
            return {
              ...po,
              total: 0,
            };
          }
        })
      );

      setPos(withTotals);
      setPage(1);
    } catch (err: any) {
      console.log("LOAD PO REPORT ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Load PO failed");
    } finally {
      setLoading(false);
    }
  };

  const filtered = pos.filter((po) => {
    const q = search.toLowerCase();

    const poDate = new Date(po.poDate || po.createdAt || "");
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const matchDate =
      quickFilter === "all" || (poDate >= start && poDate <= end);

    const matchSearch =
      String(po.poNumber || "").toLowerCase().includes(q) ||
      String(po.supplier || "").toLowerCase().includes(q);

    return matchDate && matchSearch;
  });

  const totalAmount = filtered.reduce((sum, po) => sum + getPOTotal(po), 0);
  const totalPO = filtered.length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentData = filtered.slice((page - 1) * perPage, page * perPage);

  const resetFilter = () => {
    setSearch("");
    setQuickFilter("today");
    setDefaultDates("today");
  };

  const generatePDF = (po: PO) => {
  const doc = new jsPDF();

  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);

  doc.text("PURCHASE ORDER", 105, y, {
    align: "center",
  });

  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);

  doc.text(`PO #: ${po.poNumber}`, 20, y);
  y += 12;

  doc.text(`Supplier: ${po.supplier}`, 20, y);
  y += 12;

  doc.text(
    `Date: ${
      po.poDate
        ? new Date(po.poDate).toLocaleDateString()
        : ""
    }`,
    20,
    y
  );

  y += 12;

  const storedUser = localStorage.getItem("user");

  let username = "Admin";

  if (storedUser) {
    try {
      username = JSON.parse(storedUser).username;
    } catch {}
  }

  doc.text(`Created By: ${username}`, 20, y);

  y += 10;

  const canvas = document.createElement("canvas");

  JsBarcode(canvas, po.poNumber, {
    format: "CODE128",
    width: 2,
    height: 40,
    displayValue: true,
  });

  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    125,
    45,
    60,
    22
  );

  y += 30;

  doc.line(20, y, 190, y);

  y += 10;

  doc.setFont("helvetica", "bold");

doc.text("#", 20, y);
doc.text("Material", 35, y);
doc.text("Qty", 90, y);
doc.text("Unit", 110, y);

doc.text("Price", 155, y, {
  align: "right",
});

doc.text("Total", 190, y, {
  align: "right",
});

y += 6;

doc.line(20, y, 190, y);

y += 10;

doc.setFont("helvetica", "normal");

po.items?.forEach((item: any, i: number) => {
  const qty = Number(
    item.qty ??
    item.quantity ??
    1
  );

  const price = Number(item.price || 0);
  const total = qty * price;

  const material =
    item.materialName ||
    item.itemName ||
    "";

  doc.text(String(i + 1), 20, y);

  doc.text(material, 35, y);

  doc.text(String(qty), 90, y);

  doc.text(item.unit || "pcs", 110, y);

  doc.text(money(price), 155, y, {
    align: "right",
  });

  doc.text(money(total), 190, y, {
    align: "right",
  });

  y += 10;
});

y += 10;

doc.line(120, y, 190, y);

y += 10;

doc.setFont("helvetica", "bold");

doc.text("TOTAL:", 145, y, {
  align: "right",
});

doc.text(money(po.total || 0), 190, y, {
  align: "right",
});;

  const blob = doc.output("blob");

  const url = URL.createObjectURL(blob);

  setPdfUrl(url);
};
  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PO REPORT", 105, y, { align: "center" });

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 20, y);
    y += 6;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text(`Total PO: ${totalPO}`, 20, y);
    doc.text(`Total Amount: ${money(totalAmount)}`, 140, y);

    y += 12;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 6, 170, 10, "F");

    doc.text("PO", 22, y);
    doc.text("Supplier", 65, y);
    doc.text("Total", 130, y);
    doc.text("Date", 165, y);

    y += 10;
    doc.setFont("helvetica", "normal");

    filtered.forEach((po) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const date = po.poDate || po.createdAt;

      doc.text(po.poNumber || "", 22, y);
      doc.text(po.supplier || "", 65, y);
      doc.text(money(getPOTotal(po)), 130, y);
      doc.text(date ? new Date(date).toLocaleDateString() : "N/A", 165, y);

      y += 8;
    });

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
  };

  const printPDF = () => {
    const iframe = document.getElementById("poReportFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  return (
  <div style={styles.page}>
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {t("poreports", "PO Reports")}
          </h1>

          <p style={styles.subtitle}>
            {t(
              "erp_purchase_order_analytics_dashboard",
              "ERP / Purchase Order Analytics Dashboard"
            )}
          </p>
        </div>

        <button style={styles.exportBtn} onClick={exportPDF}>
          {t("exportpdf", "Export PDF")}
        </button>
      </div>

      <div style={styles.filterBox}>
        <div>
          <label style={styles.label}>{t("quickfilter", "Quick Filter")}</label>

          <select
            style={styles.input}
            value={quickFilter}
            onChange={(e) => {
              setQuickFilter(e.target.value);
              setDefaultDates(e.target.value);
            }}
          >
            <option value="today">{t("today", "Today")}</option>
            <option value="yesterday">{t("yesterday", "Yesterday")}</option>
            <option value="week">{t("last7days", "Last 7 Days")}</option>
            <option value="month">{t("thismonth", "This Month")}</option>
            <option value="all">{t("all", "All")}</option>
          </select>
        </div>

        <div>
          <label style={styles.label}>{t("startdate", "Start Date")}</label>
          <input
            style={styles.input}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label style={styles.label}>{t("enddate", "End Date")}</label>
          <input
            style={styles.input}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button style={styles.applyBtn} onClick={loadPOs}>
          {t("applyfilter", "Apply Filter")}
        </button>

        <button style={styles.resetBtn} onClick={resetFilter}>
          {t("reset", "Reset")}
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span>{t("totalpoamount", "Total PO Amount")}</span>
          <b style={styles.greenText}>{money(totalAmount)}</b>
        </div>

        <div style={styles.statCard}>
          <span>{t("totalpo", "Total PO")}</span>
          <b>{totalPO}</b>
        </div>

        <div style={styles.statCard}>
          <span>{t("currentpage", "Current Page")}</span>
          <b>
            {page} / {totalPages}
          </b>
        </div>
      </div>

      {loading && (
        <div style={styles.loading}>
          {t("loading", "Loading...")}
        </div>
      )}

      <input
        style={styles.search}
        placeholder={t("searchpoorsupplier", "Search PO or supplier...")}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{t("po", "PO")}</th>
              <th style={styles.th}>{t("supplier", "Supplier")}</th>
              <th style={styles.th}>{t("total", "Total")}</th>
              <th style={styles.th}>{t("date", "Date")}</th>
              <th style={styles.th}>{t("action", "Action")}</th>
            </tr>
          </thead>

          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.empty}>
                  {t("nopofound", "No PO found")}
                </td>
              </tr>
            ) : (
              currentData.map((po) => {
                const date = po.poDate || po.createdAt;

                return (
                  <tr key={po.id}>
                    <td style={styles.tdBold}>{po.poNumber}</td>
                    <td style={styles.td}>{po.supplier}</td>
                    <td style={styles.amount}>{money(getPOTotal(po))}</td>
                    <td style={styles.td}>
                      {date ? new Date(date).toLocaleDateString() : "N/A"}
                    </td>
                    <td style={styles.td}>
  <button
    style={styles.viewBtn}
    onClick={() => generatePDF(po)}
  >
    View
  </button>
</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        <button
          style={styles.pageBtn}
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t("prev", "Prev")}
        </button>

        <b>
          {t("page", "Page")} {page} / {totalPages}
        </b>

        <button
          style={styles.pageBtn}
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          {t("next", "Next")}
        </button>
      </div>

   {pdfUrl && (
  <div style={styles.pdfBox}>
    <div style={styles.pdfHeader}>
      <h3 style={{ margin: 0 }}>
        Purchase Order Preview
      </h3>

      <div>
        <button
          style={styles.printBtn}
          onClick={() => {
            const iframe =
              document.getElementById(
                "pdfFrame"
              ) as HTMLIFrameElement;

            iframe?.contentWindow?.print();
          }}
        >
          Print
        </button>

        <button
          style={styles.closeBtn}
          onClick={() => {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl("");
          }}
        >
          Close
        </button>
      </div>
    </div>

    <iframe
      id="pdfFrame"
      src={pdfUrl}
      width="100%"
      height="900"
      style={styles.iframe}
    />
  </div>
)}
    </div>
  </div>
);
};

export default POReportPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "white",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    marginBottom: "18px",
  },
  title: {
    margin: 0,
    fontSize: "52px",
    color: "#0f172a",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "20px",
    color: "#64748b",
  },
  filterBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr auto auto",
    gap: "14px",
    alignItems: "end",
    marginTop: "18px",
    background: "#f8fafc",
    padding: "18px",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "bold",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    background: "white",
  },
  applyBtn: {
    border: "none",
    borderRadius: "14px",
    background: "#2563eb",
    color: "white",
    padding: "14px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  resetBtn: {
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    padding: "14px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  exportBtn: {
    border: "none",
    borderRadius: "16px",
    background: "#020617",
    color: "white",
    padding: "14px 22px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "18px",
    marginTop: "20px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "18px",
  },
  greenText: {
    color: "#f81212",
    fontSize: "30px",
  },
  loading: {
    marginTop: "14px",
    color: "#64748b",
  },
  search: {
    marginTop: "20px",
    width: "360px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
  },
  tableWrap: {
    marginTop: "18px",
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
    color: "#0f172a",
    fontSize: "16px",
  },
  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "15px",
  },
  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontWeight: "bold",
    fontSize: "15px",
  },
  amount: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#fa0c0c",
    fontWeight: "bold",
    fontSize: "15px",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },
  pagination: {
    marginTop: "18px",
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
    outline: "none",
  },
 

pdfBox: {
  marginTop: "25px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "16px",
},

pdfHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "14px",
},

printBtn: {
  border: "none",
  borderRadius: "10px",
  background: "#16a34a",
  color: "white",
  padding: "10px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "8px",
},

closeBtn: {
  border: "none",
  borderRadius: "10px",
  background: "#dc2626",
  color: "white",
  padding: "10px 14px",
  fontWeight: "bold",
  cursor: "pointer",
},

iframe: {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  background: "#fff",
},
};