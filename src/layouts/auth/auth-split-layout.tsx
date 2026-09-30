import { useEffect } from 'react'
import AppLogo from '#/components/app-logo'
import { Link } from '@tanstack/react-router'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '#/hooks/use-theme'

interface AuthLayoutProps {
    children: React.ReactNode
    title?: string
    description?: string
}

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { theme, setTheme } = useTheme()

    useEffect(() => {
        // ensures correct hydration on mount
    }, [])

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">

            {/* LEFT SIDE */}
            <div className="relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900 dark:bg-zinc-950" />

                <Link to="/" className="relative z-20 flex items-center text-lg font-medium">
                    <AppLogo />
                </Link>
            </div>

            {/* RIGHT SIDE */}
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">

                    {/* MOBILE LOGO */}
                    <Link to="/" className="relative z-20 flex items-center justify-center lg:hidden">
                        <div className="h-10 sm:h-12" />
                    </Link>

                    {/* THEME TOGGLE */}
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                        <button
                            onClick={() => setTheme('light')}
                            className={`rounded-md p-2 hover:bg-muted transition ${theme === 'light' ? 'text-foreground' : ''
                                }`}
                        >
                            <Sun className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => setTheme('dark')}
                            className={`rounded-md p-2 hover:bg-muted transition ${theme === 'dark' ? 'text-foreground' : ''
                                }`}
                        >
                            <Moon className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => setTheme('auto')}
                            className={`rounded-md p-2 hover:bg-muted transition ${theme === 'auto' ? 'text-foreground' : ''
                                }`}
                        >
                            <Monitor className="h-4 w-4" />
                        </button>
                    </div>

                    {/* HEADER */}
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium text-foreground">
                            {title}
                        </h1>

                        <p className="text-sm text-muted-foreground text-balance">
                            {description}
                        </p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    )
}