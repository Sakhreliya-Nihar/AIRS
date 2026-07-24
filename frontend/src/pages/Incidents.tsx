import { useEffect, useState, useMemo } from "react";
import { Search, Filter, X, Calendar, AlertTriangle, Wifi, Shield, Network } from "lucide-react";
const API_KEY = import.meta.env.VITE_API_KEY

/* ---------- Types ---------- */
interface AIInsight {
    summary: string;
    recommendation: string;
    risk_score: number;
}

interface TechnicalDetails {
    original_internal_ips?: string[];
    original_external_ips?: string[];
    original_macs?: string[];
    ip_count?: number;
}

interface IncidentEvent {
    event_id: string;
    raw_sanitised_text: string;
    original_filename: string;
    local_timestamp: string;
    technical_details?: TechnicalDetails;
}

interface Incident {
    id: string;
    event: IncidentEvent;
    ai_insights: AIInsight[] | null;
    analysis_status: "completed" | "pending" | "ignored_low_risk" | "resolved";
    timestamp?: any;
    user_notes?: string[];
}

export default function Incidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState("");

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        // --- DEBUGGING: Check your browser console to see if the key exists ---
        console.log("Using API Key:", API_KEY);
        fetchIncidents();
    }, []);

    const fetchIncidents = () => {
        // --- SYNTAX FIX: Headers must be inside the fetch options object ---
        fetch("http://localhost:8000/api/incidents", {
            headers: {
                "X-API-Key": API_KEY
            }
        })
            .then((res) => {
                if (res.status === 403) {
                    throw new Error("403 Forbidden: API Key invalid or missing");
                }
                return res.json();
            })
            .then((data: Incident[]) => {
                const sorted = data.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || new Date(a.timestamp).getTime() || 0;
                    const timeB = b.timestamp?.seconds || new Date(b.timestamp).getTime() || 0;
                    return timeB - timeA;
                });
                setIncidents(sorted);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load incidents", err);
                setLoading(false);
            });
    };

    /* ---------- Action Handlers ---------- */
    const handleMarkResolved = async (docId: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/incidents/${docId}/resolve`, {
                method: 'PATCH',
                headers: {
                    "X-API-Key": API_KEY
                }
            });
            if (res.ok) {
                setIncidents(prev => prev.map(inc => inc.id === docId ? { ...inc, analysis_status: 'resolved' } : inc));
                setSelectedIncident(prev => prev ? { ...prev, analysis_status: 'resolved' } : null);
            }
        } catch (err) { console.error(err); }
    };

    const handleSaveNote = async (docId: string) => {
        if (!note.trim()) return;
        try {
            const res = await fetch(`http://localhost:8000/api/incidents/${docId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "X-API-Key": API_KEY
                },
                body: JSON.stringify({ note })
            });
            if (res.ok) {
                setIncidents(prev => prev.map(inc =>
                    inc.id === docId ? { ...inc, user_notes: [...(inc.user_notes || []), note] } : inc
                ));
                setSelectedIncident(prev => prev ? { ...prev, user_notes: [...(prev.user_notes || []), note] } : null);
                setNote("");
            }
        } catch (err) { console.error(err); }
    };

    // ... (Keep the rest of your filter logic / JSX exactly as it was) ...
    // (I have omitted the rest of the file for brevity, but the logic above replaces your top section)

    // You need to paste the rest of your component here (Filter logic and Return statement)
    // ...

    /* ---------- Filter and Search Logic ---------- */
    const getSeverityLabel = (score: number): string => {
        if (score >= 8) return "Critical";
        if (score >= 6) return "High";
        if (score >= 4) return "Medium";
        if (score > 0) return "Low";
        return "Pending";
    };

    const filteredIncidents = useMemo(() => {
        return incidents.filter((incident) => {
            const riskScore = incident.ai_insights?.[0]?.risk_score ?? 0;
            const severity = getSeverityLabel(riskScore);
            const summary = incident.ai_insights?.[0]?.summary || "";
            const eventText = incident.event.raw_sanitised_text || "";

            // Search query filter (searches ID, summary, and event text)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesId = incident.event.event_id.toLowerCase().includes(query);
                const matchesSummary = summary.toLowerCase().includes(query);
                const matchesEvent = eventText.toLowerCase().includes(query);
                const matchesNotes = incident.user_notes?.some(note => note.toLowerCase().includes(query));

                if (!matchesId && !matchesSummary && !matchesEvent && !matchesNotes) {
                    return false;
                }
            }

            // Severity filter
            if (severityFilter.length > 0 && !severityFilter.includes(severity)) {
                return false;
            }

            // Status filter
            if (statusFilter.length > 0 && !statusFilter.includes(incident.analysis_status)) {
                return false;
            }

            // Date range filter
            if (dateRange.start || dateRange.end) {
                const incidentDate = incident.timestamp?.seconds
                    ? new Date(incident.timestamp.seconds * 1000)
                    : new Date(incident.timestamp);

                if (!isNaN(incidentDate.getTime())) {
                    if (dateRange.start) {
                        const startDate = new Date(dateRange.start);
                        if (incidentDate < startDate) return false;
                    }
                    if (dateRange.end) {
                        const endDate = new Date(dateRange.end);
                        endDate.setHours(23, 59, 59, 999);
                        if (incidentDate > endDate) return false;
                    }
                }
            }

            return true;
        });
    }, [incidents, searchQuery, severityFilter, statusFilter, dateRange]);

    /* ---------- Filter Toggle Handlers ---------- */
    const toggleSeverityFilter = (severity: string) => {
        setSeverityFilter(prev =>
            prev.includes(severity)
                ? prev.filter(s => s !== severity)
                : [...prev, severity]
        );
    };

    const toggleStatusFilter = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const clearAllFilters = () => {
        setSearchQuery("");
        setSeverityFilter([]);
        setStatusFilter([]);
        setDateRange({ start: "", end: "" });
    };

    const activeFilterCount =
        (searchQuery ? 1 : 0) +
        severityFilter.length +
        statusFilter.length +
        (dateRange.start || dateRange.end ? 1 : 0);

    /* ---------- Helpers ---------- */
    const formatTimestamp = (ts: any) => {
        if (!ts) return "No Date";
        if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const parsedDate = new Date(ts);
        return !isNaN(parsedDate.getTime()) ? parsedDate.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Pending...";
    };

    // Returning full hardcoded strings for Tailwind compiler
    const getSeverityStyles = (score: number) => {
        if (score >= 8) return "bg-red-100 text-red-700 border-red-300";      // Critical
        if (score >= 6) return "bg-orange-100 text-orange-700 border-orange-300"; // High
        if (score >= 4) return "bg-yellow-100 text-yellow-700 border-yellow-300"; // Medium
        if (score > 0) return "bg-green-100 text-green-700 border-green-300";   // Low (1-3)
        return "bg-gray-100 text-gray-700 border-gray-300";                     // No Score
    };

    const getStatusStyles = (status: string) => {
        if (status === 'resolved') return "bg-green-100 text-green-700 border-green-300";
        if (status === 'completed') return "bg-blue-100 text-blue-700 border-blue-300";
        return "bg-gray-100 text-gray-700 border-gray-300";
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Incidents...</div>;

    /* ---------- DETAILED VIEW ---------- */
    if (selectedIncident) {
        const ai = selectedIncident.ai_insights?.[0];
        const riskScore = ai?.risk_score ?? 0;
        const techDetails = selectedIncident.event.technical_details;

        const severityLabel = (score: number) => {
            if (score >= 8) return "CRITICAL";
            if (score >= 6) return "HIGH";
            if (score >= 4) return "MEDIUM";
            if (score > 0) return "LOW";
            return "PENDING";
        };

        return (
            <div className="p-8 space-y-6 bg-[#FDFCFE] min-h-screen">
                <div className="flex justify-between items-center">
                    <button onClick={() => setSelectedIncident(null)} className="text-gray-500 hover:text-gray-800 font-bold tracking-tighter uppercase text-xs">
                        ← Back to Log
                    </button>
                    <button
                        onClick={() => handleMarkResolved(selectedIncident.id)}
                        className={`px-6 py-2 rounded-lg font-bold border-2 transition-all ${selectedIncident.analysis_status === 'resolved'
                            ? "bg-green-100 border-green-400 text-green-700"
                            : "bg-purple-600 border-purple-600 text-white hover:bg-purple-700"
                            }`}
                    >
                        {selectedIncident.analysis_status === 'resolved' ? "RESOLVED" : "MARK RESOLVED"}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        {/* Technical Log Entry */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-50">
                            <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Technical Log Entry</h3>
                            <pre className="text-[11px] font-mono bg-gray-900 text-green-400 p-5 rounded-xl overflow-auto max-h-64 shadow-inner">
                                {selectedIncident.event.raw_sanitised_text}
                            </pre>
                        </div>

                        {/* Technical Details - NEW SECTION */}
                        {techDetails && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-50">
                                <div className="flex items-center gap-2 mb-4">
                                    <Network className="text-indigo-600" size={16} />
                                    <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Network Intelligence</h3>
                                </div>

                                <div className="space-y-4">
                                    {/* External IPs */}
                                    {techDetails.original_external_ips && techDetails.original_external_ips.length > 0 && (
                                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Shield className="text-red-600" size={14} />
                                                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-wider">External IPs (Threat Vectors)</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {techDetails.original_external_ips.map((ip, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-mono border border-red-300">
                                                        {ip}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Internal IPs */}
                                    {techDetails.original_internal_ips && techDetails.original_internal_ips.length > 0 && (
                                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Wifi className="text-blue-600" size={14} />
                                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Internal IPs (Your Network)</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {techDetails.original_internal_ips.map((ip, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-mono border border-blue-300">
                                                        {ip}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* MAC Addresses */}
                                    {techDetails.original_macs && techDetails.original_macs.length > 0 && (
                                        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Network className="text-purple-600" size={14} />
                                                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-wider">MAC Addresses (Hardware)</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {techDetails.original_macs.map((mac, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-mono border border-purple-300">
                                                        {mac}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary Stats */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total IPs</p>
                                                <p className="text-xl font-black text-gray-700">{techDetails.ip_count || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Source File</p>
                                                <p className="text-xs font-mono text-gray-600 truncate">{selectedIncident.event.original_filename}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Analyst Notes */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-50">
                            <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Analyst Notes</h3>
                            <div className="space-y-2 mb-4">
                                {selectedIncident.user_notes?.map((n, i) => (
                                    <div key={i} className="text-sm p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400 text-purple-900 italic">
                                        "{n}"
                                    </div>
                                ))}
                            </div>
                            <textarea
                                className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-purple-400 outline-none"
                                rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add investigation details..."
                            />
                            <button onClick={() => handleSaveNote(selectedIncident.id)} className="mt-2 bg-purple-600 text-white px-8 py-2 rounded-xl text-xs font-black hover:bg-purple-700">
                                SAVE NOTE
                            </button>
                        </div>
                    </div>

                    {/* AI Intelligence Report */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-gray-50 flex flex-col min-h-[500px]">
                        <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-8">AI Intelligence Report</h3>
                        <div className="space-y-8 flex-grow">
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Threat Analysis</h4>
                                <p className="text-gray-800 text-sm leading-relaxed font-medium bg-gray-50/50 p-4 rounded-xl border border-gray-100">{ai?.summary}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Recommendation</h4>
                                <p className="text-gray-800 text-sm leading-relaxed font-medium bg-gray-50/50 p-4 rounded-xl border border-gray-100">{ai?.recommendation}</p>
                            </div>
                        </div>
                        <div className={`self-end p-6 rounded-3xl text-center border-2 ${getSeverityStyles(riskScore)}`}>
                            <p className="text-[9px] uppercase font-black opacity-60 mb-1">Risk Score</p>
                            <p className="text-5xl font-black leading-none">{riskScore}</p>
                            <p className="text-[10px] font-black mt-2 opacity-80">{severityLabel(riskScore)}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- TABLE VIEW ---------- */
    return (
        <div className="p-8 space-y-6 bg-[#FDFCFE] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-black text-gray-800 tracking-tighter">INCIDENT LOG</h2>

                {/* Active filter count badge */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-black">
                            {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filters'} Active
                        </span>
                        <button
                            onClick={clearAllFilters}
                            className="text-xs font-bold text-gray-500 hover:text-gray-700 underline"
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* Search and Filter Bar */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by ID, keywords, or summary..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-10 py-3 border-2 border-gray-100 rounded-xl text-sm focus:border-purple-400 outline-none bg-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${showFilters || activeFilterCount > 0
                            ? 'bg-purple-600 text-white'
                            : 'bg-white border-2 border-gray-100 text-gray-700 hover:border-purple-400'
                            }`}
                    >
                        <Filter size={18} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Expanded Filter Panel */}
                {showFilters && (
                    <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 space-y-6">
                        {/* Severity Filters */}
                        <div>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Severity Level</h4>
                            <div className="flex flex-wrap gap-2">
                                {['Critical', 'High', 'Medium', 'Low', 'Pending'].map((severity) => (
                                    <button
                                        key={severity}
                                        onClick={() => toggleSeverityFilter(severity)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all ${severityFilter.includes(severity)
                                            ? severity === 'Critical' ? 'bg-red-100 border-red-300 text-red-700'
                                                : severity === 'High' ? 'bg-orange-100 border-orange-300 text-orange-700'
                                                    : severity === 'Medium' ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                                                        : severity === 'Low' ? 'bg-green-100 border-green-300 text-green-700'
                                                            : 'bg-gray-100 border-gray-300 text-gray-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        {severity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status Filters */}
                        <div>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Status</h4>
                            <div className="flex flex-wrap gap-2">
                                {['completed', 'pending', 'resolved', 'ignored_low_risk'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => toggleStatusFilter(status)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all uppercase ${statusFilter.includes(status)
                                            ? status === 'resolved' ? 'bg-green-100 border-green-300 text-green-700'
                                                : status === 'completed' ? 'bg-blue-100 border-blue-300 text-blue-700'
                                                    : 'bg-gray-100 border-gray-300 text-gray-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        {status.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range Filter */}
                        <div>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Calendar size={14} />
                                Date Range
                            </h4>
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">From</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full px-3 py-2 border-2 border-gray-100 rounded-lg text-sm focus:border-purple-400 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">To</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full px-3 py-2 border-2 border-gray-100 rounded-lg text-sm focus:border-purple-400 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-500">
                    Showing <span className="text-purple-600 font-black">{filteredIncidents.length}</span> of <span className="font-black">{incidents.length}</span> incidents
                </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-50 overflow-hidden">
                {filteredIncidents.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertTriangle className="mx-auto mb-4 text-gray-300" size={48} />
                        <h3 className="text-lg font-black text-gray-400 mb-2">No Incidents Found</h3>
                        <p className="text-sm text-gray-400">Try adjusting your search or filter criteria</p>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearAllFilters}
                                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-100/50 border-b-2 border-gray-50">
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Severity</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Summary</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Investigation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-gray-50">
                            {filteredIncidents.map((item) => {
                                const riskScore = item.ai_insights?.[0]?.risk_score ?? 0;
                                const severityLabel = riskScore >= 8 ? "CRITICAL" : riskScore >= 6 ? "HIGH" : riskScore >= 4 ? "MEDIUM" : riskScore > 0 ? "LOW" : "PENDING";

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-all">
                                        <td className="p-5 text-xs font-mono text-gray-300">#{item.event.event_id}</td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black border-2 ${getSeverityStyles(riskScore)}`}>
                                                {severityLabel}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black border-2 uppercase ${getStatusStyles(item.analysis_status)}`}>
                                                {item.analysis_status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-xs font-bold text-gray-500">{formatTimestamp(item.timestamp)}</td>
                                        <td className="p-5 text-[11px] text-gray-400 font-mono truncate max-w-[250px] italic">{item.event.raw_sanitised_text}</td>
                                        <td className="p-5 text-center">
                                            <button
                                                onClick={() => setSelectedIncident(item)}
                                                className="bg-purple-600 text-white px-5 py-2 rounded-xl text-[10px] font-black hover:bg-purple-700 shadow-md transition-all active:scale-95"
                                            >
                                                INVESTIGATE
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}