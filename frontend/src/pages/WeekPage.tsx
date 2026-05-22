import { useState } from "react";
import { Calendar } from "primereact/calendar";
 import { saveAuditLog } from "../utils/tempLog2";   
const initialForm = {
  id: "",
  employeeId: "",
  employeeCode: "",
  employeeName: "",
  department: "",
  position: "",
  payrollMonth: "",
  basicSalary: "",
  overtimeAmount: "",
  bonusAmount: "",
  deductionAmount: "",
  taxAmount: "",
  paymentStatus: "Pending",
};
 
const WeekPage = () => {

  const [dates, setDates] = useState<Date[] | null>(null);
 const [bulkMonth0, setBulkMonth0] = useState<Date | null>(null);
    const [form, setForm] = useState(initialForm);
    
  const formatMonth = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  return (

    <div className="card flex justify-content-center">
      <Calendar
        value={dates}
        onChange={(e) => setDates(e.value as Date[])}
      selectionMode="range" readOnlyInput hideOnRangeSelection 
       
      />
        <Calendar
                  value={bulkMonth0}
                  onChange={(e) => {
                    const d = e.value as Date;
                    setBulkMonth0(d);
                    setForm({ ...form, payrollMonth: formatMonth(d) });
                  }}
                  view="month"
                  dateFormat="mm/yy"
                 
                />
    </div>
    
  );
};

export default WeekPage;




  



  