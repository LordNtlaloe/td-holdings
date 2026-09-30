import { useUpdateUserStatus, useDeleteUser } from '#/lib/api/hooks'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '#/components/ui/dropdown-menu'
import { Button } from '#/components/ui/button'
import { MoreHorizontal, ShieldCheck, ShieldOff, Ban, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '#/components/ui/alert-dialog'
import type { Id } from '#/types/entities'
interface UserActionsProps {
    userId: Id<'users'>
    userName: string
    currentStatus?: 'active' | 'suspended' | 'banned'
}

export function UserActions({ userId, userName, currentStatus = 'active' }: UserActionsProps) {
    const updateStatus = useUpdateUserStatus()
    const deleteUser = useDeleteUser()
    const [confirmDelete, setConfirmDelete] = useState(false)

    const handleStatus = async (status: 'active' | 'suspended' | 'banned') => {
        await updateStatus({ userId, status })
    }

    const handleDelete = async () => {
        await deleteUser({ userId })
        setConfirmDelete(false)
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
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions for {userName}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {currentStatus !== 'active' && (
                        <DropdownMenuItem onClick={() => handleStatus('active')}>
                            <ShieldCheck className="mr-2 size-4 text-green-600" />
                            Activate
                        </DropdownMenuItem>
                    )}
                    {currentStatus !== 'suspended' && (
                        <DropdownMenuItem onClick={() => handleStatus('suspended')}>
                            <ShieldOff className="mr-2 size-4 text-orange-600" />
                            Suspend
                        </DropdownMenuItem>
                    )}
                    {currentStatus !== 'banned' && (
                        <DropdownMenuItem onClick={() => handleStatus('banned')}>
                            <Ban className="mr-2 size-4 text-red-600" />
                            Ban
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        onClick={() => setConfirmDelete(true)}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {userName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this user and all their data. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}