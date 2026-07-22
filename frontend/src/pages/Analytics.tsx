import { useEffect, useState, useMemo } from "react";
// Recharts: A charting library for React that uses SVG for rendering
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
// Lucide-React: An icon library providing consistent, scalable vector icons
import {
    ShieldAlert, ShieldCheck, Activity, AlertTriangle,
    RefreshCw, Info, Calendar, TrendingUp, Wifi, WifiOff, AlertCircle, Database
} from "lucide-react";

/* ---------- Configuration & Constants ---------- */
// Mapping severity levels to specific hex codes for consistent UI branding
const SEVERITY_COLORS = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e"
};

/* ---------- Sub-Components ---------- */
/**
 * StatCard: A reusable functional component for the top metric cards.
 * Uses destructuring to pull props (label, value, colour, etc.)
 */
const StatCard = ({ label, value, color, icon: Icon, trend }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-all duration-300">
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            {/* Dynamic text colour based on the 'colour' prop */}
            <h3 className={`text-2xl font-black ${color || "text-slate-900"}`}>{value}</h3>
            {/* Only render the trend element if a trend value exists (conditional rendering) */}
            {trend && (
                <div className="flex items-center gap-1 mt-2">
                    <TrendingUp size={12} className="text-green-500" />
                    <p className="text-[10px] text-green-600 font-bold">{trend}</p>
                </div>
            )}
        </div>
        {/* Visual background for icons using dynamic Tailwind class manipulation */}
        <div className={`p-3 rounded-xl ${color ? color.replace('text-', 'bg-').replace('600', '100').replace('500', '100') : "bg-indigo-50 text-indigo-600"} flex items-center justify-center`}>
            <Icon size={20} />
        </div>
    </div>
);

/* ---------- Main Component ---------- */
export default function Analytics() {
    // State Hooks: Managing data, loading states, and error handling
    const [incidents, setIncidents] = useState([]);      // Array of incident objects from API
    const [loading, setLoading] = useState(true);        // Initial full-page load state
    const [isSyncing, setIsSyncing] = useState(false);    // State for manual refresh button feedback
    const [error, setError] = useState(null);            // Stores error strings if API fails
    const [lastSyncTime, setLastSyncTime] = useState(null); // Timestamp of last successful fetch

    /**
     * fetchData: Asynchronous function to communicate with the FastAPI backend.
     * Uses the Fetch API to perform a GET request.
     */
    const fetchData = async () => {
        setError(null); // Reset error state before attempt
        try {
            // Fetching from the local FastAPI loopback address
            const res = await fetch("http://127.0.0.1:8000/api/incidents");

            // Error handling: Fetch only throws on network failure, not 404/500s
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

            const data = await res.json();
            setIncidents(data); // Store results in state
            setLastSyncTime(new Date().toLocaleTimeString()); // Record success time
        } catch (err) {
            console.error("API Error:", err);
            setError("API Offline"); // Update UI to show connection error
        } finally {
            setLoading(false);      // Remove initial spinner
            setIsSyncing(false);    // Stop refresh button animation
        }
    };

    // useEffect: Runs once when the component mounts to trigger the initial data load
    useEffect(() => {
        fetchData();
    }, []);

    /* ---------- Data Processing (useMemo used for performance optimization) ---------- */

    // Logic to calculate summary metrics (Total, Open, Critical)
    const stats = useMemo(() => {
        const total = incidents.length;
        const open = incidents.filter(i => i.analysis_status !== "resolved").length;
        // Critical incidents defined as score >= 8 and not yet resolved
        const critical = incidents.filter(i =>
            (i.ai_insights?.[0]?.risk_score ?? 0) >= 8 && i.analysis_status !== "resolved"
        ).length;
        return { total, open, critical, resolved: total - open };
    }, [incidents]); // Only re-calculates if the incidents array changes

    // Logic to format data for the Pie Chart
    // Logic to format data for the Pie Chart
    const severityData = useMemo(() => {
        // 1. Create a helper list of only incidents that actually have AI results
        const analyzedIncidents = incidents.filter(i =>
            i.ai_insights && i.ai_insights.length > 0 && i.ai_insights[0].risk_score !== undefined
        );

        return [
            {
                name: 'Critical',
                value: analyzedIncidents.filter(i => i.ai_insights[0].risk_score >= 8).length
            },
            {
                name: 'High',
                value: analyzedIncidents.filter(i => {
                    const s = i.ai_insights[0].risk_score;
                    return s >= 6 && s < 8;
                }).length
            },
            {
                name: 'Medium',
                value: analyzedIncidents.filter(i => {
                    const s = i.ai_insights[0].risk_score;
                    return s >= 4 && s < 6;
                }).length
            },
            {
                name: 'Low',
                value: analyzedIncidents.filter(i => i.ai_insights[0].risk_score < 4).length
            },
        ].filter(d => d.value > 0);
    }, [incidents]);

    // Logic to format data for the 7-day Trend Area Chart
    const trendData = useMemo(() => {
        return [...Array(7)].map((_, i) => {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - (6 - i)); // Look back 6 days to today
            const targetDateKey = targetDate.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD

            // Count incidents occurring on this specific date
            const count = incidents.filter(inc => {
                // Handle both Firebase Timestamps (seconds) and standard ISO strings
                let incDate = inc.timestamp?.seconds ? new Date(inc.timestamp.seconds * 1000) : new Date(inc.timestamp);
                return !isNaN(incDate) && incDate.toLocaleDateString('en-CA') === targetDateKey;
            }).length;

            return {
                date: targetDate.toLocaleDateString(undefined, { weekday: 'short' }), // e.g., "Mon"
                attacks: count
            };
        });
    }, [incidents]);

    // Loading Screen: Displayed while the initial fetchData() is running
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <RefreshCw className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">Connecting to Local API...</p>
            </div>
        );
    }

    return (
        <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans flex flex-col">
            {/* Page Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900">Security Analytics</h2>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <Calendar size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Automated Threat Feed</span>
                    </div>
                </div>
            </header>

            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard label="Total Events" value={stats.total} icon={Activity} />
                <StatCard label="Critical Threats" value={stats.critical} color="text-red-600" icon={ShieldAlert} />
                <StatCard label="Open Cases" value={stats.open} color="text-orange-500" icon={AlertTriangle} />
                <StatCard label="Resolved" value={stats.resolved} color="text-green-600" icon={ShieldCheck} trend="+12% Resolution" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                {/* Area Chart: Trend Analysis */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold mb-8">Threat Activity Trend</h3>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData}>
                                    {/* Definition for the gradient under the area line */}
                                    <defs>
                                        <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                                    <Area type="monotone" dataKey="attacks" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAttacks)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Pie Chart: Severity Distribution */}
                <div className="lg:col-span-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-full">
                        <h3 className="text-lg font-bold mb-2">Risk Breakdown</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={severityData} innerRadius={80} outerRadius={105} paddingAngle={10} dataKey="value" stroke="none">
                                        {/* Iterating through data to apply custom severity colors */}
                                        {severityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------- API STATUS FOOTER ---------- 
          This section monitors the health of the connection to the FastAPI backend.
      */}
            <footer className="mt-auto pt-4">
                <div className={`bg-white rounded-3xl p-6 border-2 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-4 ${error ? 'border-red-100 bg-red-50/30' : 'border-slate-50 shadow-sm'
                    }`}>
                    <div className="flex items-center gap-4">
                        {/* Conditional Status Icon: Red for error, Spinning for sync, Green for OK */}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${error ? 'bg-red-100 text-red-600' : isSyncing ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-green-100 text-green-600'
                            }`}>
                            {error ? <AlertCircle size={24} /> : isSyncing ? <RefreshCw size={24} className="animate-spin" /> : <Wifi size={24} />}
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                    {error ? "Backend Disconnected" : isSyncing ? "Syncing Incident Engine" : "System Engine Active"}
                                </h4>
                                {/* Visual Pill indicating Online/Offline status */}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                    {error ? "OFFLINE" : "ONLINE"}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-slate-400">
                                {error ? "Check uvicorn main:app --reload status" : `Last successful heartbeat: ${lastSyncTime}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Label showing the exact endpoint for development transparency */}
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Endpoint</span>
                            <span className="text-xs font-bold text-slate-600">http://127.0.0.1:8000/api/incidents</span>
                        </div>

                        {/* Manual Re-sync Button: Re-runs fetchData() without a page reload */}
                        <button
                            onClick={() => { setIsSyncing(true); fetchData(); }}
                            disabled={isSyncing}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${error ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-indigo-600'
                                } shadow-lg disabled:opacity-50`}
                        >
                            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                            {isSyncing ? "FETCHING DATA..." : error ? "RETRY CONNECTION" : "REFRESH ANALYTICS"}
                        </button>
                    </div>
                </div>

                <p className="text-center text-[10px] font-bold text-slate-300 mt-4 uppercase tracking-[0.2em]">
                    Security Assistant Dashboard • Interface Built by Matthew Fish
                </p>
            </footer>
        </div>
    );
}