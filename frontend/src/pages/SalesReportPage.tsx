import axios from "axios";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
 import { saveAuditLog } from "../utils/tempLog2";   
const socket = io("http://localhost:5000");
export default function SalesReportPage() {
  const [summary, setSummary] = useState({
    totalSales: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    totalOrders: 0,
  });

  const [cashierSales, setCashierSales] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};


 useEffect(() => {
  
    saveAuditLog({
  
    moduleName: "Marketting",
  
      submenuName: "Sales Report",
  
      actionType: "VIEW PAGE",
  
    });
  
  }, []);
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value) || 0);

  useEffect(() => {
    const today = new Date();
    let start = "";
    let end = "";
if (filter === "today") {
  start = formatDate(today);
  end = formatDate(today);

} else if (filter === "yesterday") {
  const y = new Date(today);

  y.setDate(today.getDate() - 1);

  start = formatDate(y);
  end = formatDate(y);

} else if (filter === "week") {
  const firstDay = new Date(today);

  firstDay.setDate(today.getDate() - today.getDay());

  start = formatDate(firstDay);
  end = formatDate(today);

} else if (filter === "month") {
  const firstDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  start = formatDate(firstDay);
  end = formatDate(today);

} else if (filter === "fiscal") {
  const firstDay = new Date(
    today.getFullYear(),
    0,
    1
  );

  start = formatDate(firstDay);
  end = formatDate(today);
}

    if (filter !== "custom") {
      setStartDate(start);
      setEndDate(end);
    }
  }, [filter]);

 useEffect(() => {
  if (startDate && endDate) {
    loadReports();
    loadSummary();
    loadCashierSales();
  }
}, [startDate, endDate]);

useEffect(() => {
  const refreshSalesReport = () => {
    console.log("Sales report realtime refresh 🔥");

    if (startDate && endDate) {
      loadReports();
      loadSummary();
      loadCashierSales();
    }
  };

 // socket.on("dashboardUpdated", refreshSalesReport);
  socket.on("salesUpdated", refreshSalesReport);

  return () => {
   // socket.off("dashboardUpdated", refreshSalesReport);
    socket.off("salesUpdated", refreshSalesReport);
  };
}, [startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, reports]);

const loadReports = async () => {
  const res = await axios.get(
    "http://localhost:5000/api/reports/list",
    {
      params: {
        startDate,
        endDate,
      },
    }
  );

  console.log("REPORTS 👉", res.data);
  setReports(Array.isArray(res.data) ? res.data : []);
};
const loadSummary = async () => {
  const res = await axios.get("http://localhost:5000/api/reports/summary", {
    params: { startDate, endDate },
  });

  console.log("SUMMARY DATA:", res.data);
  setSummary(res.data);
};

const loadCashierSales = async () => {
  const res = await axios.get("http://localhost:5000/api/reports/cashiers", {
    params: { startDate, endDate },
  });

  console.log("CASHIER DATA:", res.data);
  setCashierSales(res.data);
};

  const applyFilter = () => {
    setCurrentPage(1);
    loadReports();
    loadSummary();
    loadCashierSales();
  };

  const resetFilter = () => {
    setSearch("");
    setCurrentPage(1);
    setFilter("today");
  };
const filteredReports = reports.filter((r) => {
  if (!search.trim()) return true;

  const q = search.toLowerCase();

  return (
    r.customerName?.toString().toLowerCase().includes(q) ||

    r.invoiceNumber?.toString().toLowerCase().includes(q) ||
    r.receiptNumber?.toString().toLowerCase().includes(q) ||
    r.cashier?.toString().toLowerCase().includes(q)
  );
});

const rowsPerPage = 5;

const totalPages = Math.max(
  1,
  Math.ceil(filteredReports.length / rowsPerPage)
);

const currentRows = filteredReports.slice(
  (currentPage - 1) * rowsPerPage,
  currentPage * rowsPerPage
);
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  
const exportPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Sales Report", 14, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 22);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // Summary cards
  const cards = [
    ["Total Sales", money(summary.totalSales)],
    ["Paid Invoices", String(summary.paidInvoices)],
    ["Unpaid Invoices", String(summary.unpaidInvoices)],
    ["Total Orders", String(summary.totalOrders)],
  ];

  let x = 14;
  let y = 42;

  cards.forEach((card) => {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y, 42, 22, 3, 3, "F");

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(card[0], x + 3, y + 7);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(card[1], x + 3, y + 16);

    x += 46;
  });

  // Sales table
  autoTable(doc, {
    startY: 75,
    head: [[
      "Invoice",
      "Receipt",
      "Customer",
      "Cashier",
      "Total",
      "Status",
      "Date",
    ]],
    body: filteredReports.map((r) => [
      r.invoiceNumber || "N/A",
      r.receiptNumber || "N/A",
      r.customerName || "N/A",
      r.cashier || "N/A",
      money(r.total),
      r.status || "N/A",
      r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
    ]),
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Cashier sales
  let finalY = (doc as any).lastAutoTable.finalY + 12;

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Sales By Cashier", 14, finalY);

  autoTable(doc, {
    startY: finalY + 5,
    head: [["Cashier", "Total Sales"]],
    body: cashierSales.map((c) => [
      c.cashier || "N/A",
      money(c.totalSales),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });

  doc.save(`sales-report-${startDate}-to-${endDate}.pdf`);
};
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-5xl font-bold text-slate-900">Sales Reports</h1>
          <p className="text-xl text-slate-600 mt-2">
            ERP / POS Sales Analytics Dashboard
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col min-w-[220px]">
              <label className="text-sm font-semibold text-gray-600 mb-2">
                Quick Filter
              </label>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-12 rounded-2xl border border-gray-300 px-4 text-lg"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="fiscal">Fiscal Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <div className="flex flex-col min-w-[220px]">
              <label className="text-sm font-semibold text-gray-600 mb-2">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setFilter("custom");
                  setStartDate(e.target.value);
                }}
                className="h-12 rounded-2xl border border-gray-300 px-4 text-lg"
              />
            </div>

            <div className="flex flex-col min-w-[220px]">
              <label className="text-sm font-semibold text-gray-600 mb-2">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setFilter("custom");
                  setEndDate(e.target.value);
                }}
                className="h-12 rounded-2xl border border-gray-300 px-4 text-lg"
              />
            </div>

            <button
              onClick={applyFilter}
              className="h-12 px-8 rounded-2xl bg-blue-600 text-white text-lg font-semibold"
            >
              Apply Filter
            </button>

            <button
              onClick={resetFilter}
              className="h-12 px-8 rounded-2xl bg-gray-200 text-gray-800 text-lg font-semibold"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

  {/* ✅ TOTAL SALES */}
  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">
      Total Sales
    </p>

    <h2 className="text-5xl font-bold text-green-600 whitespace-nowrap">
      {money(summary.totalSales)}
    </h2>
  </div>

  {/* ✅ PAID INVOICES */}
  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">
      Paid Invoices
    </p>

    <h2 className="text-5xl font-bold text-green-600">
      {summary.paidInvoices}
    </h2>
  </div>

  {/* ✅ UNPAID */}
  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">
      Unpaid Invoices
    </p>

    <h2 className="text-5xl font-bold text-red-600">
      {summary.unpaidInvoices}
    </h2>
  </div>

  {/* ✅ TOTAL ORDERS */}
  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">
      Total Orders
    </p>

    <h2 className="text-5xl font-bold text-blue-600">
      {summary.totalOrders}
    </h2>
  </div>

</div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="flex justify-between gap-4 p-5 border-b">
            <input
              type="text"
              placeholder="Search invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full md:w-[350px] rounded-2xl border px-4 text-lg"
            />

          <button
  onClick={exportPDF}
  className="h-12 px-6 rounded-2xl bg-black text-white text-lg font-semibold hover:bg-slate-800 transition"
>
  Export PDF
</button>
          </div>

         <div className="bg-white rounded-3xl shadow-lg p-4 overflow-hidden">

  <div className="overflow-x-auto rounded-2xl">

    <table className="w-full min-w-[900px] border-collapse">

      <thead className="bg-blue-100">
        <tr>
          <th className="text-left p-4 text-lg font-bold">Invoice</th>
          <th className="text-left p-4 text-lg font-bold">Receipt</th>
          <th className="text-left p-4 text-lg font-bold">Customer</th>
          <th className="text-left p-4 text-lg font-bold">Cashier</th>
          <th className="text-left p-4 text-lg font-bold">Total</th>
          <th className="text-left p-4 text-lg font-bold">Status</th>
          <th className="text-left p-4 text-lg font-bold">Date</th>
        </tr>
      </thead>

      <tbody>
        {currentRows.length === 0 ? (
          <tr>
            <td colSpan={7} className="text-center p-8 text-gray-500">
              No reports found
            </td>
          </tr>
        ) : (
          currentRows.map((r) => (
            <tr
              key={r.id}
              className="border-t hover:bg-slate-50 transition"
            >
              <td className="p-4 text-lg">{r.invoiceNumber}</td>
              <td className="p-4 text-lg">{r.receiptNumber}</td>
              <td className="p-4 text-lg">{r.customerName}</td>
              <td className="p-4 text-lg">{r.cashier || "N/A"}</td>

              <td className="p-4 text-lg font-bold text-green-600 whitespace-nowrap">
                {money(r.total)}
              </td>

              <td className="p-4">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold ${
                    r.status?.toLowerCase() === "paid"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-red-100 text-red-700 border border-red-300"
                  }`}
                >
                  {r.status?.toLowerCase() === "paid" ? "✓" : "!"}
                  {r.status}
                </span>
              </td>

              <td className="p-4 text-lg whitespace-nowrap">
                {r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString()
                  : "N/A"}
              </td>
            </tr>
          ))
        )}
      </tbody>

    </table>

  </div>

</div>

          <div className="flex justify-center items-center gap-4 p-5 border-t">
            <button
              onClick={goPrev}
              disabled={currentPage === 1}
              className="bg-gray-200 px-5 py-2 rounded-xl disabled:opacity-50"
            >
              Prev
            </button>

            <span className="font-semibold text-lg">
              Page {currentPage} / {totalPages}
            </span>

            <button
              onClick={goNext}
              disabled={currentPage === totalPages}
              className="bg-gray-200 px-5 py-2 rounded-xl disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-3xl font-bold mb-5">Sales By Cashier</h2>

          {cashierSales.length === 0 ? (
            <p className="text-gray-500">No cashier sales found</p>
          ) : (
            cashierSales.map((c, i) => (
              <div key={i} className="flex justify-between border-b py-3">
                <span className="text-lg">{c.cashier || "N/A"}</span>
                <span className="text-lg font-bold text-green-600">
                  {money(c.totalSales)}
                </span>
            
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}