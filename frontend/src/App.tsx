// src/App.tsx
import { useState, useEffect } from "react";

// --- FIREBASE IMPORTS ---
// Make sure this path points exactly to your firebase file!
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

  // --- THE SECURITY GUARD ---
  // This listens to Firebase. It automatically detects if you are logged in or out.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true); // Let them in
      } else {
        setIsAuthenticated(false); // Kick them out
      }
      setIsCheckingAuth(false); // Stop the loading spinner
    });

    return () => unsubscribe();
  }, []);

  // 1. Show a loading spinner while Firebase checks the browser memory for a session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#FDFCFE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  // 2. THE BOUNCER: If Firebase says you aren't logged in, FORCE the Login screen.
  if (!isAuthenticated) {
    return <Login />;
  }

  // 3. If you make it past the bouncer, load the Dashboard!
  return (
    <div className="min-h-screen bg-[#FDFCFE]">

      <NavBar
        brandName="SOC Engine"
        imageSrcPath={imagePath}
        navItems={navItems}
        onSelect={(item) => setActivePage(item)}
        activeItem={activePage}
      />

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
