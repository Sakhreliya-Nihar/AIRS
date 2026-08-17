interface StatCardProps { // Defines the props expected by the StatCard component.
    label: string; // The title or description of the statistic (e.g., "Total Users")
    value: string | number; // The actual numeric or string value to display
    color?: string; // Optional Tailwind CSS text color class (e.g., "text-green-500"
}


// reusable UI component that displays a single statistic in a styled card.

function StatCard({ label, value, color = "text-black" }: StatCardProps) {
    return (
        // Outer container: white background, light shadow, rounded corners, and a subtle border
        <div className="bg-white shadow rounded-xl p-4 border border-gray-100">
            {/* Label: smaller, muted text above the main value */}
            <p className="text-gray-500 text-sm font-medium">{label}</p>
            {/* Value: large, bold text. Applies the custom color class if provided, otherwise defaults to black */}
            <p className={`text-3xl font-bold mt-2 ${color}`}>
                {value}
            </p>
        </div>
    );
}
