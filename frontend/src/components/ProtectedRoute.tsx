
import { useEffect, useState } from "react";

import { Navigate, useLocation } from "react-router-dom";

import axios from "axios";

const API = "http://localhost:5000/api";
const permissionAliases: Record<string, string[]> = {
  dashboard: ["dashboard"],
  order: ["order", "order","order"],
  oeproforma: ["oeproforma", "oeproforma","oeproforma"],
   oeinvoices: ["oeinvoices", "oeinvoices","oeinvoices"],

  inventory: ["inventory", "stock"],
  products: ["products", "product"],

  delivery: ["delivery", "dlv", "dlvreceipt", "dlv_receipt"],

  sales: ["sales", "salespage"],
  receipts: ["receipts"],
  customers: ["customers", "customer"],

  employeeofmonth: [
    "employeeofmonth",
    "employeeofthemonth",
    "employee_of_month",
    "hr",
  ],
    trends: [
    "trends",
    "trends",
    "trens",
    
  ],
  invreport: [
    "invreport",
    "invreport",
    "invreport",
    
  ],
  apaging: [
    "apaging",
    "apaging",
    "apaging",
    
  ],
   araging: [
    "araging",
    "araging",
    "araging",
    
  ],
    setbank: [
    "setbank",
    "setbank",
    "setbank",
    
  ],
 createpo: [
    "createpo",
    "createpo",
    "createpo",
    
  ],
   poproformat: [
    "poproforma",
    "poproforma",
    "poproforma",
    
  ],
  reception: [
    "reception",
    "reception",
    "reception",
    
  ],
   poinvreport: [
    "poinvreport",
    "poinvreport",
    "poinvreport",
    
  ],
   poreport: [
    "poreport",
    "poreport",
    "poreport",
    
  ],
   receiving: [
    "receiving",
    "receiving",
    " receiving",
    
  ],
  currency: [
    "currency",
    "currency",
    "currency",
    
  ],
  currencyreport: [
    "currencyreport",
    "currencyreport",
    "currencyreport",
    
  ],
    prodctionreport: [
    "prodctionreport",
    
    
  ],
   about: [
    "about",
    
    
  ], 
  camera: [
    "camera",
    
    
  ],
    backup: [
    "backup",
    
    
  ],
  userauditlog: [
    "userauditlog",
    
    
  ],
};

const ProtectedRoute = ({ children, permission }: any) => {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  const location = useLocation();

  const [checkingLicense, setCheckingLicense] = useState(true);
  const [licenseActive, setLicenseActive] = useState(false);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const res = await axios.get(`${API}/license/status`);

        const lic = res.data;

        const expired =
          lic?.endDate && new Date() > new Date(lic.endDate);

        const active =
          lic?.isActive &&
          !lic?.isBlocked &&
          !expired;

        setLicenseActive(active);
      } catch (err) {
        setLicenseActive(false);
      } finally {
        setCheckingLicense(false);
      }
    };

    checkLicense();
  }, []);

  if (!token || !userData) {
    return <Navigate to="/login" replace />;
  }

  if (checkingLicense) {
    return <div style={{ padding: 30 }}>Checking license...</div>;
  }

  const isLicensePage =
    location.pathname === "/settings/license";

  if (!licenseActive && !isLicensePage) {
    return <Navigate to="/settings/license" replace />;
  }

  const user = JSON.parse(userData);

  const isAdmin =
    String(user.username || "").toLowerCase() === "admin" ||
    String(user.role || "").toLowerCase() === "admin";

  if (isAdmin) {
    return children;
  }

  let permissions: string[] = [];

  if (Array.isArray(user.permissions)) {
    permissions = user.permissions;
  } else if (
    typeof user.permissions === "object" &&
    user.permissions !== null
  ) {
    permissions = Object.keys(user.permissions);
  } else if (typeof user.permissions === "string") {
    permissions = [user.permissions];
  }

  permissions = permissions.map((p) =>
    String(p).toLowerCase()
  );

  const allowed =
    permissionAliases[permission] || [permission];

  const hasPermission =
    !permission ||
    allowed.some((a: string) =>
      permissions.includes(a.toLowerCase())
    );

  if (!hasPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;