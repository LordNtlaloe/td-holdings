import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '#/components/ui/dropdown-menu'
import { Link, useRouter } from '@tanstack/react-router'
import { LogOut, Settings } from 'lucide-react'
import { UserInfo } from './user-info'
import { setToken } from '#/lib/api/client'

export function UserMenuContent() {
    const router = useRouter()

    const handleLogout = async () => {
        setToken(null)
        router.invalidate()
        window.location.replace('/sign-in')
    }

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo showEmail />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings">
                        <Settings className="mr-2 size-4" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <button onClick={handleLogout} className="w-full cursor-pointer">
                    <LogOut className="mr-2 size-4" />
                    Log out
                </button>
            </DropdownMenuItem>
        </>
    )
}