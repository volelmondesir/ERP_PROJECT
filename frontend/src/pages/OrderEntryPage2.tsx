import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import glogo from "../assets/glogo.png";
import { saveAuditLog } from "../utils/tempLog2";
const API = "/api";

const OrderEntryPage2: React.FC = () => {
  const [stocks, setStocks] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [company, setCompany] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const qtyRef = useRef<HTMLInputElement>(null);
useEffect(() => {

  saveAuditLog({

  moduleName: "Order Entry",

    submenuName: "Orders",

    actionType: "VIEW PAGE",

  });

}, []);
  useEffect(() => {
    loadData();
    loadCompany();
  }, []);

  const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;

  const loadCompany = async () => {
    try {
      const companyRes = await axios.get(`${API}/company`);
      setCompany(companyRes.data?.data || companyRes.data);
    } catch (err) {
      console.log("COMPANY LOAD ERROR 👉", err);
    }
  };

  const loadData = async () => {
    try {
      const stockRes = await axios.get(`${API}/ic/items`);
      setStocks(Array.isArray(stockRes.data) ? stockRes.data : []);
    } catch (err) {
      console.log("STOCK LOAD ERROR 👉", err);
      setStocks([]);
    }

    try {
      const taxRes = await axios.get(`${API}/tax`);
      setTaxRate(Number(taxRes.data?.taxRate || 0));
    } catch (err) {
      console.log("TAX LOAD ERROR 👉", err);
      setTaxRate(0);
    }
  };

  const formatName = (name: string) => {
    return name
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const generateBarcode = (value: string) => {
    const canvas = document.createElement("canvas");

    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true,
    });

    return canvas.toDataURL("image/png");
  };

  const handleSelect = async (name: string) => {
    setSelectedItem(name);
    setPrice(0);

    if (!name) {
      setStock(0);
      return;
    }

    const item = stocks.find((s: any) => s.itemName === name);

    if (!item) {
      setStock(0);
      return;
    }

    setStock(Number(item.qty || 0));

    try {
      const priceRes = await axios.get(`${API}/reports/price-history`);
      const prices = Array.isArray(priceRes.data) ? priceRes.data : [];

      const latest = prices
        .filter((p: any) => p.itemName === name)
        .sort(
          (a: any, b: any) =>
            new Date(b.changedAt).getTime() -
            new Date(a.changedAt).getTime()
        )[0];

      const productPrice = Number(latest?.newPrice || 0);

      if (productPrice <= 0) {
        alert("Pa gen pri pou item sa. Mete price avan ou vann li.");
        setPrice(0);
        return;
      }

      setPrice(productPrice);

      setTimeout(() => {
        qtyRef.current?.focus();
      }, 100);
    } catch (err) {
      console.log("PRICE LOAD ERROR 👉", err);
      setPrice(0);
    }
  };

  const addItem = () => {
    if (!selectedItem || !quantity) {
      alert("Select item and quantity");
      return;
    }

    const qty = Number(quantity);

    if (qty <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    if (qty > stock) {
      alert("Not enough stock");
      return;
    }

    if (Number(price) <= 0) {
      alert("Item price must be greater than 0.");
      return;
    }

    const selectedProduct = stocks.find(
      (s: any) => s.itemName === selectedItem
    );

    if (!selectedProduct) {
      alert("Product not found");
      return;
    }

    const alreadyExists = items.find(
      (i) => i.productId === selectedProduct.id
    );

    if (alreadyExists) {
      alert("Item already added");
      return;
    }

    setItems([
      ...items,
      {
        productId: selectedProduct.id,
        itemName: selectedItem,
        qty,
        price: Number(price),
      },
    ]);

    setSelectedItem("");
    setQuantity("");
    setPrice(0);
    setStock(0);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.price) * Number(item.qty);
  }, 0);

  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const printReceipt = () => {
    window.print();
  };

  const buildPDF = (invoice: any) => {

  const doc = new jsPDF();

  let y = 15;

  // LOGO


  doc.addImage(
    glogo,
    "PNG",
    87 ,   // X
    6,    // Y
    35,   // width
    35    // height
  );

  y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);

  doc.text(
    company?.companyName || "",
    105,
    y,
    { align: "center" }
  );

  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(
    company?.address || "",
    105,
    y,
    { align: "center" }
  );

  y += 5;

  doc.text(
    company?.phone || "",
    105,
    y,
    { align: "center" }
  );

    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("INVOICE", 105, y, { align: "center" });

    y += 10;

    const barcode = generateBarcode(invoice.invoiceNumber);
    doc.addImage(barcode, "PNG", 135, y - 8, 60, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    doc.text(`Invoice: ${invoice.invoiceNumber}`, 20, y);
    y += 8;

    doc.text(`Customer: ${invoice.customerName}`, 20, y);
    y += 8;

    doc.text(`Cashier: ${invoice.cashier}`, 20, y);
    y += 9;

    doc.setFont("helvetica", "bold");
    doc.text("Product", 20, y);
    doc.text("Qty", 90, y);
    doc.text("Price", 120, y);
    doc.text("Total", 170, y);
    doc.line(20, y + 2, 190, y + 2);

    y += 10;
    doc.setFont("helvetica", "normal");

    invoice.items.forEach((item: any) => {
      const lineTotal = Number(item.price) * Number(item.qty);

      doc.text(item.itemName, 20, y);
      doc.text(String(item.qty), 90, y);
      doc.text(money(item.price), 120, y);
      doc.text(money(lineTotal), 170, y);

      y += 8;
    });

    y += 10;
    doc.line(120, y, 190, y);
    y += 8;

    doc.text("Subtotal:", 120, y);
    doc.text(money(invoice.subtotal), 190, y, { align: "right" });
    y += 8;

    doc.text(`Tax (${invoice.taxRate}%):`, 120, y);
    doc.text(money(invoice.taxAmount), 190, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 120, y);
    doc.text(money(invoice.total), 190, y, { align: "right" });

    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(company?.footerMessage || "Thank you for your business!", 105, y, {
      align: "center",
    });

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    setPdfUrl(url);
  };

 const handleSubmit = async () => {

  const cleanCustomer = formatName(customerName);

  if (!cleanCustomer || items.length === 0) {
    alert("Fill all fields");
    return;
  }

  if (grandTotal <= 0) {
    alert("Invoice total must be greater than 0");
    return;
  }

  const storedUser = localStorage.getItem("user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : null;

  const userId = Number(user?.id);

  const username =
    user?.username || "Admin";

  if (!userId || Number.isNaN(userId)) {
    alert("User not valid. Login again.");
    return;
  }

  try {

    const res = await axios.post(
      `${API}/oe/orders`,
      {
        userId,
        username,
        customerName: cleanCustomer,
        taxRate,
        items,
      }
    );

    // AUDIT LOG
    await saveAuditLog({

      moduleName: "Order Entry",

      submenuName: "Orders",

      actionType: `CREATE ORDER: ${res.data.invoiceNumber}`,

    });

    alert("Order created ✅");

    const receiptData = {

      invoiceNumber: res.data.invoiceNumber,

      customerName: cleanCustomer,

      cashier: username,

      taxRate,

      items,

      subtotal: res.data.subtotal,

      taxAmount: res.data.taxAmount,

      total: res.data.total,

      barcode: generateBarcode(
        res.data.invoiceNumber
      ),
    };

    buildPDF(receiptData);

    setReceipt(receiptData);

    setItems([]);

    setCustomerName("");

    setSelectedItem("");

    setQuantity("");

    setPrice(0);

    setStock(0);

    loadData();

  } catch (err: any) {

    console.log("ORDER ERROR 👉", err);

    alert(
      err.response?.data?.message ||
      err.response?.data?.error ||
      "Save failed"
    );
  }
};

  const newOrder = () => {
    setItems([]);
    setCustomerName("");
    setSelectedItem("");
    setQuantity("");
    setPrice(0);
    setStock(0);
    setPdfUrl(null);
    setReceipt(null);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>New Order</h1>
            <p style={styles.subtitle}>Create POS invoice</p>
          </div>

          <button onClick={newOrder} style={styles.secondaryBtn}>
            New Order
          </button>
        </div>

        <div style={styles.customerBox}>
          <input
            style={styles.customerInput}
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div style={styles.formRow}>
          <select
            style={styles.input}
            value={selectedItem}
            onChange={(e) => handleSelect(e.target.value)}
          >
            <option value="">Select Item</option>

            {stocks.map((s: any) => (
              <option key={s.id} value={s.itemName}>
                {s.itemName}
              </option>
            ))}
          </select>

          <input
            style={styles.input}
            ref={qtyRef}
            type="number"
            min="1"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <button onClick={addItem} style={styles.primaryBtn}>
            Add Item
          </button>
        </div>

        <div style={styles.infoRow}>
          <div style={styles.infoBox}>
            <span>Stock</span>
            <strong>{stock}</strong>
          </div>

          <div style={styles.infoBox}>
            <span>Price</span>
            <strong>{money(price)}</strong>
          </div>

          <div style={styles.infoBox}>
            <span>Tax</span>
            <strong>{taxRate}%</strong>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}></th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.empty}>
                    No items added
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{item.itemName}</td>
                    <td style={styles.td}>{item.qty}</td>
                    <td style={styles.td}>{money(item.price)}</td>
                    <td style={styles.td}>
                      {money(Number(item.price) * Number(item.qty))}
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => removeItem(i)} style={styles.removeBtn}>
                        X
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <div style={styles.totals}>
            <p>Subtotal: <b>{money(subtotal)}</b></p>
            <p>Tax ({taxRate}%): <b>{money(taxAmount)}</b></p>
            <h2>Total: {money(grandTotal)}</h2>
          </div>

          <button onClick={handleSubmit} style={styles.submitBtn}>
            Submit Order
          </button>
        </div>

        {pdfUrl && (
          <div className="no-print" style={{ marginTop: 20 }}>
            <a href={pdfUrl} download="invoice.pdf">
              <button style={styles.secondaryBtn}>Download PDF</button>
            </a>
          </div>
        )}

        {receipt && (
          <>
            <div className="no-print" style={{ marginTop: 20 }}>
              <button onClick={printReceipt} style={styles.submitBtn}>
                🖨 Print Receipt
              </button>
            </div>

            <div className="receipt">
              <div className="receipt-center">
                

               <img
    src={glogo}
    alt="glogo"
    className="receipt-logo"
  />

  <div className="receipt-title">
    {company?.companyName}
  </div>

  <div className="receipt-subtitle">
    {company?.address}
  </div>

  <div className="receipt-subtitle">
    {company?.phone}
  </div>

                {receipt.barcode && (
                  <img
                    src={receipt.barcode}
                    alt="barcode"
                    className="receipt-barcode"
                  />
                )}
              </div>

              <div className="receipt-line"></div>

              <div className="receipt-row">
                <span>Invoice</span>
                <span>{receipt.invoiceNumber}</span>
              </div>

              <div className="receipt-row">
                <span>Customer</span>
                <span>{receipt.customerName}</span>
              </div>

              <div className="receipt-row">
                <span>Cashier</span>
                <span>{receipt.cashier}</span>
              </div>

              <div className="receipt-row">
                <span>Date</span>
                <span>{new Date().toLocaleString()}</span>
              </div>

              <div className="receipt-line"></div>

              {receipt.items.map((item: any, i: number) => (
                <div key={i}>
                  <div className="receipt-item-name">
                    {item.itemName}
                  </div>

                  <div className="receipt-row">
                    <span>{item.qty} x {money(item.price)}</span>
                    <span>{money(item.qty * item.price)}</span>
                  </div>
                </div>
              ))}

              <div className="receipt-line"></div>

              <div className="receipt-row">
                <span>Subtotal</span>
                <span>{money(receipt.subtotal)}</span>
              </div>

              <div className="receipt-row">
                <span>Tax</span>
                <span>{money(receipt.taxAmount)}</span>
              </div>

              <div className="receipt-row receipt-total">
                <span>TOTAL</span>
                <span>{money(receipt.total)}</span>
              </div>

              <div className="receipt-line"></div>

              <div className="receipt-footer">
                {company?.footerMessage || "Thank you for your business"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderEntryPage2;

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "36px",
    color: "#0f172a",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "18px",
  },
  customerBox: {
    marginBottom: "24px",
  },
  customerInput: {
    width: "100%",
    maxWidth: "420px",
    padding: "16px",
    fontSize: "18px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    outline: "none",
  },
  formRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "18px",
  },
  input: {
    minWidth: "220px",
    padding: "14px",
    fontSize: "17px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    outline: "none",
    background: "#fff",
  },
  primaryBtn: {
    padding: "14px 22px",
    border: "none",
    borderRadius: "14px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  infoRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },
  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "18px",
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "17px",
  },
  th: {
    background: "#f1f5f9",
    padding: "14px",
    textAlign: "left",
    color: "#0f172a",
  },
  td: {
    padding: "14px",
    borderTop: "1px solid #e2e8f0",
  },
  empty: {
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
    borderTop: "1px solid #e2e8f0",
  },
  removeBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "20px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  totals: {
    fontSize: "18px",
    color: "#0f172a",
  },
  submitBtn: {
    padding: "16px 28px",
    border: "none",
    borderRadius: "16px",
    background: "#16a34a",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  pdf: {
    marginTop: "28px",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
  },
    logo: {
    marginBottom: "2px",
      width: "48px",
  height: "48px",
  objectFit: "contain",
   display: "flex",
  flexDirection: "column",
  alignItems: "center",

 
  },

logoBox: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: "0px",
},

logoImage: {
  width: "48px",
  height: "48px",
  objectFit: "contain",
  marginBottom: "0px",
},
};