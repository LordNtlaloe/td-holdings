import { useEffect, useState } from 'react'

export type Appearance = 'light' | 'dark' | 'system'

function applyTheme(appearance: Appearance) {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved =
        appearance === 'system' ? (prefersDark ? 'dark' : 'light') : appearance

    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    root.style.colorScheme = resolved

    if (appearance === 'system') {
        root.removeAttribute('data-theme')
    } else {
        root.setAttribute('data-theme', appearance)
    }
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(() => {
        try {
            return (localStorage.getItem('appearance') as Appearance) || 'system'
        } catch {
            return 'system'
        }
    })

    // Apply on mount and whenever appearance changes
    useEffect(() => {
        applyTheme(appearance)
        try {
            localStorage.setItem('appearance', appearance)
        } catch { }
    }, [appearance])

    // Re-apply when system preference changes (only matters when appearance === 'system')
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => {
            if (appearance === 'system') applyTheme('system')
        }
        media.addEventListener('change', handler)
        return () => media.removeEventListener('change', handler)
    }, [appearance])

    return { appearance, updateAppearance: setAppearance }
}