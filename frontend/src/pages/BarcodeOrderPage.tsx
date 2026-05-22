import { useRef, useState } from "react";
import axios from "axios";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000/api";

const BarcodeOrderPage = () => {
  const [barcode, setBarcode] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [cart, setCart] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const scanBarcode = async (e: any) => {
    if (e.key !== "Enter") return;

    const code = barcode.trim();

    if (!code) return;

    try {
      const res = await axios.get(`${API}/inventory/barcode/${code}`);
      const item = res.data?.data;

      setCart((prev) => {
        const exists = prev.find((x) => x.itemBarcode === item.itemBarcode);

        if (exists) {
          return prev.map((x) =>
            x.itemBarcode === item.itemBarcode
              ? { ...x, qty: Number(x.qty) + 1 }
              : x
          );
        }

        return [
          ...prev,
          {
            itemName: item.itemName,
            itemBarcode: item.itemBarcode,
            availableQty: Number(item.availableQty || 0),
            qty: 1,
          },
        ];
      });

      setBarcode("");
      inputRef.current?.focus();
    } catch (err: any) {
      alert(err.response?.data?.message || "Item not found");
      setBarcode("");
      inputRef.current?.focus();
    }
  };

  const updateQty = (itemBarcode: string, qty: number) => {
    if (qty < 1) qty = 1;

    setCart((prev) =>
      prev.map((item) =>
        item.itemBarcode === itemBarcode ? { ...item, qty } : item
      )
    );
  };

  const removeItem = (itemBarcode: string) => {
    setCart((prev) => prev.filter((item) => item.itemBarcode !== itemBarcode));
  };

  const clearCart = () => {
    setCart([]);
    setBarcode("");
    inputRef.current?.focus();
  };

  const saveOrder = async () => {
    if (saving) return;

    if (cart.length === 0) {
      alert("No item scanned");
      return;
    }

    const overStock = cart.find(
      (item) => Number(item.qty) > Number(item.availableQty)
    );

    if (overStock) {
      alert(`${overStock.itemName} pa gen ase stock`);
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/orders/barcode-order`, {
        customerName,
        items: cart,
      });

      alert("Order saved ✅");
      clearCart();
    } catch (err: any) {
      console.log("SAVE ORDER ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Barcode Order</h1>
          <p style={styles.sub}>Scan item barcode, edit qty, then save order</p>
        </div>

        <button onClick={clearCart} style={styles.clearBtn}>
          Clear
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.topGrid}>
          <input
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={styles.input}
          />

          <input
            ref={inputRef}
            autoFocus
            placeholder="Scan barcode here..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={scanBarcode}
            style={styles.scanInput}
          />
        </div>

        <div style={styles.summary}>
          <span>
            Items: <b>{cart.length}</b>
          </span>

          <span>
            Total Qty: <b>{totalQty}</b>
          </span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Barcode</th>
                <th style={styles.th}>Available</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {cart.map((item) => {
                const isOver = Number(item.qty) > Number(item.availableQty);

                return (
                  <tr key={item.itemBarcode}>
                    <td style={styles.td}>{item.itemName}</td>
                    <td style={styles.td}>{item.itemBarcode}</td>
                    <td style={styles.td}>{item.availableQty}</td>

                    <td style={styles.td}>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) =>
                          updateQty(item.itemBarcode, Number(e.target.value))
                        }
                        style={styles.qtyInput}
                      />
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background: isOver ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {isOver ? "Over Stock" : "OK"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <button
                        onClick={() => removeItem(item.itemBarcode)}
                        style={styles.removeBtn}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}

              {cart.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.empty}>
                    Scan barcode pou ajoute item nan order la
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button onClick={saveOrder} disabled={saving} style={styles.saveBtn}>
          {saving ? "Saving..." : "Save Order"}
        </button>
      </div>
    </div>
  );
};

export default BarcodeOrderPage;

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "24px 36px",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  h1: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 500,
    color: "#0f172a",
  },
  sub: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "16px",
  },
  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 18px 45px rgba(15,23,42,0.10)",
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "16px",
    marginBottom: "16px",
  },
  input: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
  },
  scanInput: {
    padding: "14px",
    borderRadius: "12px",
    border: "2px solid #2563eb",
    fontSize: "18px",
    outline: "none",
  },
  summary: {
    display: "flex",
    gap: "18px",
    marginBottom: "16px",
    color: "#334155",
    fontSize: "16px",
  },
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
    marginBottom: "18px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#eef2f7",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "15px",
  },
  td: {
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },
  qtyInput: {
    width: "90px",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },
  badge: {
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
  },
  removeBtn: {
    padding: "8px 12px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  saveBtn: {
    padding: "14px 22px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
  clearBtn: {
    padding: "12px 18px",
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
  },
};