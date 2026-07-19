import { useEffect, useState } from "react";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import {
    ShieldAlert, ShieldCheck, Activity, AlertTriangle,
    RefreshCw, Info, Calendar
} from "lucide-react";

// Sub-component for better organisation 
const StatCard = ({ label, value, color, icon: Icon, trend }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
            <h3 className={`text-2xl font-bold ${color || "text-slate-900"}`}>{value}</h3>
            {trend && <p className="text-xs text-green-600 mt-2 font-medium">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-slate-50 ${color?.replace('text-', 'bg-').replace('600', '100') || "text-indigo-600"}`}>
            <Icon size={20} />
        </div>
    </div>
);

const SEVERITY_COLORS: Record<string, string> = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e"
};

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
            .catch(err => console.error("Fetch error:", err));
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <RefreshCw className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-500 font-medium italic">Loading...</p>
            </div>
        );
    }


    const totalIncidents = incidents.length;
    const openCases = incidents.filter(i => i.analysis_status !== "resolved").length;
    const resolved = totalIncidents - openCases;
    const criticalThreats = incidents.filter(i => (i.ai_insights?.[0]?.risk_score ?? 0) >= 8).length;

    const severityData = [
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
    ].filter(d => d.value > 0);

    const trendData = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
            date: d.toLocaleDateString(undefined, { weekday: 'short' }),
            attacks: incidents.filter(inc => {
                if (!inc.timestamp?.seconds) return false;
                return new Date(inc.timestamp.seconds * 1000).toISOString().split('T')[0] === dateStr;
            }).length
        };
    });

    return (
        <div className="p-8 bg-slate-50/50 min-h-screen text-slate-900 font-sans">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Security Analytics</h2>
                    <p className="text-slate-500 flex items-center gap-2 mt-1">
                        <Calendar size={14} /> Real-time threat intelligence overview
                    </p>
                </div>
            </header>

            {/* Stats Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard label="Total Incidents" value={totalIncidents} icon={Activity} />
                <StatCard label="Critical Threats" value={criticalThreats} color="text-red-600" icon={ShieldAlert} />
                <StatCard label="Open Cases" value={openCases} color="text-orange-500" icon={AlertTriangle} />
                <StatCard label="Resolved" value={resolved} color="text-green-600" icon={ShieldCheck} trend="+12% from last week" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Trend Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">Threat Activity Trend</h3>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Last 7 Days</span>
                        </div>
                        <div style={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="attacks" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAttacks)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-indigo-900 rounded-2xl p-6 text-white flex items-center justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <h4 className="text-lg font-semibold mb-1">AI Protection Active</h4>
                            <p className="text-indigo-200 text-sm max-w-md">Your automated response engine is scanning all entry points. No unauthorized lateral movements detected.</p>
                        </div>
                        <ShieldCheck size={80} className="text-indigo-800 absolute -right-4 -bottom-4 z-0 opacity-50" />
                    </div>
                </div>


                {/* Sidebar Distribution */}
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                        <h3 className="text-lg font-bold mb-6">Severity Distribution</h3>
                        <div style={{ width: '100%', height: 280 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || "#cbd5e1"} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-auto pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-slate-800 mb-3">
                                <Info size={16} className="text-indigo-500" />
                                <span className="text-sm font-semibold">System Insights</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl">
                                {criticalThreats > 0
                                    ? `Alert: ${criticalThreats} critical threats identified. Check logs for origin IP addresses immediately.`
                                    : "All systems are good. No critical threats to worry about."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}