// components/reports/ActivityTimeline.tsx
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getInitials } from "./report-utils";

interface Activity {
    id: string;
    userName: string;
    action: string;
    description?: string;
    createdAt: number;
    role?: string;
}

interface ActivityTimelineProps {
    activities: Activity[];
    className?: string;
    limit?: number;
}

export function ActivityTimeline({ activities, className, limit = 10 }: ActivityTimelineProps) {
    const displayed = activities.slice(0, limit);

    if (displayed.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                No recent activity
            </div>
        );
    }

    return (
        <div className={cn("flow-root", className)}>
            <ul className="-mb-8">
                {displayed.map((activity, idx) => (
                    <li key={activity.id}>
                        <div className="relative pb-8">
                            {idx < displayed.length - 1 && (
                                <span
                                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                />
                            )}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-background">
                                        <span className="text-primary text-sm font-semibold">
                                            {getInitials(activity.userName)}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">
                                                {activity.userName}
                                            </span>{" "}
                                            {activity.action}
                                            {activity.description && (
                                                <span className="text-muted-foreground"> {activity.description}</span>
                                            )}
                                            {activity.role && (
                                                <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                                                    {activity.role}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
                                        <time dateTime={new Date(activity.createdAt).toISOString()}>
                                            {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                                        </time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}