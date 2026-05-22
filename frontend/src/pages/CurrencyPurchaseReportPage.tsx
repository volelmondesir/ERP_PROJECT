import axios from "axios";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
 import { saveAuditLog } from "../utils/tempLog2"; 
const socket = io("http://localhost:5000");

export default function CurrencyPurchaseReportPage() {
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalHTG: 0,
    totalUSD: 0,
    totalCAD: 0,
  });
const formatDate = (date:Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};
 const [cashierSales, setCashierSales] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [deviseFilter, setDeviseFilter] = useState("all");

  const [filter, setFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const moneyHTG = (value: number) => `HTG ${Number(value || 0).toFixed(2)}`;
  const moneyUSD = (value: number) => `$${Number(value || 0).toFixed(2)}`;

  useEffect(() => {
    const today = new Date();
    let start = "";
    let end = "";

    if (filter === "today") {
    start = formatDate(today);
      end = start;
    } else if (filter === "yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      start = y.toISOString().split("T")[0];
      end = start;
    } else if (filter === "week") {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay());
      start = firstDay.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    } else if (filter === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    } else if (filter === "fiscal") {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      start = firstDay.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    }

    if (filter !== "custom") {
      setStartDate(start);
      setEndDate(end);
    }
  }, [filter]);

useEffect(() => {

  saveAuditLog({

  moduleName: "Cashier",

    submenuName: "Currency Report",

    actionType: "VIEW PAGE",

  });

}, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
      loadSummary();
     loadCashierSales();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const refreshCurrencyReport = () => {
      if (startDate && endDate) {
        loadReports();
        loadSummary();
        loadCashierSales();
      }
    };

    socket.on("currencyUpdated", refreshCurrencyReport);
    socket.on("dashboardUpdated", refreshCurrencyReport);

    return () => {
      socket.off("currencyUpdated", refreshCurrencyReport);
      socket.off("dashboardUpdated", refreshCurrencyReport);
    };
  }, [startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, deviseFilter, reports]);

  const loadReports = async () => {
    const res = await axios.get("http://localhost:5000/api/devises/report", {
      params: { startDate, endDate },
    });

    setReports(Array.isArray(res.data) ? res.data : []);
  };

  const loadSummary = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/devises/report/summary",
      {
        params: { startDate, endDate },
      }
    );

    setSummary(res.data);
  };

const loadCashierSales = async () => {
  const res = await axios.get(
    "http://localhost:5000/api/devises/report/cashiers",
    {
      params: { startDate, endDate },
    }
  );

  console.log("CASHIER DATA:", res.data);
  setCashierSales(res.data || []);
};
  const applyFilter = () => {
    setCurrentPage(1);
    loadReports();
    loadSummary();
  };

  const resetFilter = () => {
    setSearch("");
    setDeviseFilter("all");
    setCurrentPage(1);
    setFilter("today");
  };

  const filteredReports = reports.filter((r) => {
    const q = search.toLowerCase();

    const matchesSearch =
      !search.trim() ||
      r.customerName?.toString().toLowerCase().includes(q) ||
      r.receiptNumber?.toString().toLowerCase().includes(q) ||
      r.deviseName?.toString().toLowerCase().includes(q) ||
      r.cashier?.toString().toLowerCase().includes(q) ||
      r.username?.toString().toLowerCase().includes(q);

    const matchesDevise =
      deviseFilter === "all" ||
      r.deviseName?.toString().toUpperCase() === deviseFilter;

    return matchesSearch && matchesDevise;
  });

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / rowsPerPage));

  const currentRows = filteredReports.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const exportPDF = () => {
    const rows = filteredReports
      .map(
        (r) => `
          <tr>
            <td>${r.receiptNumber || ""}</td>
            <td>${r.customerName || ""}</td>
            <td>${r.cashier || r.username || "N/A"}</td>
            <td>${r.deviseName || ""}</td>
            <td>${moneyUSD(r.amountDevise)}</td>
            <td>${Number(r.rate || 0)}</td>
            <td>${moneyHTG(r.totalHTG)}</td>
            <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}</td>
          </tr>
        `
      )
      .join("");

    const win = window.open("", "_blank");

    if (!win) return;
const cashierRows = cashierSales
  .map(
    (c) => `
      <tr>
        <td>${c.cashier || "N/A"}</td>
        <td>${moneyHTG(c.totalSales)}</td>
        <td>${moneyUSD(c.totalDevise)}</td>
        <td>${c.totalTransactions || 0}</td>
      </tr>
    `
  )
  .join("");
    win.document.write(`
      <html>
        <head>
          <title>Currency Purchase Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #111827;
            }

            h1 {
              margin-bottom: 5px;
            }

            .sub {
              color: #64748b;
              margin-bottom: 20px;
            }

            .cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 25px;
            }

            .card {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 15px;
            }

            .label {
              color: #64748b;
              font-size: 13px;
            }

            .value {
              font-size: 22px;
              font-weight: bold;
              margin-top: 5px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }

            th {
              background: #f1f5f9;
              text-align: left;
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }

            td {
              padding: 10px;
              border-bottom: 1px solid #eee;
            }

            .green {
              color: #16a34a;
              font-weight: bold;
            }

            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <button onclick="window.print()">Print / Save PDF</button>

          <h1>Currency Purchase Reports</h1>
          <div class="sub">
            Period: ${startDate} to ${endDate}
          </div>

          <div class="cards">
            <div class="card">
              <div class="label">Total HTG</div>
              <div class="value red">${moneyHTG(summary.totalHTG)}</div>
            </div>

            <div class="card">
              <div class="label">Transactions</div>
              <div class="value">${summary.totalTransactions}</div>
            </div>

            <div class="card">
              <div class="label">USD Purchased</div>
              <div class="value">${moneyUSD(summary.totalUSD)}</div>
            </div>

            <div class="card">
              <div class="label">CAD Purchased</div>
              <div class="value">${moneyUSD(summary.totalCAD)}</div>
            </div>
          </div>
<h2 style="margin-top:40px;">
<table>
  <thead>
    <tr>
      <th>Receipt</th>
      <th>Customer</th>
      <th>Cashier</th>
      <th>Devise</th>
      <th>Amount</th>
      <th>Rate</th>
      <th>Total HTG</th>
      <th>Date</th>
    </tr>
  </thead>

  <tbody>
    ${rows}
  </tbody>
</table>

<h2 style="margin-top:40px;">
  Sales By Cashier
</h2>

<table>
  <thead>
    <tr>
      <th>Cashier</th>
      <th>Total HTG</th>
      <th>Total Devise</th>
      <th>Transactions</th>
    </tr>
  </thead>

  <tbody>
    ${cashierRows}
  </tbody>
</table>
        </body>
      </html>
    `);

    win.document.close();
  };


return (
  <div className="min-h-screen bg-gray-100 p-6 overflow-x-hidden">
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl xl:text-5xl font-bold text-slate-900">
          Currency Purchase Reports
        </h1>
        <p className="text-xl text-slate-600 mt-2">
          ERP / Currency Purchase Analytics Dashboard
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-200 overflow-hidden">
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

          <div className="flex flex-col min-w-[180px]">
            <label className="text-sm font-semibold text-gray-600 mb-2">
              Devise
            </label>

            <select
              value={deviseFilter}
              onChange={(e) => setDeviseFilter(e.target.value)}
              className="h-12 rounded-2xl border border-gray-300 px-4 text-lg"
            >
              <option value="all">All</option>
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
            </select>
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
  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">Total HTG</p>
    <h2 className="text-5xl font-bold text-red-600 whitespace-nowrap">
      {moneyHTG(summary.totalHTG)}
    </h2>
  </div>

  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">Transactions</p>
    <h2 className="text-5xl font-bold">
      {summary.totalTransactions}
    </h2>
  </div>

  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">USD Purchased</p>
    <h2 className="text-5xl font-bold text-green-600 whitespace-nowrap">
      {moneyUSD(summary.totalUSD)}
    </h2>
  </div>

  <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden min-w-0">
    <p className="text-xl text-gray-500">CAD Purchased</p>
    <h2 className="text-5xl font-bold text-blue-600 whitespace-nowrap">
      {moneyUSD(summary.totalCAD)}
    </h2>
  </div>
</div>
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="flex justify-between gap-4 p-5 border-b">
          <input
            type="text"
            placeholder="Search receipt, customer, user, devise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 w-full md:w-[420px] rounded-2xl border px-4 text-lg"
          />

          <button
            onClick={exportPDF}
            className="h-12 px-6 rounded-2xl bg-black text-white text-lg font-semibold whitespace-nowrap"
          >
            Export PDF
          </button>
        </div>
 <div className="overflow-x-auto rounded-2xl">

    <table className="w-full min-w-[900px] border-collapse">

      <thead className="bg-blue-100">
              <tr>
                <th className="text-left p-4 text-lg font-bold">Receipt</th>
                <th className="text-left p-4 text-lg font-bold">Customer</th>
                <th className="text-left p-4 text-lg font-bold">Cashier</th>
                <th className="text-left p-4 text-lg font-bold">Devise</th>
                <th className="text-left p-4 text-lg font-bold">Amount</th>
                <th className="text-left p-4 text-lg font-bold">Rate</th>
                <th className="text-left p-4 text-lg font-bold">Total HTG</th>
                <th className="text-left p-4 text-lg font-bold">Date</th>
              </tr>
            </thead>

            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-gray-500">
                    No currency purchase found
                  </td>
                </tr>
              ) : (
                currentRows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 text-lg">{r.receiptNumber}</td>
                    <td className="p-4 text-lg">{r.customerName}</td>
                    <td className="p-4 text-lg">
                      {r.cashier || r.username || "N/A"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-4 py-1 rounded-full text-sm font-semibold text-white ${
                          r.deviseName === "USD"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                      >
                        {r.deviseName}
                      </span>
                    </td>

   <td
  className={`p-4 text-lg font-bold ${
    r.deviseName === "CAD"
      ? "text-blue-600"
      : "text-green-600"
  }`}
>
  {moneyUSD(r.amountDevise)}
</td>       <td
  className={`p-4 text-lg font-bold ${
    r.deviseName === "CAD"
      ? "text-blue-600"
      : "text-green-600"
  }`}
>
  {Number(r.rate || 0)}
</td> 

                    <td className="p-4 text-lg font-bold text-red-600">
                      {moneyHTG(r.totalHTG)}
                    </td>

                    <td className="p-4 text-lg">
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

      <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden">
        <h2 className="text-3xl font-bold mb-5">Sales By Cashier</h2>

        {cashierSales.length === 0 ? (
          <p className="text-gray-500">No cashier sales found</p>
        ) : (
          cashierSales.map((c, i) => (
            <div
              key={i}
              className="flex justify-between items-center border-b py-4 gap-4"
            >
              <div className="min-w-0">
                <span className="text-2xl font-semibold truncate block">
                  {c.cashier || "N/A"}
                </span>
              </div>

              <div className="flex items-end gap-3 whitespace-nowrap">
                <span className="text-2xl font-bold text-green-600">
                  {moneyUSD(c.totalDevise)}
                </span>

                <span className="text-2xl font-bold text-black">/</span>

                <span className="text-2xl font-bold text-red-600">
                  {moneyHTG(c.totalSales)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);
 
}