import { useState } from "react";
import NavBar from "./components/NavBar";
import Analytics from "./pages/Analytics";
import 'bootstrap/dist/css/bootstrap.css';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import imagePath from "./assets/placeholder-img.png";

// --- Placeholder Components  ---
const Incidents = () => (
  <div className="p-6">
    <h2 className="text-2xl font-semibold">Incidents Page</h2>
    <p>List of incidents will come here...</p>
  </div>
);

const Settings = () => (
  <div className="p-6">
    <h2 className="text-2xl font-semibold">Settings Page</h2>
    <p>User preferences go here...</p>
  </div>
);

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
      </div>
    </div>
  )
}
