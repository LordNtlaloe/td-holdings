interface DashboardCardProps {
    icon: React.ReactNode;
    content: number;
    title: string;
    metrics: string;
    className?: string;
    bgClass?: string; 
}

export default function DashboardCard({ icon, content, title, metrics, className, bgClass }: DashboardCardProps) {
    return (
        <div className={`relative flex flex-col bg-clip-border rounded-xl bg-[#2A2A2A] text-white shadow-lg shadow-gray-800/50 p-4 h-full w-full ${className}`}>
            <div className={`bg-clip-border mx-4 rounded-xl overflow-hidden text-white shadow-lg absolute -mt-2 -ml-2 grid h-16 w-16 place-items-center ${bgClass}`}>
                {icon}
            </div>
            <div className="pt-12 text-right">
                <p className="text-sm text-gray-300">{title}</p>
                <h4 className="text-2xl font-semibold text-white">{content}</h4>
            </div>
            <div className="border-t border-gray-700 pt-2">
                <p className="text-base text-gray-400">
                    <strong className="text-red-400">{metrics}</strong> than yesterday
                </p>
            </div>
        </div>
    );
}
