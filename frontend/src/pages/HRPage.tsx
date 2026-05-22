import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { saveAuditLog } from "../utils/tempLog2"; 
const HRPage: React.FC = () => {
   const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const employees = [
    { name: "Jane Smith", position: "Software Engineer", salary: 100000 },
    { name: "John Doe", position: "Product Manager", salary: 95000 },
  ];

  // ✅ GENERATE PDF (pa auto download)
  const generatePDF = () => {
    const doc = new jsPDF();

    doc.text("Human Resources Report", 20, 20);

    employees.forEach((emp, index) => {
      doc.text(
        `${emp.name} - ${emp.position} - $${emp.salary}`,
        20,
        30 + index * 10
      );
    });

    // 👉 kreye blob
    const blob = doc.output("blob");

    // 👉 kreye URL pou preview
    const url = URL.createObjectURL(blob);

    setPdfUrl(url);
  };

  

  return (
    <div>
      <h2>Human Resources</h2>
      <p>Manage Employees</p>
 <button onClick={generatePDF}>Generate Report</button>
     
      {/* Fòm pou ajoute anplwaye */}
      
      <form>
        <label>
          Employee Name:
          <input type="text" placeholder="Enter Employee Name" />
        </label>
        <br />
        <label>
          Position:
          <input type="text" placeholder="Enter Position" />
        </label>
        <br />
        <label>
          Salary:
          <input type="number" placeholder="Enter Salary" />
        </label>
        <br />
        <button type="submit">Add Employee</button>
      </form>
    </div>
  );
};

export default HRPage;