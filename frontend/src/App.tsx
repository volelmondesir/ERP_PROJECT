import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
// 🔥 LAYOUT (gen Sidebar + Header ladan)
import Layout from "./Layout";

import UsersPage from "./pages/UsersPage";
import RegisterPage from "./pages/RegisterPage";

// CORE
import DashboardPage from "./pages/DashboardPage";
import AddUserPage from "./pages/AddUserPage";
import ManageUsersPage from "./pages/ManageUsersPage";

// ERP MODULES
import OrderEntryPage2 from "./pages/OrderEntryPage2";
import HRPage from "./pages/HRPage";
import LedgerPage from "./pages/LedgerPage";
import ProductionPage from "./pages/ProductionPage";
import CaissePage from "./pages/CaissePage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import ProductPage from "./pages/ProductPage";
import PricePage from "./pages/PricePage";
import PaidInvoicesPage from "./pages/PaidInvoicesPage";
import FiscalYearPage from "./pages/FiscalYearPage";
import TaxPage from "./pages/TaxPage";
import DeliveryPage from "./pages/DeliveryPage";
import ItemPage from "./pages/ItemPage";

// AUTH
import LoginPage from "./pages/LoginPage";
import SetBankPage from "./pages/SetBankPage";
import ChequeRequestPage from "./pages/ChequeRequestPage";
import ChequeListPage from "./pages/ChequeListPage";
import ListChequePage from "./pages/ListChequePage";
import ChequeFormPage from "./pages/ChequeFormPage";
import SetupPinPage from "./pages/SetupPinPage";
import RolePermissionsPage from "./pages/RolePermissionsPage";
import PurchaseOrderPage from "./pages/PurchaseOrderPage";
import AccountsReceivablePage from "./pages/AccountsReceivablePage";
import AccountsPayablePage from "./pages/AccountsPayablePage";
import ReceiptsPage from "./pages/ReceiptsPage";
import FinishedGoodsPage from "./pages/FinishedGoodsPage";
import MgmDashboardPage  from  "./pages/MgmDashboardPage";
import ICEntryItemPage from "./pages/ICEntrryItemPage";

import InventoryFichePage from "./pages/InventoryFichePage";
import ICStockLevelPage from "./pages/ICStockLevelPage";
import PriceUpdatePage from "./pages/PriceUpdatePage";
import SalesReportPage from "./pages/SalesReportPage";
import AccountPage from "./pages/AccountPage";
import PayablePage from "./pages/PayablePage";
import ProformaPage from "./pages/ProformaPage";
import POtoINVPage from "./pages/POtoINVPage";
import ReceptionPage from "./pages/ReceptionPage";
import AccountPayablePOPage from "./pages/AccountPayablePOPage";
import POReportPage from "./pages/POReportsPage";
import AccountReportPage from "./pages/AccountReportPage";
import POpoReportPage from "./pages/POpoReportsPage";
import CustomerPage from "./pages/CustomerPage";
import CustomerPaymentPage from "./pages/CustomerPaymentPage ";
import CustomerPaymentHistoryPage from "./pages/CustomerPaymentHistoryPage";
import CustomerPaymentSumaryPage from "./pages/CustomerPaymentSumaryPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import InventoryHistoryPage from "./pages/InventoryHistoryPage";
import VendorPage from "./pages/VendorPage"
import VendorCustomerAssignPage from "./pages/VendorCustomerAssignPage";
import EmployeePage from "./pages/EmployeePage";
import AttendancePage from "./pages/AttendancePage";
import PayrollPage from "./pages/PayrollPage";
import DepartmentPage from "./pages/DepartmentPage";
import EmployeeHistoryPage from "./pages/EmployeeHistoryPage";
import LeaveManagementPage from "./pages/LeaveManagementPage";
import GeneralLedgerPage from "./pages/GeneralLedgerPage";
import JournalEntriesPage from "./pages/JournalEntries";
import InvestmentPage from "./pages/InvestmentPage";
import LicensePage from "./pages/LicensePage";
import BinManagementPage from "./pages/BinManagementPage";
import CreateBinPage from "./pages/CreateBinPage";
import ICEntryItemPage2 from "./pages/ICEntryItemPage2";
import DeliveryReceiptPage from "./pages/DeliveryReceiptPage";
import DeliveryReceiptPage2 from "./pages/DeliveryReceiptPage2";
import EmployeeOfMonthPage from "./pages/EmployeeOfMonthPage";
import TrendsPage from "./pages/TrendsPage";
import POToInvoiceReportPage from "./pages/POToInvoiceReportPage";
import ItemUpdateQtyPage from "./pages/ItemUpdateQtyPage";
import OeProformaPage from "./pages/OeProformaPage";
import ReceivingReportPage from "./pages/ReceivingReportPage";
import DeviseSetupPage from "./pages/DeviseSetupPage";
import DevisePurchasePage from "./pages/DevisePurchasepage";
import CurrencyPurchaseReportPage from "./pages/CurrencyPurchaseReportPage";
import ProductionReportPage from "./pages/ProductionReportPage";
import AboutPage from "./pages/AboutPage";
import DVRBrowserPage from "./pages/DVRBrowserPage";
import BackupPage from "./pages/BackupPage";
import UserAuditLogPage from "./pages/UserAuditLogPage";
//import DeliveryReceiptPage2 from "./pages/DeliveryReceiptPage2";



const App = () => {
  console.log("APP LOADED ✅");

return (

  <Router>

    <Routes>

      {/* DEFAULT */}

      <Route

        path="/"

        element={<Navigate to="/login" replace />}

      />

      {/* LOGIN */}

      <Route

        path="/login"

        element={<LoginPage />}

      />

      {/* APP LAYOUT */}

      <Route element={<Layout />}>

        <Route

          path="/dashboard"

          element={

            <ProtectedRoute

              roles={["admin", "user"]}

              permission="dashboard"

            >

              <DashboardPage />

            </ProtectedRoute>

          }

        />

        {/* CHANGE USER */}

        <Route

          path="/change-user"

          element={

            <ProtectedRoute

              roles={["admin"]}

            >

              <UsersPage />

            </ProtectedRoute>

          }

        />
            <Route
            path="/trends"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="trends">
                <TrendsPage />
              </ProtectedRoute>
            }
          />
            <Route
            path="/settings/devise"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="devise">
                <DeviseSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos/buycurrency"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="buycurrency">
                <DevisePurchasePage/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos/currencyreport"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="currencyreport">
                <CurrencyPurchaseReportPage/>
              </ProtectedRoute>
            }
          />
             <Route
            path="/mfg/productionreport"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="productionreport">
                <ProductionReportPage/>
              </ProtectedRoute>
            }
          />
             <Route
            path="/settings/about"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="about">
                <AboutPage/>
              </ProtectedRoute>
            }
          />
             <Route
            path="/settings/dvr"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="dvr">
                <DVRBrowserPage/>
              </ProtectedRoute>
            }
          />
             <Route
            path="/settings/backup"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="backup">
                <BackupPage/>
              </ProtectedRoute>
            }
          />
             <Route
            path="/settings/userauditlog"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="userauditlog">
                <UserAuditLogPage/>
              </ProtectedRoute>
            }
          />
           <Route
            path="/hr"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="hr">
                <HRPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/hr/employee"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="employee">
                <EmployeePage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/hr/dpt"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="dpt">
                <DepartmentPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/hr/attendance"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="attendance">
                <AttendancePage />
              </ProtectedRoute>
            }
          />
              <Route
            path="/hr/payroll"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="payroll">
                <PayrollPage />
              </ProtectedRoute>
            }
          />
               <Route
            path="/hr/employeehistory"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="employeehistory">
                <EmployeeHistoryPage />
              </ProtectedRoute>
            }
          />
              <Route
            path="/hr/leavemanagement"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="leavemanagement">
                <LeaveManagementPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/ledger"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="ledger">
                <LedgerPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/pos/sales"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="sales">
                <SalesPage />
              </ProtectedRoute>
            }
            
          />
            <Route
            path="/pos/receipts"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="receipts">
                <ReceiptsPage />
              </ProtectedRoute>
            }
            
          />
            <Route
            path="/mk/entryprice"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="entryprice">
                <PriceUpdatePage />
              </ProtectedRoute>
            }
            
          />
              <Route
            path="/mk/vendor"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="vendor">
                <VendorPage />
              </ProtectedRoute>
            }
            
          />
                  <Route
            path="/mk/vendorcustomer"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="vendorcustomer">
                <VendorCustomerAssignPage />
              </ProtectedRoute>
            }
            
          />
                    <Route
            path="/mk/customer"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="customer">
                <CustomerPage />
              </ProtectedRoute>
            }
            
          />
            <Route
            path="/mk/salesreport"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="salesreport">
                <SalesReportPage />
              </ProtectedRoute>
            }
            
          />
           <Route
            path="/mfg/production"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="production">
                <ProductionPage />
              </ProtectedRoute>
            }
          />     <Route
  path="/mfg/mfgdashboard"
  element={<ProtectedRoute roles={["admin", "user"]} permission="mfgdashboard">
      <MgmDashboardPage />
    </ProtectedRoute>
  }
/>
     <Route
            path="/mfg/finishedgoods"
            element={
              <ProtectedRoute roles={["admin","user"]} permission="finishedgoods">
                <FinishedGoodsPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/mfg/item"
            element={
              <ProtectedRoute roles={["admin","user"]} permission="item">
                <ItemPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/inventory"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="inventory">
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ic/entryitem"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="entryitem">
                <ICEntryItemPage />
              </ProtectedRoute>
            }
          />

            <Route
            path="/ic/entryitem2"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="entryitem2">
                <ICEntryItemPage2 />
              </ProtectedRoute>
            }
          />
           <Route
            path="/ic/inv"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="inv">
                <InventoryFichePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ic/itemstock"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="itemstock">
                <ICStockLevelPage />
              </ProtectedRoute>
            }
          />
             <Route
            path="/ic/invhistory"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="invhistory">
                <InventoryHistoryPage />
              </ProtectedRoute>
            }
          />
             <Route
            path="/ic/bm"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="bm">
                <BinManagementPage />
              </ProtectedRoute>
            }
          />
            <Route
            path="/ic/bins"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="bins">
                <CreateBinPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/caisse"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="caisse">
                <CaissePage />
              </ProtectedRoute>
            }
          />rd
           <Route
            path="/products"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="products">
                <ProductPage />
              </ProtectedRoute>
            }
          />
           <Route
  path="/tax"
  element={
    <ProtectedRoute roles={["admin", "user"]} permission="tax">
      <TaxPage />
    </ProtectedRoute>
  }
/>
           <Route
            path="/price"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="price">
                <PricePage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/fiscal"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="fiscal">
                <FiscalYearPage />
              </ProtectedRoute>
            }
          />

           <Route
            path="/ap/payments"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="payments">
                <PayablePage />
              </ProtectedRoute>
            }
          />
             <Route
            path="/po/poreport"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="poreports">
                <POReportPage />
              </ProtectedRoute>
            }
          />
             <Route
            path="/gl/accountreport"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="accountreport">
                <AccountReportPage />
              </ProtectedRoute>
            }
          />
               <Route
            path="/gl/gl2"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="gl2">
                <GeneralLedgerPage />
              </ProtectedRoute>
            }
          />
            <Route
            path="/gl/je"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="journalentry">
                <JournalEntriesPage />
              </ProtectedRoute>
            }
          />
               <Route
            path="/gl/invest"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="invest">
                <InvestmentPage/>
              </ProtectedRoute>
            }
          />
             <Route
            path="/settings/license"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="license">
                <LicensePage/>
              </ProtectedRoute>
            }
          />
          <Route
  path="/hr/employeeofmonth"
  element={
    <ProtectedRoute roles={["admin", "user"]} permission="employeeofthemonth">
      <EmployeeOfMonthPage />
    </ProtectedRoute>
  }
/>
           <Route
            path="/po/potoinv"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="potoinv">
                <POtoINVPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/po/poinvreport"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="poinvreport">
                <POpoReportPage />
              </ProtectedRoute>
            }
          />
             <Route
            path="/po/invreport"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="invreport">
                <POToInvoiceReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ic/entryqty"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="entryqty">
                <ItemUpdateQtyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/oe/oeproforma"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="oeproforma">
                <OeProformaPage />
              </ProtectedRoute>
            }
          />
             <Route
            path="/po/reception"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="reception">
                <ReceptionPage />
              </ProtectedRoute>
            }
          />
              <Route
            path="/ap/po"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="po">
                <AccountPayablePOPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/gl/account"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="account">
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/register"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="register">
                <RegisterPage />
              </ProtectedRoute>
            }
          />
            <Route
            path="/po/receiving"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="receiving">
                <ReceivingReportPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/oe/oeinvoices"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="oeinvoices">
                <PaidInvoicesPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/oe/order"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="order">
                <OrderEntryPage2 />
              </ProtectedRoute>
            }
          />
           <Route
            path="dlv"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="dlv">
                <DeliveryReceiptPage />
              </ProtectedRoute>
            }
          />
         
               <Route
            path="/dlvreceipt"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="dlvreceipt">
                <DeliveryReceiptPage2 />
              </ProtectedRoute>
            }
          />
   
   <Route
   
            path="/role"
            element={
              <ProtectedRoute roles={["admin", "user"]}permission="role">
                <RolePermissionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cheque"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="cheque">
                <ChequeRequestPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ar/payments"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="payments">
                <ChequeFormPage />
              </ProtectedRoute>
            }
          />
 <Route
            path="/ar/customers"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="customers">
                <CustomerPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/ar/customerpayment"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="cstomerpayment">
                <CustomerPaymentPage />
              </ProtectedRoute>
            }
          />
            <Route
            path="/ar/customerhistory"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="customerhistory">
                <CustomerPaymentHistoryPage />
              </ProtectedRoute>
            }
          />
               <Route
            path="/ar/customersumary"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="customersumary">
                <CustomerPaymentSumaryPage />
              </ProtectedRoute>
            }
          />
                 <Route
            path="/settings/company"
            element={
              <ProtectedRoute roles={["admin", "user"]} permission="compagny">
                <CompanySettingsPage />
              </ProtectedRoute>
            }
          />
          {/* ADMIN ONLY */}
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={["admin"]} permission="users">
                <ManageUsersPage />
              </ProtectedRoute>
            }
          />
   <Route
            path="/changeuser"
            element={
              <ProtectedRoute roles={["admin"]}permission="changeuser">
                <UsersPage/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/po/createpo"
            element={
              <ProtectedRoute roles={["admin"]}permission="createpo">
                <PurchaseOrderPage/>
              </ProtectedRoute>
            }
          />
            <Route
            path="/po/poproforma"
            element={
              <ProtectedRoute roles={["admin"]}permission="poproforma">
                <ProformaPage/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ar"
            element={
              <ProtectedRoute roles={["admin"]}permission="ar">
                <AccountsReceivablePage/>
              </ProtectedRoute>
            }
          />
           <Route
            path="/ap/po"
            element={
              <ProtectedRoute roles={["admin"]}permission="po">
                <AccountsPayablePage/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-user"
            element={
              <ProtectedRoute roles={["admin"]} permission="add-user">
                <AddUserPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ar/chequelist"
            element={
              <ProtectedRoute roles={["admin","user"]} permission="chequelist">
                <ChequeListPage />
              </ProtectedRoute>
            }
          />
  
    <Route
            path="/ar/list"
            element={
              <ProtectedRoute roles={["admin","user"]} permission="list">
                <ListChequePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings/setbank"
            element={
              <ProtectedRoute roles={["admin"]} permission="setbank">
                <SetBankPage />
              </ProtectedRoute>
            }
          />
         <Route
            path="/setuppin"
            element={
              <ProtectedRoute roles={["admin"]} permission="setuppin">
                <SetupPinPage />
              </ProtectedRoute>
            }
          />
        </Route>

      </Routes>
    </Router>
  );
};

export default App;
