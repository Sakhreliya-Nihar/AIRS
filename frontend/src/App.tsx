import { useState } from "react";
import NavBar from "./components/NavBar";
import Analytics from "./pages/Analytics";
import Incidents from "./pages/Incidents";
import Settings from "./pages/Settings";

// Bootstrap imports to prevent CSS conflicts with Tailwind
import imagePath from "./assets/placeholder-img.png";

function App() {
  const [activePage, setActivePage] = useState("Analytics");

  const navItems = ["Analytics", "Incidents", "Settings"];

  return (
    // min-h-screen ensures the background color covers the whole page
    // bg-[#FDFCFE] matches dashboard theme
    <div className="min-h-screen bg-[#FDFCFE]">

      {/* Navigation Bar */}
      <NavBar
        brandName="SOC Engine"
        imageSrcPath={imagePath}
        navItems={navItems}
        onSelect={(item) => setActivePage(item)}
        activeItem={activePage} // gets passed so current page can be highlighted
      />

      {/* Main Page Content Area 
        max-w-[1600px] keeps the dashboard from becoming too wide on ultra-wide monitors
      */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activePage === "Analytics" && <Analytics />}
          {activePage === "Incidents" && <Incidents />}
          {activePage === "Settings" && <Settings />}
        </div>
      </main>

    </div>
  );
}

export default App;