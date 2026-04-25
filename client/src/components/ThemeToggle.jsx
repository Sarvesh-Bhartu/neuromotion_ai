import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-grey hover:text-white transition-all border border-white/5 flex items-center justify-center"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-yellow-500" />
      ) : (
        <Moon size={18} className="text-brand-blue" />
      )}
    </button>
  )
}
