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

const API_KEY = import.meta.env.VITE_API_KEY;

/* ---------- Types & Interfaces ---------- */
interface AIInsight {
    summary: string;
    mitigation_steps: string[];
    risk_score: number;
}

interface Incident {
    id?: string;
    analysis_status: string;
    timestamp?: any;
    ai_insights?: AIInsight[] | null;
}

interface StatCardProps {
    label: string;
    value: number | string;
    color?: string;
    icon: React.ElementType;
    trend?: string;
}

/* ---------- Configuration & Constants ---------- */
const SEVERITY_COLORS: Record<string, string> = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e"
};

const TIME_RANGES = [
    { label: 'Last Hour', value: 'hour', hours: 1, days: null },
    { label: 'Last 24 Hours', value: 'day', hours: 24, days: null },
    { label: 'Last 7 Days', value: 'week', hours: null, days: 7 },
    { label: 'Last 30 Days', value: 'month', hours: null, days: 30 },
    { label: 'Last Year', value: 'year', hours: null, days: 365 },
    { label: 'All Time', value: 'all', hours: null, days: null },
    { label: 'Custom Range', value: 'custom', hours: null, days: null }
];

/* ---------- Sub-Components ---------- */
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
        <div className={`p-3 rounded-xl ${color ? color.replace('text-', 'bg-').replace('600', '100').replace('500', '100') : "bg-indigo-50 text-indigo-600"} flex items-center justify-center`}>
            <Icon size={20} />
        </div>
    </div>
);

/* ---------- Main Component ---------- */
export default function Analytics() {
    // Strongly typed state
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const [selectedRange, setSelectedRange] = useState<string>('week');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);

    const fetchData = async () => {
        setError(null);
        try {
            const res = await fetch("http://127.0.0.1:8000/api/incidents", {
                headers: {
                    "X-API-Key": API_KEY
                }
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

    useEffect(() => {
        fetchData();
    }, []);

    const filteredIncidents = useMemo(() => {
        if (selectedRange === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);

            return incidents.filter(inc => {
                const incDate = inc.timestamp?.seconds
                    ? new Date(inc.timestamp.seconds * 1000)
                    : new Date(inc.timestamp);
                return incDate >= start && incDate <= end;
            });
        }

        if (selectedRange === 'all') {
            return incidents;
        }

        const range = TIME_RANGES.find(r => r.value === selectedRange);
        if (!range) return incidents;

        const cutoffDate = new Date();

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

    const stats = useMemo(() => {
        const total = filteredIncidents.length;
        const open = filteredIncidents.filter(i => i.analysis_status !== "resolved").length;
        const critical = filteredIncidents.filter(i =>
            (i.ai_insights?.[0]?.risk_score ?? 0) >= 8 && i.analysis_status !== "resolved"
        ).length;
        return { total, open, critical, resolved: total - open };
    }, [filteredIncidents]);

    const severityData = useMemo(() => {
        const analyzedIncidents = filteredIncidents.filter(i =>
            i.ai_insights && i.ai_insights.length > 0 && i.ai_insights[0].risk_score !== undefined
        );

        return [
            {
                name: 'Critical',
                value: analyzedIncidents.filter(i => (i.ai_insights?.[0].risk_score ?? 0) >= 8).length
            },
            {
                name: 'High',
                value: analyzedIncidents.filter(i => {
                    const s = i.ai_insights?.[0].risk_score ?? 0;
                    return s >= 6 && s < 8;
                }).length
            },
            {
                name: 'Medium',
                value: analyzedIncidents.filter(i => {
                    const s = i.ai_insights?.[0].risk_score ?? 0;
                    return s >= 4 && s < 6;
                }).length
            },
            {
                name: 'Low',
                value: analyzedIncidents.filter(i => (i.ai_insights?.[0].risk_score ?? 0) < 4).length
            },
        ].filter(d => d.value > 0);
    }, [filteredIncidents]);

    const trendData = useMemo(() => {
        let intervals = 7;
        let intervalType = 'day';

        if (selectedRange === 'hour') {
            intervals = 12;
            intervalType = 'minute';
        } else if (selectedRange === 'day') {
            intervals = 24;
            intervalType = 'hour';
        } else if (selectedRange === 'week') {
            intervals = 7;
            intervalType = 'day';
        } else if (selectedRange === 'month') {
            intervals = 30;
            intervalType = 'day';
        } else if (selectedRange === 'year') {
            intervals = 12;
            intervalType = 'month';
        } else if (selectedRange === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 1) {
                intervals = 24;
                intervalType = 'hour';
            } else if (daysDiff <= 7) {
                intervals = daysDiff;
                intervalType = 'day';
            } else if (daysDiff <= 60) {
                intervals = daysDiff;
                intervalType = 'day';
            } else {
                intervals = Math.ceil(daysDiff / 30);
                intervalType = 'month';
            }
        }

        return [...Array(intervals)].map((_, i) => {
            const targetDate = new Date();

            if (intervalType === 'minute') {
                targetDate.setMinutes(targetDate.getMinutes() - ((intervals - 1 - i) * 5));
            } else if (intervalType === 'hour') {
                targetDate.setHours(targetDate.getHours() - (intervals - 1 - i));
            } else if (intervalType === 'day') {
                targetDate.setDate(targetDate.getDate() - (intervals - 1 - i));
            } else if (intervalType === 'month') {
                targetDate.setMonth(targetDate.getMonth() - (intervals - 1 - i));
            }

            const count = filteredIncidents.filter(inc => {
                const incDate = inc.timestamp?.seconds
                    ? new Date(inc.timestamp.seconds * 1000)
                    : new Date(inc.timestamp);

                if (isNaN(incDate.getTime())) return false;

                if (intervalType === 'minute') {
                    const startOfInterval = new Date(targetDate);
                    const endOfInterval = new Date(targetDate);
                    endOfInterval.setMinutes(endOfInterval.getMinutes() + 5);
                    return incDate >= startOfInterval && incDate < endOfInterval;
                } else if (intervalType === 'hour') {
                    return incDate.getHours() === targetDate.getHours() &&
                        incDate.toLocaleDateString('en-CA') === targetDate.toLocaleDateString('en-CA');
                } else if (intervalType === 'day') {
                    return incDate.toLocaleDateString('en-CA') === targetDate.toLocaleDateString('en-CA');
                } else if (intervalType === 'month') {
                    return incDate.getMonth() === targetDate.getMonth() &&
                        incDate.getFullYear() === targetDate.getFullYear();
                }
                return false;
            }).length;

            let label; {
                if (intervalType === 'minute' || intervalType === 'hour') {
                    label = targetDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                } else if (intervalType === 'day') {
                    label = targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                } else if (intervalType === 'month') {
                    label = targetDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                }

                return {
                    date: label,
                    attacks: count
                };
            });
    }, [filteredIncidents, selectedRange, customStartDate, customEndDate]);

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
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900">Security Analytics</h2>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <Calendar size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Automated Threat Feed</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Clock size={16} className="text-indigo-600" />
                        <select
                            value={selectedRange}
                            onChange={(e) => {
                                setSelectedRange(e.target.value);
                                setShowCustomPicker(e.target.value === 'custom');
                            }}
                            className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                        >
                            {TIME_RANGES.map(range => (
                                <option key={range.value} value={range.value}>{range.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="text-slate-400" />
                    </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard label="Total Events" value={stats.total} icon={Activity} />
                <StatCard label="Critical Threats" value={stats.critical} color="text-red-600" icon={ShieldAlert} />
                <StatCard label="Open Cases" value={stats.open} color="text-orange-500" icon={AlertTriangle} />
                <StatCard label="Resolved" value={stats.resolved} color="text-green-600" icon={ShieldCheck} trend="+12% Resolution" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                <div className="lg:col-span-8">
                    <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold mb-8">Threat Activity Trend</h3>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData}>
                                    <defs>
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
                                        angle={selectedRange === 'year' ? 0 : -15}
                                        textAnchor={selectedRange === 'year' ? 'middle' : 'end'}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                                    <Area type="monotone" dataKey="attacks" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAttacks)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

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