import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";
const socket = io("http://localhost:5000");

export default function UserAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [cleanDays, setCleanDays] = useState("30");
  const [page, setPage] = useState(1);
  const [submenuFilter, setSubmenuFilter] = useState("");
const [daysFilter, setDaysFilter] = useState("0");

  const perPage = 12;

  useEffect(() => {
  
    saveAuditLog({
  
    moduleName: "Settings",
  
      submenuName: "UserAuditLog",
  
      actionType: "VIEW PAGE",
  
    });
  
  }, []);
const loadLogs = async () => {

  const res = await axios.get(`${API}/users/audit-log`, {
    params: {
      search,
      moduleName: moduleFilter,
      submenuName: submenuFilter,
      actionType: actionFilter,
      days: daysFilter,
    },
  });

  setLogs(res.data || []);
};
const cleanOldLogs = async () => {

  if (!confirm("Clean audit logs?")) return;

  try {

    const res = await axios.get(
      `${API}/users/audit-log/clean`,
      {
        params: {
          moduleName: moduleFilter,
          actionType: actionFilter,
          days: daysFilter,
        },
      }
    );

    alert(
      `Deleted ${res.data.rowsDeleted} logs ✅`
    );

    loadLogs();

  } catch (err: any) {

    console.log(
      "CLEAN ERROR 👉",
      err.response?.data || err
    );

    alert(
      err.response?.data?.message ||
      "Clean failed"
    );
  }
};
  useEffect(() => {
    loadLogs();

    const refreshLogs = () => {
      loadLogs();
    };

    socket.on("auditLogUpdated", refreshLogs);

    return () => {
      socket.off("auditLogUpdated", refreshLogs);
    };
  }, []);

  const filtered = logs.filter((l) => {
    const term = search.toLowerCase();

    const matchSearch =
      String(l.username || "").toLowerCase().includes(term) ||
      String(l.fullName || "").toLowerCase().includes(term) ||
      String(l.moduleName || "").toLowerCase().includes(term) ||
      String(l.submenuName || "").toLowerCase().includes(term) ||
      String(l.actionType || "").toLowerCase().includes(term) ||
      String(l.ipAddress || "").toLowerCase().includes(term) ||
      String(l.computerName || "").toLowerCase().includes(term);

    const matchModule =
      !moduleFilter || l.moduleName === moduleFilter;

    const matchAction =
      !actionFilter ||
      String(l.actionType || "").includes(actionFilter);

    return matchSearch && matchModule && matchAction;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const currentRows = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-bold text-slate-900">
              User Activity Logs
            </h1>

            <p className="text-xl text-slate-600 mt-2">
              Track users, modules, submenus, IP, PC, and actions.
            </p>
          </div>

          <button
            onClick={loadLogs}
            className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold"
          >
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-5 border border-slate-200 flex flex-wrap gap-4">
          <input
            placeholder="Search user, module, action, IP, PC..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-12 flex-1 min-w-[260px] rounded-2xl border border-slate-300 px-4"
          />

          <select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
            className="h-12 rounded-2xl border border-slate-300 px-4"
          >
            <option value="">All Modules</option>
            <option value="Authentication">Authentication</option>
            <option value="Cashier">Cashier</option>
            <option value="Order Entry">Order Entry</option>
            <option value="Settings">Settings</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-12 rounded-2xl border border-slate-300 px-4"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="VIEW PAGE">VIEW PAGE</option>
            <option value="CREATE">CREATE</option>
            <option value="DELETE">DELETE</option>
          </select>

       <select
  value={daysFilter}
  onChange={(e) => {
    setDaysFilter(e.target.value);
    setPage(1);
    loadLogs();
  }}
  className="h-12 rounded-2xl border border-slate-300 px-4"
>
  <option value="0">All Days</option>
  <option value="1">Today</option>
  <option value="7">Last 7 Days</option>
  <option value="30">Last 30 Days</option>
  <option value="90">Last 90 Days</option>
</select>
          <button
            onClick={cleanOldLogs}
            className="h-12 px-6 rounded-2xl bg-red-600 text-white font-bold"
          >
            Clean Logs
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-4 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4 text-left">User</th>
                  <th className="p-4 text-left">Module</th>
                  <th className="p-4 text-left">Submenu</th>
                  <th className="p-4 text-left">Action</th>
                  <th className="p-4 text-left">IP Address</th>
                  <th className="p-4 text-left">PC / Device</th>
                  <th className="p-4 text-left">Date</th>
                </tr>
              </thead>

              <tbody>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  currentRows.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">
                        {log.username || "N/A"}
                      </td>

                      <td className="p-4">{log.moduleName || "N/A"}</td>

                      <td className="p-4">{log.submenuName || "N/A"}</td>

                      <td className="p-4">
                        <span
  className={`px-4 py-1 rounded-full font-bold text-sm
  ${
    String(log.actionType || "").includes("LOGIN")
      ? "bg-green-100 text-green-700"

      : String(log.actionType || "").includes("LOGOUT")
      ? "bg-red-100 text-red-700"

      : String(log.actionType || "").includes("DELETE")
      ? "bg-red-100 text-red-700"

      : String(log.actionType || "").includes("CREATE")
      ? "bg-violet-100 text-violet-700"
       : String(log.actionType || "").includes("VIEW")
      ? "bg-blue-100 text-blue-700"

      : "bg-slate-100 text-slate-700"
  }`}
>
  {log.actionType || "VIEW"}
</span>
                      </td>

                      <td className="p-4 text-slate-600">
                        {log.ipAddress || "N/A"}
                      </td>

                      <td className="p-4 text-slate-600">
                        {log.computerName || "N/A"}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {log.createdAt
                          ? String(log.createdAt).replace("T", " ").slice(0, 19)
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center items-center gap-4 mt-5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-5 py-2 rounded-xl bg-slate-200 font-bold disabled:opacity-50"
            >
              Prev
            </button>

            <b>
              Page {page} / {totalPages}
            </b>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              className="px-5 py-2 rounded-xl bg-slate-200 font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}