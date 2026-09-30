import { useTheme } from '#/hooks/use-theme'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '#/lib/utils'

const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'System', icon: Monitor },
] as const

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <div className="flex gap-2">
            {options.map(({ value, label, icon: Icon }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                        theme === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                >
                    <Icon className="size-4" />
                    {label}
                </button>
            ))}
        </div>
    )
}