import React, { useState, useEffect } from "react";
import axios from "axios";
import { translations } from "../translations/translations";
const API = "/api";
import { saveAuditLog } from "../utils/tempLog2"; 
type ModuleType = {
  name: string;
  label: string;
  children: string[];
};

const modules: ModuleType[] = [
  {
    name: "ap",
    label: "Accounts Payable",
    children: ["apaging","po", "payments", "poreports"],
  },
  {
    name: "ar",
    label: "Accounts Receivable",
    children: [
      "araging",
      "chequeform",
      "customers",
      "customerhistory",
      "customersumary",
      "cstomerpayment",
      "invoices",
      "chequelist",
      "list",
    ],
  },
  {
    name: "cashier",
    label: "Cashier",
    children: ["buycurrency","currencyreport","sales", "receipts", "caisse"],
  },
  {
    name: "dashboard",
    label: "Dashboard",
    children: ["dashboard","trends"],
  },
  {
    name: "delivery",
    label: "Delivery",
    children: ["dlv", "dlvreceipt"],
  },
  {
    name: "inventory",
    label: "Inventory",
    children: ["inventory", "entryitem","entryqty","inv", "itemstock", "invhistory", "bm", "bins"],
  },
  {
    name: "ledger",
    label: "General Ledger",
    children: ["account", "accountreport", "gl2", "journalentry", "invest"],
  },
  {
    name: "manufacturing",
    label: "Manufacturing",
    children: ["mfgdashboard", "createitem", "finishedgoods", "production","productionreport"],
  },
  {
    name: "marketing",
    label: "Marketing",
    children: ["entryprice", "salesreport", "vendor", "vendorcustomer", "customer"],
  },
  {
    name: "orderentry",
    label: "Order Entry",
    children: ["order", "oeproforma","oeinvoices"],
  },
  {
    name: "purchase order",
    label: "Purchase Order",
    children: ["createpo", "potoinv","invreport" ,"poinvreport", "poproforma","poreport" ,"reception","receiving"],
  },
  {
    name: "hr",
    label: "Human Resources",
    children: ["hr", "employee", "dpt", "attendance", "payroll", "employeehistory", "leavemanagement","employeeofmonth"],
  },
  {
    name: "settings",
    label: "Settings",
    children: ["about","backup","camera","setbank", "compagny", "currency","fiscal", "users", "changeuser", "role", "setuppin", "tax", "register", "license","userauditlog"],
  },
];

const menuLabels: Record<string, string> = {
     productionreport: "Production Report",
  po: "Purchase Order",
  payments: "Payments",
  poreport:"POReport",
  poinvreport: "PO INV Report",
   poinreport: "PO INV Reports",
   receiving: "Receiving Report",
  invreports:"INV Reports",
   apaging:"AP Aging",
    araging:"AR Aging",
  trends: "trends",
  chequeform: "Cheque Form",
  customers: "Customers",
  customerhistory: "Customer History",
  customersumary: "Customer Summary",
  cstomerpayment: "Customer Payment",
  invoices: "Invoices",
  chequelist: "Cheque List",
  list: "List",
  entryqty :"EntryQty",
  
  buycurrency :"Buy Currency",
  sales: "Sales",
  receipts: "Receipts",
  caisse: "Caisse",
 currencyreport:"Currency Report",
  dashboard: "Dashboard",

  dlv: "Delivery",
  dlvreceipt: "Delivery Receipt",

  inventory: "Inventory",
  entryitem: "Entry Item",
  inv: "Inventory",
  itemstock: "Item Stock",
  invhistory: "Inventory History",
  bm: "BM",
  bins: "Bins",

  account: "Account",
  accountreport: "Account Report",
  gl2: "GL2",
  journalentry: "Journal Entry",
  invest: "Invest",

  mfgdashboard: "MFG Dashboard",
  createitem: "Create Item",
  finishedgoods: "Finished Goods",
  production: "Production",

  entryprice: "Entry Price",
  salesreport: "Sales Report",
  vendor: "Vendor",
  vendorcustomer: "Vendor Customer",
  customer: "Customer",

  order: "Order",
  oeprofoma: "OEProforma",
oeinvoices: "OEInvoices",
  createpo: "Create PO",
  potoinv: "PO To Invoice",

  poproforma: "POProforma",
  reception: "Goods Receipt",

  hr: "HR",
  employee: "Employee",
  dpt: "Department",
  attendance: "Attendance",
  payroll: "Payroll",
  employeehistory: "Employee History",
  leavemanagement: "Leave Management",
employeeofmonth: "employeeofmonth",
about: "About",
backup: "Backup",
camera: "Camera",
  setbank: "Set Bank",
   currency: "Currency",
  compagny: "Company",
  fiscal: "Fiscal",
  users: "Users",
  changeuser: "Change User",
  role: "Role",
  setuppin: "Setup PIN",
  tax: "Tax",
  register: "Register",
  license: "License",
  userauditlog: "User Auditlog"
};

const formatLabel = (text: string) => {
  return text
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const RolePermissionsPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
const [openModule, setOpenModule] = useState<string | null>(null);
const [lang, setLang] = useState("en");
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);

      const unique = res.data.filter(
        (u: any, index: number, self: any[]) =>
          index === self.findIndex((x) => x.username === u.username)
      );

      setUsers(unique);
    } catch (err: any) {
      console.log("LOAD USERS ERROR 👉", err.response?.data || err.message);
      setUsers([]);
    }
  };

  const loadPermissions = async (userId: string) => {
    setSelectedUser(userId);

    if (!userId) {
      setPermissions([]);
      return;
    }

    try {
      const res = await axios.get(`${API}/permissions/${userId}`);
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.log("LOAD PERMISSIONS ERROR 👉", err.response?.data || err.message);
      setPermissions([]);
    }
  };

  const togglePermission = (parent: string, children: string[] = []) => {
    setPermissions((prev) => {
      const isParentChecked = prev.includes(parent);

      if (isParentChecked) {
        return prev.filter((p) => p !== parent && !children.includes(p));
      }

      return Array.from(new Set([...prev, parent, ...children]));
    });
  };

  const toggleChild = (child: string, parent: string) => {
    setPermissions((prev) => {
      if (prev.includes(child)) {
        return prev.filter((p) => p !== child);
      }

      return Array.from(new Set([...prev, child, parent]));
    });
  };

  const savePermissions = async () => {
    if (!selectedUser) {
      alert("Select user");
      return;
    }

    try {
      setSaving(true);

      await axios.post(`${API}/permissions`, {
        userId: Number(selectedUser),
        permissions,
      });

      alert("✅ Permissions Saved");
    } catch (err: any) {
      console.log("SAVE PERMISSIONS ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔐 User Permissions</h1>
          <p style={styles.subtitle}>Assign modules and pages by user</p>
        </div>

        <button onClick={savePermissions} disabled={saving} style={styles.saveBtn}>
          {saving ? "Saving..." : "💾 Save Permissions"}
        </button>
      </div>

      <div style={styles.topBar}>
        <select
          value={selectedUser}
          onChange={(e) => loadPermissions(e.target.value)}
          style={styles.select}
        >
          <option value="">Select User</option>

          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username} ({u.role})
            </option>
          ))}
        </select>

        <div style={styles.countBox}>
          Selected permissions: <b>{permissions.length}</b>
        </div>
      </div>

      <div style={styles.grid}>
        {modules.map((mod) => (
          <div key={mod.name} style={styles.card}>
            <label style={styles.moduleLabel}>
              <input
                type="checkbox"
                checked={permissions.includes(mod.name)}
                onChange={() => togglePermission(mod.name, mod.children)}
                style={styles.checkbox}
              />
              <span>{mod.label}</span>
            </label>

            <div style={styles.children}>
              {mod.children.map((child) => (
                <label key={child} style={styles.childLabel}>
                  <input
                    type="checkbox"
                    checked={permissions.includes(child)}
                    onChange={() => toggleChild(child, mod.name)}
                    style={styles.checkbox}
                  />
                  <span>{menuLabels[child] || formatLabel(child)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolePermissionsPage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "28px 34px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
    gap: "16px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    color: "#0f172a",
    fontWeight: 600,
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "16px",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px",
  },

  select: {
    width: "320px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    background: "#fff",
    outline: "none",
  },

  countBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    padding: "12px 16px",
    borderRadius: "12px",
    color: "#334155",
    fontSize: "15px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },

  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  },

  moduleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: "bold",
    fontSize: "18px",
    color: "#0f172a",
    marginBottom: "12px",
  },

  children: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    paddingLeft: "8px",
  },

  childLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "15px",
    color: "#334155",
    background: "#f8fafc",
    padding: "9px 10px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },

  saveBtn: {
    padding: "12px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "15px",
  },
};