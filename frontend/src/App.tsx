// src/app.tsx
import { useState, useEffect } from "react";

// firebase imports
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import NavBar from "./components/NavBar";
import Analytics from "./pages/Analytics";
import Incidents from "./pages/Incidents";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

import imagePath from "./assets/placeholder-img.png";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState("Analytics");

  const navItems = ["Analytics", "Incidents", "Settings"];

  // the security guard
  // this listens to firebase. it automatically detects if you are logged in or out.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // let them in
        setIsAuthenticated(true);
      } else {
        // kick them out
        setIsAuthenticated(false);
      }
      // Stop the loading spinner
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. show a loading spinner while firebase checks the browser memory for a session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#FDFCFE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  // 2. the bouncer: if firebase says you aren't logged in, force the login screen.
  if (!isAuthenticated) {
    return <Login />;
  }

  // 3. if you make it past the bouncer, load the dashboard!
  return (
    <div className="min-h-screen bg-[#FDFCFE]">

      <NavBar
        brandName="SOC Engine"
        imageSrcPath={imagePath}
        navItems={navItems}
        onSelect={(item) => setActivePage(item)}
        activeItem={activePage}
      />

      <main className="max-w-400 mx-auto px-4 py-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activePage === "Analytics" && <Analytics />}
          {activePage === "Incidents" && <Incidents />}
          {activePage === "Settings" && <Settings />}
        </div>
      </main>

    </div>
  );
}
