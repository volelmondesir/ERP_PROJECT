import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import logo from "../assets/glogo.png";
 import { saveAuditLog } from "../utils/tempLog2";   
type LangType = keyof typeof translations;

const API = "api";

const DeliveryReceiptPage2 = () => {
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [loadingRcp, setLoadingRcp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [company, setCompany] = useState<any>(null);
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [printUrl, setPrintUrl] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [form, setForm] = useState({
    rcpNumber: "",
    itemName: "",
    binCode: "",
    qty: "",
    receiptQty: "",
    deliveredQty: "",
    remainingQty: "",
  });

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
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
    loadBins();
    loadTransactions();
    loadCompany();

    const username = localStorage.getItem("username") || "Admin";
    setCurrentUser(username);
  }, []);

  const generateDeliveryNumber = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `DLV-${random}`;
  };

  const loadBins = async () => {
    try {
      const res = await axios.get(`${API}/bins/bins`);
      setBins(res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD BINS ERROR 👉", err.response?.data || err.message);
      setBins([]);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await axios.get(`${API}/dlv/bin-transactions`);
      const data = res.data?.data || [];
      setTransactions(data);
      return data;
    } catch (err: any) {
      console.log("LOAD TRANSACTIONS ERROR 👉", err.response?.data || err.message);
      setTransactions([]);
      return [];
    }
  };

  const loadCompany = async () => {
    try {
      const companyRes = await axios.get(`${API}/company`);
      setCompany(companyRes.data?.data || companyRes.data);
    } catch (err) {
      console.log("COMPANY LOAD ERROR 👉", err);
    }
  };

  const loadReceiptItemsByRcp = async () => {
    const rcp = form.rcpNumber.trim();

    if (!rcp) {
      alert("Enter RCP #");
      return;
    }

    try {
      setLoadingRcp(true);

      const res = await axios.get(`${API}/dlv/delivery-items/${rcp}`);
      const data = res.data?.data || [];

      setReceiptItems(data);

      if (data.length === 0) {
        alert("No items found for this RCP #");
      }

      setForm((prev) => ({
        ...prev,
        rcpNumber: rcp,
        itemName: "",
        binCode: "",
        qty: "",
        receiptQty: "",
        deliveredQty: "",
        remainingQty: "",
      }));
    } catch (err: any) {
      console.log("LOAD RCP ITEMS ERROR 👉", err.response?.data || err.message);
      setReceiptItems([]);
      alert(err.response?.data?.message || "RCP not found");
    } finally {
      setLoadingRcp(false);
    }
  };

  const handleItemChange = (itemName: string) => {
    const item = receiptItems.find(
      (i) => String(i.itemName || i.productName) === String(itemName)
    );

    if (!item) {
      setForm((prev) => ({
        ...prev,
        itemName,
        receiptQty: "",
        deliveredQty: "",
        remainingQty: "",
        qty: "",
      }));
      return;
    }

    const receiptQty = Number(item.receiptQty ?? item.quantity ?? item.qty ?? 0);
    const deliveredQty = Number(item.deliveredQty || 0);
    const remainingQty = Number(item.remainingQty ?? receiptQty - deliveredQty);

    setForm((prev) => ({
      ...prev,
      itemName,
      receiptQty: String(receiptQty),
      deliveredQty: String(deliveredQty),
      remainingQty: String(remainingQty),
      qty: remainingQty > 0 ? String(remainingQty) : "",
    }));
  };

  const closePrintPreview = () => {
    if (printUrl) {
      URL.revokeObjectURL(printUrl);
    }

    setPrintUrl("");
  };

  const newDelivery = () => {
    setForm({
      rcpNumber: "",
      itemName: "",
      binCode: "",
      qty: "",
      receiptQty: "",
      deliveredQty: "",
      remainingQty: "",
    });

    setReceiptItems([]);
    setDeliveryNumber("");
    closePrintPreview();
  };

  const printIframe = () => {
  const iframe = document.getElementById(
    "deliveryPrintFrame"
  ) as HTMLIFrameElement;

  if (!iframe) return;

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
};
const buildPrintReceipt = (data: any) => {
  const items = Array.isArray(data.items) ? data.items : [];
const logoUrl = logo.startsWith("http")
  ? logo
  : `${window.location.origin}${logo}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Delivery Receipt</title>

        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }

          html,
          body {
            width: 58mm;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif;
            font-size: 11px;
          }

          .receipt {
            width: 58mm;
            padding: 4mm;
            box-sizing: border-box;
          }

          .center {
            text-align: center;
          }

          .company {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
          }

          .small {
            font-size: 10px;
            line-height: 1.3;
          }

          .line {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            margin: 4px 0;
            font-size: 11px;
          }

          .label {
            font-weight: normal;
          }

          .value {
            font-weight: bold;
            text-align: right;
          }

          .item {
            margin-bottom: 6px;
          }

          .item-name {
            font-weight: bold;
            font-size: 11px;
            word-break: break-word;
          }

          .footer {
            text-align: center;
            font-weight: bold;
            font-size: 11px;
            margin-top: 10px;
          }

          @media print {
            html,
            body {
              width: 58mm;
              margin: 0 !important;
              padding: 0 !important;
            }

            .receipt {
              width: 58mm;
              padding: 4mm;
            }
             .logo {
  width: 22mm !important;
  height: 22mm !important;
  max-width: 22mm !important;
  max-height: 22mm !important;
  object-fit: contain !important;
  display: block !important;
  margin: 0 auto 4mm auto !important;
}

          }
        </style>
      </head>

      <body>
        <div class="receipt">
          <div class="center">
       
    <!-- Add your logo here -->
     <img
  src="${logoUrl}"
  alt="Company Logo"
  style="
    width:90px;
    height:90px;
    object-fit:contain;
    display:block;
    margin:0 auto 10px auto;
  "
/>
       
            <div class="company">${data.companyName || "COMPANY"}</div>
            <div class="small">${data.address || ""}</div>
            <div class="small">${data.phone || ""}</div>
          </div>

          <div class="line"></div>

          <div class="row">
            <span class="label">DLV #</span>
            <span class="value">${data.deliveryNumber || "-"}</span>
          </div>

          <div class="row">
            <span class="label">RCP #</span>
            <span class="value">${data.rcpNumber || "-"}</span>
          </div>

          <div class="row">
            <span class="label">User</span>
            <span class="value">${data.userCode || "-"}</span>
          </div>

          <div class="row">
            <span class="label">Date</span>
            <span class="value">${data.date || "-"}</span>
          </div>

          <div class="row">
            <span class="label">Time</span>
            <span class="value">${data.time || "-"}</span>
          </div>

          <div class="line"></div>

          ${items
            .map(
              (item: any) => `
                <div class="item">
                  <div class="item-name">${item.itemName || "-"}</div>
                  <div class="row">
                    <span>Qty</span>
                    <span class="value">${Number(item.qty || 0).toFixed(2)}</span>
                  </div>
                </div>
              `
            )
            .join("")}

          <div class="line"></div>

          <div class="row">
            <span>Total Lines</span>
            <span class="value">${items.length}</span>
          </div>

          <div class="line"></div>

          <div class="footer">
            ${data.footerMessage || "Thank you"}
          </div>
        </div>

        <script>
          window.onload = function () {
            setTimeout(function () {
              window.focus();
             // window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });

  if (printUrl) {
    URL.revokeObjectURL(printUrl);
  }

  const url = URL.createObjectURL(blob);
  setPrintUrl(url);
};
  const printDeliveryReceipt = (allTransactions = transactions) => {
    const rcp = form.rcpNumber.trim();

    if (!rcp) {
      alert("Enter or load RCP # first");
      return;
    }

    const deliveryItems = allTransactions.filter(
      (t: any) =>
        String(t.rcpNumber || t.orderNumber).trim() === String(rcp).trim()
    );

    if (deliveryItems.length === 0) {
      alert("No delivered items found for this RCP #");
      return;
    }

    const dlv =
      deliveryNumber ||
      deliveryItems.find((x: any) => x.deliveryNumber)?.deliveryNumber ||
      "-";

    setDeliveryNumber(dlv);

    buildPrintReceipt({
      deliveryNumber: dlv,
      rcpNumber: rcp,
      items: deliveryItems,
      companyName: company?.companyName,
      address: company?.address,
      phone: company?.phone,
      footerMessage: company?.footerMessage,
      userCode: deliveryItems[0]?.userCode || currentUser,
      date: deliveryItems[0]?.date,
      time: deliveryItems[0]?.hour,
    });
  };

  const confirmDelivery = async () => {
    const amount = Number(form.qty || 0);
    const remainingQty = Number(form.remainingQty || 0);

    if (!form.rcpNumber || !form.itemName || !form.binCode || amount <= 0) {
      alert("RCP #, item, bin and qty required");
      return;
    }

    if (remainingQty > 0 && amount > remainingQty) {
      alert(`Qty cannot be greater than remaining qty: ${remainingQty}`);
      return;
    }

    const existingTransaction = transactions.find(
      (t) =>
        String(t.rcpNumber || t.orderNumber).trim() ===
        String(form.rcpNumber).trim()
    );

    const newDeliveryNumber =
      existingTransaction?.deliveryNumber ||
      deliveryNumber ||
      generateDeliveryNumber();

    try {
      setSaving(true);

      await axios.post(`${API}/dlv/delivery/remove-from-bin`, {
        deliveryNumber: newDeliveryNumber,
        rcpNumber: form.rcpNumber,
        orderNumber: form.rcpNumber,
        itemName: form.itemName,
        binCode: form.binCode,
        qty: amount,
        userCode: currentUser || "Admin",
      });

      setDeliveryNumber(newDeliveryNumber);

      alert(`Delivery confirmed ✅ ${newDeliveryNumber}`);

      setForm((prev) => ({
        ...prev,
        itemName: "",
        binCode: "",
        qty: "",
        receiptQty: "",
        deliveredQty: "",
        remainingQty: "",
      }));

      const latestTransactions = await loadTransactions();

      printDeliveryReceipt(latestTransactions);

      await loadReceiptItemsByRcp();
    } catch (err: any) {
      alert(err.response?.data?.message || "Delivery failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase();

    return transactions.filter(
      (t) =>
        String(t.deliveryNumber || "").toLowerCase().includes(q) ||
        String(t.rcpNumber || t.orderNumber || "").toLowerCase().includes(q) ||
        String(t.itemName || "").toLowerCase().includes(q) ||
        String(t.binCode || "").toLowerCase().includes(q) ||
        String(t.qty || "").includes(q) ||
        String(t.userCode || "").toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;

  const paginatedHistory = filteredTransactions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <div style={styles.topActions}>
              <h1 style={styles.title}>
                🚚 {t("deliveryreceipt", "Delivery Receipt")}
              </h1>

              <button onClick={newDelivery} style={styles.newBtn}>
                {t("newdelivery", "New Delivery")}
              </button>
            </div>

            {deliveryNumber && (
              <div style={styles.dlvBox}>
                {t("lastdelivery", "Last Delivery #")}:{" "}
                <b>{deliveryNumber}</b>
              </div>
            )}

            <input
              value={form.rcpNumber}
              placeholder={t("rcpnumber", "RCP#...")}
              onChange={(e) =>
                setForm({
                  ...form,
                  rcpNumber: e.target.value,
                })
              }
              style={styles.input}
            />

            <button
              onClick={loadReceiptItemsByRcp}
              disabled={loadingRcp}
              style={{
                ...styles.loadBtn,
                opacity: loadingRcp ? 0.6 : 1,
                cursor: loadingRcp ? "not-allowed" : "pointer",
              }}
            >
              {loadingRcp ? t("loading", "Loading...") : t("loadrcp", "Load RCP #")}
            </button>

            <select
              value={form.itemName}
              onChange={(e) => handleItemChange(e.target.value)}
              style={styles.input}
            >
              <option value="">{t("selectitem", "Select Item")}</option>

              {receiptItems.map((item, index) => (
                <option key={index} value={item.itemName || item.productName}>
                  {item.itemName || item.productName}
                </option>
              ))}
            </select>

            <div style={styles.infoGrid}>
              <div style={styles.infoBox}>
                <span>{t("receiptqty", "Receipt Qty")}</span>
                <b>{form.receiptQty || "0"}</b>
              </div>

              <div style={styles.infoBox}>
                <span>{t("delivered", "Delivered")}</span>
                <b>{form.deliveredQty || "0"}</b>
              </div>

              <div style={styles.infoBox}>
                <span>{t("remaining", "Remaining")}</span>
                <b>{form.remainingQty || "0"}</b>
              </div>
            </div>

            <select
              value={form.binCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  binCode: e.target.value,
                })
              }
              style={styles.input}
            >
              <option value="">{t("selectbin", "Select Bin")}</option>

              {bins.map((bin) => (
                <option key={bin.id} value={bin.binCode}>
                  {bin.binCode} - {bin.binName}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={form.qty}
              placeholder={t("qty", "Qty")}
              readOnly
              style={{
                ...styles.input,
                background: "#f1f5f9",
                cursor: "not-allowed",
              }}
            />

            <button
              onClick={confirmDelivery}
              disabled={saving || !form.qty || Number(form.qty) <= 0}
              style={{
                ...styles.saveBtn,
                opacity: saving || !form.qty || Number(form.qty) <= 0 ? 0.5 : 1,
                cursor:
                  saving || !form.qty || Number(form.qty) <= 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {saving
                ? t("saving", "Saving...")
                : t("confirmdelivery", "Confirm Delivery")}
            </button>

            <button
              onClick={() => printDeliveryReceipt()}
              disabled={!form.rcpNumber}
              style={{
                ...styles.printReceiptBtn,
                opacity: !form.rcpNumber ? 0.5 : 1,
                cursor: !form.rcpNumber ? "not-allowed" : "pointer",
              }}
            >
              {t("previewprintfullreceipt", "Preview / Print Full Receipt")}
            </button>

            {printUrl && (
              <div style={styles.previewBox}>
                <div style={styles.previewActions}>
                  <button onClick={printIframe} style={styles.printBtn}>
                    {t("print", "Print")}
                  </button>

                  <button onClick={closePrintPreview} style={styles.closeBtn}>
                    {t("close", "Close")}
                  </button>
                </div>

                <iframe
                  id="deliveryPrintFrame"
                  src={printUrl}
                  width="100%"
                  height="400"
                  style={styles.iframe}
                  title={t("deliveryreceiptpreview", "Delivery Receipt Preview")}
                />
              </div>
            )}
          </div>
        </div>

        <div style={styles.rightCol}>
          <div style={styles.card}>
            <h1 style={styles.title}>
              {t("deliveryreceipts", "Delivery Receipts")}
            </h1>

            <input
              placeholder={t(
                "searchdeliveryreceipt",
                "Search DLV, RCP, item, bin, qty..."
              )}
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
                    <th style={styles.th}>{t("dlvnumber", "DLV #")}</th>
                    <th style={styles.th}>{t("rcpnumberlabel", "RCP #")}</th>
                    <th style={styles.th}>{t("item", "Item")}</th>
                    <th style={styles.th}>{t("bin", "Bin")}</th>
                    <th style={styles.th}>{t("qty", "Qty")}</th>
                    <th style={styles.th}>{t("date", "Date")}</th>
                    <th style={styles.th}>{t("time", "Time")}</th>
                    <th style={styles.th}>{t("deliveredby", "Delivered By")}</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedHistory.map((tRow, index) => (
                    <tr key={tRow.id || index}>
                      <td style={styles.td}>{tRow.deliveryNumber || "-"}</td>
                      <td style={styles.td}>
                        {tRow.rcpNumber || tRow.orderNumber || "-"}
                      </td>
                      <td style={styles.td}>{tRow.itemName || "-"}</td>
                      <td style={styles.td}>{tRow.binCode || "-"}</td>
                      <td
                        style={{
                          ...styles.td,
                          color: "#16a34a",
                          fontWeight: "bold",
                        }}
                      >
                        {Number(tRow.qty || 0).toFixed(2)}
                      </td>
                      <td style={styles.td}>{tRow.date || "-"}</td>
                      <td style={styles.td}>{tRow.hour || "-"}</td>
                      <td style={styles.td}>{tRow.userCode || "-"}</td>
                    </tr>
                  ))}

                  {paginatedHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} style={styles.empty}>
                        {t(
                          "nodeliveryreceiptsfound",
                          "No delivery receipts found"
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.pagination}>
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
                style={{
                  ...styles.pageBtn,
                  opacity: page === 1 ? 0.5 : 1,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                {t("prev", "Prev")}
              </button>

              <span style={styles.pageText}>
                {t("page", "Page")} {page} {t("of", "of")} {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                style={{
                  ...styles.pageBtn,
                  opacity: page === totalPages ? 0.5 : 1,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                {t("next", "Next")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryReceiptPage2;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "410px minmax(0, 1fr)",
    gap: "22px",
  },

  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  rightCol: {
    minWidth: 0,
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },

  topActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },

  title: {
    margin: 0,
    fontSize: "24px",
    color: "#0f172a",
  },

  newBtn: {
    padding: "10px 14px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  dlvBox: {
    marginTop: "12px",
    padding: "12px",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "12px",
    fontSize: "15px",
  },

  input: {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
    marginTop: "12px",
  },

  loadBtn: {
    width: "100%",
    marginTop: "12px",
    padding: "13px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
  },

  saveBtn: {
    marginTop: "18px",
    width: "100%",
    padding: "14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "16px",
  },

  printReceiptBtn: {
    width: "100%",
    marginTop: "12px",
    padding: "13px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginTop: "12px",
  },

  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#334155",
    fontSize: "13px",
  },

  previewBox: {
    marginTop: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
    background: "#f8fafc",
  },

  previewActions: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },

  printBtn: {
    flex: 1,
    padding: "12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  closeBtn: {
    flex: 1,
    padding: "12px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  iframe: {
    border: "1px solid #ccc",
    borderRadius: "12px",
    background: "#fff",
  },

  search: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    marginBottom: "14px",
    boxSizing: "border-box",
    outline: "none",
    marginTop: "14px",
  },

  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    marginTop: "14px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "950px",
  },

  th: {
    background: "#eef2f7",
    padding: "14px",
    textAlign: "left",
    color: "#0f172a",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    color: "#334155",
    whiteSpace: "nowrap",
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
  },

  pageText: {
    fontWeight: "bold",
    color: "#334155",
  },
};