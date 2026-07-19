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
    analysis_status: "completed" | "pending" | "ignored_low_risk";
    timestamp?: {
        seconds: number;
    };

}

/* ---------- Component ---------- */

export default function Incidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:8000/api/incidents")
            .then(res => res.json())
            .then((data: Incident[]) => {
                setIncidents(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load incidents", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <p className="p-6">Loading incidents...</p>;
    }

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-semibold">Incidents</h2>

            {incidents.length === 0 && (
                <p className="text-gray-500">No incidents detected.</p>
            )}

            <div className="space-y-4">
                {incidents.map(item => {
                    const ai = item.ai_insights?.[0];

                    const riskScore = ai?.risk_score ?? 0;

                    const riskColor =
                        riskScore >= 7
                            ? "border-red-500"
                            : riskScore >= 4
                                ? "border-yellow-400"
                                : "border-green-400";

                    return (
                        <div
                            key={item.id}
                            className={`bg-white shadow rounded-xl p-5 border-l-4 ${riskColor}`}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500">
                                    {item.timestamp
                                        ? new Date(item.timestamp.seconds * 1000).toLocaleString()
                                        : "—"}
                                </span>

                                <span
                                    className={`px-3 py-1 text-xs rounded-full ${item.analysis_status === "completed"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                >
                                    {item.analysis_status}
                                </span>
                            </div>

                            {/* Log text */}
                            <pre className="font-mono text-sm bg-gray-50 p-3 rounded mb-3 whitespace-pre-wrap">
                                {item.event.raw_sanitised_text}
                            </pre>

                            {/* AI Output */}
                            {ai && (
                                <>
                                    <p className="font-semibold">
                                        Risk Score:{" "}
                                        <span className="text-red-600">{riskScore}/10</span>
                                    </p>

                                    <p className="mt-2">{ai.summary}</p>

                                    <p className="mt-1 text-sm text-gray-600">
                                        Recommendation: {ai.recommendation}
                                    </p>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}