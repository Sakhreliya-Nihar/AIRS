interface StatCardProps {
    label: string;
    value: string | number;
    color?: string; // Added optional colour prop
}

function StatCard({ label, value, color = "text-black" }: StatCardProps) {
    return (
        <div className="bg-white shadow rounded-xl p-4 border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>
                {value}
            </p>
        </div>
    );
}

export default StatCard;
