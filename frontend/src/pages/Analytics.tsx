import React, { useEffect, useState, useMemo } from "react";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import {
    ShieldAlert, ShieldCheck, Activity, AlertTriangle,
    RefreshCw, Calendar, TrendingUp, Wifi, AlertCircle,
    Clock, ChevronDown
} from "lucide-react";

// Load API Key from Vite environment variables for secure API requests
const API_KEY = import.meta.env.VITE_API_KEY;

// Types & Interfaces
interface AIInsight {
    summary: string;
    mitigation_steps: string[];
    risk_score: number;
}

interface Incident {
    id?: string;
    analysis_status: string;
    timestamp?: any; // Marked as 'any' because it could be a Firebase Timestamp object or a standard ISO string
    ai_insights?: AIInsight[] | null;
}

// Props for the individual statistic cards displayed at the top of the dashboard
interface StatCardProps {
    label: string;
    value: number | string;
    color?: string; // Optional Tailwind text color class
    icon: React.ElementType; // Allows passing Lucide React components directly as props
    trend?: string; // e.g., "+12% Resolution"
}

/* ==========================================
   Configuration & Constants
   ========================================== */

// Maps severity levels to specific hex colors used in the PieChart
const SEVERITY_COLORS: Record<string, string> = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e"
};

// Definitions for the time filter dropdown. 
// Uses nulls to determine which time unit to calculate against in the filter logic.
const TIME_RANGES = [
    { label: 'Last Hour', value: 'hour', hours: 1, days: null },
    { label: 'Last 24 Hours', value: 'day', hours: 24, days: null },
    { label: 'Last 7 Days', value: 'week', hours: null, days: 7 },
    { label: 'Last 30 Days', value: 'month', hours: null, days: 30 },
    { label: 'Last Year', value: 'year', hours: null, days: 365 },
    { label: 'All Time', value: 'all', hours: null, days: null },
    { label: 'Custom Range', value: 'custom', hours: null, days: null }
];

/**
 * Reusable StatCard component for displaying key metrics.
 * Dynamically adjusts its icon background color based on the provided text color.
 */
const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon: Icon, trend }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-all duration-300">
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <h3 className={`text-2xl font-black ${color || "text-slate-900"}`}>{value}</h3>
            {trend && (
                <div className="flex items-center gap-1 mt-2">
                    <TrendingUp size={12} className="text-green-500" />
                    <p className="text-[10px] text-green-600 font-bold">{trend}</p>
                </div>
            )}
        </div>
        {/* Dynamic Background Color Generation: If a color like 'text-red-600' is passed, it converts it to 'bg-red-100' for the icon background */}
        <div className={`p-3 rounded-xl ${color ? color.replace('text-', 'bg-').replace('600', '100').replace('500', '100') : "bg-indigo-50 text-indigo-600"} flex items-center justify-center`}>
            <Icon size={20} />
        </div>
    </div>
);

// main component
export default function Analytics() {
    // Data & Loading State 
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    // Time Filter State 
    const [selectedRange, setSelectedRange] = useState<string>('week');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);

    /**
     * Fetches incident data from the local Python backend.
     */
    const fetchData = async () => {
        setError(null);
        try {
            const res = await fetch("http://127.0.0.1:8000/api/incidents", {
                headers: { "X-API-Key": API_KEY }
            });

            if (!res.ok) {
                if (res.status === 403) throw new Error("403 Forbidden: Invalid API Key");
                throw new Error(`HTTP Error: ${res.status}`);
            }

            const data: Incident[] = await res.json();
            setIncidents(data);
            setLastSyncTime(new Date().toLocaleTimeString());
        } catch (err: any) {
            console.error("API Error:", err);
            setError(err?.message === "403 Forbidden: Invalid API Key" ? "Authentication Failed" : "API Offline");
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    };

    // Fetch data on initial component mount
    useEffect(() => {
        fetchData();
    }, []);

    /**
      * Data Filtering & Aggregation Hooks (useMemo)
      * These recalculate only when 'incidents' or 'selectedRange' change, avoiding unnecessary re-renders.
    */

    /**
     * Filters the raw incident list based on the currently selected time range.
     */
    const filteredIncidents = useMemo(() => {
        // Handle Custom Date Range
        if (selectedRange === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999); // Extend to the very end of the selected day

            return incidents.filter(inc => {
                // Handle both Firebase Timestamp objects (which have a .seconds property) and standard date strings
                const incDate = inc.timestamp?.seconds
                    ? new Date(inc.timestamp.seconds * 1000)
                    : new Date(inc.timestamp);
                return incDate >= start && incDate <= end;
            });
        }

        // Handle "All Time"
        if (selectedRange === 'all') {
            return incidents;
        }

        // Handle Preset Ranges (Hour, Day, Week, etc.)
        const range = TIME_RANGES.find(r => r.value === selectedRange);
        if (!range) return incidents;

        const cutoffDate = new Date(); // Represents the oldest date 
        if (range.hours) {
            cutoffDate.setHours(cutoffDate.getHours() - range.hours);
        } else if (range.days) {
            cutoffDate.setDate(cutoffDate.getDate() - range.days);
        }

        return incidents.filter(inc => {
            const incDate = inc.timestamp?.seconds
                ? new Date(inc.timestamp.seconds * 1000)
                : new Date(inc.timestamp);
            return incDate >= cutoffDate;
        });
    }, [incidents, selectedRange, customStartDate, customEndDate]);

    /**
     * Calculates the top-level numbers for the 4 StatCards.
     */
    const stats = useMemo(() => {
        const total = filteredIncidents.length;
        const open = filteredIncidents.filter(i => i.analysis_status !== "resolved").length;
        // Critical incidents are those with a score >= 8 that are NOT yet resolved
        const critical = filteredIncidents.filter(i =>
            (i.ai_insights?.[0]?.risk_score ?? 0) >= 8 && i.analysis_status !== "resolved"
        ).length;
        return { total, open, critical, resolved: total - open };
    }, [filteredIncidents]);

    /**
     * Formats data for the PieChart (Risk Breakdown).
     * Maps AI risk scores (1-10) into string categories (Low, Medium, High, Critical).
     */
    const severityData = useMemo(() => {
        // Only count incidents that have been analyzed and have a score
        const analyzedIncidents = filteredIncidents.filter(i =>
            i.ai_insights && i.ai_insights.length > 0 && i.ai_insights[0].risk_score !== undefined
        );

        return [
            { name: 'Critical', value: analyzedIncidents.filter(i => (i.ai_insights?.[0].risk_score ?? 0) >= 8).length },
            {
                name: 'High', value: analyzedIncidents.filter(i => {
                    const s = i.ai_insights?.[0].risk_score ?? 0;
                    return s >= 6 && s < 8;
                }).length
            },
            {
                name: 'Medium', value: analyzedIncidents.filter(i => {
                    const s = i.ai_insights?.[0].risk_score ?? 0;
                    return s >= 4 && s < 6;
                }).length
            },
            { name: 'Low', value: analyzedIncidents.filter(i => (i.ai_insights?.[0].risk_score ?? 0) < 4).length },
        ].filter(d => d.value > 0); // Remove categories with 0 incidents to keep the pie chart clean
    }, [filteredIncidents]);

    /**
     * Complex data transformation for the AreaChart (Threat Activity Trend).
     * It takes raw incident timestamps and groups them into "buckets" (minutes, hours, days, or months)
     * depending on the selected time range. It ensures continuous data by filling empty buckets with 0.
     */
    const trendData = useMemo(() => {
        if (!incidents.length) return [];

        // Helper to safely parse dates from mixed API payload formats
        const parseDate = (ts: any) => {
            if (!ts) return new Date();
            if (ts.seconds) return new Date(ts.seconds * 1000);
            const d = new Date(ts);
            return isNaN(d.getTime()) ? new Date() : d;
        };

        let start = new Date();
        let end = new Date();
        let bucketFormat: 'minute' | 'hour' | 'day' | 'month' = 'day';

        // 1. Determine Start Time and Bucket Size based on selected filter
        if (selectedRange === 'hour') {
            start.setHours(start.getHours() - 1);
            bucketFormat = 'minute'; // Group by 5-minute increments
        } else if (selectedRange === 'day') {
            start.setHours(start.getHours() - 24);
            bucketFormat = 'hour';   // Group by hour
        } else if (selectedRange === 'week') {
            start.setDate(start.getDate() - 7);
            bucketFormat = 'day';    // Group by day
        } else if (selectedRange === 'month') {
            start.setDate(start.getDate() - 30);
            bucketFormat = 'day';
        } else if (selectedRange === 'year') {
            start.setFullYear(start.getFullYear() - 1);
            bucketFormat = 'month';  // Group by month
        } else if (selectedRange === 'all' || selectedRange === 'custom') {
            // For dynamic ranges, calculate the difference in days to pick the best bucket size
            if (selectedRange === 'all') {
                const times = incidents.map(i => parseDate(i.timestamp).getTime());
                start = new Date(Math.min(...times));
            } else {
                start = new Date(customStartDate || Date.now());
                end = new Date(customEndDate || Date.now());
                end.setHours(23, 59, 59, 999);
            }

            const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff <= 2) bucketFormat = 'hour';
            else if (daysDiff <= 90) bucketFormat = 'day';
            else bucketFormat = 'month';
        }

        // Safety fallback for corrupted old dates (e.g., Unix epoch 1970)
        if (start.getFullYear() < 2000) {
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
            bucketFormat = 'month';
        }

        /**
         * Generates a string key to group incidents into the Map.
         * e.g., bucketFormat 'hour' returns "2024-03-01T14" grouping all incidents between 2:00 PM and 2:59 PM.
         */
        const getBucketKey = (d: Date, format: string) => {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const dy = String(d.getDate()).padStart(2, '0');
            const hr = String(d.getHours()).padStart(2, '0');
            // For minute format, round down to the nearest 5 minutes
            const mi = String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0');

            if (format === 'minute') return `${yr}-${mo}-${dy}T${hr}:${mi}`;
            if (format === 'hour') return `${yr}-${mo}-${dy}T${hr}`;
            if (format === 'day') return `${yr}-${mo}-${dy}`;
            if (format === 'month') return `${yr}-${mo}`;
            return `${yr}-${mo}-${dy}`;
        };

        const buckets = new Map<string, { label: string, attacks: number }>();

        // 2. Pre-fill the buckets to guarantee continuous lines (no gaps in the graph where attacks = 0)
        let current = new Date(start);
        // Align the starting bucket to the exact boundary of the chosen format
        if (bucketFormat === 'minute') current.setMinutes(Math.floor(current.getMinutes() / 5) * 5, 0, 0);
        else if (bucketFormat === 'hour') current.setMinutes(0, 0, 0);
        else if (bucketFormat === 'day') current.setHours(0, 0, 0, 0);
        else if (bucketFormat === 'month') { current.setDate(1); current.setHours(0, 0, 0, 0); }

        while (current <= end) {
            const key = getBucketKey(current, bucketFormat);
            let label = '';

            // Format the X-Axis label string for the chart based on the bucket size
            if (bucketFormat === 'minute' || bucketFormat === 'hour') {
                label = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (bucketFormat === 'day') {
                label = current.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            } else if (bucketFormat === 'month') {
                label = current.toLocaleDateString([], { month: 'short', year: '2-digit' });
            }

            buckets.set(key, { label, attacks: 0 }); // Initialize with 0

            // Increment the pointer for the while loop
            if (bucketFormat === 'minute') current.setMinutes(current.getMinutes() + 5);
            else if (bucketFormat === 'hour') current.setHours(current.getHours() + 1);
            else if (bucketFormat === 'day') current.setDate(current.getDate() + 1);
            else if (bucketFormat === 'month') current.setMonth(current.getMonth() + 1);
        }

        // 3. Tally the actual incidents into the corresponding pre-filled buckets
        incidents.forEach(inc => {
            const d = parseDate(inc.timestamp);
            if (d >= start && d <= end) {
                const key = getBucketKey(d, bucketFormat);
                if (buckets.has(key)) {
                    buckets.get(key)!.attacks += 1;
                }
            }
        });

        // 4. Convert the Map into the array structure required by Recharts
        return Array.from(buckets.values()).map(b => ({
            date: b.label,
            attacks: b.attacks
        }));
    }, [incidents, selectedRange, customStartDate, customEndDate]);

    // Initial loading state UI
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
            {/* Header & Time Filters*/}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900">Security Analytics</h2>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <Calendar size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Automated Threat Feed</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Main Time Range Dropdown */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Clock size={16} className="text-indigo-600" />
                        <select
                            value={selectedRange}
                            onChange={(e) => {
                                setSelectedRange(e.target.value);
                                setShowCustomPicker(e.target.value === 'custom'); // Toggle secondary date inputs
                            }}
                            className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                        >
                            {TIME_RANGES.map(range => (
                                <option key={range.value} value={range.value}>{range.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="text-slate-400" />
                    </div>

                    {/* Conditional Custom Date Picker Inputs */}
                    {showCustomPicker && (
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="text-xs font-bold text-slate-700 border-none outline-none"
                            />
                            <span className="text-slate-400">→</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="text-xs font-bold text-slate-700 border-none outline-none"
                            />
                        </div>
                    )}
                </div>
            </header>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard label="Total Events" value={stats.total} icon={Activity} />
                <StatCard label="Critical Threats" value={stats.critical} color="text-red-600" icon={ShieldAlert} />
                <StatCard label="Open Cases" value={stats.open} color="text-orange-500" icon={AlertTriangle} />
                <StatCard label="Resolved" value={stats.resolved} color="text-green-600" icon={ShieldCheck} trend="+12% Resolution" />
            </div>

            {/* Charts Grid  */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">

                {/* Main Area Chart (Takes up 8 of 12 columns) */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold mb-8">Threat Activity Trend</h3>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData}>
                                    <defs>
                                        {/* Defines the smooth fade gradient under the area chart line */}
                                        <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                                        dy={10}
                                        // Slants the labels for tighter views (like days), keeps them straight for years/all time
                                        angle={selectedRange === 'year' || selectedRange === 'all' ? 0 : -15}
                                        textAnchor={selectedRange === 'year' || selectedRange === 'all' ? 'middle' : 'end'}
                                        minTickGap={20}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                                    <Area type="monotone" dataKey="attacks" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAttacks)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Side Pie Chart (Takes up 4 of 12 columns) */}
                <div className="lg:col-span-4">
                    <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 h-full">
                        <h3 className="text-lg font-bold mb-2">Risk Breakdown</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={severityData} innerRadius={80} outerRadius={105} paddingAngle={10} dataKey="value" stroke="none">
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

            {/* Footer / Connection Status Bar */}
            <footer className="mt-auto pt-4">
                <div className={`bg-white rounded-3xl p-6 border-2 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-4 ${error ? 'border-red-100 bg-red-50/30' : 'border-slate-50 shadow-sm'
                    }`}>
                    <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${error ? 'bg-red-100 text-red-600' : isSyncing ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-green-100 text-green-600'
                            }`}>
                            {error ? <AlertCircle size={24} /> : isSyncing ? <RefreshCw size={24} className="animate-spin" /> : <Wifi size={24} />}
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                    {error ? "Backend Disconnected" : isSyncing ? "Syncing Incident Engine" : "System Engine Active"}
                                </h4>
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
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Endpoint</span>
                            <span className="text-xs font-bold text-slate-600">http://127.0.0.1:8000/api/incidents</span>
                        </div>

                        {/* Manual Refresh / Retry Button */}
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
                    Security Assistant Dashboard • Interface Built by Nihar Sakhreliya
                </p>
            </footer>
        </div>
    );