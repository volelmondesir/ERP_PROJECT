import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api/";

type Item = {
  id: number;
  itemName: string;
  itemCode: string;
  barcode: string;
  createdDate?: string;
  createdAt?: string;
  qty?: number;
};

export default function ItemUpdateQtyPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const pageSize = 5;

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

  const loadItems = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/ic/items");

    console.log("ITEMS 👉", res.data);

    setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
  } catch (err) {
    console.log("ITEM LOAD ERROR:", err);
    setItems([]);
  }
};  

  useEffect(() => {
    loadItems();
  }, []);

  const selectedItem = items.find((x) => String(x.id) === String(itemId));

  const updateQty = async () => {
    if (!itemId || qty === "") {
      alert(t("selectitemandqty", "Select item and enter quantity"));
      return;
    }

    try {
      setSaving(true);

     await axios.put(
  `http://localhost:5000/api/ic/items/${itemId}/qty`,
  {
    qty
  }
);

      alert(t("qtyupdated", "Quantity updated"));

      setItemId("");
      setQty("");
      loadItems();
    } catch (err: any) {
      console.log("UPDATE QTY ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || t("updatefailed", "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return items.filter((item) =>
      String(item.itemName || "").toLowerCase().includes(q) ||
      String(item.itemCode || "").toLowerCase().includes(q) ||
      String(item.barcode || "").toLowerCase().includes(q) ||
      String(item.qty || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>📦 {t("updateitemqty", "Update Item Qty")}</h1>
          <p style={styles.sub}>
            {t("updateitemqtysubtitle", "Select an item and update stock quantity")}
          </p>
        </div>

        <button onClick={loadItems} style={styles.refreshBtn}>
          {t("refresh", "Refresh")}
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>{t("qtyform", "Quantity Update")}</h2>

          <label style={styles.label}>{t("selectitem", "Select Item")}</label>
          <select
            value={itemId}
            onChange={(e) => {
              const id = e.target.value;
              setItemId(id);

              const found = items.find((x) => String(x.id) === String(id));
              setQty(found?.qty !== undefined ? String(found.qty) : "");
            }}
            style={styles.input}
          >
            <option value="">{t("selectitem", "Select Item")}</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.itemName}
              </option>
            ))}
          </select>

          {selectedItem && (
            <div style={styles.previewBox}>
              <b>{selectedItem.itemName}</b>
              <span>{selectedItem.itemCode}</span>
              <span>
                {t("currentqty", "Current Qty")}:{" "}
                <b>{Number(selectedItem.qty || 0).toFixed(2)}</b>
              </span>
            </div>
          )}

          <label style={styles.label}>{t("quantity", "Quantity")}</label>
          <input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={t("enterqty", "Enter quantity")}
            style={styles.input}
          />

          <button
            onClick={updateQty}
            disabled={saving}
            style={{
              ...styles.saveBtn,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("saving", "Saving...") : t("updateqty", "Update Qty")}
          </button>
        </div>

        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h2 style={styles.cardTitle}>{t("items", "Items")}</h2>

            <span style={styles.countBadge}>
              {filtered.length} {t("records", "records")}
            </span>
          </div>

          <input
            placeholder={t("searchitem", "Search item code, name, barcode...")}
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
                  <th style={styles.th}>{t("code", "Code")}</th>
                  <th style={styles.th}>{t("item", "Item")}</th>
                  <th style={styles.th}>{t("barcode", "Barcode")}</th>
                  <th style={styles.th}>{t("qty", "Qty")}</th>
                  <th style={styles.th}>{t("date", "Date")}</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.tdBold}>{row.itemCode || "-"}</td>
                    <td style={styles.td}>{row.itemName || "-"}</td>
                    <td style={styles.td}>{row.barcode || "-"}</td>
                    <td style={styles.qtyTd}>
                      {Number(row.qty || 0).toFixed(2)}
                    </td>
                    <td style={styles.td}>
                      {row.createdDate || row.createdAt
                        ? String(row.createdDate || row.createdAt).slice(0, 10)
                        : "-"}
                    </td>
                  </tr>
                ))}

                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      {t("noitemsfound", "No items found")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
    overflowX: "hidden",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
  },

  h1: {
    margin: 0,
    fontSize: "34px",
    color: "#0f172a",
  },

  sub: {
    marginTop: "8px",
    color: "#64748b",
  },

  refreshBtn: {
    border: "none",
    borderRadius: "12px",
    background: "#2563eb",
    color: "#fff",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "420px 1fr",
    gap: "22px",
    width: "100%",
    maxWidth: "100%",
  },

  formCard: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  listCard: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    minWidth: 0,
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  cardTitle: {
    margin: 0,
    color: "#0f172a",
  },

  countBadge: {
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
  },

  label: {
    fontWeight: "bold",
    color: "#334155",
  },

  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "15px",
  },

  previewBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    color: "#1e3a8a",
  },

  saveBtn: {
    width: "100%",
    padding: "12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
  },

  search: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    outline: "none",
    marginBottom: "16px",
  },

  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflowX: "auto",
    overflowY: "hidden",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
  },

  th: {
    background: "#eef2f7",
    padding: "18px",
    textAlign: "left",
    fontSize: "14px",
    color: "#334155",
  },

  td: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#334155",
  },

  tdBold: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#0f172a",
    fontWeight: "bold",
  },

  qtyTd: {
    padding: "13px 14px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#16a34a",
    fontWeight: "bold",
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
    marginTop: "18px",
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