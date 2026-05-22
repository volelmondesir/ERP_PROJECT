import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
import { saveAuditLog } from "../utils/tempLog2"; 
type LangType = keyof typeof translations;

const API = "http://localhost:5000/api";

type Item = {
  id?: number;
  itemName: string;
  itemCode: string;
  barcode: string;
  createdDate: string;
};

export default function ItemPage() {
  const today = new Date().toISOString().split("T")[0];

  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 5;

  const [lang, setLang] = useState<LangType>(
    (localStorage.getItem("lang") as LangType) || "en"
  );

  const t = (key: string, fallback: string) => {
    return (translations[lang] as Record<string, string>)?.[key] || fallback;
  };

  const generateItemCode = () => {
    return "ITM-" + Math.floor(100000 + Math.random() * 900000);
  };

  const generateBarcode = () => {
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  };

  const [item, setItem] = useState<Item>({
    itemName: "",
    itemCode: "",
    barcode: "",
    createdDate: today,
  });

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

  const resetForm = () => {
    setEditing(null);

    setItem({
      itemName: "",
      itemCode: generateItemCode(),
      barcode: generateBarcode(),
      createdDate: today,
    });
  };

  const loadItems = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/ic/items");
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err: any) {
      console.log("LOAD ITEMS ERROR 👉", err.response?.data || err.message);
      setItems([]);
    }
  };

  useEffect(() => {
    resetForm();
    loadItems();
  }, []);

  const handleSave = async () => {
    if (!item.itemName) {
      alert(t("enteritemname", "Enter item name"));
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await axios.put(`${API}/mfg/items/${editing.id}`, {
          itemName: item.itemName,
          itemCode: item.itemCode,
          barcode: item.barcode,
        });

        alert(t("updated", "Updated"));
      } else {
        await axios.post(`${API}/mfg/items`, {
          itemName: item.itemName,
          itemCode: item.itemCode,
          barcode: item.barcode,
        });

        alert(t("saved", "Saved"));
      }

      resetForm();
      loadItems();
    } catch (err: any) {
      console.error("SAVE ITEM ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || t("savefailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const editItem = (row: any) => {
    setEditing(row);

    setItem({
      id: row.id,
      itemName: row.itemName || "",
      itemCode: row.itemCode || "",
      barcode: row.barcode || "",
      createdDate: row.createdDate
        ? String(row.createdDate).slice(0, 10)
        : today,
    });
  };

  const deleteItem = async (id: number) => {
    if (!confirm(t("confirmdelete", "Delete this item?"))) return;

    try {
      await axios.delete(`${API}/mfg/items/${id}`);
      alert(t("deleted", "Deleted"));

      if (editing?.id === id) resetForm();

      loadItems();
    } catch (err: any) {
      console.log("DELETE ITEM ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || t("deletefailed", "Delete failed"));
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return items.filter((x) =>
      String(x.itemName || "").toLowerCase().includes(q) ||
      String(x.itemCode || "").toLowerCase().includes(q) ||
      String(x.barcode || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>📦 {t("createitem", "Create Item")}</h1>
          <p style={styles.sub}>
            {t("createitemsubtitle", "Create, search, edit and delete items")}
          </p>
        </div>

        <button onClick={loadItems} style={styles.refreshBtn}>
          {t("refresh", "Refresh")}
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>
            {editing ? t("edititem", "Edit Item") : t("newitem", "New Item")}
          </h2>

          <label style={styles.label}>{t("itemname", "Item Name")}</label>
          <input
            type="text"
            value={item.itemName}
            onChange={(e) =>
              setItem({
                ...item,
                itemName: e.target.value,
              })
            }
            style={styles.input}
          />

          <label style={styles.label}>{t("itemcode", "Item Code")}</label>
          <input
            type="text"
            value={item.itemCode}
            readOnly
            style={styles.readOnlyInput}
          />

          <div style={styles.barcodeBox}>
            <h3 style={styles.barcodeTitle}>
              📌 {t("barcodepreview", "Barcode Preview")}
            </h3>

            <div style={styles.bars}>
              {item.barcode.split("").map((n, i) => (
                <div
                  key={i}
                  style={{
                    width: Number(n) % 2 === 0 ? 2 : 4,
                    height: Number(n) % 2 === 0 ? 55 : 70,
                    background: "#000",
                  }}
                />
              ))}
            </div>

            <div style={styles.barcodeNumber}>{item.barcode}</div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...styles.saveBtn,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving
              ? t("saving", "Saving...")
              : editing
              ? t("updateitem", "Update Item")
              : t("saveitem", "Save Item")}
          </button>

          {editing && (
            <button onClick={resetForm} style={styles.cancelBtn}>
              {t("cancel", "Cancel")}
            </button>
          )}
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
                  <th style={styles.th}>{t("date", "Date")}</th>
                  <th style={styles.th}>{t("action", "Action")}</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.tdBold}>{row.itemCode || "-"}</td>
                    <td style={styles.td}>{row.itemName || "-"}</td>
                    <td style={styles.td}>{row.barcode || "-"}</td>
                    <td style={styles.td}>
                      {row.createdDate || row.createdAt
                        ? String(row.createdDate || row.createdAt).slice(0, 10)
                        : "-"}
                    </td>

                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      <button onClick={() => editItem(row)} style={styles.editBtn}>
                        {t("edit", "Edit")}
                      </button>

                      <button
                        onClick={() => deleteItem(row.id)}
                        style={styles.deleteBtn}
                      >
                        {t("delete", "Delete")}
                      </button>
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
    boxSizing: "border-box",
  },

  formCard: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
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
  },

  readOnlyInput: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    outline: "none",
    color: "#334155",
    fontWeight: "bold",
  },

  barcodeBox: {
    marginTop: "8px",
    border: "1px dashed #cbd5e1",
    padding: "14px",
    borderRadius: "14px",
    background: "#f8fafc",
    textAlign: "center",
  },

  barcodeTitle: {
    margin: "0 0 10px",
    color: "#0f172a",
  },

  bars: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 2,
    height: 70,
    marginBottom: 10,
  },

  barcodeNumber: {
    letterSpacing: 3,
    fontSize: 20,
    fontFamily: "monospace",
    color: "#0f172a",
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

  cancelBtn: {
    width: "100%",
    padding: "12px",
    background: "#64748b",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
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
    padding: "14px",
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

  editBtn: {
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    marginRight: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  deleteBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
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