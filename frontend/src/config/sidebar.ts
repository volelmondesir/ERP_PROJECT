// src/config/sidebar.ts
export const sidebarItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    module: "dashboard",
    action: "view",
  },
  {
    label: "Sales",
    path: "/sales",
    module: "sales",
    action: "view",
  },
  {
    label: "Inventory",
    path: "/inventory",
    module: "inventory",
    action: "view",
  },
  {
    label: "Cheques",
    path: "/chequelist",
    module: "cheque",
    action: "view",
  },
  {
    label: "Create Cheque",
    path: "/chequeform",
    module: "cheque",
    action: "create",
  },
  {
    label: "Users",
    path: "/users",
    module: "users",
    action: "view",
  },
];