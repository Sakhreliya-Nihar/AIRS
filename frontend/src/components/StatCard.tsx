interface StatCardProps {
    label: string;
    value: string | number;
}

function StatCard({ label, value }: StatCardProps) {
    return (
        <div className="bg-white shadow rounded-xl p-4">
            <p className="text-gray-500 text-sm">{label}</p>
            <p className="text-3xl font-semibold mt-2">{value}</p>
        </div>
    );
}

export default StatCard;
