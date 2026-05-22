import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

const Layout = () => {
  return (
    <div style={styles.container}>
      
      {/* SIDEBAR */}
      <Sidebar />

      {/* RIGHT SIDE */}
      <div style={styles.right}>

        {/* HEADER */}
        <Header />

        {/* MAIN CONTENT */}
      <main
  style={{
    padding: "20px",
    display: "flex",
    justifyContent: "center",
  }}
>
  <div
    style={{
      width: "100%",
      maxWidth: "1000px",
    }}
  >
    <Outlet />
  </div>
</main>

      </div>
    </div>
  );
};

export default Layout;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    height: "100vh",
  },

 right: {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  background: "#f5f6fa",

  marginLeft: "240px", // 🔥 SA KI TE MANKE A
},

  main: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
  },

  content: {
    width: "100%", // 🔥 FULL WIDTH
  },
};