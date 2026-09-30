import { useUpdateUserStatus, useDeleteUser, useSetUserPassword, useCurrentUser } from '#/lib/api/hooks'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '#/components/ui/dropdown-menu'
import { Button } from '#/components/ui/button'
import { MoreHorizontal, ShieldCheck, ShieldOff, Ban, Trash2, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SetPasswordDialog } from '#/components/general/set-password-dialog'
import { ConfirmDeleteDialog } from '#/components/general/confirm-delete-dialog'
import type { Id } from '#/types/entities'
interface UserActionsProps {
    userId: Id<'users'>
    userName: string
    userEmail?: string
    /** Role of the row being acted on — a super_admin row is protected. */
    targetRole?: string | null
    currentStatus?: 'active' | 'suspended' | 'banned'
}

export function UserActions({ userId, userName, userEmail, targetRole, currentStatus = 'active' }: UserActionsProps) {
    const updateStatus = useUpdateUserStatus()
    const deleteUser = useDeleteUser()
    const setUserPassword = useSetUserPassword()
    const { data: currentUserData } = useCurrentUser()
    const [setPasswordOpen, setSetPasswordOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    // Mirrors mayManageRole() on the server — an admin has no authority over a
    // super_admin. The server refuses regardless; this only avoids offering
    // actions that would come back 403.
    const isProtectedRow =
        targetRole === 'super_admin' && currentUserData?.user?.role !== 'super_admin'
    const protectedTitle = 'Only a super_admin can do this'

    const handleStatus = async (status: 'active' | 'suspended' | 'banned') => {
        await updateStatus({ userId, status })
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions for {userName}</DropdownMenuLabel>
                    {isProtectedRow && (
                        <DropdownMenuLabel className="pt-0 text-xs font-normal text-muted-foreground">
                            Super admin — only another super_admin can change this account
                        </DropdownMenuLabel>
                    )}
                    <DropdownMenuSeparator />

                    {currentStatus !== 'active' && (
                        <DropdownMenuItem
                            onClick={() => handleStatus('active')}
                            disabled={isProtectedRow}
                            title={isProtectedRow ? protectedTitle : undefined}
                        >
                            <ShieldCheck className="mr-2 size-4 text-green-600" />
                            Activate
                        </DropdownMenuItem>
                    )}
                    {currentStatus !== 'suspended' && (
                        <DropdownMenuItem
                            onClick={() => handleStatus('suspended')}
                            disabled={isProtectedRow}
                            title={isProtectedRow ? protectedTitle : undefined}
                        >
                            <ShieldOff className="mr-2 size-4 text-orange-600" />
                            Suspend
                        </DropdownMenuItem>
                    )}
                    {currentStatus !== 'banned' && (
                        <DropdownMenuItem
                            onClick={() => handleStatus('banned')}
                            disabled={isProtectedRow}
                            title={isProtectedRow ? protectedTitle : undefined}
                        >
                            <Ban className="mr-2 size-4 text-red-600" />
                            Ban
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        onClick={() => setSetPasswordOpen(true)}
                        disabled={isProtectedRow}
                        title={isProtectedRow ? protectedTitle : undefined}
                    >
                        <KeyRound className="mr-2 size-4 text-blue-600" />
                        Set Password
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        disabled={isProtectedRow}
                        title={isProtectedRow ? protectedTitle : undefined}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Two-step confirm (email + typed phrase), then a countdown that can
                still be undone — see the component for why. */}
            <ConfirmDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                subjectName={userName}
                subjectEmail={userEmail}
                onConfirm={async () => {
                    await deleteUser({ userId })
                    toast.success(`${userName} has been deleted.`)
                }}
            />

            <SetPasswordDialog
                open={setPasswordOpen}
                onOpenChange={setSetPasswordOpen}
                subjectName={userName}
                subjectEmail={userEmail}
                onSubmit={(password) => setUserPassword({ userId, password })}
                onSuccess={() => toast.success(`Password updated for ${userName}.`)}
            />
        </>
    )
}