import { Server } from "socket.io";
import http from "http";

import express from "express";
import cors from "cors";
import sql from "mssql";
import { connectDB } from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import { verifyToken } from "./middleware/auth.js";
import { checkPermission } from "./middleware/permissions.js";
import productionRouter from "./routes/mfg.js";
import taxRoutes from "./routes/tax.js";
import usersRoutes from "./routes/users.js";
import permissionsRoutes from "./routes/permissions.js";
import icRoutes from "./routes/ic.js";
import mkRoutes from "./routes/mk.js";
import orderRoutes from "./routes/orders.js";
import invoicesRoutes from "./routes/invoices.js";
import paymentsRoutes from "./routes/payments.js";
import deliveryRoutes from "./routes/delivery.js";

import accountsRoutes from "./routes/accounts.js"
import glRoutes from "./routes/gl.js"
import apRoutes from "./routes/ap.js";
import poRoutes from "./routes/po.js";
import fisalRoutes from "./routes/fiscalyear.js";
import bankRoutes from "./routes/bank.js";
import dashRoutes from "./routes/dash.js";
import chequesRoutes from "./routes/ar.js";
import customerRoutes from "./routes/customer.js";
import companyRoutes from  "./routes/company.js";
import hrRoutes from "./routes/hr.js";
import dptRoutes from "./routes/dpt.js";
import attendanceRoutes from "./routes/attendance.js";
import pinRoutes from "./routes/pin.js"
import payrollRoutes from "./routes/payroll.js";
import binRoutes from "./routes/bins.js"
import journalEntriesRoutes from "./routes/je.js";
import investmentRoutes from "./routes/investment.js";
import vendorRoutes from "./routes/vendor.js";
//import permissionsRoutes from "./routes/permissions.js"
import licenseRoutes from "./routes/lic.js";
//import { checkLicense } from "./middleware/checkLicense.js";
import deviseRoutes from "./routes/devise.js"
import loginRoutes from "./routes/login.js"

import dotenv from "dotenv";
dotenv.config();



{/** import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);*/}






//import usersRoutes  from "./routes/users.js";
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
 // console.log("Socket connected:", socket.id);
  socket.on('send_message', (data) => {
    // Broadcast message to all connected clients
    io.emit('receive_message', data);
  });
  socket.on("disconnect", () => {
   // console.log("Socket disconnected:", socket.id);
  });
});

export { io };

// ✅ MIDDLEWARE
app.use(express.json());

app.use(cors()); // ✅ open tout pou test
// License routes pa dwe bloke
app.use("/api/license", licenseRoutes);


// Tout lòt API yo ap pase anba license check
//app.use("/api/hr", checkLicense, hrRoutes);
//app.use("/api/accounts", checkLicense, accountRoutes);
//app.use("/api", checkLicense, journalEntriesRoutes);
app.use("/api/company", companyRoutes);
app.use("/api", loginRoutes);
app.use("/api/devises", deviseRoutes);
app.use("/api/bins", binRoutes);
app.use("/api/pin", pinRoutes);
app.use("/api/po", poRoutes);
app.use("/api/oe", orderRoutes);
app.use("/api/ap", apRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/hr", payrollRoutes);
app.use("/api/accounts" ,glRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/hr", dptRoutes);
app.use("/api/hr", attendanceRoutes);
app.use("/api", journalEntriesRoutes);
app.use("/api", investmentRoutes);
app.use("/api/ic", icRoutes);
app.use("/api/reports", mkRoutes);
app.use("/api/", orderRoutes);
app.use("/api", invoicesRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/rcp", paymentsRoutes);
app.use("/api/dlv", deliveryRoutes);
app.use("/api", pinRoutes);
app.use("/api", deliveryRoutes);
app.use("/api", usersRoutes);
app.use("/api/fiscalyear", fisalRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/mfg", productionRouter);
app.use("/api/dash", dashRoutes);
app.use("/api/ar", chequesRoutes);
app.use("/api/ar", customerRoutes);

app.use("/api", productionRouter); 
app.use("/api/permissions", permissionsRoutes);
app.use("/uploads", express.static("uploads"));



// Route pou production/dashboard

// Route pou production/dashboard
// Pou "/api/production/dashboard"
const SECRET = "mysecretkey";
// ✅ DATABASE CONFIG
const dbConfig = {
  user: "sa",
  password: "5092213525",
  server: "localhost",
  database: "ERP_DB",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
connectDB();


// ✅ CONNECT DB
sql.connect(dbConfig)
  .then(() => console.log("🚀 Connected to MSSQL!"))
  .catch(err => console.log("❌ DB Error:", err));



app.use("/api/mk", vendorRoutes);
app.get("/inventory", async (req, res) => {
  const result = await sql.query`SELECT * FROM Inventory`;
  res.json(result.recordset);
});



app.get("/prices/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await sql.query`
      SELECT TOP 1 price FROM Prices
      WHERE productId = ${productId}
      ORDER BY id DESC
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send("Price not found");
    }

    res.json(result.recordset[0]);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/products", async (req, res) => {
  const result = await sql.query`SELECT * FROM Products`;
  res.json(result.recordset);
});


app.get("/prices/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await sql.query`
      SELECT TOP 1 price FROM Prices
      WHERE productId = ${productId}
      ORDER BY id DESC
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send("Price not found");
    }

    res.json(result.recordset[0]);

  } catch (err) {
    res.status(500).send(err.message);
  }
});


// 💾 SAVE INVOICE
app.post("/invoices", async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).send("orderId required");
    }

    // 🔒 CHECK EXISTING
    const existing = await sql.query`
      SELECT id, invoiceNumber FROM Invoices WHERE orderId = ${orderId}
    `;

    if (existing.recordset.length > 0) {
      return res.json(existing.recordset[0]);
    }

    // 🔍 ORDER
    const orderRes = await sql.query`
      SELECT * FROM Orders WHERE id = ${orderId}
    `;

    if (!orderRes.recordset.length) {
      return res.status(404).send("Order not found");
    }

    const order = orderRes.recordset[0];

    // 📅 GET FISCAL YEAR (🔥 AVAN INSERT)
    const fiscal = await getActiveFiscalYear();

    if (!fiscal) {
      return res.status(400).send("No active fiscal year");
    }

    // 📦 ITEMS
    const itemsRes = await sql.query`
      SELECT oi.quantity, oi.price, p.name
      FROM OrderItems oi
      JOIN Products p ON oi.productId = p.id
      WHERE oi.orderId = ${orderId}
    `;

    const items = itemsRes.recordset;

    // 💰 SUBTOTAL
    let subtotal = 0;
    items.forEach(i => {
      subtotal += i.price * i.quantity;
    });

    // 🧾 TAX
    const taxRes = await sql.query(`
      SELECT TOP 1 taxRate
      FROM TaxSettings
      WHERE isActive = 1
      ORDER BY updatedAt DESC
    `);

    const taxRate = taxRes.recordset[0]?.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // 🔢 INVOICE NUMBER
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const random = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `IVN-${datePart}-${random}`;

    // 💾 INSERT (🔥 AK fiscal_year_id)
    const insertRes = await sql.query`
      INSERT INTO Invoices (
        invoiceNumber,
        orderId,
        customerName,
        subtotal,
        taxRate,
        taxAmount,
        total,
        paidAmount,
        status,
        fiscal_year_id
      )
      OUTPUT INSERTED.id
      VALUES (
        ${invoiceNumber},
        ${orderId},
        ${order.customerName},
        ${subtotal},
        ${taxRate},
        ${taxAmount},
        ${total},
        0,
        'UNPAID',
        ${fiscal.id}
      )
    `;

    const invoiceId = insertRes.recordset[0].id;

    // 💾 SAVE ITEMS
    for (const item of items) {
      await sql.query`
        INSERT INTO InvoiceItems (invoiceId, name, quantity, price)
        VALUES (${invoiceId}, ${item.name}, ${item.quantity}, ${item.price})
      `;
    }

    res.json({
      id: invoiceId,
      invoiceNumber,
      customerName: order.customerName,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      paidAmount: 0,
      fiscalYear: fiscal.year_label
    });

  } catch (err) {
    console.error("INVOICE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});



// 📄 GET SINGLE ORDER (pou invoice)
app.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql.query`
      SELECT * FROM Orders WHERE id = ${id}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send("Order not found");
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/invoices/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const invoiceRes = await sql.query`
      SELECT * FROM Invoices WHERE orderId = ${orderId}
    `;

    if (invoiceRes.recordset.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    const invoice = invoiceRes.recordset[0];

    // 🔥 GET ITEMS
    const itemsRes = await sql.query`
      SELECT oi.quantity, oi.price, p.name
      FROM OrderItems oi
      JOIN Products p ON oi.productId = p.id
      WHERE oi.orderId = ${orderId}
    `;

    res.json({
      ...invoice,
      items: itemsRes.recordset
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
});



// ✏️ UPDATE INVOICE
app.put("/invoices/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerName, total } = req.body;

    // CHECK SI EXISTE
    const existing = await sql.query`
      SELECT * FROM Invoices WHERE orderId = ${orderId}
    `;

    if (existing.recordset.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    // UPDATE
    await sql.query`
      UPDATE Invoices
      SET customerName = ${customerName},
          total = ${total}
      WHERE orderId = ${orderId}
    `;

    res.send("Invoice updated");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 💡 CREATE OR UPDATE

    


app.get("/invoices/:id", async (req, res) => {
  const id = req.params.id;

  let invoiceRes;

  if (!isNaN(id)) {
    invoiceRes = await sql.query`
      SELECT * FROM Invoices WHERE id = ${id}
    `;
  } else {
    invoiceRes = await sql.query`
      SELECT * FROM Invoices WHERE invoiceNumber = ${id}
    `;
  }

  if (invoiceRes.recordset.length === 0) {
    return res.status(404).send("Invoice not found");
  }

  const invoice = invoiceRes.recordset[0];

  // 🔥 GET ITEMS
  const itemsRes = await sql.query`
    SELECT oi.quantity, oi.price, p.name
    FROM OrderItems oi
    JOIN Products p ON oi.productId = p.id
    WHERE oi.orderId = ${invoice.orderId}
  `;

  res.json({
    ...invoice,
    items: itemsRes.recordset
  });
});

async function getActiveFiscalYear() {
  const res = await sql.query`
    SELECT TOP 1 *
    FROM fiscal_years
    WHERE GETDATE() BETWEEN start_date AND end_date
    ORDER BY start_date DESC
  `;

  if (res.recordset.length === 0) {
    throw new Error("No active fiscal year");
  }

  const fy = res.recordset[0];

  if (fy.status === "Closed") {
    throw new Error("Fiscal year is CLOSED");
  }

  return fy;
}







app.get("/products", async (req, res) => {
  const result = await sql.query`SELECT * FROM Products`;
  res.json(result.recordset);
 });


app.post("/prices", async (req, res) => {
  try {
    const { productId, price, date } = req.body;

    await sql.query`
      INSERT INTO Prices (productId, price, createdAt)
      VALUES (${productId}, ${price}, ${date})
    `;

    res.send("Price added");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put("/prices/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { price } = req.body;

    await sql.query`
      UPDATE Prices
      SET price = ${price}
      WHERE productId = ${productId}
    `;

    res.send("Price updated");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/sales", async (req, res) => {
  try {
    const { orderCode, customerName, productId, amount, date } = req.body;

    // 🔍 GET LAST PRICE
    const priceResult = await sql.query`
      SELECT TOP 1 price FROM Prices
      WHERE productId = ${productId}
      ORDER BY id DESC
    `;

    if (priceResult.recordset.length === 0) {
      return res.status(400).send("No price found");
    }

    const price = priceResult.recordset[0].price;

    const total = price;
    const balance = amount - total;

    await sql.query`
      INSERT INTO Sales (orderCode, customerName, productId, total, amount, balance, createdAt)
      VALUES (${orderCode}, ${customerName}, ${productId}, ${total}, ${amount}, ${balance}, ${date})
    `;

    res.send("Sale saved");
  } catch (err) {
    res.status(500).send(err.message);
  }
});





app.post("/products", async (req, res) => {
  try {
    const { productCode, name, date } = req.body;

    await sql.query`
      INSERT INTO Products (productCode, name, createdAt)
      VALUES (${productCode}, ${name}, ${date})
    `;

    res.send("Product added");
  } catch (err) {
    res.status(500).send(err.message);
  }
});
    // UPDATE INVOICE
 
app.get("/inventory", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM Inventory`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// ✅ GET ORDER + PRICE
app.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql.query`
      SELECT o.id, o.customerName, o.product, o.quantity, i.price
      FROM Orders o
      JOIN Inventory i ON o.product = i.product
      WHERE o.id = ${id}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send("Order not found");
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
// 👉 GET ALL ORDERS
app.get("/orders", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM Orders`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✏️ UPDATE ORDER
app.put("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, product, quantity } = req.body;

    await sql.query`
      UPDATE Orders
      SET customerName = ${customerName},
          product = ${product},
          quantity = ${quantity}
      WHERE id = ${id}
    `;

    res.send("Order updated");
  } catch (err) {
    res.status(500).send(err.message);
  }
});
// ❌ DELETE ORDER
app.delete("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await sql.query`
      DELETE FROM Orders WHERE id = ${id}
    `;

    res.send("Order deleted");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT
        (SELECT SUM(total) FROM Invoices) as totalSales,
        (SELECT SUM(total - paidAmount) FROM Invoices WHERE total > paidAmount) as unpaid,
        (SELECT COUNT(*) FROM Invoices WHERE status = 'Pending') as pendingDeliveries,
        (SELECT COUNT(*) FROM Invoices WHERE status = 'Paid') as readyDeliveries,
        (SELECT COUNT(*) FROM Invoices WHERE status = 'Paid') as delivered
    `);

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
app.get("/api/top-products", async (req, res) => {
  try {
    const result = await sql.query(`
     SELECT TOP 5 
        oi.productName,
        SUM(oi.quantity) as totalSold
      FROM OrderItems oi
      JOIN Invoices i ON oi.orderId = i.orderId
	    JOIN Payments p ON p.invoiceId = i.id
      GROUP BY oi.productName
      ORDER BY totalSold DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
//
app.get("/api/stock-levels", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT 
        p.name,
        i.quantity
      FROM Inventory i
      JOIN Products p ON i.productId = p.id
      ORDER BY i.quantity ASC
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
// TOTAL SALES
app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const sales = await sql.query(`
      SELECT ISNULL(SUM(total),0) as totalSales FROM Invoices
    `);

    const unpaid = await sql.query(`
      SELECT COUNT(*) as unpaid FROM Invoices WHERE status != 'Paid'
    `);

    const pending = await sql.query(`
      SELECT COUNT(*) as pending FROM Deliveries WHERE status != 'Delivered'
    `);

    res.json({
      totalSales: sales.recordset[0].totalSales,
      unpaid: unpaid.recordset[0].unpaid,
      pending: pending.recordset[0].pending
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});






// =========================
// ✅ TEST ROUTE
// =========================
app.get("/", (req, res) => {
  res.send("API OK");
});

// =========================
// ✅ REGISTER
// =========================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await new sql.Request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashedPassword)
      .query("INSERT INTO Users (username, password) VALUES (@username, @password)");

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// ===============================
// 📊 FISCAL YEAR SYSTEM (CLEAN)
// ===============================

// 🔓 OPEN FISCAL YEAR
// ===============================
// 📊 FISCAL YEAR SYSTEM (FINAL)
// ===============================



app.post('/api/fiscal-year/open', async (req, res) => {
  const transaction = new sql.Transaction();

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // 🔥 1. DETERMINE YEAR AUTOMATIC
    const today = new Date();
    const month = today.getMonth(); // 0 = Jan

    const y = month >= 9
      ? today.getFullYear() + 1
      : today.getFullYear();

    // 🔥 2. CHECK SI GEN OPEN DEJA
    const check = await request.query(`
      SELECT * FROM fiscal_years WHERE status = 'OPEN'
    `);

    if (check.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "A fiscal year is already OPEN"
      });
    }

    // 🔥 3. DEFINE RANGE (Oct → Sep)
    const start = new Date(Date.UTC(y - 1, 9, 1)); // Oct 1
    const end   = new Date(Date.UTC(y, 8, 30));    // Sep 30

    // 🔥 4. INSERT FISCAL YEAR
    const fy = await request.query(`
      INSERT INTO fiscal_years (year_label, start_date, end_date, status)
      OUTPUT INSERTED.id
      VALUES (
        '${y-1}-${y}',
        '${start.toISOString()}',
        '${end.toISOString()}',
        'OPEN'
      )
    `);

    const fiscalYearId = fy.recordset[0].id;

    // 🔥 5. MONTH ORDER (Oct → Sep)
    const monthsOrder = [9,10,11,0,1,2,3,4,5,6,7,8];
    const monthNames = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    // 🔥 6. INSERT PERIODS (SAFE)
    for (let i = 0; i < 12; i++) {
      const m = monthsOrder[i];

      const yearForMonth = m >= 9 ? (y - 1) : y;

      const pStart = new Date(Date.UTC(yearForMonth, m, 1));
      const pEnd   = new Date(Date.UTC(yearForMonth, m + 1, 0));

      const monthName = monthNames[m];

      console.log("INSERT PERIOD:", monthName);

      await request.query(`
        IF NOT EXISTS (
          SELECT 1 FROM fiscal_periods
          WHERE fiscal_year_id = ${fiscalYearId}
          AND period_name = '${monthName}'
        )
        INSERT INTO fiscal_periods
        (fiscal_year_id, period_name, start_date, end_date, status)
        VALUES (
          ${fiscalYearId},
          '${monthName}',
          '${pStart.toISOString()}',
          '${pEnd.toISOString()}',
          'OPEN'
        )
      `);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Fiscal year ${y-1}-${y} created (Oct → Sep)`
    });

  } catch (err) {
    await transaction.rollback();

    console.error("ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// 🔒 CLOSE FISCAL YEAR
app.post('/api/fiscal-year/close/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const periods = await sql.query`
      SELECT * FROM fiscal_periods 
      WHERE fiscal_year_id = ${id} AND status = 'OPEN'
    `;

    if (periods.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Fèmen tout periods avan"
      });
    }

    await sql.query`
      UPDATE fiscal_years 
      SET status = 'CLOSED'
      WHERE id = ${id}
    `;

    res.json({
      success: true,
      message: "Fiscal year closed"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// 🔒 CLOSE PERIOD
app.post('/api/fiscal-period/close/:id', async (req, res) => {
  try {
    await sql.query`
      UPDATE fiscal_periods 
      SET status = 'CLOSED'
      WHERE id = ${req.params.id}
    `;

    res.json({
      success: true,
      message: "Period closed"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// 📊 GET ALL YEARS
app.get('/api/fiscal-years', async (req, res) => {
  try {
    const result = await sql.query`
      SELECT * FROM fiscal_years ORDER BY id DESC
    `;

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// 📅 GET PERIODS BY YEAR
app.get('/api/fiscal-periods/:id', async (req, res) => {
  try {
    const result = await sql.query`
      SELECT * FROM fiscal_periods
      WHERE fiscal_year_id = ${req.params.id}
      ORDER BY id
    `;

    console.log("PERIODS:", result.recordset);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// 🧪 TEST ROUTE
app.get('/api/fiscal-test', (req, res) => {
  res.json({ message: "Fiscal route OK" });
});
app.get('/api/fiscal-year/open', (req, res) => {
  res.json({
    message: "Use POST, not GET"
  });
});

// Approve
app.post('/check-request/approve/:id', async (req, res) => {
  const { approver } = req.body;
  await sql.query`
    UPDATE check_requests 
    SET status='APPROVED', approved_by=${approver}
    WHERE id=${req.params.id}
  `;
  res.send("Approved");
});





/* =========================
   🔐 1. SET / UPDATE PIN
========================= */


/* 🔐 SET PIN */


app.post("/api/set-pin", async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ message: "Missing data" });
    }

    if (pin.length < 4) {
      return res.status(400).json({ message: "PIN too short" });
    }

    // 🔐 HASH PIN
    const hash = await bcrypt.hash(pin, 10);

    await sql.query`
      UPDATE users
      SET pin_hash = ${hash}
      WHERE username = ${username}
    `;

    res.json({ message: "PIN encrypted & saved 🔐" });

  } catch (err) {
    console.error("ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});
/* =========================
   🔐 2. VERIFY PIN
========================= */
app.post("/api/verify-pin", async (req, res) => {
  try {
    const { username, pin } = req.body;

    const result = await sql.query`
      SELECT pin_hash FROM users WHERE username = ${username}
    `;

    const user = result.recordset[0];

    console.log("USER 👉", user);
    console.log("PIN 👉", pin);

    if (!user || !user.pin_hash) {
      return res.status(400).json({ message: "PIN not set ❌" });
    }

    const hash = String(user.pin_hash); // 🔥 FORCE STRING

    const isMatch = await bcrypt.compare(pin, hash);

    console.log("MATCH 👉", isMatch);

    if (isMatch) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Wrong PIN ❌" });
    }

  } catch (err) {
    console.error("ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});
// GET USERS

/* =========================
   🔐 3. OPTIONAL CHECK ACCESS
========================= */
app.post("/api/check-access", async (req, res) => {
  try {
    const { username } = req.body;

    const result = await sql.query`
      SELECT pin_hash FROM users WHERE username = ${username}
    `;

    if (!result.recordset[0]?.pin_hash) {
      return res.status(403).json({ access: false });
    }

    res.json({ access: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// SET BANK
app.post("/api/banks", async (req, res) => {
  try {
    console.log("BODY 👉", req.body);

    const { name, account_number } = req.body;

    if (!name || !account_number) {
      return res.status(400).json({ message: "Missing data ❌" });
    }

    const result = await sql.query`
      INSERT INTO banks (name, account_number)
      OUTPUT INSERTED.*
      VALUES (${name}, ${account_number})
    `;

    console.log("INSERTED 👉", result.recordset);

    res.json({ message: "Bank added ✅", data: result.recordset[0] });

  } catch (err) {
    console.error("SQL ERROR 👉", err);
    res.status(500).json({ message: err.message });
  }
});
// GET BANK
app.get("/api/banksxx", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT id, name, account_number FROM banks
    `;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// =========================
// ✅ LOGIN (FIXED 🔥)
// =========================
app.post("/logintest", async (req, res) => {
  try {
    const { username, password } = req.body;

    const userResult = await sql.query`
      SELECT *
      FROM users
      WHERE username = ${username}
    `;

    if (userResult.recordset.length === 0) {
      return res.status(401).json({
        message: "Invalid username",
      });
    }

    const user = userResult.recordset[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    // ✅ LOAD USER PERMISSIONS
    const permissionsResult = await sql.query`
      SELECT permission
      FROM user_permissions
      WHERE user_id = ${user.id}
    `;

    const permissions =
      permissionsResult.recordset.map(
        (p) => p.permission
      );

    // ✅ TOKEN
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      "secretkey",
      {
        expiresIn: "1d",
      }
    );
io.emit("auditLogUpdated", {
  moduleName: "Order Entry",
  submenuName: "Orders",
  actionType: `CREATE ORDER: ${invoiceNumber}`,
  username,
});
    res.json({
      success: true,

      token,

      user: {
        id: user.id,
        username: user.username,
            fullName: user.fullName,
      },

      permissions,
    });

  } catch (err) {
    console.log("LOGIN ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// LOGIN
app.post("/login3", async (req, res) => {
  try {
    const { username, password } = req.body;

    const pool = await sql.connect();

    // 🔍 FIND USER
    const result = await pool.request()
      .input("username", sql.VarChar, username)
      .query(`SELECT * FROM users WHERE username = @username`);

    const user = result.recordset[0];

    // ❌ USER NOT FOUND
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔐 CHECK PASSWORD
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 🔥 GET PERMISSIONS
    const permsResult = await pool.request()
      .input("userId", sql.Int, user.id)
      .query(`
        SELECT permission 
        FROM user_permissions 
        WHERE user_id = @userId
      `);

    const permissions = permsResult.recordset.map(p => p.permission);

    // 🔐 TOKEN (optional but recommended)
   const token = jwt.sign(
  {
    id: user.id,
    username: user.username,
    role: user.role
  },
  "secretkey",
  { expiresIn: "1d" }
);
    // ✅ FINAL RESPONSE
    res.json({
      token,
      user,
      permissions
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login error" });
  }
});




app.get("/fix-user", async (req, res) => {
  const hash = await bcrypt.hash("1234", 10);

  await sql.query`
    UPDATE users
    SET password = ${hash}
    WHERE username = 'vmondesir'
  `;

  res.send("Password fixed ✅");
});

//  GET CHEQUES
app.get(
  "/api/cheques",
  verifyToken,
  checkPermission("cheque", "view"),
  checkPermission("cheque", "delete"),
  async (req, res) => {
    const result = await sql.query`SELECT * FROM Cheques`;
    res.json(result.recordset);
  }
);

//POST CHEQUES
app.post(
  "/api/cheques",
  verifyToken,
  checkPermission("cheque", "create"),
  async (req, res) => {
    // insert logic
  }
);

// DELETE CHEQUES
app.delete(
  "/api/cheques/:id",
  verifyToken,
  checkPermission("cheque", "delete"),
  async (req, res) => {
    // delete logic
  }
);
app.post("/create-user", async (req, res) => {
  const { username, password, role_id } = req.body;

  const hash = await bcrypt.hash(password, 10);

  await sql.query`
    INSERT INTO Users (username, password, role, role_id)
    VALUES (${username}, ${hash}, 'user', ${role_id})
  `;

  res.json({ message: "User created ✅" });
});

app.get("/reset-password/:username/:pass", async (req, res) => {
  const { username, pass } = req.params;

  const hash = await bcrypt.hash(pass, 10);

  await sql.query`
    UPDATE Users
    SET password = ${hash}
    WHERE username = ${username}
  `;

  res.send("Password reset ✅");
});
// =========================
// ✅ PROTECTED ROUTE (TEST)
// =========================
{/** */}
app.get(
  "/dashboard",
  verifyToken,
  checkPermission("dashboard", "view"),
  (req, res) => {
    res.json({ message: "Welcome dashboard ✅" });
  }
);
//GET ALL PERMISSIONS
app.get("/api/permissions", async (req, res) => {
  const result = await sql.query`SELECT * FROM Permissions`;
  res.json(result.recordset);
});
//GET ROLE PERMISSIONS
app.get("/api/roles/:id/permissions", async (req, res) => {
  const { id } = req.params;

  const result = await sql.query`
    SELECT p.id, p.module, p.action
    FROM RolePermissions rp
    JOIN Permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = ${id}
  `;

  res.json(result.recordset);
});
//UPDATE ROLE PERMISSIONS
app.post("/api/roles/:id/permissions", async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  // delete old
  await sql.query`
    DELETE FROM RolePermissions WHERE role_id = ${id}
  `;

  // insert new
  for (let pid of permissions) {
    await sql.query`
      INSERT INTO RolePermissions (role_id, permission_id)
      VALUES (${id}, ${pid})
    `;
  }

  res.json({ message: "Updated ✅" });
});
// TEMPLATE TO ROLE

app.post("/roles/:roleId/apply-template/:templateId", async (req, res) => {
  const { roleId, templateId } = req.params;

  // ❌ DELETE OLD
  await sql.query`
    DELETE FROM RolePermissions WHERE role_id = ${roleId}
  `;

  // ✅ INSERT TEMPLATE PERMISSIONS
  await sql.query`
    INSERT INTO RolePermissions (role_id, permission_id)
    SELECT ${roleId}, permission_id
    FROM TemplatePermissions
    WHERE template_id = ${templateId}
  `;

  res.json({ success: true });
});

// 🔥 GET TEMPLATES
app.get("/templates", async (req, res) => {
  const result = await sql.query`SELECT * FROM PermissionTemplates`;
  res.json(result.recordset);
});

// 🔥 GET ROLE PERMISSIONS
app.get("/api/roles/:roleId/permissions", async (req, res) => {
  const { roleId } = req.params;

  const result = await sql.query`
    SELECT p.id, p.module, p.action
    FROM RolePermissions rp
    JOIN Permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = ${roleId}
  `;

  res.json(result.recordset);
});

////




app.get("/invoices/:id", async (req, res) => {
  const { id } = req.params;

  const invoiceRes = await sql.query`
    SELECT * FROM Invoices WHERE id = ${id}
  `;

  if (invoiceRes.recordset.length === 0) {
    return res.status(404).send("Invoice not found");
  }

  const invoice = invoiceRes.recordset[0];

  // 🔥 AJOUTE SA
  const itemsRes = await sql.query`
    SELECT name, quantity, price
    FROM InvoiceItems
    WHERE invoiceId = ${id}
  `;

  invoice.items = itemsRes.recordset;

  res.json(invoice);
});
// 🔥 METE FONKSYON AN ISIT
async function generateDeliveryNumber() {
  let deliveryNumber;
  let exists = true;

  while (exists) {
    deliveryNumber =
      "DL-" + Math.floor(100000 + Math.random() * 900000);

    const check = await sql.query`
      SELECT 1 FROM Deliveries WHERE deliveryNumber = ${deliveryNumber}
    `;

    exists = check.recordset.length > 0;
  }

  return deliveryNumber;
}
// DELETE USER
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await sql.query`
      DELETE FROM user_permissions WHERE user_id = ${id}
    `;

    await sql.query`
      DELETE FROM users WHERE id = ${id}
    `;

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting user");
  }
});
// 🔑 CHANGE PASSWORD
// 🔑 CHANGE PASSWORD
// 🔑 CHANGE PASSWORD
app.put("/users/:id/password", async (req, res) => {
  const { id } = req.params;
  const { password, currentUser } = req.body;

  try {

    // ✅ GET TARGET USER
    const userResult = await sql.query`
      SELECT username
      FROM users
      WHERE id = ${id}
    `;

    if (userResult.recordset.length === 0) {
      return res.status(404).send("User not found");
    }

    const targetUser = userResult.recordset[0];

    // ✅ ONLY ADMIN HIMSELF CAN CHANGE ADMIN PASSWORD
    if (
      String(targetUser.username).toLowerCase() === "admin" &&
      String(currentUser).toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message:
          "Only master admin can change this password",
      });
    }

    // ✅ HASH PASSWORD
    const hash = await bcrypt.hash(password, 10);

    // ✅ UPDATE
    await sql.query`
      UPDATE users
      SET password = ${hash}
      WHERE id = ${id}
    `;

    res.send("Password updated ✅");

  } catch (err) {

    console.error(err);

    res.status(500).send("Error ❌");
  }
});
//
app.post("/change-password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    const hash = await bcrypt.hash(newPassword, 10);

    await sql.query`
      UPDATE users
      SET password = ${hash}
      WHERE id = ${userId}
    `;

    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
  }
});

// CREATE PO
app.post("/po", async (req, res) => {
  const { supplier, items } = req.body;

  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  const result = await sql.query`
    INSERT INTO purchase_orders (supplier, total)
    OUTPUT INSERTED.id
    VALUES (${supplier}, ${total})
  `;

  const poId = result.recordset[0].id;

  for (const item of items) {
    await sql.query`
      INSERT INTO purchase_order_items (po_id, item_name, qty, price)
      VALUES (${poId}, ${item.name}, ${item.qty}, ${item.price})
    `;
  }

  res.send({ message: "PO created", poId });
});

// GET ALL PO
app.get("/po", async (req, res) => {
  const result = await sql.query`SELECT * FROM purchase_orders`;
  res.json(result.recordset);
});
// CREATE BILL
app.post("/bills", async (req, res) => {
  const { supplier, total } = req.body;

  await sql.query`
    INSERT INTO bills (supplier, total)
    VALUES (${supplier}, ${total})
  `;

  res.send("Bill created");
});

// GET ALL
app.get("/bills", async (req, res) => {
  const result = await sql.query`SELECT * FROM bills`;
  res.json(result.recordset);
});

// PAY BILL
app.put("/bills/:id/pay", async (req, res) => {
  const { amount } = req.body;
  const { id } = req.params;

  await sql.query`
    UPDATE bills
    SET paid = paid + ${amount}
    WHERE id = ${id}
  `;

  res.send("Bill payment added");
});

app.get("/ar", async (req, res) => {
  const result = await sql.query`
    SELECT 
      i.id,
      i.invoiceNumber,
      i.customerName,
      i.total,
      i.paidAmount as paid,
      (i.total - i.paidAmount) as balance,
      i.status
    FROM Invoices i
  `;

  res.json(result.recordset);
});

app.get("/ar/customer/:name", async (req, res) => {
  const result = await sql.query`
    SELECT * FROM Invoices
    WHERE customerName = ${req.params.name}
  `;

  res.json(result.recordset);
});
app.post("/ar/pay", async (req, res) => {
  const { invoiceId, amount } = req.body;

  const invoiceRes = await sql.query`
    SELECT * FROM Invoices WHERE id = ${invoiceId}
  `;

  if (invoiceRes.recordset.length === 0) {
    return res.status(404).send("Invoice not found");
  }

  const invoice = invoiceRes.recordset[0];
  const newPaid = (invoice.paidAmount || 0) + Number(amount);

  let status = "Unpaid";
  if (newPaid >= invoice.total) status = "Paid";
  else if (newPaid > 0) status = "Partial";

  // update invoice
  await sql.query`
    UPDATE Invoices
    SET paidAmount = ${newPaid},
        status = ${status}
    WHERE id = ${invoiceId}
  `;

  // save payment history
  await sql.query`
    INSERT INTO AR_Payments (invoiceId, amount)
    VALUES (${invoiceId}, ${amount})
  `;

  res.json({
    message: "Payment saved",
    paid: newPaid,
    status
  });
});
app.get("/ar/summary", async (req, res) => {
  const result = await sql.query(`
    SELECT
      SUM(total) as totalReceivable,
      SUM(paidAmount) as totalCollected,
      SUM(total - paidAmount) as outstanding
    FROM Invoices
  `);

  res.json(result.recordset[0]);
});
app.get("/ar/aging", async (req, res) => {
  const result = await sql.query(`
    SELECT 
      customerName,
      total,
      paidAmount,
      DATEDIFF(DAY, createdAt, GETDATE()) as days
    FROM Invoices
  `);

  const data = result.recordset.map(i => {
    let bucket = "0-30";

    if (i.days > 30) bucket = "31-60";
    if (i.days > 60) bucket = "61-90";
    if (i.days > 90) bucket = "90+";

    return { ...i, bucket };
  });

  res.json(data);
});



app.put("/api/invoices/:id/pay", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).send("Invalid ID");
    }

    await sql.query(`
      UPDATE invoices
      SET status = 'paid'
      WHERE id = ${id}
    `);

    res.send("Updated");

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
// =======================================================
// 📄 GET RECEIPTS (SEARCH + PAGINATION SAFE)
// =======================================================

app.get("/api/receipts4", async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;

    const pageSize = 4;
    const offset = (page - 1) * pageSize;

    const result = await sql.query`
      WITH ReceiptCTE AS (
        SELECT 
          p.id,
          p.invoiceId,  -- 🔥 FIX LA ISIT
          p.receiptNumber,
          i.invoiceNumber,
          i.customerName,
          p.amount,
          p.paymentDate,
          ROW_NUMBER() OVER (ORDER BY p.id DESC) AS rowNum
        FROM Payments p
        JOIN Invoices i ON p.invoiceId = i.id
        WHERE 
          p.receiptNumber LIKE ${"%" + search + "%"} OR
          i.customerName LIKE ${"%" + search + "%"}
      )
      SELECT *
      FROM ReceiptCTE
      WHERE rowNum BETWEEN ${offset + 1} AND ${offset + pageSize}
    `;

    res.json(result.recordset);

  } catch (err) {
    console.error("RECEIPTS ERROR 👉", err);
    res.status(500).send(err.message);
  }
});

// =======================================================
// 📄 GET FULL INVOICE (WITH ITEMS)
// =======================================================

app.get("/api/invoice-full/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    // GET INVOICE
    const invRes = await sql.query`
      SELECT * FROM Invoices WHERE id = ${id}
    `;

    const invoice = invRes.recordset[0];

    if (!invoice) {
      return res.status(404).send("Invoice not found");
    }

    // 🔥 GET ORDER ID
    const orderId = invoice.orderId;

    // GET ITEMS ✅ FIXED
    const itemsRes = await sql.query`
      SELECT 
        oi.quantity, 
        oi.price, 
        ISNULL(p.name, 'Unknown Product') as name
      FROM OrderItems oi
      LEFT JOIN Products p ON oi.productId = p.id
      WHERE oi.orderId = ${orderId}
    `;

    console.log("INVOICE ID 👉", id);
    console.log("ORDER ID 👉", orderId);
    console.log("ITEMS 👉", itemsRes.recordset);

    invoice.items = itemsRes.recordset || [];

    res.json(invoice);

  } catch (err) {
    console.error("INVOICE FULL ERROR 👉", err);
    res.status(500).send(err.message);
  }
});


// =======================================================
// 📊 COUNT (POU PAGE NUMBERS)
// =======================================================
app.get("/api/receipts/count", async (req, res) => {
  try {
    const search = req.query.search || "";

    const result = await sql.query`
      SELECT COUNT(*) as total
      FROM Payments p
      JOIN Invoices i ON p.invoiceId = i.id
      WHERE 
        p.receiptNumber LIKE ${"%" + search + "%"} OR
        i.customerName LIKE ${"%" + search + "%"}
    `;

    res.json(result.recordset[0]);

  } catch (err) {
    res.status(500).send(err.message);
  }
});


app.get("/api/invoices-paid", async (req, res) => {
  const result = await sql.query(`
    SELECT 
      id AS invoiceId,   -- 🔥 SA ENPOTAN
      invoiceNumber,
      customerName,
      total
    FROM Invoices
    WHERE paidAmount >= total
  `);

  res.json(result.recordset);
});

app.get("/api/invoices/paid", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT 
        id,
        customerName AS customer,
        total
      FROM invoices
      WHERE status = 'paid'
      ORDER BY id DESC
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error("PAID INVOICES ERROR:", err);
    res.status(500).send("Server error");
  }
});
app.post("/api/invoices", async (req, res) => {
  try {
    const { customerName, items, taxRate } = req.body;

    // CALCUL
    let subtotal = 0;
    items.forEach(i => {
      subtotal += i.price * i.quantity;
    });

    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // INSERT INVOICE
    const invRes = await sql.query`
      INSERT INTO Invoices (customerName, subtotal, taxAmount, total, taxRate)
      OUTPUT INSERTED.id
      VALUES (${customerName}, ${subtotal}, ${taxAmount}, ${total}, ${taxRate})
    `;

    const invoiceId = invRes.recordset[0].id;

    // 🔥 INSERT ITEMS (SA TE MANKE)
    for (const item of items) {
      await sql.query`
        INSERT INTO InvoiceItems (invoiceId, name, quantity, price)
        VALUES (${invoiceId}, ${item.name}, ${item.quantity}, ${item.price})
      `;
    }

    res.json({ message: "Invoice created", invoiceId });

  } catch (err) {
    console.error("CREATE INVOICE ERROR 👉", err);
    res.status(500).send(err.message);
  }
});


app.get("/api/invoices/:id", async (req, res) => {
  console.log("🔥 THIS ROUTE IS RUNNING");
  try {
    const { id } = req.params;

    const invRes = await sql.query`
      SELECT * FROM Invoices WHERE id = ${id}
    `;

    if (!invRes.recordset.length) {
      return res.status(404).send("Invoice not found");
    }

    const invoice = invRes.recordset[0];

    const itemsRes = await sql.query`
      SELECT name, quantity, price
      FROM InvoiceItems
      WHERE invoiceId = ${id}
    `;

    invoice.items = itemsRes.recordset;

    res.json(invoice);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const userId = req.user.id; // soti nan auth

    const result = await sql.query`
      SELECT u.id, u.username, r.id as roleId, r.name as role, p.action
      FROM Users u
      JOIN Roles r ON u.role_Id = r.id
      LEFT JOIN RolePermissions rp ON rp.role_Id = r.id
      LEFT JOIN Permissions p ON p.id = rp.permission_Id
      WHERE u.id = ${userId}
    `;

    if (!result.recordset.length) {
      return res.status(404).send("User not found");
    }

    const user = {
      id: result.recordset[0].id,
      username: result.recordset[0].username,
      role: result.recordset[0].role,
      permissions: result.recordset
        .map(r => r.action)
        .filter(Boolean) // retire null
    };

    res.json(user);

  } catch (err) {
    console.error("ME ERROR 👉", err);
    res.status(500).send(err.message);
  }
});
app.get("/api/permissions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await sql.query`
      SELECT p.action
      FROM Users u
      JOIN RolePermissions rp ON rp.role_Id = u.role_Id
      JOIN Permissions p ON p.id = rp.permission_Id
      WHERE u.id = ${userId}
    `;

    const permissions = result.recordset.map(p => p.action);

    res.json(permissions);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading permissions");
  }
});

app.post("/production", async (req, res) => {
  const { productionCode, machineStart, date, qty } = req.body;

  try {
    await sql.query`
      INSERT INTO Production (productionCode, machineStart, createdAt)
      VALUES (${productionCode}, ${machineStart}, ${date})
    `;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});


// =========================
// ✅ START SERVER
// =========================
const current = new Date();
const date = current.toLocaleDateString();
const time = current.toLocaleTimeString()
server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000","📆Day ",date,"Time🕒 ",time);
});


