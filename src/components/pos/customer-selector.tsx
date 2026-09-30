import { useState, useRef, useEffect } from 'react'
import { useSearchCustomersByName } from '#/lib/api/hooks'
import { Loader2, UserPlus, Check } from 'lucide-react'
import { Input } from '#/components/ui/input'

type CustomerMatch = {
    _id: string
    name: string
    visitCount?: number
    totalSpent?: number
}

type Props = {
    // name typed/selected by the cashier — controlled by parent
    value: string
    onChange: (name: string) => void
    disabled?: boolean
}

export function CustomerInput({ value, onChange, disabled }: Props) {
    const [open, setOpen] = useState(false)
    const [focused, setFocused] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const results = useSearchCustomersByName(value) as CustomerMatch[] | undefined

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const showDropdown = focused && open && value.trim().length > 0

    // Whether the typed name exactly matches an existing customer (case-insensitive)
    const exactMatch = results?.find(
        (r) => r.name.toLowerCase() === value.trim().toLowerCase()
    )

    return (
        <div ref={containerRef} className="relative">
            <Input
                placeholder="Type customer name..."
                value={value}
                disabled={disabled}
                onChange={(e) => {
                    onChange(e.target.value)
                    setOpen(true)
                }}
                onFocus={() => {
                    setFocused(true)
                    setOpen(true)
                }}
                onBlur={() => setFocused(false)}
            />

            {showDropdown && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {results === undefined ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Searching...
                        </div>
                    ) : results.length === 0 ? (
                        // No match — show "will be added as new"
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                            <UserPlus className="h-3 w-3" />
                            <span>
                                Add <span className="font-medium text-foreground">"{value.trim()}"</span> as new customer
                            </span>
                        </div>
                    ) : (
                        <ul className="max-h-48 overflow-y-auto py-1">
                            {results.map((customer) => {
                                const isExact = customer.name.toLowerCase() === value.trim().toLowerCase()
                                return (
                                    <li key={customer._id}>
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                                            onMouseDown={(e) => {
                                                // mousedown fires before blur, so we can select before the input loses focus
                                                e.preventDefault()
                                                onChange(customer.name)
                                                setOpen(false)
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isExact && <Check className="h-3 w-3 text-primary" />}
                                                <span className={isExact ? 'font-medium' : ''}>{customer.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {customer.visitCount != null && customer.visitCount > 0 && (
                                                    <span>{customer.visitCount} visit{customer.visitCount !== 1 ? 's' : ''}</span>
                                                )}
                                                {customer.totalSpent != null && customer.totalSpent > 0 && (
                                                    <span>R{customer.totalSpent.toFixed(2)} spent</span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                )
                            })}

                            {/* If typed name doesn't exactly match any result, offer to add as new */}
                            {!exactMatch && (
                                <li>
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 border-t px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            setOpen(false)
                                        }}
                                    >
                                        <UserPlus className="h-3 w-3" />
                                        Add <span className="ml-1 font-medium text-foreground">"{value.trim()}"</span> as new customer
                                    </button>
                                </li>
                            )}
                        </ul>
                    )}
                </div>
            )}

            {/* Inline status hint below the input */}
            {value.trim() && !open && (
                <p className="mt-1 text-xs text-muted-foreground">
                    {exactMatch
                        ? `Returning customer · ${exactMatch.visitCount ?? 0} visit(s)`
                        : 'New customer — will be added on checkout'}
                </p>
            )}
        </div>
    )
}