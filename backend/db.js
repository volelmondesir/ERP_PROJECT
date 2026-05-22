import sql from "mssql";

const config = {
  user: "sa",
  password: "5092213525",
  server: "localhost",
  database: "ERP_DB",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};


// Konekte ak DB
export const connectDB = async () => {
  try {
    await sql.connect(config);
  console.log("✅ Connected to SQL Server");
  } catch (error) {
    console.error("❌ DB Error:", error);
    process.exit(1); // Sispann si gen erè nan koneksyon
  }
};
// Kòm yon mòd fallback, ou ka itilize sa a nan lòt wout
export const closeDB = async () => {
  await sql.close();
};
export default sql;