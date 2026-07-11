import { useState } from "react";
import NavBar from "./components/NavBar";
import Analytics from "./pages/Analytics";
import Incidents from "./pages/Incidents";
import Settings from "./pages/Settings";
import TestConnection from './components/TestConnection';

import 'bootstrap/dist/css/bootstrap.css';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import imagePath from "./assets/placeholder-img.png";

function App() {
  const [activePage, setActivePage] = useState("Analytics");

  let items = ["Analytics", "Incidents", "Settings"];

  return (
    <div>



      <NavBar
        brandName="Dashboard"
        imageSrcPath={imagePath}
        navItems={items}
        onSelect={(item) => setActivePage(item)}
      />

      <div className="content-container">
        {activePage === "Analytics" && <Analytics />}
        {activePage === "Incidents" && <Incidents />}
        {activePage === "Settings" && <Settings />}
        {/* --- TEMPORARY TEST SECTION --- */}
        <TestConnection />
        {/* ----------------------------- */}

      </div>
    </div>




  )
}

export default App