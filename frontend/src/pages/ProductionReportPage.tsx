import axios from "axios";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { io } from "socket.io-client";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";
const socket = io("http://localhost:5000");

export default function ProductionReportPage() {
const [summary, setSummary] = useState({
  totalProductions: 0,
  totalQuantity: 0,
  avgProduction: 0,
  completedProductions: 0,
});
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 5;

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

 

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
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

      start = formatDate(firstDay);
      end = formatDate(today);
    } else if (filter === "fiscal") {
      const firstDay = new Date(today.getFullYear(), 0, 1);

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
    }
  }, [startDate, endDate]);

 useEffect(() => {
  const refreshProductionReport = () => {
    console.log("Production report refreshed 🔥");
    loadReports();
    loadSummary();
  };

  socket.on("dashboardUpdated", refreshProductionReport);
  socket.on("productionUpdated", refreshProductionReport);

  return () => {
    socket.off("dashboardUpdated", refreshProductionReport);
    socket.off("productionUpdated", refreshProductionReport);
  };
}, [startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, reports]);

 const loadReports = async () => {
  const res = await axios.get(`${API}/production/report/list`, {
    params: {
      startDate,
      endDate,
   
    },
  });

  setReports(Array.isArray(res.data) ? res.data : []);
};

 const loadSummary = async () => {
  const res = await axios.get(`${API}/production/report/summary`, {
    params: {
      startDate,
      endDate,
      
    },
  });

  setSummary({
    totalProductions: Number(res.data.totalProductions) || 0,
    totalQuantity: Number(res.data.totalQuantity) || 0,
    avgProduction: Number(res.data.avgProduction) || 0,
    completedProductions: Number(res.data.completedProductions) || 0,
  });
};

  const applyFilter = () => {
    setCurrentPage(1);
    loadReports();
    loadSummary();
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
      r.productionNumber?.toString().toLowerCase().includes(q) ||
      r.productName?.toString().toLowerCase().includes(q) ||
      r.batchNumber?.toString().toLowerCase().includes(q) ||
      r.user?.toString().toLowerCase().includes(q) ||
      r.status?.toString().toLowerCase().includes(q)
    );
  });

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

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 34, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Production Report", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 23);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29);

    const cards = [
      ["Productions", String(summary.totalProductions)],
      ["Quantity", String(summary.totalQuantity)],
      ["Average Daily", String(summary.avgProduction)],
      ["Completed", String(summary.completedProductions)],
    ];

    let x = 14;
    const y = 44;

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

    autoTable(doc, {
      startY: 78,
      head: [["Production Code", "Machine Start", "Quantity", "Date"]],
      body: filteredReports.map((r) => [
        r.productionCode || "N/A",
        r.machineStart || "N/A",
        r.qtyProduced || 0,
        r.date ? new Date(r.date).toLocaleDateString() : "N/A",
      ]),
      theme: "striped",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    doc.save(`production-report-${startDate}-to-${endDate}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-5xl font-bold text-slate-900">
            Production Reports
          </h1>

          <p className="text-xl text-slate-600 mt-2">
            ERP Production Analytics Dashboard
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
              className="h-12 px-8 rounded-2xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition"
            >
              Apply Filter
            </button>

            <button
              onClick={resetFilter}
              className="h-12 px-8 rounded-2xl bg-gray-200 text-gray-800 text-lg font-semibold hover:bg-gray-300 transition"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden">
            
            <p className="text-xl text-gray-500">Total Productions</p>

            <h2 className="text-5xl font-bold text-blue-600">
              {summary.totalProductions}
            </h2>
          </div>
          <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden">
<p className="text-xl text-gray-500">
  Average Daily
</p>

<h2 className="text-5xl font-bold text-red-600 whitespace-nowrap">
  {summary.avgProduction || 0}
</h2></div>
          <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden">
            <p className="text-xl text-gray-500">Total Quantity</p>

            <h2 className="text-5xl font-bold text-green-600">
              {summary.totalQuantity}
            </h2>
          </div>


          <div className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden">
            <p className="text-xl text-gray-500">Completed Productions</p>

            <h2 className="text-5xl font-bold text-purple-600">
              {summary.completedProductions}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="flex flex-wrap justify-between gap-4 p-5 border-b">
            <input
              type="text"
              placeholder="Search production..."
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
              <table className="w-full min-w-[1000px] border-collapse">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="text-left p-4 text-lg font-bold">
                      Production #
                    </th>
                    <th className="text-left p-4 text-lg font-bold">Machine Start</th>
                   
                    <th className="text-left p-4 text-lg font-bold">
                      Quantity
                    </th>
                  
                    <th className="text-left p-4 text-lg font-bold">Date</th>
                  </tr>
                </thead>

              <tbody>
  {currentRows.length === 0 ? (
    <tr>
      <td colSpan={5} className="text-center p-8 text-gray-500">
        No production reports found
      </td>
    </tr>
  ) : (
    currentRows.map((r, index) => (
      <tr
        key={index}
        className="border-t hover:bg-slate-50 transition"
      >
        <td className="p-4 text-lg font-semibold">
          {r.productionCode || "N/A"}
        </td>

        <td className="p-4 text-lg">
          {r.machineStart ?? "N/A"}
        </td>

        <td className="p-4 text-lg font-bold text-blue-600">
          {r.qtyProduced || 0}
        </td>

      

        <td className="p-4 text-lg whitespace-nowrap">
          {r.date
            ? new Date(r.date).toLocaleDateString()
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
      </div>
    </div>
  );
}