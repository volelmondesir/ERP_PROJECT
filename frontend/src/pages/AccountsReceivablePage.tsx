import { useState } from "react";
 import { saveAuditLog } from "../utils/tempLog2";   
const AccountsReceivablePage = () => {
  const [invoices, setInvoices] = useState<any[]>([
    { customer: "John", amount: 500, paid: 200 }
  ]);

  return (
    <div style={styles.container}>
      <h2>💰 Accounts Receivable</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Balance</th>
          </tr>
        </thead>

        <tbody>
          {invoices.map((inv, i) => (
            <tr key={i}>
              <td>{inv.customer}</td>
              <td>${inv.amount}</td>
              <td>${inv.paid}</td>
              <td>${inv.amount - inv.paid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountsReceivablePage;
const styles: any = {
  container: {
    padding: "20px",
  },
  input: {
    padding: "8px",
    margin: "10px 0",
    width: "100%",
  },
  row: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  saveBtn: {
    padding: "10px",
    background: "#0984e3",
    color: "#fff",
    border: "none",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
};