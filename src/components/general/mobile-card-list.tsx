import { cn } from '#/lib/utils'

export interface MobileCardField {
    label: string
    value: React.ReactNode
    /** Drop this field — useful for incidental data that only adds noise. */
    hidden?: boolean
    className?: string
}

interface MobileCardListProps<T> {
    items: T[]
    /** stable React key per row */
    getId: (item: T, index: number) => string | number
    /** the card's headline — normally the row's name / number / date */
    title: (item: T, index: number) => React.ReactNode
    /** the rest of the row, rendered as labelled key/value lines */
    fields: (item: T, index: number) => MobileCardField[]
    /** slot in the card header (e.g. a row-actions menu) */
    actions?: (item: T, index: number) => React.ReactNode
    /** makes the whole card tappable */
    onItemClick?: (item: T, index: number) => void
    /** shown when there are no items */
    empty?: React.ReactNode
    className?: string
}

/**
 * The phone representation of a table row.
 *
 * Below `md` the caller hides its `<table>` (`hidden md:block`) and renders this
 * instead, so a wide table never has to be read by scrolling sideways. Above
 * `md` this renders nothing at all. Styling matches the card view in
 * `general/data-table.tsx` so both kinds of list look like one app.
 */
export function MobileCardList<T>({
    items,
    getId,
    title,
    fields,
    actions,
    onItemClick,
    empty = 'No data available',
    className,
}: MobileCardListProps<T>) {
    if (items.length === 0) {
        return (
            <div
                className={cn(
                    'rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground md:hidden',
                    className
                )}
            >
                {empty}
            </div>
        )
    }

    return (
        <div className={cn('grid gap-2 md:hidden', className)}>
            {items.map((item, index) => {
                const visible = fields(item, index).filter((f) => !f.hidden)

                return (
                    <div
                        key={getId(item, index)}
                        className={cn(
                            'rounded-lg border bg-card',
                            onItemClick && 'cursor-pointer active:bg-muted/50'
                        )}
                        onClick={onItemClick ? () => onItemClick(item, index) : undefined}
                    >
                        <div className="flex items-start gap-2 border-b px-3 py-2.5">
                            <div className="min-w-0 flex-1 text-sm font-medium">
                                {title(item, index)}
                            </div>
                            {actions && <div className="shrink-0">{actions(item, index)}</div>}
                        </div>

                        {visible.length > 0 && (
                            <dl className="divide-y">
                                {visible.map((field) => (
                                    <div
                                        key={field.label}
                                        className="flex items-start justify-between gap-4 px-3 py-2"
                                    >
                                        <dt className="shrink-0 text-xs text-muted-foreground">
                                            {field.label}
                                        </dt>
                                        <dd
                                            className={cn(
                                                'min-w-0 break-words text-right text-sm',
                                                field.className
                                            )}
                                        >
                                            {field.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
