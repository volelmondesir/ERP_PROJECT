import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { saveAuditLog } from "../utils/tempLog2"; 
const API = "http://localhost:5000/api";

export default function PriceUpdatePage() {

  const { t } = useTranslation();

  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const pageSize = 5;

  useEffect(() => {
    loadItems();
    loadHistory();
  }, []);

  const loadItems = async () => {
    try {

      const res = await axios.get(`${API}/ic/items-price`);

      setItems(Array.isArray(res.data) ? res.data : []);

    } catch (err) {

      console.log("ITEM LOAD ERROR:", err);

      setItems([]);
    }
  };

  const loadHistory = async () => {
    try {

      const res = await axios.get(
        `${API}/reports/price-history`
      );

      setHistory(
        Array.isArray(res.data)
          ? res.data
          : []
      );

      setPage(1);

    } catch (err) {

      console.log("HISTORY LOAD ERROR:", err);

      setHistory([]);
    }
  };

  const money = (value: any) =>
    `$${Number(value || 0).toFixed(2)}`;

  // ✅ SELECTED ITEM
const selectedItem = items.find(
  (x) => x.itemName === itemName
);
const lastHistory = history.find(
  (h) => h.itemName === itemName
);

const oldPrice = Number(
  lastHistory?.oldPrice ?? selectedItem?.price ?? 0
);


// ✅ CURRENT PRICE
const currentPrice = Number(
  selectedItem?.price || 0
);

// ✅ NEW PRICE
const newPrice = Number(price || 0);

// ✅ DIFFERENCE
const difference = newPrice - currentPrice;

  const updatePrice = async () => {

    const cleanPrice = Number(price);

    if (!itemName) {

      alert(
        t("selectitem", "Select item")
      );

      return;
    }

    if (!cleanPrice || cleanPrice <= 0) {

      alert(
        t(
          "pricegreaterzero",
          "Price must be greater than 0"
        )
      );

      return;
    }

    try {

      setSaving(true);

      await axios.post(
        `${API}/reports/update-price`,
        {
          itemName,
          price: cleanPrice,
        }
      );

      alert(
        t(
          "priceupdated",
          "Price updated ✅"
        )
      );

      setPrice("");
      setItemName("");

      loadHistory();

    } catch (err: any) {

      console.log(
        "UPDATE ERROR:",
        err
      );

      alert(
        err.response?.data?.message ||
        t(
          "updatefailed",
          "Update failed"
        )
      );

    } finally {

      setSaving(false);
    }
  };

  const filtered = useMemo(() => {

    const q = search.toLowerCase();

    return history.filter((h) =>

      String(h.itemName || "")
        .toLowerCase()
        .includes(q)

    );

  }, [history, search]);

  const totalPages =
    Math.ceil(filtered.length / pageSize) || 1;

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (

    <div style={styles.page}>

      {/* HERO */}
      <div style={styles.hero}>

        <div>

          <span style={styles.badge}>
            💲 {t("pricecontrol", "Price Control")}
          </span>

          <h1 style={styles.h1}>
            {t("priceupdate", "Price Update")}
          </h1>

          <p style={styles.sub}>
            {t(
              "priceupdatedesc",
              "Update item prices and track history"
            )}
          </p>

        </div>

        <button
          onClick={loadHistory}
          style={styles.refreshBtn}
        >
          🔄 {t("refresh", "Refresh")}
        </button>

      </div>

      <div style={styles.layout}>

        {/* LEFT */}
        <div style={styles.formCard}>

          <h2 style={styles.cardTitle}>
            {t("updateprice", "Update Price")}
          </h2>

          <label style={styles.label}>
            {t("selectitem", "Select Item")}
          </label>

          <select
            value={itemName}
            onChange={(e) =>
              setItemName(e.target.value)
            }
            style={styles.input}
          >

            <option value="">
              {t("selectitem", "Select Item")}
            </option>

            {items.map((item) => (

              <option
                key={item.id}
                value={item.itemName}
              >
               
                {item.itemName}
              </option>

            ))}

          </select>

          {/* CURRENT PRICE */}
          {selectedItem && (

            <div style={styles.priceCard}>

              <div style={styles.currentLabel}>
                {t(
                  "currentprice",
                  "Current Price"
                )}
              </div>

              <div style={styles.currentPrice}>
                {money(currentPrice)}
              </div>

              <div style={styles.diffWrap}>

                <span style={styles.oldBadge}>
                  {t("oldprice", "Old Price")}
                  :
                  {" "}
                  {money(oldPrice)}
                </span>

                <span
                  style={{
                    ...styles.diffBadge,

                    background:
                      difference > 0
                        ? "#dcfce7"
                        : difference < 0
                        ? "#fee2e2"
                        : "#f1f5f9",

                    color:
                      difference > 0
                        ? "#16a34a"
                        : difference < 0
                        ? "#dc2626"
                        : "#475569",
                  }}
                >
                  {t(
                    "difference",
                    "Difference"
                  )}

                  :

                  {" "}

                  {difference > 0 ? "+" : ""}

                  {money(difference)}
                </span>

              </div>

            </div>

          )}

          {/* NEW PRICE */}
          <label style={styles.label}>
            {t("newprice", "New Price")}
          </label>

          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
            placeholder={t(
              "enternewprice",
              "Enter new price"
            )}
            style={styles.input}
          />

          {/* SAVE */}
          <button
            onClick={updatePrice}
            disabled={saving}
            style={{
              ...styles.saveBtn,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving
              ? t("saving", "Saving...")
              : `💾 ${t("update", "Update")}`}
          </button>

        </div>

        {/* RIGHT */}
        <div style={styles.listCard}>

          <div style={styles.listHeader}>

            <h2 style={styles.cardTitle}>
              📜 {t("pricehistory", "Price History")}
            </h2>

            <span style={styles.countBadge}>
              {filtered.length}
              {" "}
              {t("records", "records")}
            </span>

          </div>

          {/* SEARCH */}
          <input
            placeholder={t(
              "searchitem",
              "Search item..."
            )}
            value={search}
            onChange={(e) => {

              setSearch(e.target.value);

              setPage(1);

            }}
            style={styles.search}
          />

          {/* TABLE */}
          <div style={styles.tableWrap}>

            <table style={styles.table}>

              <thead>

                <tr>

                  <th style={styles.th}>
                    {t("item", "Item")}
                  </th>

                  <th style={styles.th}>
                    {t("oldprice", "Old Price")}
                  </th>

                  <th style={styles.th}>
                    {t("newprice", "New Price")}
                  </th>

                  <th style={styles.th}>
                    {t("difference", "Difference")}
                  </th>

                  <th style={styles.th}>
                    {t("date", "Date")}
                  </th>

                </tr>

              </thead>

              <tbody>

                {paginated.length === 0 ? (

                  <tr>

                    <td
                      colSpan={5}
                      style={styles.empty}
                    >
                      {t(
                        "nohistory",
                        "No history found"
                      )}
                    </td>

                  </tr>

                ) : (

                  paginated.map((h) => {

                    const oldPrice = Number(
                      h.oldPrice || 0
                    );

                    const newPrice = Number(
                      h.newPrice || 0
                    );

                    const diff =
                      newPrice - oldPrice;

                    return (

                      <tr key={h.id}>

                        <td style={styles.tdBold}>
                          {h.itemName}
                        </td>

                        <td style={styles.td}>
                          {money(oldPrice)}
                        </td>

                        <td style={styles.amount}>
                          {money(newPrice)}
                        </td>

                        <td
                          style={{
                            ...styles.tdBold,

                            color:
                              diff >= 0
                                ? "#16a34a"
                                : "#dc2626",
                          }}
                        >
                          {diff >= 0 ? "+" : ""}

                          {money(diff)}
                        </td>

                        <td style={styles.td}>
                          {h.changedAt
                            ? new Date(
                                h.changedAt
                              ).toLocaleString()
                            : "-"}
                        </td>

                      </tr>

                    );
                  })

                )}

              </tbody>

            </table>

          </div>

          {/* PAGINATION */}
          <div style={styles.pagination}>

            <button
              disabled={page === 1}
              onClick={() =>
                setPage((p) =>
                  Math.max(1, p - 1)
                )
              }
              style={styles.pageBtn}
            >
              Prev
            </button>

            <span style={styles.pageText}>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={
                page === totalPages
              }
              onClick={() =>
                setPage((p) =>
                  Math.min(
                    totalPages,
                    p + 1
                  )
                )
              }
              style={styles.pageBtn}
            >
              Next
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

const styles: any = {

  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: 30,
    fontFamily: "Arial",
  },

  hero: {
    background:
      "linear-gradient(135deg,#0f172a,#2563eb,#7c3aed)",
    color: "#fff",
    borderRadius: 24,
    padding: 30,
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  badge: {
    background: "rgba(255,255,255,0.2)",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: "bold",
  },

  h1: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 38,
  },

  sub: {
    opacity: 0.9,
  },

  refreshBtn: {
    border: "none",
    borderRadius: 12,
    background: "#fff",
    color: "#2563eb",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    height: 50,
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "420px 1fr",
    gap: 20,
  },

  formCard: {
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.08)",
  },

  listCard: {
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.08)",
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 18,
  },

  label: {
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 10,
    display: "block",
  },

  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 15,
  },

  saveBtn: {
    width: "100%",
    marginTop: 18,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: 14,
    fontWeight: "bold",
    fontSize: 16,
    cursor: "pointer",
  },

  priceCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
  },

  currentLabel: {
    fontWeight: 700,
    marginBottom: 8,
  },

  currentPrice: {
    fontSize: 34,
    fontWeight: 800,
     color: "#16a34a",
    marginBottom: 14,
  },

  diffWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  oldBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 13,
  },

  diffBadge: {
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 13,
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  countBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "7px 12px",
    borderRadius: 999,
    fontWeight: "bold",
  },

  search: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    marginBottom: 16,
  },

  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eef2f7",
    padding: 14,
    textAlign: "left",
  },

  td: {
    padding: 14,
    borderTop: "1px solid #e2e8f0",
  },

  tdBold: {
    padding: 14,
    borderTop: "1px solid #e2e8f0",
    fontWeight: "bold",
  },

  amount: {
    padding: 14,
    borderTop: "1px solid #e2e8f0",
    color: "#16a34a",
    fontWeight: "bold",
  },

  empty: {
    textAlign: "center",
    padding: 30,
    color: "#64748b",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginTop: 18,
    alignItems: "center",
  },

  pageBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  pageText: {
    fontWeight: "bold",
  },

};