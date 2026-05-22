import { useState } from "react";
import axios from "axios";

export default function BackupPage() {

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [history, setHistory] = useState<any[]>([]);

  const createBackup = async () => {

    try {

      setLoading(true);

      setMessage("");

      const res = await axios.post(
        "http://localhost:5000/api/backup-db"
      );

      setMessage(res.data.message);

      setHistory((prev) => [
        {
          file: res.data.file,
          date: new Date().toLocaleString(),
        },
        ...prev,
      ]);

    } catch (err) {

      console.log(err);

      setMessage("Backup failed ❌");

    } finally {

      setLoading(false);
    }
  };
const restoreDatabase = async (file: string) => {
  const confirmRestore = window.confirm(
    "Restore will replace current database. Continue?"
  );

  if (!confirmRestore) return;

  try {
    const res = await axios.post("http://localhost:5000/api/restore-db", {
      file,
    });

    alert(res.data.message);
  } catch (err: any) {
    alert(err?.response?.data?.message || "Restore failed ❌");
  }
};
  return (
    <div className="min-h-screen bg-slate-100 p-6">

      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div>

          <h1 className="text-5xl font-bold text-slate-900">
            Database Backup Center
          </h1>

          <p className="text-xl text-slate-600 mt-2">
            SysSoft ERP SQL Backup Management
          </p>

        </div>

        {/* CARD */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">

          <div className="flex flex-wrap gap-5 items-center justify-between">

            <div>

              <h2 className="text-3xl font-bold text-slate-900">
                Create SQL Backup
              </h2>

              <p className="text-slate-500 mt-2">
                Backup your ERP database securely
              </p>

            </div>

            <button
              onClick={createBackup}
              disabled={loading}
              className={`h-14 px-8 rounded-2xl text-white text-lg font-bold transition ${
                loading
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Creating Backup..." : "Backup Database"}
            </button>
<button
  //onClick={() => restoreDatabase(b.file)}
  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold"
>
  Restore
</button>
          </div>

          {/* MESSAGE */}
          {message && (
            <div className="mt-6 bg-slate-100 rounded-2xl p-4 text-lg font-semibold">
              {message}
            </div>
          )}

        </div>

        {/* HISTORY */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">

          <div className="p-6 border-b">

            <h2 className="text-3xl font-bold text-slate-900">
              Backup History
            </h2>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-blue-100">

                <tr>
                  <th className="text-left p-5 text-lg font-bold">
                    Backup File
                  </th>

                  <th className="text-left p-5 text-lg font-bold">
                    Created At
                  </th>
                </tr>

              </thead>

              <tbody>

                {history.length === 0 ? (

                  <tr>
                    <td
                      colSpan={2}
                      className="text-center p-10 text-slate-500"
                    >
                      No backups yet
                    </td>
                  </tr>

                ) : (

                  history.map((b, i) => (

                    <tr
                      key={i}
                      className="border-t hover:bg-slate-50 transition"
                    >

                      <td className="p-5 font-semibold">
                        {b.file}
                      </td>

                      <td className="p-5">
                        {b.date}
                      </td>

                    </tr>

                  ))
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}