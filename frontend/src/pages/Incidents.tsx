import { useEffect, useState, useMemo } from "react";
import { Search, Filter, X, Calendar, AlertTriangle, Shield, Network, FileDown, ClipboardList, ShieldCheck, UserCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const API_KEY = import.meta.env.VITE_API_KEY

/* ---------- Types ---------- */
interface AIInsight {
    summary: string;
    mitigation_steps: string[];
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
    is_verified?: boolean;
    completed_steps?: number[];
    assigned_to?: string;
}

interface TeamMember {
    id: string; // Firestore document ID
    name: string;
    email?: string;
}

export default function Incidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState("");
    const [viewMode, setViewMode] = useState<string>("details");
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [showFilters, setShowFilters] = useState(false);

    // Consolidated useEffect: Fetches both incidents and users on load
    useEffect(() => {
        console.log("Using API Key:", API_KEY);
        fetchIncidents();
        fetchTeamMembers();
    }, []);

    // Reset view mode when selecting a new incident
    useEffect(() => {
        if (selectedIncident) setViewMode("details");
    }, [selectedIncident]);

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/users", {
                headers: {
                    "X-API-Key": API_KEY
                }
            });
            if (!res.ok) throw new Error("Failed to fetch users");

            const data: TeamMember[] = await res.json();
            setTeamMembers(data);
        } catch (err) {
            console.error("Failed to load team members", err);
        }
    };
    // Linking Listener 
    useEffect(() => {
        const handleDeepLink = () => {
            // Grab the ID from the URL (removing the # symbol)
            const hashId = window.location.hash.replace('#', '');

            if (hashId && incidents.length > 0) {
                const foundIncident = incidents.find(inc => inc.id === hashId);
                if (foundIncident) {
                    // Auto-open the incident!
                    setSelectedIncident(foundIncident);

                    // Clean up the URL so it doesn't get stuck there
                    window.history.replaceState(null, '', window.location.pathname);
                }
            }
        };

        // Run on initial load/incident update
        handleDeepLink();

        // Listen for hash changes if they are already ON the Incidents tab
        window.addEventListener('hashchange', handleDeepLink);
        return () => window.removeEventListener('hashchange', handleDeepLink);
    }, [incidents]);

    // Fixed Assignment Handler
    const handleAssignUser = async (docId: string, userId: string) => {
        if (!selectedIncident) return;

        // 1. Optimistic Update (Update UI immediately)
        const updatedIncident = { ...selectedIncident, assigned_to: userId };
        setSelectedIncident(updatedIncident);
        setIncidents(prev => prev.map(inc => inc.id === docId ? updatedIncident : inc));

        // 2. Send to API
        try {
            const res = await fetch(`http://localhost:8000/api/incidents/${docId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    "X-API-Key": API_KEY
                },
                body: JSON.stringify({ assigned_to: userId })
            });

            if (!res.ok) {
                throw new Error("Failed to assign user");
            }
        } catch (err) {
            console.error("Failed to assign user", err);
        }
    };

    const handleToggleStep = async (docId: string, stepIndex: number) => {
        if (!selectedIncident) return;

        // 1. Calculate the new state locally
        const currentSteps = selectedIncident.completed_steps || [];
        const isCompleted = currentSteps.includes(stepIndex);

        let newSteps;
        if (isCompleted) {
            newSteps = currentSteps.filter(i => i !== stepIndex); // Uncheck
        } else {
            newSteps = [...currentSteps, stepIndex]; // Check
        }

        // 2. Optimistic Update (Update UI immediately)
        const updatedIncident = { ...selectedIncident, completed_steps: newSteps };
        setSelectedIncident(updatedIncident); // Update selected view
        setIncidents(prev => prev.map(inc => inc.id === docId ? updatedIncident : inc)); // Update list view

        // 3. Send to API
        try {
            await fetch(`http://localhost:8000/api/incidents/${docId}/mitigate`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    "X-API-Key": API_KEY
                },
                body: JSON.stringify({ completed_steps: newSteps })
            });
        } catch (err) {
            console.error("Failed to save progress", err);
        }
    };

    const fetchIncidents = () => {
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

    /* ---------- PDF Report Generation ---------- */
    const generatePDFReport = () => {
        try {
            console.log("Starting PDF generation...");

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            let yPos = margin;

            // Helper function to add page breaks
            const checkPageBreak = (heightNeeded: number) => {
                if (yPos + heightNeeded > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                    return true;
                }
                return false;
            };

            // Header
            doc.setFillColor(124, 58, 237); // Purple
            doc.rect(0, 0, pageWidth, 35, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('Incident Report', margin, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const reportDate = new Date().toLocaleString();
            doc.text(`Generated: ${reportDate}`, margin, 28);

            yPos = 50;

            // Summary Section
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Executive Summary', margin, yPos);
            yPos += 10;

            const totalIncidents = filteredIncidents.length;
            const criticalCount = filteredIncidents.filter(i => (i.ai_insights?.[0]?.risk_score ?? 0) >= 8).length;
            const highCount = filteredIncidents.filter(i => {
                const score = i.ai_insights?.[0]?.risk_score ?? 0;
                return score >= 6 && score < 8;
            }).length;
            const resolvedCount = filteredIncidents.filter(i => i.analysis_status === 'resolved').length;
            const pendingCount = filteredIncidents.filter(i => i.analysis_status === 'pending').length;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total Incidents: ${totalIncidents}`, margin, yPos);
            yPos += 6;
            doc.text(`Critical Severity: ${criticalCount}`, margin, yPos);
            yPos += 6;
            doc.text(`High Severity: ${highCount}`, margin, yPos);
            yPos += 6;
            doc.text(`Resolved: ${resolvedCount}`, margin, yPos);
            yPos += 6;
            doc.text(`Pending: ${pendingCount}`, margin, yPos);
            yPos += 15;

            // Incident Details Table
            checkPageBreak(20);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Incident Details', margin, yPos);
            yPos += 10;

            // Prepare table data
            const tableData = filteredIncidents.map(incident => {
                const riskScore = incident.ai_insights?.[0]?.risk_score ?? 0;
                const severity = riskScore >= 8 ? "CRITICAL" : riskScore >= 6 ? "HIGH" : riskScore >= 4 ? "MEDIUM" : riskScore > 0 ? "LOW" : "PENDING";
                const integrity = incident.is_verified ? "VERIFIED" : "TAMPERED";
                const timestamp = formatTimestamp(incident.timestamp);
                const summary = incident.ai_insights?.[0]?.summary || 'N/A';

                return [
                    incident.event.event_id.substring(0, 8),
                    severity,
                    integrity,
                    incident.analysis_status.toUpperCase(),
                    timestamp,
                    summary.length > 50 ? summary.substring(0, 47) + '...' : summary
                ];
            });

            autoTable(doc, {
                startY: yPos,
                head: [['ID', 'Severity', 'Integrity', 'Status', 'Timestamp', 'Summary']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [124, 58, 237],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [50, 50, 50]
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 22 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 'auto' }
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { left: margin, right: margin }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;

            // Detailed Incident Analysis (Top 5 Critical/High)
            const criticalIncidents = filteredIncidents
                .filter(i => (i.ai_insights?.[0]?.risk_score ?? 0) >= 6)
                .slice(0, 5);

            if (criticalIncidents.length > 0) {
                checkPageBreak(20);
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('Critical Incident Analysis', margin, yPos);
                yPos += 10;

                criticalIncidents.forEach((incident) => {
                    checkPageBreak(60);

                    // Incident Header
                    doc.setFillColor(240, 240, 240);
                    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 12, 'F');

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(124, 58, 237);
                    doc.text(`Incident #${incident.event.event_id}`, margin + 3, yPos);
                    yPos += 10;

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);

                    // Risk Score
                    const riskScore = incident.ai_insights?.[0]?.risk_score ?? 0;
                    doc.text(`Risk Score: ${riskScore}/10`, margin + 3, yPos);
                    yPos += 6;

                    // Timestamp
                    doc.text(`Detected: ${formatTimestamp(incident.timestamp)}`, margin + 3, yPos);
                    yPos += 6;

                    // Summary
                    doc.setFont('helvetica', 'bold');
                    doc.text('Summary:', margin + 3, yPos);
                    yPos += 5;
                    doc.setFont('helvetica', 'normal');

                    const summary = incident.ai_insights?.[0]?.summary || 'No summary available';
                    const summaryLines = doc.splitTextToSize(summary, pageWidth - 2 * margin - 6);
                    summaryLines.forEach((line: string) => {
                        checkPageBreak(5);
                        doc.text(line, margin + 3, yPos);
                        yPos += 5;
                    });
                    yPos += 3;

                    // User Notes
                    if (incident.user_notes && incident.user_notes.length > 0) {
                        yPos += 3;
                        doc.setFont('helvetica', 'bold');
                        doc.text('Notes:', margin + 3, yPos);
                        yPos += 5;
                        doc.setFont('helvetica', 'normal');

                        incident.user_notes.forEach(note => {
                            const noteLines = doc.splitTextToSize(`• ${note}`, pageWidth - 2 * margin - 6);
                            noteLines.forEach((line: string) => {
                                checkPageBreak(5);
                                doc.text(line, margin + 3, yPos);
                                yPos += 5;
                            });
                        });
                    }

                    yPos += 10;
                });
            }

            // Footer on each page
            const pageCount = doc.internal.pages.length - 1;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Page ${i} of ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
                doc.text(
                    'Incident Management Dashboard - Confidential',
                    margin,
                    pageHeight - 10
                );
            }

            // Save PDF
            const filename = `incident-report-${new Date().toISOString().split('T')[0]}.pdf`;
            console.log("Saving PDF as:", filename);
            doc.save(filename);
            console.log("PDF generation complete!");

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

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

    const activeFilterCount = severityFilter.length + statusFilter.length + (dateRange.start ? 1 : 0) + (dateRange.end ? 1 : 0);

    const toggleSeverityFilter = (severity: string) => {
        setSeverityFilter(prev =>
            prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
        );
    };

    const toggleStatusFilter = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const clearAllFilters = () => {
        setSearchQuery("");
        setSeverityFilter([]);
        setStatusFilter([]);
        setDateRange({ start: "", end: "" });
    };

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return "N/A";
        try {
            const date = timestamp?.seconds
                ? new Date(timestamp.seconds * 1000)
                : new Date(timestamp);
            return date.toLocaleString();
        } catch {
            return "Invalid Date";
        }
    };

    const getSeverityStyles = (score: number) => {
        if (score >= 8) return "bg-red-100 border-red-300 text-red-700";
        if (score >= 6) return "bg-orange-100 border-orange-300 text-orange-700";
        if (score >= 4) return "bg-yellow-100 border-yellow-300 text-yellow-700";
        if (score > 0) return "bg-green-100 border-green-300 text-green-700";
        return "bg-gray-100 border-gray-300 text-gray-700";
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "resolved":
                return "bg-green-100 border-green-300 text-green-700";
            case "completed":
                return "bg-blue-100 border-blue-300 text-blue-700";
            case "pending":
                return "bg-yellow-100 border-yellow-300 text-yellow-700";
            default:
                return "bg-gray-100 border-gray-300 text-gray-700";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-bold">Loading incidents...</p>
                </div>
            </div>
        );
    }

    if (selectedIncident) {
        const riskScore = selectedIncident.ai_insights?.[0]?.risk_score ?? 0;
        const severityLabel = getSeverityLabel(riskScore);

        return (
            <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedIncident(null)}
                            className="bg-white px-6 py-3 rounded-xl shadow-md border-2 border-gray-100 text-sm font-black text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            ← Back to List
                        </button>
                        <h1 className="text-4xl font-black text-gray-800">
                            Incident Investigation
                        </h1>
                    </div>

                    {/* Investigation Panel */}
                    <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 p-8 space-y-8">
                        <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${selectedIncident.is_verified
                            ? "bg-green-50 border-green-100 text-green-700"
                            : "bg-red-50 border-red-100 text-red-700"
                            }`}>
                            {selectedIncident.is_verified ? (
                                <Shield size={20} />
                            ) : (
                                <AlertTriangle size={20} className="animate-pulse" />
                            )}
                            <span className="text-xs font-black uppercase tracking-widest">
                                {selectedIncident.is_verified
                                    ? "Integrity Verified: Data is cryptographically authentic"
                                    : "Security Alert: Log integrity check failed - Potential tampering detected"}
                            </span>
                        </div>
                        {/* Incident Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800 mb-2">
                                    #{selectedIncident.event.event_id}
                                </h2>
                                <p className="text-sm text-gray-500 font-bold">
                                    {formatTimestamp(selectedIncident.timestamp)}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <span className={`px-4 py-2 rounded-xl text-xs font-black border-2 ${getSeverityStyles(riskScore)}`}>
                                    {severityLabel.toUpperCase()}
                                </span>
                                <span className={`px-4 py-2 rounded-xl text-xs font-black border-2 uppercase ${getStatusStyles(selectedIncident.analysis_status)}`}>
                                    {selectedIncident.analysis_status}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                            <UserCircle size={20} className="text-gray-400" />
                            <label className="text-sm font-bold text-gray-600">Assign To:</label>
                            <select
                                value={selectedIncident.assigned_to || ""}
                                onChange={(e) => handleAssignUser(selectedIncident.id, e.target.value)}
                                className="flex-1 bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-purple-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Unassigned</option>
                                {/* Map over the dynamic state instead of the hardcoded array */}
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} {member.email ? `(${member.email})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Mitigation / Details Switcher */}
                        {viewMode === "mitigation" ? (
                            /* --- MITIGATION VIEW --- */
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-100 mb-6">
                                    <h3 className="text-lg font-black text-indigo-900 mb-2 flex items-center gap-2">
                                        <ShieldCheck className="text-indigo-600" />
                                        Response Playbook
                                    </h3>
                                    <p className="text-sm text-indigo-700 mb-4">
                                        Follow these steps to contain and remediate the threat. Tick them off as you go.
                                    </p>

                                    <div className="space-y-3">
                                        {selectedIncident.ai_insights?.[0]?.mitigation_steps?.map((step, idx) => {
                                            // Check if this specific index is inside completed_steps array
                                            const isChecked = selectedIncident.completed_steps?.includes(idx) || false;

                                            return (
                                                <label
                                                    key={idx}
                                                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm ${isChecked
                                                        ? "bg-indigo-100 border-indigo-300" // Darker style when checked
                                                        : "bg-white border-indigo-50 hover:border-indigo-200"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked} // Controlled component
                                                        onChange={() => handleToggleStep(selectedIncident.id, idx)} // Call our new handler
                                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className={`text-sm font-medium leading-relaxed ${isChecked ? "text-indigo-800 line-through decoration-indigo-400" : "text-slate-700"
                                                        }`}>
                                                        {step}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setViewMode("details")}
                                    className="text-slate-500 font-bold text-xs hover:text-indigo-600 flex items-center gap-2"
                                >
                                    ← Back to Incident Details
                                </button>
                            </div>
                        ) : (
                            /* --- DETAILS VIEW (Wrapped) --- */
                            <>
                                {/* AI Analysis */}
                                {selectedIncident.ai_insights && selectedIncident.ai_insights[0] && (
                                    <div className="space-y-6">
                                        {/* Risk Score */}
                                        <div>
                                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3">Risk Score</h3>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${riskScore >= 8 ? 'bg-red-500' :
                                                            riskScore >= 6 ? 'bg-orange-500' :
                                                                riskScore >= 4 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${riskScore * 10}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-2xl font-black text-gray-800">{riskScore}/10</span>
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div>
                                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3">AI Summary</h3>
                                            <p className="text-gray-700 leading-relaxed">{selectedIncident.ai_insights[0].summary}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Raw Event Data */}
                                <div>
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3">Raw Event Data</h3>
                                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                                        <p className="text-xs font-mono text-gray-600 whitespace-pre-wrap">{selectedIncident.event.raw_sanitised_text}</p>
                                    </div>
                                </div>

                                {/* Technical Details */}
                                {selectedIncident.event.technical_details && (
                                    <div>
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Network size={16} />
                                            Technical Details
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedIncident.event.technical_details.original_internal_ips && (
                                                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100">
                                                    <p className="text-xs font-black text-blue-600 mb-2">Internal IPs</p>
                                                    <p className="text-xs font-mono text-gray-700">{selectedIncident.event.technical_details.original_internal_ips.join(', ')}</p>
                                                </div>
                                            )}
                                            {selectedIncident.event.technical_details.original_external_ips && (
                                                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-100">
                                                    <p className="text-xs font-black text-purple-600 mb-2">External IPs</p>
                                                    <p className="text-xs font-mono text-gray-700">{selectedIncident.event.technical_details.original_external_ips.join(', ')}</p>
                                                </div>
                                            )}
                                            {selectedIncident.event.technical_details.original_macs && (
                                                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-100">
                                                    <p className="text-xs font-black text-green-600 mb-2">MAC Addresses</p>
                                                    <p className="text-xs font-mono text-gray-700">{selectedIncident.event.technical_details.original_macs.join(', ')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* User Notes */}
                                <div>
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3">Investigation Notes</h3>
                                    {selectedIncident.user_notes && selectedIncident.user_notes.length > 0 ? (
                                        <div className="space-y-2 mb-4">
                                            {selectedIncident.user_notes.map((note, idx) => (
                                                <div key={idx} className="bg-yellow-50 border-2 border-yellow-100 rounded-xl p-3">
                                                    <p className="text-sm text-gray-700">{note}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic mb-4">No notes yet</p>
                                    )}

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSaveNote(selectedIncident.id)}
                                            placeholder="Add investigation note..."
                                            className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl text-sm focus:border-purple-400 outline-none"
                                        />
                                        <button
                                            onClick={() => handleSaveNote(selectedIncident.id)}
                                            className="bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-black hover:bg-purple-700 transition-all"
                                        >
                                            Add Note
                                        </button>
                                        <button
                                            onClick={() => setViewMode("mitigation")}
                                            className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-2 ${viewMode === "mitigation"
                                                ? "bg-indigo-600 text-white border-indigo-600"
                                                : "bg-white text-indigo-600 border-indigo-100 hover:border-indigo-300"
                                                }`}
                                        >
                                            <ClipboardList size={16} />
                                            MITIGATION PLAN
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                {selectedIncident.analysis_status !== 'resolved' && (
                                    <div className="pt-6 border-t-2 border-gray-100">
                                        <button
                                            onClick={() => handleMarkResolved(selectedIncident.id)}
                                            className="w-full bg-green-600 text-white py-4 rounded-xl font-black hover:bg-green-700 transition-all"
                                        >
                                            Mark as Resolved
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-gray-800 mb-2">
                            Security Incidents
                        </h1>
                        <p className="text-gray-500 font-bold">Monitor and investigate security events</p>
                    </div>
                    <button
                        onClick={generatePDFReport}
                        className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg"
                    >
                        <FileDown size={18} />
                        Generate Report
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="space-y-4">
                    <div className="flex gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search incidents by ID, summary, or notes..."
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
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Integrity</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignee</th>
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
                                                {item.is_verified ? (
                                                    <div className="flex items-center gap-2 text-green-600">
                                                        <Shield size={16} />
                                                        <span className="text-[10px] font-black uppercase">Verified</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-red-500 animate-pulse">
                                                        <AlertTriangle size={16} />
                                                        <span className="text-[10px] font-black uppercase">Tampered</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black border-2 uppercase ${getStatusStyles(item.analysis_status)}`}>
                                                    {item.analysis_status}
                                                </span>
                                            </td>
                                            <td className="p-5 text-[11px] font-bold text-gray-600">
                                                {item.assigned_to
                                                    ? teamMembers.find(m => m.id === item.assigned_to)?.name || "Unknown User"
                                                    : <span className="text-gray-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="p-5 text-xs font-bold text-gray-500">{formatTimestamp(item.timestamp)}</td>
                                            <td className="p-5 text-[11px] text-gray-400 font-mono truncate max-w-62.5 italic">{item.event.raw_sanitised_text}</td>
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
        </div>
    );