import { useUserProfile } from '#/lib/api/hooks'
import { Skeleton } from '#/components/ui/skeleton'
import { Card } from '../ui/card';

const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    doctor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    pharmacist: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    cashier: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 border-b last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
        </div>
    )
}

export function AccountInfo() {
    const user = useUserProfile()

    if (user === undefined) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        )
    }

    if (!user) return null

    const joined = new Date(user.createdAt ?? Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return (
        <Card className='max-w-full p-4'>
            <InfoRow label="Email" value={user.email} />
            <InfoRow
                label="Role"
                value={
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleColors[user.role] ?? ''}`}>
                        {user.role}
                    </span>
                }
            />
            <InfoRow label="Member since" value={joined} />
        </Card>
    )
}