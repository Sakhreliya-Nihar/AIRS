import { useEffect, useState } from "react";

/* ---------- Types ---------- */

interface AIInsight {
    summary: string;
    recommendation: string;
    risk_score: number;
}

interface IncidentEvent {
    event_id: string;
    raw_sanitised_text: string;
    original_filename: string;
    local_timestamp: string;
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

    useEffect(() => {
        fetchIncidents();
    }, []);

    const fetchIncidents = () => {
        fetch("http://localhost:8000/api/incidents")
            .then(res) => res.json())
            .then((data: Incident[]) => {
                const sorted = data.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || new Date(a.timestamp).getTime() || 0;
                    const timeB = b.timestamp?.seconds || new Date(b.timestamp).getTime() || 0;
                    return timeB - timeA;
                });
                setIncidents(sorted);
                setLoading(false);
            })
        .catch(err) => {
        console.error("Failed to load incidents", err);
        setLoading(false);
    });
};

/* ---------- Action Handlers ---------- */
const handleMarkResolved = async (docId: string) => {
    try {
        const res = await fetch(`http://localhost:8000/api/incidents/${docId}/resolve`, {
            method: 'PATCH',
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
            headers: { 'Content-Type': 'application/json' },
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-50">
                        <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Technical Log Entry</h3>
                        <pre className="text-[11px] font-mono bg-gray-900 text-green-400 p-5 rounded-xl overflow-auto max-h-64 shadow-inner">
                            {selectedIncident.event.raw_sanitised_text}
                        </pre>
                    </div>

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
        <h2 className="text-3xl font-black text-gray-800 tracking-tighter">INCIDENT LOG</h2>

        <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-50 overflow-hidden">
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
                    {incidents.map((item) => {
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
        </div>
    </div>
);
}