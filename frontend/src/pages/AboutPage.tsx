import { useNavigate } from "react-router-dom";
 import { saveAuditLog } from "../utils/tempLog2";   
export default function AboutPage() {
    const navigate = useNavigate();
  const features = [
    {
  icon: "📈",
  title: "Dashboard",
  bg: "bg-cyan-100",
  text: "Monitor real-time business activities, KPIs, sales, production, inventory, and financial performance through intelligent dashboards."
},
    {
      icon: "💰",
      title: "Accounting",
      bg: "bg-green-100",
      text: "Manage cashier, orders, invoices, inventory, payments, purchases, receivables, payables, general ledger, and financial reports in one centralized system."
    },
    {
      icon: "📊",
      title: "Analytics & Reports",
      bg: "bg-purple-100",
      text: "Generate enterprise dashboards, PDF reports, KPI analytics, and live business insights instantly."
    },
       {
      icon: "🚚",
      title: "Delivery",
      bg: "bg-purple-100",
      text: "Delivery sheet receipt & report."
    },
    {
      icon: "👥",
      title: "Human Resources",
      bg: "bg-blue-100",
      text: "Manage employees, payroll, attendance, departments, leave requests, and HR operations in one centralized platform."
    },
    {
      icon: "📦",
      title: "Inventory Management",
      bg: "bg-blue-100",
      text: "Track stock levels, warehouses, product movements, and real-time inventory updates with intelligent analytics."
    },
    {
      icon: "🏭",
      title: "Manufacturing",
      bg: "bg-green-100",
      text: "Monitor production processes, machine counters, finished goods, and factory performance in real time."
    },
    {
      icon: "📢",
      title: "Marketing",
      bg: "bg-pink-100",
      text: "Manage campaigns, customer engagement, sales promotions, analytics, and business growth strategies in real time."
    },
    {
      icon: "🛒",
      title: "Purchase Orders & Order Entry",
      bg: "bg-orange-100",
      text: "Create purchase orders, manage customer orders, track inventory movements, and process sales efficiently."
    },
    {
      icon: "⚙️",
      title: "Settings",
      bg: "bg-slate-100",
      text: "Configure company preferences, users, permissions, taxes, currencies, modules, and system camera video security settings."
    }
  ];

  return (
  <div className="min-h-screen bg-slate-100 p-6">

  <div className="max-w-5xl mx-auto">

    {/* HERO */}
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-[32px] shadow-2xl overflow-hidden">

      <div className="p-10 md:p-14">

     

        {/* TITLE */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center leading-tight">
         ................
        </h1>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center leading-tight">
          SysSoft ERP
        </h1>

        {/* DESCRIPTION */}
        <p className="text-blue-100 text-1xl md:text-2xl leading-relaxed mt-8 text-center">
          Is a modern enterprise resource planning platform
          designed to simplify dashboard ,
          trends real time ,manufacturing ,
          accounting ,inventory ,
          marketting ,delivey ,reports,
          human ressources ,video camera security ,
           and business operations in one intelligent system.
        </p>

      </div>

    </div>




        {/* FEATURES */}
     {/* FEATURES */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
  {features.map((item) => (
    <div
      key={item.title}
      className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200 hover:-translate-y-1 transition"
    >
      <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center text-2xl`}>
        {item.icon}
      </div>

      <h2 className="text-3xl font-bold text-slate-900 mt-4">
        {item.title}
      </h2>

      <p className="text-slate-600 text-lg mt-3 leading-relaxed">
        {item.text}
      </p>
    </div>
  ))}
</div>

        {/* COMPANY SECTION */}
        <div className="bg-white rounded-[32px] shadow-2xl p-10 border border-slate-200">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-5xl font-extrabold text-slate-900">
                Built For Modern Businesses
              </h2>

              <p className="text-slate-600 text-xl mt-6 leading-relaxed">
                SysSoft ERP combines modern UI/UX with powerful enterprise
                functionality to help businesses improve efficiency,
                automate operations, and scale faster.
              </p>

              <div className="space-y-5 mt-8">
                {[
                  "Real-time dashboard analytics",
                  "Manufacturing & inventory integration",
                  "Enterprise-grade reporting system"
                ].map((text) => (
                  <div key={text} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                      ✓
                    </div>

                    <p className="text-lg text-slate-700">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[32px] h-[420px] shadow-2xl flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-8xl">🖥️</div>

                <h2 className="text-4xl font-extrabold mt-6">
                  SysSoft ERP
                </h2>

                <p className="text-blue-100 text-xl mt-3">
                  Smart Enterprise Platform
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center py-10">
          <h2 className="text-4xl font-extrabold text-slate-900">
            Ready To Transform Your Business?
          </h2>

          <p className="text-slate-600 text-xl mt-4">
            Experience intelligent ERP solutions designed for modern enterprises.
          </p>

       <button
  onClick={() => navigate("/dashboard")}
  className="mt-8 h-14 px-10 rounded-2xl bg-blue-600 text-white text-xl font-bold hover:bg-blue-700 transition"
>
  🚀 Start Now
</button>
        <div className="bg-slate-900 rounded-[28px] overflow-hidden px-8 py-8 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white">
              SysSoft ERP
            </h2>

            <p className="text-slate-300 mt-3 text-lg">
              Smart Enterprise Resource Planning Platform
            </p>

        
 <div className="bg-slate-900 rounded-[28px] overflow-hidden relative px-8 py-8 text-center shadow-2xl"/>
            <p className="text-slate-400">
              ©️ {new Date().getFullYear()} SysSoft Technologies.
              SysGROUP division's SysSoft. All rights reserved SysGROUP owns the following country patents.
            </p>

             <p className="text-slate-400">
             which may cover products that are offered and licensed by SysGROUP
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Manufacturing • Inventory • Accounting • Analytics
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
