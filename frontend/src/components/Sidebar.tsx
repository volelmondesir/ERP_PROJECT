import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { can } from "../utils/permissions";
import { translations } from "../translations/translations";

type LangType = keyof typeof translations;

type ModuleType = {
  name: string;
  label: string;
  children: string[];
  routes: Record<string, string>;
};

const modules: ModuleType[] = [
  {
    name: "dashboard",
    label: "Dashboard",
    children: ["dashboard","trends"],
    routes: { dashboard: "/dashboard",trends:"/trends" },
  },
  {
    name: "ap",
    label: "Accounts Payable",
    children: ["apaging","po", "payments"],
    routes: {
      apaging: "/ap/apaging",
      po: "/ap/po",
      payments: "/ap/payments",
  
    },
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
      
      "list"
      
    ],
    routes: {
      araging:"/ar/araging",
      chequeform: "/ar/payments",
      customers: "/ar/customers",
      customerhistory: "/ar/customerhistory",
      customersumary: "/ar/customersumary",
      cstomerpayment: "/ar/customerpayment",
      chequelist: "/ar/chequelist",
      list: "/ar/list",
      cheque: "/cheque",
    },
  },
  {
    name: "cashier",
    label: "Cashier",
    children: ["buycurrency", "currencyreport","receipts","sales"],
    routes: {
      buycurrency: "/pos/buycurrency",    //"/pos/buydevise",
       currencyreport: "/pos/currencyreport",
      sales: "/pos/sales",
      receipts: "/pos/receipts",
      
    },
  },
  {
    name: "delivery",
    label: "Delivery",
    children: ["dlv", "dlvreceipt"],
    routes: {
      dlv: "/dlv",
      dlvreceipt: "/dlvreceipt",
    },
  },
  {
    name: "ledger",
    label: "General Ledger",
    children: ["account", "accountreport", "gl2", "journalentry", "invest"],
    routes: {
      account: "/gl/account",
      accountreport: "/gl/accountreport",
      gl2: "/gl/gl2",
      journalentry: "/gl/je",
      invest: "/gl/invest",
    },
  },
  {
    name: "hr",
    label: "Human Resources",
    children: [
      "employee",
      "dpt",
      "attendance",
      "payroll",
      "employeehistory",
   
      "leavemanagement",
         "employeeofmonth",
    ],
    routes: {
      employee: "/hr/employee",
      dpt: "/hr/dpt",
      attendance: "/hr/attendance",
      payroll: "/hr/payroll",
      employeehistory: "/hr/employeehistory",
      leavemanagement: "/hr/leavemanagement",
      employeeofmonth: "/hr/employeeofmonth"
    },
  },
  {
    name: "inventory",
    label: "Inventory Control",
    children: ["entryitem", "itemstock","entryqty","inv", "invhistory", "bm", "bins", "entryitem2"],
    routes: {
      entryitem: "/ic/entryitem",
      itemstock: "/ic/itemstock",
      inv: "/ic/inv",
      invhistory: "/ic/invhistory",
      bm: "/ic/bm",
      bins: "/ic/entryitem2",
      entryitem2: "/ic/entryitem2",
        entryqty: "/ic/entryqty",
    },
  },
  {
    name: "manufacturing",
    label: "Manufacturing",
    children: ["mfgdashboard", "createitem", "finishedgoods", "production","productionreport"],
    routes: {
      mfgdashboard: "/mfg/mfgdashboard",
      createitem: "/mfg/item",
      finishedgoods: "/mfg/finishedgoods",
      production: "/mfg/production",
       productionreport: "/mfg/productionreport",
    },
  },
  {
    name: "marketing",
    label: "Marketing",
    children: ["entryprice", "salesreport", "vendor", "vendorcustomer", "customer"],
    routes: {
      entryprice: "/mk/entryprice",
      salesreport: "/mk/salesreport",
      vendor: "/mk/vendor",
      vendorcustomer: "/mk/vendorcustomer",
      customer: "/mk/customer",
    },
  },
  {
    name: "orderentry",
    label: "Order Entry",
    children: ["order","oeinvoices","oeproforma"],
    routes: {
      order: "/oe/order",
      oeproforma: "/oe/oeproforma",
      oeinvoices: "/oe/oeinvoices",
    },
  },
  {
    name: "purchase order",
    label: "Purchase Order",
    children: ["createpo", "potoinv", "poinvreport","invreport","poproforma","poreport" ,"reception","receiving"],
    routes: {
     createpo: "/po/createpo",
      potoinv: "/po/potoinv",
      poinvreport: "/po/poinvreport",
      invreport: "/po/invreport",
      poproforma: "/po/poproforma",
      reception: "/po/reception",
       poreport: "/po/poreport",
      receiving: "/po/receiving",

    },
  },
  {
    name: "settings",
    label: "Settings",
    children: [
    
      "about",
      "backup",
       "camera",
      "setbank",
      "bins",
      "compagny",
      "currency",
      "fiscal",
      "changeuser",
      "license",
      "role",
      "setuppin",
      "tax",
      "register",
      "userauditlog"
    ],
    routes: {
       
      about: "/settings/about",
      backup: "/settings/backup",
      camera: "/settings/dvr",
      setbank: "/settings/setbank",
      bins: "/ic/bins",
      compagny: "/settings/company",
      currency: "/settings/devise",
      fiscal: "/fiscal",
      changeuser: "/changeuser",
      license: "/settings/license",
      role: "/role",
      setuppin: "/setuppin",
      tax: "/tax",
      register: "/register",
      userauditlog: "/settings/userauditlog",
    },
  },
];

const menuLabels: Record<string, string> = {
  dashboard: "Dashboard",
  trends: "Trends",
  po: "Purchase Orders",
  payments: "Payments",
  about : "About",
  poreport: "PO Report",
  receiving: "Receiving Report",
  invreports: "INV Reports",
  apaging: "AP Aging",
   araging: "AR Aging",
   currency: "Currency",
   
  chequeform: "Cheque Form",
  customers: "Customers",
  customerhistory: "Customer History",
  customersumary: "Customer Summary",
  cstomerpayment: "Customer Payment",
  chequelist: "Cheque List",
  list: "List",
  cheque: "Cheque",
  sales: "Sales",
  receipts: "Receipts",

  currencyreport:"Currency Report",
    buycurrency:"Buy Currency",
  dlv: "Delivery",
  dlvreceipt: "Delivery Receipt",
  account: "Account",
  accountreport: "Account Report",
  gl2: "GL2",
  journalentry: "Journal Entry",
  invest: "Invest",
  employee: "Employee",
  dpt: "Department",
  attendance: "Attendance",
  payroll: "Payroll",
  employeehistory: "Employee History",
  leavemanagement: "Leave Management",
  entryitem: "Entry Item",
  itemstock: "Item Stock",
  inv: "Inventory",
  invhistory: "Inventory History",
  bm: "BM",
  bins: "Bins",
  entryqty: "Entry Qty",
  mfgdashboard: "MFG Dashboard",
  createitem: "Create Item",
  finishedgoods: "Finished Goods",
  production: "Production",
   productionreport: "Production Report",
  entryprice: "Entry Price",
  salesreport: "Sales Report",
  vendor: "Vendor",
  vendorcustomer: "Vendor Customer",
  customer: "Customer",
  order: "Order",
  oeproforma: "OEProforma",
oeinvoices: "OEInvoices",
  createpo: "Purchase",
  potoinv: "PO To Invoice",
  poinvreport: "PO INV Report",
 poproforma:"POProfornma",
  reception: "Goods Receipt",
  setbank: "Set Bank",
  compagny: "Company",
    backupy: "Backup",
  fiscal: "Fiscal",
  changeuser: "Change User",
  license: "License",
  role: "Role",
  setuppin: "Setup PIN",
  tax: "Tax",
  register: "Register",
  userauditlog: "User Auditlog"
};

const formatLabel = (text: string) => {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const Sidebar = () => {
  const location = useLocation();
  const [openModule, setOpenModule] = useState<string | null>(null);
 const [lang, setLang] = useState<LangType>(() => {
  return (localStorage.getItem("lang") as LangType) || "en";
});
const changeLanguage = (value: LangType) => {
  setLang(value);

  localStorage.setItem("lang", value);

  window.dispatchEvent(
    new Event("languageChanged")
  );
};

  useEffect(() => {
    modules.forEach((mod) => {
      const match = mod.children.find((child) => mod.routes[child] === location.pathname);

      if (match) {
        setOpenModule(mod.name);
      }
    });
  }, [location.pathname]);

  return (
    <div style={styles.sidebar}>
  <div style={styles.logoBox}>
  <img
    src={""}
    alt="."
    style={styles.logoImage}
  />
 
  <h2 style={styles.logo}></h2>
</div>
    <select
  value={lang}
onChange={(e) =>
  changeLanguage(
    e.target.value as LangType
  )
}
  style={styles.languageSelect}
>
  <option value="en">English</option>
  <option value="fr">Français</option>
  <option value="ht">Kreyòl</option>
</select>



      <div style={styles.menu}>
        {modules.map((mod) => {
          const allowedChildren = mod.children.filter((child) => can(child));

          if (allowedChildren.length === 0 && !can(mod.name)) {
            return null;
          }

          const isOpen = openModule === mod.name;

          return (
            <div key={mod.name}>
              <div
                style={{
                  ...styles.menuTitle,
                  background: isOpen ? "#34495e" : "#2f3640",
                }}
                onClick={() => setOpenModule(isOpen ? null : mod.name)}
              >
             
  {(translations[lang] as Record<string, string>)[mod.name] || mod.label}
</div>

              {isOpen && (
                <div style={styles.submenu}>
                  {allowedChildren.map((child) => (
                    <NavLink
                      key={child}
                      to={mod.routes[child]}
                      style={({ isActive }) => ({
                        ...styles.link,
                        background: isActive ? "#0984e3" : "transparent",
                      })}
                    >
                    {(translations[lang] as Record<string, string>)[child] || menuLabels[child] || formatLabel(child)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "240px",
    height: "100vh",
    background: "#1e272e",
    color: "#fff",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    borderRight: "1px solid #1e293b",
    
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "#1e293b #1e293b",
  },

  logo: {
    marginBottom: "2px",
     left: 0,
    top: 0,
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

  menu: {
    flex: 1,
    overflowY: "auto",
    paddingRight: "5px",
  },

  menuTitle: {
    padding: "10px",
    cursor: "pointer",
    borderRadius: "6px",
    marginTop: "10px",
    transition: "0.2s",
  },

  submenu: {
    marginLeft: "10px",
    display: "flex",
    flexDirection: "column",
  },

 link: {
  color: "#dcdde1",
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: "4px",
  marginTop: "4px",
},

languageSelect: {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #34495e",
  background: "#2f3640",
  color: "#fff",
  outline: "none",
},

};