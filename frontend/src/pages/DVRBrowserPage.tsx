import { useState } from "react";
 import { saveAuditLog } from "../utils/tempLog2";   
export default function DVRBrowserPage() {

  const [url, setUrl] = useState(
""
  );

  const [cameraUrl, setCameraUrl] = useState(
  ""
  );
  const loadCamera = () => {
    if (!url.trim()) {
      alert("Please enter DVR camera URL");
      return;
    }

    setCameraUrl(url);
  };

  const refreshCamera = () => {
    setCameraUrl("");
    setTimeout(() => setCameraUrl(url), 200);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">

      <div className="max-w-7xl mx-auto space-y-6">

        <div>
          <h1 className="text-5xl font-bold text-slate-900">
            DVR Security Camera
          </h1>

          <p className="text-xl text-slate-600 mt-2">
            Browser access for DVR / CCTV security system
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 border border-slate-200">

          <label className="text-sm font-bold text-slate-600">
            DVR / Camera URL
          </label>

          <div className="flex flex-wrap gap-4 mt-3">

            <input
              type="text"
                 placeholder="Example: http://192.168.1.100:8080"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 flex-1 min-w-[280px] rounded-2xl border border-slate-300 px-4 text-lg"
            />

            <button
              onClick={loadCamera}
              className="h-12 px-8 rounded-2xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 transition"
            >
              Load DVR
            </button>

            <button
              onClick={refreshCamera}
              disabled={!cameraUrl}
              className="h-12 px-8 rounded-2xl bg-slate-900 text-white text-lg font-bold disabled:opacity-50"
            >
              Refresh
            </button>

          </div>

        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">

          <div className="flex justify-between items-center p-5 border-b">

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Live Camera View
              </h2>

              <p className="text-slate-500">
                {cameraUrl || "No DVR loaded"}
              </p>
            </div>

            {cameraUrl && (
              <a
                href={cameraUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-2xl bg-green-600 text-white font-bold"
              >
                Open Fullscreen
              </a>
            )}

          </div>

          <div className="h-[650px] bg-slate-900">

            {cameraUrl ? (

              <iframe
                src={cameraUrl}
                title="DVR Camera"
                className="w-full h-full border-0"
                allowFullScreen
              />

            ) : (

              <div className="h-full flex items-center justify-center text-white text-2xl font-bold">
                Enter DVR URL to view camera
              </div>

            )}

          </div>

        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-5 text-yellow-800">
          <b>Note:</b> Some camera systems may block iframe display.
          If that happens, use the <b>Open Fullscreen</b> button.
        </div>

      </div>

    </div>
  );
}