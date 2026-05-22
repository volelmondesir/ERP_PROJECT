import { useState } from "react";
import axios from "axios";
import { saveAuditLog } from "../utils/tempLog2"; 
type Item = {
  code: string;
  qty: number;
  date: string;
};

export default function FinishedGoodsPage() {

  // ✅ FIX DATE BUG
  // timezone-safe today date
  const today = new Date();

  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];

  const [code, setCode] = useState("");
  const [qty, setQty] = useState(0);

  // ✅ default today
  const [date, setDate] = useState(localDate);

  const [list, setList] = useState<Item[]>([]);

  // 🔒 HANDLE QTY
  const handleQty = (value: number) => {
    if (value < 0) setQty(0);
    else setQty(value);
  };

  // ➕ ADD ROW
  const addRow = () => {

    if (!code || !date) {
      alert("Fill all fields");
      return;
    }

    if (qty <= 0) {
      alert("Qty must be greater than 0");
      return;
    }

    const newItem: Item = {
      code,
      qty,
      date,
    };

    setList([newItem, ...list]);

    // RESET FORM
    setCode("");
    setQty(0);

    // keep today date
    setDate(localDate);
  };

  // 💾 SAVE ALL
  const saveAll = async () => {

    if (list.length === 0) {
      alert("No data to save");
      return;
    }

    try {

      for (const item of list) {

        await axios.post(
          "http://localhost:5000/api/finishedgoods",
          {
            productionCode: item.code,
            qty: Number(item.qty),
            date: item.date,
          }
        );
      }

      alert("Saved & Production Updated ✅");

      setList([]);

    } catch (error) {

      console.error("SAVE ERROR:", error);

      alert("Error saving data ❌");
    }
  };

  // 🆕 RESET
  const resetAll = () => {
    setList([]);
    setCode("");
    setQty(0);
    setDate(localDate);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">

      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-5xl font-bold text-slate-900">
            Finished Goods
          </h1>

          <p className="text-xl text-slate-600 mt-2">
            Manufacturing Finished Goods Entry
          </p>
        </div>

        {/* FORM CARD */}
        <div className="bg-white rounded-3xl shadow-lg p-6 border border-slate-200">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* CODE */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-2">
                Production Code
              </label>

              <input
                type="text"
                placeholder="Enter code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-12 rounded-2xl border border-slate-300 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* QTY */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-2">
                Quantity
              </label>

              <input
                type="number"
                min="0"
                placeholder="Qty"
                value={qty}
                onChange={(e) => handleQty(Number(e.target.value))}
                className="h-12 rounded-2xl border border-slate-300 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* DATE */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-2">
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 rounded-2xl border border-slate-300 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* ADD BUTTON */}
            <div className="flex items-end">
              <button
                onClick={addRow}
                className="h-12 w-full rounded-2xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 transition"
              >
                ➕ Add
              </button>
            </div>

          </div>
        </div>

        {/* PREVIEW */}
        <div className="bg-white rounded-3xl shadow-lg p-5 border border-slate-200">

          <p className="text-lg text-slate-700">
            Preview:
          </p>

          <div className="mt-3 flex flex-wrap gap-4">

            <div className="bg-slate-100 px-4 py-2 rounded-xl">
              <span className="font-semibold">
                Code:
              </span>{" "}
              {code || "-"}
            </div>

            <div className="bg-slate-100 px-4 py-2 rounded-xl">
              <span className="font-semibold">
                Qty:
              </span>{" "}
              {qty}
            </div>

            <div className="bg-slate-100 px-4 py-2 rounded-xl">
              <span className="font-semibold">
                Date:
              </span>{" "}
              {date}
            </div>

          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

          <div className="p-5 border-b">
            <h2 className="text-2xl font-bold text-slate-900">
              Finished Goods List
            </h2>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full border-collapse">

              <thead className="bg-blue-100">
                <tr>
                  <th className="text-left p-4 text-lg font-bold">
                    Production Code
                  </th>

                  <th className="text-left p-4 text-lg font-bold">
                    Qty
                  </th>

                  <th className="text-left p-4 text-lg font-bold">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>

                {list.map((item, i) => (
                  <tr
                    key={i}
                    className="border-t hover:bg-slate-50 transition"
                  >
                    <td className="p-4 text-lg font-semibold">
                      {item.code}
                    </td>

                    <td className="p-4 text-lg font-bold text-blue-600">
                      {item.qty}
                    </td>

                    <td className="p-4 text-lg whitespace-nowrap">
                      {item.date}
                    </td>
                  </tr>
                ))}

                {list.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-center p-8 text-slate-500 text-lg"
                    >
                      No finished goods yet
                    </td>
                  </tr>
                )}

              </tbody>
            </table>

          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-wrap gap-4">

          <button
            onClick={saveAll}
            className="h-12 px-8 rounded-2xl bg-green-600 text-white text-lg font-bold hover:bg-green-700 transition"
          >
            💾 Save All
          </button>

          <button
            onClick={resetAll}
            className="h-12 px-8 rounded-2xl bg-red-600 text-white text-lg font-bold hover:bg-red-700 transition"
          >
            🆕 Reset
          </button>

        </div>

      </div>
    </div>
  );
}