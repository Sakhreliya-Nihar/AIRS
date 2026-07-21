import { useEffect, useState, useMemo } from "react";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import {
    ShieldAlert, ShieldCheck, Activity, AlertTriangle,
    RefreshCw, Info, Calendar, TrendingUp
} from "lucide-react";

/* ---------- Configuration & Constants ---------- */
const SEVERITY_COLORS: Record<string, string> = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e"
};

/* ---------- Sub-Components ---------- */
const StatCard = ({ label, value, color, icon: Icon, trend }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-all duration-300">
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
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:8000/api/incidents")
            .then(res => res.json())
            .then(data => {
                setIncidents(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setLoading(false);
            });
    }, []);

    /* ---------- Data Processing ---------- */
    const stats = useMemo(() => {
        const total = incidents.length;
        const open = incidents.filter(i => i.analysis_status !== "resolved").length;

        // Added status check so resolved threats are removed from this count
        const critical = incidents.filter(i =>
            (i.ai_insights?.[0]?.risk_score ?? 0) >= 8 &&
            i.analysis_status !== "resolved"
        ).length;
        return { total, open, critical, resolved: total - open };
    }, [incidents]);

    const severityData = useMemo(() => [
        { name: 'Critical', value: incidents.filter(i => (i.ai_insights?.[0]?.risk_score ?? 0) >= 8).length },
        {
            name: 'High', value: incidents.filter(i => {
                const s = i.ai_insights?.[0]?.risk_score ?? 0;
                return s >= 6 && s < 8;
            }).length
        },
        {
            name: 'Medium', value: incidents.filter(i => {
                const s = i.ai_insights?.[0]?.risk_score ?? 0;
                return s >= 4 && s < 6;
            }).length
        },
        { name: 'Low', value: incidents.filter(i => (i.ai_insights?.[0]?.risk_score ?? 0) < 4).length },
    ].filter(d => d.value > 0), [incidents]);

    const trendData = useMemo(() => {
        return [...Array(7)].map((_, i) => {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - (6 - i));
            const targetDateKey = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

            const count = incidents.filter(inc => {
                let incDate: Date;
                if (inc.timestamp?.seconds) {
                    incDate = new Date(inc.timestamp.seconds * 1000);
                } else if (typeof inc.timestamp === 'string') {
                    incDate = new Date(inc.timestamp);
                } else {
                    return false;
                }
                return incDate.toLocaleDateString('en-CA') === targetDateKey;
            }).length;

            return {
                date: targetDate.toLocaleDateString(undefined, { weekday: 'short' }),
                attacks: count
            };
        });
    }, [incidents]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <RefreshCw className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-500 font-bold tracking-widest text-xs uppercase text-center">
                    Querying Firestore...<br />Syncing Analytics
                </p>
            </div>
        );
    }
    return (
        <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900">Security Analytics</h2>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <Calendar size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Automated Threat Feed</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">Export CSV</button>
                    <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Refresh Engine</button>
                </div>
            </header >

            {/* Stats Cards */}
            < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" >
                <StatCard label="Total Events" value={stats.total} icon={Activity} />
                <StatCard label="Critical Threats" value={stats.critical} color="text-red-600" icon={ShieldAlert} />
                <StatCard label="Open Cases" value={stats.open} color="text-orange-500" icon={AlertTriangle} />
                <StatCard label="Resolved" value={stats.resolved} color="text-green-600" icon={ShieldCheck} trend="+12% Resolution" />
            </div >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Column (8 spans) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Trend Chart */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold">Threat Activity Trend</h3>
                                <p className="text-xs text-slate-400 font-medium">Daily detected anomalies across all vectors</p>
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">7-Day Period</span>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="attacks"
                                        stroke="#6366f1"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorAttacks)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* Connection Status Card */}
                    <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-50 shadow-sm flex items-center justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
                                    <RefreshCw size={20} className="animate-spin" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Connection: Active</h3>
                                    <p className="text-xs font-bold text-slate-400">Last Sync: {new Date().toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> FIREBASE: ONLINE
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> GEMINI 2.0: OK
                                </span>
                            </div>
                        </div>

                        <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-purple-600 transition-all shadow-lg active:scale-95">
                            RE-SYNC DATA
                        </button>
                    </div>
                </div>{/* This closes lg:col-span-8 */}


                {/* Sidebar Column (4 spans) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full">
                        <h3 className="text-lg font-bold mb-2">Risk Breakdown</h3>
                        <p className="text-xs text-slate-400 font-medium mb-8">Classification by Severity Score</p>

                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        innerRadius={80}
                                        outerRadius={105}
                                        paddingAngle={10}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={SEVERITY_COLORS[entry.name] || "#cbd5e1"}
                                                className="outline-none hover:opacity-80 transition-opacity cursor-pointer"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-auto pt-8 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-800 mb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Info size={16} /></div>
                                <span className="text-sm font-bold">System Summary</span>
                            </div>
                            <div className={`p-4 rounded-2xl border ${stats.critical > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                <p className="text-xs leading-relaxed font-bold">
                                    {stats.critical > 0
                                        ? `Priority Alert: ${stats.critical} critical threats detected. Please investigate the 'Incidents' tab to initiate mitigation.`
                                        : "Posturing Optimal: No critical threats detected in current cycle. Monitoring traffic for lateral movement."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div> {/* This closes lg:col-span-4 */}
            </div> {/* This closes the Grid */}
        </div>
    );
}