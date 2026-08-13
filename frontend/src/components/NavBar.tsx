import { useState, useEffect, useRef, useMemo } from "react";
import { AlertTriangle, AlertCircle, Info, Bell, CheckCircle2, CheckSquare } from "lucide-react";
import "../App.css";

// --- FIREBASE IMPORTS ---
import { auth, db } from "../firebase";
import { doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore"; // Updated imports

const API_KEY = import.meta.env.VITE_API_KEY;

interface NavBarProps {
    brandName: string;
    imageSrcPath: string;
    navItems: string[];
    onSelect: (item: string) => void;
    activeItem: string;
}

const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function NavBar({ brandName, imageSrcPath, navItems, onSelect, activeItem }: NavBarProps) {
    const [initials, setInitials] = useState<string>("--");

    // --- Notification State ---
    const [appNotificationLevel, setAppNotificationLevel] = useState<string>("high");
    const [clearedNotifs, setClearedNotifs] = useState<string[]>([]); // New state for cleared alerts
    const [allActiveIncidents, setAllActiveIncidents] = useState<any[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let unsubUser = () => { };

        // Real-time listener for User Data (Solves the "Manual Refresh" issue for settings)
        const setupRealtimeUser = () => {
            const user = auth.currentUser;
            if (user) {
                const docRef = doc(db, "users", user.uid);
                unsubUser = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.name) setInitials(getInitials(data.name));
                        if (data.app_notification_level) setAppNotificationLevel(data.app_notification_level);
                        if (data.cleared_notifications) setClearedNotifs(data.cleared_notifications);
                    } else if (user.email) {
                        setInitials(getInitials(user.email.split('@')[0]));
                    }
                });
            }
        };

        // 2. Fetch incidents with background polling (Solves the "Manual Refresh" issue for new alerts)
        const fetchActiveAlerts = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/incidents", {
                    headers: { "X-API-Key": API_KEY }
                });
                if (!res.ok) return;

                const data = await res.json();
                const unresolved = data.filter((inc: any) => inc.analysis_status !== "resolved");
                setAllActiveIncidents(unresolved);
            } catch (error) {
                console.error("Error fetching alerts for NavBar:", error);
            }
        };

        setupRealtimeUser();
        fetchActiveAlerts();

        // Poll the API every 30 seconds for new incidents
        const interval = setInterval(fetchActiveAlerts, 30000);

        return () => {
            unsubUser();
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter incidents based on user preference AND if they have been cleared
    const filteredNotifications = useMemo(() => {
        if (appNotificationLevel === "none") return [];

        const filtered = allActiveIncidents.filter(inc => {
            // If the user clears this notification then hide it
            if (clearedNotifs.includes(inc.id)) return false;

            const score = inc.ai_insights?.[0]?.risk_score || 0;
            if (appNotificationLevel === "critical" && score >= 8) return true;
            if (appNotificationLevel === "high" && score >= 6) return true;
            if (appNotificationLevel === "medium" && score >= 4) return true;
            return false;
        });

        return filtered.sort((a, b) => {
            const timeA = a.timestamp?.seconds || new Date(a.timestamp).getTime() || 0;
            const timeB = b.timestamp?.seconds || new Date(b.timestamp).getTime() || 0;
            return timeB - timeA;
        }).slice(0, 5);
    }, [allActiveIncidents, appNotificationLevel, clearedNotifs]);

    // --- Handle Clearing Notifications ---
    const handleClearAll = async () => {
        const user = auth.currentUser;
        if (!user || filteredNotifications.length === 0) return;

        const idsToClear = filteredNotifications.map(n => n.id);
        const docRef = doc(db, "users", user.uid);

        try {
            // Add IDs to the user's cleared list in Firestore
            await updateDoc(docRef, {
                cleared_notifications: arrayUnion(...idsToClear)
            });
            // The onSnapshot listener will automatically update the UI
        } catch (error) {
            console.error("Failed to clear notifications", error);
        }
    };

    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp) return "Recently";
        try {
            const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
            const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

            let interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + "d ago";
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + "h ago";
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + "m ago";
            return "Just now";
        } catch {
            return "Recently";
        }
    };

    const getSeverityStyles = (score: number) => {
        if (score >= 8) return { bg: "bg-red-100", text: "text-red-600", icon: AlertTriangle };
        if (score >= 6) return { bg: "bg-orange-100", text: "text-orange-600", icon: AlertCircle };
        if (score >= 4) return { bg: "bg-yellow-100", text: "text-yellow-600", icon: Info };
        return { bg: "bg-green-100", text: "text-green-600", icon: Info };
    };

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-3">
            <div className="max-w-400 mx-auto flex items-center justify-between">

                {/* Brand Section */}
                <div
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => onSelect("Analytics")}
                >
                    <div className="p-1 bg-slate-50 rounded-lg border border-slate-100 group-hover:border-purple-200 transition-colors">
                        <img src={imageSrcPath} className="w-10 h-10 object-contain" alt="Logo" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black tracking-tight text-slate-900 leading-none">{brandName}</span>
                        <span className="text-[10px] font-bold text-purple-600 tracking-widest uppercase mt-1">SOC Engine</span>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-12">
                    <ul className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = activeItem === item;
                            return (
                                <li
                                    key={item}
                                    onClick={() => onSelect(item)}
                                    className={`relative px-4 py-2 text-sm font-bold cursor-pointer transition-all duration-200 rounded-lg
                    ${isActive ? "text-purple-600 bg-purple-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
                                >
                                    {item}
                                    {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-purple-600 rounded-full" />}
                                </li>
                            );
                        })}
                    </ul>

                    {/* Search Bar */}
                    <div className="flex items-center gap-3 bg-slate-100/50 px-4 py-2 rounded-2xl border border-slate-200 focus-within:border-purple-300 focus-within:bg-white transition-all">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Filter incidents..."
                            className="bg-transparent border-none outline-none text-xs w-40 placeholder:text-slate-400 font-medium"
                        />
                    </div>
                </div>

                {/* Notifications & User Profile */}
                <div className="flex items-center gap-6">

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
                        >
                            <Bell size={20} />
                            {filteredNotifications.length > 0 && (
                                <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" style={{ top: '-2px', left: '-2px' }}></span>
                                </span>
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform origin-top-right transition-all">
                                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800">Alerts</h3>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{appNotificationLevel} Level</span>
                                    </div>
                                    {filteredNotifications.length > 0 && (
                                        <button
                                            onClick={handleClearAll}
                                            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-2 py-1 border border-slate-200 rounded-md"
                                        >
                                            <CheckSquare size={12} /> Clear All
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-[320px] overflow-y-auto">
                                    {filteredNotifications.length === 0 ? (
                                        <div className="p-8 text-center flex flex-col items-center justify-center">
                                            <CheckCircle2 size={32} className="text-green-400 mb-2" />
                                            <p className="text-sm font-bold text-slate-600">All clear!</p>
                                            <p className="text-xs text-slate-400 mt-1">No new alerts match your threshold.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {filteredNotifications.map((inc) => {
                                                const score = inc.ai_insights?.[0]?.risk_score || 0;
                                                const style = getSeverityStyles(score);
                                                const Icon = style.icon;

                                                return (
                                                    <div
                                                        key={inc.id}
                                                        onClick={() => {

                                                            // Add the ID to the URL hash
                                                            window.location.hash = inc.id;
                                                            // Close dropdown & switch tabs
                                                            setIsDropdownOpen(false);
                                                            onSelect("Incidents");
                                                        }}
                                                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 items-start"
                                                    >
                                                        <div className={`p-2 rounded-xl mt-0.5 ${style.bg} ${style.text}`}>
                                                            <Icon size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate">
                                                                Incident #{inc.event.event_id.substring(0, 8)}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                                                {inc.ai_insights?.[0]?.summary || "New security event detected."}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-400 mt-2">
                                                                {formatTimeAgo(inc.timestamp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        onClick={() => onSelect("Settings")}
                        className="h-8 w-8 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-purple-200 cursor-pointer hover:scale-105 transition-transform"
                    >
                        {initials}
                    </div>
                </div>

            </div>
        </nav>
    );
}