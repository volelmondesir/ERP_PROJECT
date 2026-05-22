import { useEffect, useMemo, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";

const BinManagementPage = () => {
  const [bins, setBins] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [binsGenerated, setBinsGenerated] = useState(false);

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [assignForm, setAssignForm] = useState({
    itemId: "",
    itemName: "",
    binId: "",
    binCode: "",
    qty: "",
  });

  const [transferForm, setTransferForm] = useState({
    itemId: "",
    itemName: "",
    fromBinId: "",
    fromBinCode: "",
    toBinId: "",
    toBinCode: "",
    qty: "",
  });

  const [printUrl, setPrintUrl] = useState("");

  const getToday = () => {
    const now = new Date();
    return (
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0")
    );
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (value: any) => {
    if (!value) return "-";
    return String(value).split("T")[0];
  };

  const loadBins = async () => {
    try {
      const res = await axios.get(`${API}/bins/bins`);
      const data = res.data?.data || [];

      setBins(data);
      setBinsGenerated(data.length >= 1000);
    } catch (err: any) {
      console.log("LOAD BINS ERROR 👉", err.response?.data || err.message);
      setBins([]);
      setBinsGenerated(false);
    }
  };

  const loadItems = async () => {
    try {
      const res = await axios.get(`${API}/ic/items`);
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD ITEMS ERROR 👉", err.response?.data || err.message);
      setItems([]);
    }
  };

  const loadTransfers = async () => {
    try {
      const res = await axios.get(`${API}/ic/stock`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setTransfers(data);
    } catch (err: any) {
      console.log("LOAD STOCK ERROR 👉", err.response?.data || err.message);
      setTransfers([]);
    }
  };

  useEffect(() => {
    loadBins();
    loadItems();
    loadTransfers();
  }, []);

  const generateBins = async () => {
    if (!confirm("Generate bins 000 - 999?")) return;

    try {
      setGenerating(true);
      const res = await axios.post(`${API}/bins/bins/generate`);
      alert(res.data?.message || "Bins generated ✅");
      await loadBins();
    } catch (err: any) {
      alert(err.response?.data?.message || "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleAssignItem = (id: string) => {
    const item = items.find((i) => String(i.id) === String(id));
    if (!item) return;

    setAssignForm({
      ...assignForm,
      itemId: String(item.id),
      itemName: item.productName || item.name || item.itemName || "",
    });
  };

  const handleAssignBin = (id: string) => {
    const bin = bins.find((b) => String(b.id) === String(id));
    if (!bin) return;

    setAssignForm({
      ...assignForm,
      binId: String(bin.id),
      binCode: bin.binCode,
    });
  };

  const saveAssignment = async () => {
    if (!assignForm.itemId || !assignForm.binId || Number(assignForm.qty || 0) <= 0) {
      alert("Item, bin, and qty required");
      return;
    }

    try {
      setSaving(true);

      await axios.put(`${API}/ic/stock-update`, {
        itemName: assignForm.itemName,
        qty: Number(assignForm.qty),
        date: getToday(),
        time: getCurrentTime(),
        binCode: assignForm.binCode,
      });

      await axios.post(`${API}/bins/item-bin`, {
        itemId: Number(assignForm.itemId),
        itemName: assignForm.itemName,
        binId: Number(assignForm.binId),
        binCode: assignForm.binCode,
        qty: Number(assignForm.qty),
      });

      alert("Item assigned ✅");

      setAssignForm({
        itemId: "",
        itemName: "",
        binId: "",
        binCode: "",
        qty: "",
      });

      await loadTransfers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Assign failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTransferItem = (id: string) => {
    const item = items.find((i) => String(i.id) === String(id));
    if (!item) return;

    setTransferForm({
      ...transferForm,
      itemId: String(item.id),
      itemName: item.productName || item.name || item.itemName || "",
    });
  };

  const handleFromBin = (id: string) => {
    const bin = bins.find((b) => String(b.id) === String(id));
    if (!bin) return;

    setTransferForm({
      ...transferForm,
      fromBinId: String(bin.id),
      fromBinCode: bin.binCode,
    });
  };

  const handleToBin = (id: string) => {
    const bin = bins.find((b) => String(b.id) === String(id));
    if (!bin) return;

    setTransferForm({
      ...transferForm,
      toBinId: String(bin.id),
      toBinCode: bin.binCode,
    });
  };

  const transferItem = async () => {
    if (
      !transferForm.itemId ||
      !transferForm.fromBinId ||
      !transferForm.toBinId ||
      Number(transferForm.qty || 0) <= 0
    ) {
      alert("Item, from bin, to bin, and qty required");
      return;
    }

    if (transferForm.fromBinId === transferForm.toBinId) {
      alert("From bin and To bin cannot be same");
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/bins/bin-transfer2`, {
        itemId: Number(transferForm.itemId),
        itemName: transferForm.itemName,
        fromBinId: Number(transferForm.fromBinId),
        fromBinCode: transferForm.fromBinCode,
        toBinId: Number(transferForm.toBinId),
        toBinCode: transferForm.toBinCode,
        qty: Number(transferForm.qty),
        createdBy: "Admin",
      });

      alert("Item transferred ✅");

      setTransferForm({
        itemId: "",
        itemName: "",
        fromBinId: "",
        fromBinCode: "",
        toBinId: "",
        toBinCode: "",
        qty: "",
      });

      await loadTransfers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Transfer failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredTransfers = useMemo(() => {
    const q = search.toLowerCase();

    return transfers.filter((a) =>
      String(a.itemName || "").toLowerCase().includes(q) ||
      String(a.binCode || "").toLowerCase().includes(q) ||
      String(a.qty || "").includes(q) ||
      String(a.date || "").toLowerCase().includes(q) ||
      String(a.time || "").toLowerCase().includes(q)
    );
  }, [transfers, search]);

  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;

  const paginatedTransfers = filteredTransfers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const printAssignments = () => {
    const html = `
      <html>
        <head>
          <title>Stock By Bin</title>
          <style>
            body { font-family: Arial; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 4px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #eef2f7; text-align: left; padding: 12px; border: 1px solid #e2e8f0; }
            td { padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Stock By Bin</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Bin</th>
                <th>Qty</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransfers
                .map(
                  (a) => `
                    <tr>
                      <td>${a.itemName || "-"}</td>
                      <td>${a.binCode || "-"}</td>
                      <td>${Number(a.qty || 0).toFixed(2)}</td>
                      <td>${formatDate(a.date)}</td>
                      <td>${a.time || "-"}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });

    if (printUrl) URL.revokeObjectURL(printUrl);

    setPrintUrl(URL.createObjectURL(blob));
  };

  const printIframe = () => {
    const iframe = document.getElementById("binPrintFrame") as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Bin Management</h1>
          <p style={styles.sub}>Create bins, assign items to bins, and transfer stock</p>
        </div>

        <button
          onClick={generateBins}
          disabled={generating || binsGenerated}
          style={{
            ...styles.generateBtn,
            opacity: binsGenerated ? 0.5 : 1,
            cursor: binsGenerated ? "not-allowed" : "pointer",
          }}
        >
          {binsGenerated
            ? "Bins Already Generated"
            : generating
            ? "Generating..."
            : "Generate Bins 000-999"}
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Assign Item To Bin</h2>

            <select value={assignForm.itemId} onChange={(e) => handleAssignItem(e.target.value)} style={styles.input}>
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.productName || item.name || item.itemName}
                </option>
              ))}
            </select>

            <select value={assignForm.binId} onChange={(e) => handleAssignBin(e.target.value)} style={styles.input}>
              <option value="">Select Bin</option>
              {bins.map((bin) => (
                <option key={bin.id} value={bin.id}>
                  {bin.binCode} - {bin.binName}
                </option>
              ))}
            </select>

            <input
              type="number"
                min ="0"
              placeholder="Qty"
              value={assignForm.qty}
              onChange={(e) => setAssignForm({ ...assignForm, qty: e.target.value })}
              style={styles.input}
            />

            <button onClick={saveAssignment} disabled={saving} style={styles.saveBtn}>
              {saving ? "Saving..." : "Assign Item"}
            </button>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Transfer Item To Another Bin</h2>

            <select value={transferForm.itemId} onChange={(e) => handleTransferItem(e.target.value)} style={styles.input}>
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.productName || item.name || item.itemName}
                </option>
              ))}
            </select>

            <select value={transferForm.fromBinId} onChange={(e) => handleFromBin(e.target.value)} style={styles.input}>
              <option value="">From Bin</option>
              {bins.map((bin) => (
                <option key={bin.id} value={bin.id}>
                  {bin.binCode} - {bin.binName}
                </option>
              ))}
            </select>

            <select value={transferForm.toBinId} onChange={(e) => handleToBin(e.target.value)} style={styles.input}>
              <option value="">To Bin</option>
              {bins.map((bin) => (
                <option key={bin.id} value={bin.id}>
                  {bin.binCode} - {bin.binName}
                </option>
              ))}
            </select>

            <input
              type="number"
              min ="0"
              placeholder="Transfer Qty"
              value={transferForm.qty}
              onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })}
              style={styles.input}
            />

            <button onClick={transferItem} disabled={saving} style={styles.transferBtn}>
              {saving ? "Processing..." : "Transfer Item"}
            </button>
          </div>
        </div>

        <div style={styles.historyCard}>
          <div style={styles.historyHeader}>
            <h2 style={styles.cardTitle}>Stock By Bin</h2>

            <div>
              <button onClick={printAssignments} style={styles.previewBtn}>
                Preview Print
              </button>

              {printUrl && (
                <button onClick={printIframe} style={styles.printBtn}>
                  Print
                </button>
              )}
            </div>
          </div>

          <input
            placeholder="Search item, bin, qty..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={styles.search}
          />

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Bin</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>

              <tbody>
                {paginatedTransfers.map((a, index) => (
                  <tr key={`${a.itemName}-${a.binCode}-${index}`}>
                    <td style={styles.td}>{a.itemName}</td>
                    <td style={styles.td}>{a.binCode}</td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: "bold",
                        color: Number(a.qty || 0) >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {Number(a.qty || 0).toFixed(2)}
                    </td>
                    <td style={styles.td}>{formatDate(a.date)}</td>
                    <td style={styles.td}>{a.time || "-"}</td>
                  </tr>
                ))}

                {paginatedTransfers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      No stock found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{
                ...styles.pageBtn,
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              Prev
            </button>

            <span style={styles.pageText}>Page {page} of {totalPages}</span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={{
                ...styles.pageBtn,
                opacity: page === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>

          {printUrl && (
            <iframe
              id="binPrintFrame"
              src={printUrl}
              style={styles.iframe}
              title="Bin Print Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BinManagementPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "24px 36px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
  },
  h1: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 600,
    color: "#0f172a",
  },
  sub: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "16px",
  },
  generateBtn: {
    padding: "13px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "390px minmax(0, 1fr)",
    gap: "22px",
    width: "100%",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },
  historyCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    overflow: "hidden",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },
  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "22px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
  },
  saveBtn: {
    padding: "13px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  transferBtn: {
    padding: "13px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  previewBtn: {
    padding: "10px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "8px",
  },
  printBtn: {
    padding: "10px 14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  search: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    marginBottom: "14px",
    boxSizing: "border-box",
    outline: "none",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },
  table: {
    width: "100%",
    minWidth: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
    whiteSpace: "nowrap",
    color: "#0f172a",
  },
  td: {
    padding: "13px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    whiteSpace: "nowrap",
    color: "#334155",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
  },
  pageBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },
  iframe: {
    width: "100%",
    height: "360px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    marginTop: "18px",
  },
};
