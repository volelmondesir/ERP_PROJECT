

import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "/api";
import { translations } from "../translations/translations";

type LangType = keyof typeof translations;
type POInvoice = {
  id: number;
  poId?: number;
  poNumber?: string;
  invoiceNumber?: string;
  supplier: string;
  total: number;
  paidAmount: number;
  status: string;
  createdAt?: string;
};
const POpoReportsPage = () => {
  const [pos, setPos] = useState<POInvoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfTitle, setPdfTitle] = useState("");
  const perPage = 5;
   const [lang, setLang] = useState<LangType>(
      (localStorage.getItem("lang") as LangType) || "en"
    );
  
    const t = (key: string, fallback: string) => {
      return (translations[lang] as Record<string, string>)?.[key] || fallback;
    };
  useEffect(() => {
    loadPOs();
  }, []);
  const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;
  const getUsername = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.username || "admin";
    } catch {
      return "admin";
    }
  }; 
  const loadPOs = async () => {
    try {
      const res = await axios.get(`${API}/ap/supplier-invoices`);
      setPos(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      alert(err.response?.data?.message || "Load failed");
    }
  };
  const getPONumber = (po: POInvoice) => {
    return po.poNumber || po.invoiceNumber || `PO-${po.id}`;
  };
  const getBalance = (po: POInvoice) => {
    return Number(po.total || 0) - Number(po.paidAmount || 0);
  };
  const filtered = pos.filter((po) => {
    const q = search.toLowerCase();
    const status = String(po.status || "").toUpperCase();
    const matchSearch =
      String(getPONumber(po)).toLowerCase().includes(q) ||
      String(po.supplier || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalAmount = filtered.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalPaid = filtered.reduce((s, p) => s + Number(p.paidAmount || 0), 0);
  const totalBalance = filtered.reduce((s, p) => s + getBalance(p), 0);
  const paidCount = filtered.filter(
    (p) => String(p.status || "").toUpperCase() === "PAID"
  ).length;
  const unpaidCount = filtered.filter(
    (p) => String(p.status || "").toUpperCase() !== "PAID"
  ).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentData = filtered.slice((page - 1) * perPage, page * perPage);
  const openPdf = (doc: jsPDF, title: string) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(doc.output("blob"));
    setPdfUrl(url);
    setPdfTitle(title);
  };
const viewPO = async (po: POInvoice) => {
  try {
    let items: any[] = [];
    let poDetail: any = null;

    if (po.poId) {
      const itemsRes = await axios.get(`${API}/po/items/${po.poId}`);
      items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
    }

    if (po.poNumber) {
      try {
        const detail = await axios.get(
          `${API}/po/number/${encodeURIComponent(po.poNumber)}`
        );

        poDetail = detail.data;
        items = detail.data?.items || items;
      } catch {}
    } else if (po.poId) {
      const detail = await axios.get(`${API}/po/items/${po.poId}`);
      items = Array.isArray(detail.data) ? detail.data : [];
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = 18;

    const poNo = poDetail?.poNumber || getPONumber(po);
    const supplier = poDetail?.supplier || po.supplier || "N/A";
    const poDate = poDetail?.poDate || po.createdAt;
    const username = poDetail?.username || getUsername();

    const paidAmount = Number(
      poDetail?.paidAmount ??
        po.paidAmount ??
        0
    );

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);

    doc.text("PURCHASE ORDER", pageWidth / 2, y, {
      align: "center",
    });

    y += 18;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(`PO #: ${poNo}`, 20, y);
    y += 8;

    doc.text(`Supplier: ${supplier}`, 20, y);
    y += 8;

    doc.text(
      `Date: ${
        poDate
          ? new Date(poDate).toLocaleDateString()
          : "N/A"
      }`,
      20,
      y
    );

    y += 8;

    doc.text(`Created By: ${username}`, 20, y);

    const canvas = document.createElement("canvas");

    JsBarcode(canvas, poNo, {
      format: "CODE128",
      width: 2,
      height: 45,
      displayValue: true,
      fontSize: 14,
    });

    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      125,
      32,
      60,
      28
    );

    y += 22;

    doc.line(20, y, 190, y);

    y += 10;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 6, 170, 10, "F");

    doc.setFont("helvetica", "bold");

    doc.text("#", 22, y);
    doc.text("Material", 32, y);
    doc.text("Qty", 82, y);
    doc.text("Unit", 102, y);
    doc.text("Price", 125, y);
    doc.text("Total", 150, y);
    doc.text("Note", 175, y);

    y += 10;

    doc.setFont("helvetica", "normal");

    let poTotal = 0;

    items.forEach((item: any, index: number) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const name =
        item.materialName ||
        item.name ||
        item.itemName ||
        "";

      const qty = Number(
        item.quantity ??
          item.qty ??
          0
      );

      const unit = item.unit || "pcs";
      const price = Number(item.price || 0);
      const total = qty * price;
      const note = item.note || "-";

      poTotal += total;

      const nameLines = doc.splitTextToSize(name, 42);

      doc.text(String(index + 1), 22, y);
      doc.text(nameLines, 32, y);
      doc.text(String(qty), 82, y);
      doc.text(unit, 102, y);
      doc.text(money(price), 125, y);
      doc.text(money(total), 150, y);
      doc.text(String(note).slice(0, 15), 175, y);

      y += Math.max(8, nameLines.length * 6);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, y - 3, 190, y - 3);
    });

    if (items.length === 0) {
      doc.text("No items found", 20, y);
      y += 10;
    }

    y += 12;

    if (y > 245) {
      doc.addPage();
      y = 30;
    }

    const finalTotal =
      poTotal > 0
        ? poTotal
        : Number(po.total || 0);

    const balance = Math.max(
      finalTotal - paidAmount,
      0
    );

    const isPaid = balance <= 0;
    const isPartial = paidAmount > 0 && balance > 0;

    const statusText = isPaid
      ? "Paid"
      : isPartial
      ? "Partial"
      : "Unpaid";

    const statusColor = isPaid
      ? [22, 163, 74]
      : isPartial
      ? [245, 158, 11]
      : [220, 38, 38];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text("PO TOTAL:", 125, y);
    doc.text(money(finalTotal), 190, y, {
      align: "right",
    });

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.text("Paid:", 125, y);
    doc.text(money(paidAmount), 190, y, {
      align: "right",
    });

    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Balance:", 125, y);
    doc.text(money(balance), 190, y, {
      align: "right",
    });

    y += 10;

    doc.setTextColor(
      statusColor[0],
      statusColor[1],
      statusColor[2]
    );

    doc.text("Status:", 125, y);
    doc.text(statusText, 190, y, {
      align: "right",
    });

    doc.setTextColor(15, 23, 42);

    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text("Prepared By:", 20, y);
    doc.line(55, y, 105, y);

    doc.text("Approved By:", 120, y);
    doc.line(155, y, 190, y);

    openPdf(doc, `PO Preview - ${poNo}`);
  } catch (err: any) {
    console.log("VIEW PO ERROR:", err.response?.data || err);

    alert(
      err.response?.data?.message ||
        "PO preview failed"
    );
  }
};
  const exportReportPDF = () => {
    const doc = new jsPDF();
    let y = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PO PAYMENT REPORT", 105, y, { align: "center" });
    y += 12;
    doc.setFontSize(10);
    doc.text(`Total Amount: ${money(totalAmount)}`, 20, y);
    doc.text(`Paid: ${money(totalPaid)}`, 85, y);
    doc.text(`Balance: ${money(totalBalance)}`, 140, y);
    y += 12;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 6, 180, 10, "F");
    doc.text("PO", 18, y);
    doc.text("Supplier", 55, y);
    doc.text("Total", 105, y);
    doc.text("Paid", 130, y);
    doc.text("Balance", 155, y);
    doc.text("Status", 180, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    filtered.forEach((po) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(getPONumber(po), 18, y);
      doc.text(String(po.supplier || "").slice(0, 18), 55, y);
      doc.text(money(po.total), 105, y);
      doc.text(money(po.paidAmount), 130, y);
      doc.text(money(getBalance(po)), 155, y);
      doc.text(String(po.status || "UNPAID"), 180, y);
      y += 8;
    });
    openPdf(doc, "PO Payment Report");
  };
  const printPDF = () => {
    const iframe = document.getElementById("poPayFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
  };
  const closePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
      setPdfTitle("");
    }
  };
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>PO Payment Reports</h1>
            <p style={styles.subtitle}>Track paid and unpaid purchase orders</p>
          </div>
          <button style={styles.exportBtn} onClick={exportReportPDF}>
            Export PDF
          </button>
        </div>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span>Total PO Amount</span>
            <b style={styles.greenText}>{money(totalAmount)}</b>
          </div>
          <div style={styles.statCard}>
            <span>Paid Amount</span>
            <b style={styles.greenText}>{money(totalPaid)}</b>
          </div>
          <div style={styles.statCard}>
            <span>Unpaid Balance</span>
            <b style={styles.redText}>{money(totalBalance)}</b>
          </div>
          <div style={styles.statCard}>
            <span>Paid / Unpaid</span>
            <b>
              {paidCount} / {unpaidCount}
            </b>
          </div>
        </div>
        <div style={styles.filters}>
          <input
            style={styles.search}
            placeholder="Search PO or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            style={styles.select}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
          </select>
          <button style={styles.refreshBtn} onClick={loadPOs}>
            Refresh
          </button>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
         <thead>
              <tr>
                <th style={styles.th}>{t("invoice", "Invoice")}</th>
                <th style={styles.th}>{t("ponumber", "PO Number")}</th>
                <th style={styles.th}>{t("supplier", "Supplier")}</th>
                <th style={styles.th}>{t("total", "Total")}</th>
                <th style={styles.th}>{t("paid", "Paid")}</th>
                <th style={styles.th}>{t("balance", "Balance")}</th>
                <th style={styles.th}>{t("status", "Status")}</th>
                <th style={styles.th}>{t("date", "Date")}</th>
                <th style={styles.th}>{t("action", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.empty}>
                    No PO found
                  </td>
                </tr>
              ) : (
                currentData.map((po) => {
                  const status = String(po.status || "UNPAID").toUpperCase();
                  return (
                    <tr key={po.id}>
                      <td style={styles.td}>{po.invoiceNumber}</td>
                      <td style={styles.td}>{po.poNumber}</td>
                      <td style={styles.td}>{po.supplier}</td>
                      

                      <td style={styles.amount}>{money(po.total)}</td>
                      <td style={styles.td}>{money(po.paidAmount)}</td>
                      <td style={styles.balance}>{money(getBalance(po))}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            background:
                              status === "PAID"
                                ? "#16a34a"
                                : status === "PARTIAL"
                                ? "#f59e0b"
                                : "#dc2626",
                          }}
                        >
                          {status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {po.createdAt
                          ? new Date(po.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td style={styles.td}>
                        <button style={styles.viewBtn} onClick={() => viewPO(po)}>
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
            Prev
          </button>
          <b>
            Page {page} / {totalPages}
          </b>
          <button
            style={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
        {pdfUrl && (
          <div style={styles.pdfBox}>
            <div style={styles.pdfHeader}>
              <h3 style={{ margin: 0 }}>{pdfTitle || "PO Preview"}</h3>
              <div>
                <button style={styles.printBtn} onClick={printPDF}>
                  Print
                </button>
                <button style={styles.closeBtn} onClick={closePDF}>
                  Close
                </button>
              </div>
            </div>
            <iframe
              id="poPayFrame"
              src={pdfUrl}
              width="100%"
              height="560"
              style={styles.iframe}
            />
          </div>
        )}
      </div>
    </div>
  );
};
export default POpoReportsPage;
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "30px",
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
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    fontSize: "42px",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: "6px",
    color: "#64748b",
    fontSize: "18px",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "17px",
  },
  greenText: {
    color: "#16a34a",
    fontSize: "28px",
  },
  redText: {
    color: "#dc2626",
    fontSize: "28px",
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "1fr 220px auto",
    gap: "14px",
    marginBottom: "18px",
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
  select: {
    marginTop: "20px",
    width: "180px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
  },
  refreshBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#e2e8f0",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: "14px",
    textAlign: "left",
    fontSize: "14px",
    color: "#334155",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },

tdBold: {
  padding: "11px 10px",
  borderTop: "1px solid #e2e8f0",
  fontWeight: "bold",
},
  amount: {
    padding: "11px 10px",
    borderTop: "1px solid #e2e8f0",
    color: "#16a34a",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  balance: {
    padding: "11px 10px",
    borderTop: "1px solid #e2e8f0",
    color: "#dc2626",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  badge: {
    color: "white",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  viewBtn: {
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    padding: "8px 12px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
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
  },
  pdfBox: {
    marginTop: "25px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
  },
  pdfHeader: {
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