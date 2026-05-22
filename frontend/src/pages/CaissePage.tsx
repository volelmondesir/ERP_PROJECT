import React from "react";

const CaissePage: React.FC = () => {
  return (
    <div>
      <h2>Caisse</h2>
      <p>Manage financial transactions at the caisse.</p>
      {/* Fòm pou jere tranzaksyon */}
      <form>
        <label>
          Transaction Type:
          <select>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </label>
        <br />
        <label>
          Amount:
          <input type="number" placeholder="Enter Amount" />
        </label>
        <br />
        <button type="submit">Submit Transaction</button>
      </form>
    </div>
  );
};

export default CaissePage;