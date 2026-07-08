import StatCard from "../components/StatCard";
function Analytics() {
    return (
        <div className="p-6 space-y-6">
            <h2 className="text 2x1 font-semibold">Analytics Overview</h2>

            {/* Grid for analytics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard label="Total Incidents" value="128" />
                <StatCard label="Critical Threats" value="12" />
                <StatCard label="Open Cases" value="7" />
                <StatCard label="Resolved" value="109" />

            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-xl p-6 h-[300px]">
                    Weekly Attack Trends (Chart Here)
                </div>

                <div className="bg-white shadow rounded-xl p-6 h-[300px]">
                    Severity Distribution (Chart Here)
                </div>
            </div>
        </div>
    );

}

export default Analytics;
