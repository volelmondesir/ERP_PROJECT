import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
 import { saveAuditLog } from "../utils/tempLog2";   
const API = "http://localhost:5000";

type Item = {
  name?: string;
  quantity?: number;
};

type Delivery = {
  deliveryNumber?: string;
  receiptNumber?: string;
  customerName?: string;
  invoiceNumber?: string;
  deliveredBy?:string;
  deliveryDate?: string;
  items?: Item[];
  status?: string;
};

const DeliveryPage: React.FC = () => {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [currentUser, setCurrentUser] =
  useState("");


  useEffect(() => {

  const username =
    localStorage.getItem("username");

  if (username) {
    setCurrentUser(username);
  }

}, []);
  // 🔹 LOAD DELIVERY
const loadDelivery = async (
  customRef?: string
) => {

  const value =
    (customRef || ref).trim();

  if (!value) {
    return alert(
      "Enter reference"
    );
  }

  try {

    // ✅ GET LOGGED USER
    const username =
      localStorage.getItem(
        "username"
      ) || "";

    const res =
      await axios.get(
        `${API}/api/deliveries/${value}`
      );

    // ✅ ADD DELIVERY USER
    const data = {
      ...res.data,
      deliveredBy: username
    };

    console.log(
      "DELIVERY 👉",
      data
    );

    // ✅ SAVE STATE
    setDelivery(data);

    // ✅ GENERATE PDF
    generateDeliveryPDF(data);

  } catch (err: any) {

    console.log(err);

    alert(
      err.response?.data?.error ||
      "Delivery not found"
    );
  }
};
  // 🔹 RESET
  const newDelivery = () => {
    setDelivery(null);
    setRef("");
    setPdfUrl(null);
  };

  // 🔹 CONFIRM DELIVERY
  const markDelivered = async () => {
    try {
    await axios.put(
  `${API}/api/delivery/delivered/${delivery?.deliveryNumber}`,
  {
    deliveredBy: currentUser
  }
);

      alert("✅ Delivery completed");

      await loadDelivery(); // 🔥 reload
    } catch {
      alert("❌ Error updating delivery");
    }
  };

  // 🔹 PDF
  const generateDeliveryPDF = (
  del: Delivery
) => {

  const doc =
    new jsPDF({
      unit: "mm",
      format: [80, 200]
    });

  let y = 10;

  const center = (
    t?: string
  ) => {

    doc.text(
      t ?? "",
      40,
      y,
      { align: "center" }
    );

    y += 5;
  };

  // =====================
  // HEADER
  // =====================

  center("Delivery Note");

  y += 5;

  doc.text(
    `Receipt: ${del.receiptNumber}`,
    5,
    y
  );

  y += 5;

  doc.text(
    `Invoice: ${del.invoiceNumber}`,
    5,
    y
  );

  y += 5;

  doc.text(
    `Customer: ${del.customerName}`,
    5,
    y
  );

  y += 5;
doc.text(
  `Delivered By: ${
    del.deliveredBy || ""
  }`,
  5,
  y
);


y += 5;

  doc.line(5, y, 75, y);

  y += 5;

  // =====================
  // ITEMS
  // =====================

  del.items?.forEach(item => {

    const qty =
      Number(
        item.quantity ?? 0
      );

    const itemName =
      doc.splitTextToSize(
        item.name ?? "",
        55
      );

    doc.text(
      itemName,
      5,
      y
    );

    doc.text(
      String(qty),
      75,
      y,
      {
        align: "right"
      }
    );

    y += itemName.length * 5;

    y += 4;
  });

  // =====================
  // BARCODE
  // =====================

  y += 5;

  const canvas =
    document.createElement(
      "canvas"
    );

  JsBarcode(
    canvas,
    del.receiptNumber || "",
    {
      format: "CODE128",
      width: 1.5,
      height: 30
    }
  );

  const img =
    canvas.toDataURL(
      "image/png"
    );

  doc.addImage(
    img,
    "PNG",
    10,
    y,
    60,
    20
  );

  // =====================
  // PREVIEW
  // =====================

  const url =
    URL.createObjectURL(
      doc.output("blob")
    );

  setPdfUrl(url);
};
  return (
    <div style={{ maxWidth: 400, margin: "auto" }}>
      <h2>Delivery Note</h2>

      <input
        placeholder="RPT- / DLV- / IVN-"
        value={ref}
        onChange={(e) => setRef(e.target.value.replace(/^\s+/, ""))}
      />

      <button onClick={() => loadDelivery()}>Load</button>

      <button onClick={newDelivery} style={{ marginLeft: 10 }}>
        New
      </button>

      {delivery && (
        <div>
          <p><b>Customer:</b> {delivery.customerName}</p>

          <p>
            <b>Status:</b>{" "}
            <span
              style={{
                color:
                  delivery.status === "Delivered"
                    ? "green"
                    : delivery.status === "Ready"
                    ? "blue"
                    : "orange",
                fontWeight: "bold"
              }}
            >
              {delivery.status === "Delivered"
                ? "✅ DELIVERED"
                : delivery.status === "Ready"
                ? "📦 READY"
                : "⏳ PENDING"}
            </span>
          </p>

          <p><b>Ref:</b> {delivery.receiptNumber}</p>

          {delivery.items?.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{item.name}</span>
              <span>{item.quantity}</span>
            </div>
          ))}

          {/* 🔥 BUTTON FIX */}
          <button
            onClick={() => generateDeliveryPDF(delivery)}
            disabled={delivery.status === "Delivered"}
          >
            {delivery.status === "Delivered"
              ? "Already Delivered"
              : "Generate PDF"}
          </button>

          {delivery.status !== "Delivered" && (
            <button onClick={markDelivered}>
              Confirm Delivery
            </button>
          )}

          {pdfUrl && (
            <iframe src={pdfUrl} width="100%" height="400px" />
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryPage;