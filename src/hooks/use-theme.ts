import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            return (localStorage.getItem('theme') as Theme) || 'auto'
        } catch {
            return 'auto'
        }
    })

    useEffect(() => {
        const root = document.documentElement
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const resolved = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme

        root.classList.remove('light', 'dark')
        root.classList.add(resolved)
        root.style.colorScheme = resolved

        if (theme === 'auto') {
            root.removeAttribute('data-theme')
        } else {
            root.setAttribute('data-theme', theme)
        }

        try {
            localStorage.setItem('theme', theme)
        } catch { }
    }, [theme])

    return { theme, setTheme }
}