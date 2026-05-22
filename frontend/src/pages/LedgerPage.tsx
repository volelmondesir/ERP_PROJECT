import React from "react";
import { jsPDF } from "jspdf";
import { saveAuditLog } from "../utils/tempLog2"; 
const LedgerPage: React.FC = () => {
  const generatePDF = () => {
    const doc = new jsPDF();

    doc.text("General Ledger Report", 20, 20);
    doc.text("Account Name: Cash", 20, 30);
    doc.text("Debit: $500", 20, 40);
    doc.text("Credit: $100", 20, 50);
    
    // Ajoute lòt tranzaksyon si bezwen
    doc.text("Balance: $400", 20, 60);

    doc.save("ledger_report.pdf");
  };

  return (
    <div>
      <h2>General Ledger</h2>
      <p>Manage financial transactions and accounts.</p>
      
      <button onClick={generatePDF}>Generate PDF</button>
      {/* Fòm pou antre tranzaksyon ledger */}
      <form>
        <label>
          Account Name:
          <input type="text" placeholder="Enter Account Name" />
        </label>
        <br />
        <label>
          Debit:
          <input type="number" placeholder="Enter Debit Amount" />
        </label>
        <br />
        <label>
          Credit:
          <input type="number" placeholder="Enter Credit Amount" />
        </label>
        <br />
        <button type="submit">Submit Transaction</button>
      </form>
    </div>
  );
};

export default LedgerPage;