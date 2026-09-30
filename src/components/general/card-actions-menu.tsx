import { MoreHorizontal } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

/**
 * A row's actions folded into one ⋯ menu — the mobile card equivalent of the
 * actions column.
 *
 * Pass the same cell the desktop table renders (usually a row of bare icon
 * buttons like Void / Cancel / Refund) and this turns it into a dropdown, so a
 * table keeps ONE actions implementation for both layouts instead of a second
 * list that can drift out of sync.
 *
 * The buttons are restyled into full-width rows through descendant selectors.
 * The cell's own wrapper div (`flex gap-1`) is flipped to a column, and each
 * button is stretched. Buttons are icon-only, so each keeps its `title` as the
 * hover tooltip.
 */
export function CardActionsMenu({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Row actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className={cn(
                    'w-44 p-1',
                    '[&>div]:flex-col [&>div]:gap-1 [&>div]:justify-start',
                    '[&_button]:w-full [&_button]:justify-start',
                    className
                )}
            >
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
