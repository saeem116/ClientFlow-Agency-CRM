"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type Theme = "light" | "dark" | "system"
type Density = "comfortable" | "normal" | "compact"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
  density: Density
  setDensity: (density: Density) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem("clientflow-theme")
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {
    // ignore
  }
  return null
}

function getStoredDensity(): Density | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem("clientflow-density")
    if (stored === "comfortable" || stored === "normal" || stored === "compact") return stored
  } catch {
    // ignore
  }
  return null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() || "system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    const initial = getStoredTheme() || "system"
    return initial === "system" ? getSystemTheme() : initial
  })
  const [density, setDensityState] = useState<Density>(() => getStoredDensity() || "normal")

  useEffect(() => {
    applyTheme(resolvedTheme)
    applyDensity(density)
  }, [resolvedTheme, density])

  useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? "dark" : "light"
      setResolvedTheme(newResolved)
      applyTheme(newResolved)
    }
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [theme])

  function applyTheme(resolved: "light" | "dark") {
    if (typeof window === "undefined") return
    const root = document.documentElement
    if (resolved === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }

  function applyDensity(d: Density) {
    if (typeof window === "undefined") return
    const root = document.documentElement
    root.setAttribute("data-density", d)
  }

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme)
    const resolved = newTheme === "system" ? getSystemTheme() : newTheme
    setResolvedTheme(resolved)
    applyTheme(resolved)
    try {
      localStorage.setItem("clientflow-theme", newTheme)
    } catch {
      // ignore
    }
  }

  function setDensity(newDensity: Density) {
    setDensityState(newDensity)
    applyDensity(newDensity)
    try {
      localStorage.setItem("clientflow-density", newDensity)
    } catch {
      // ignore
    }
  }

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? "dark" : "light"
      setResolvedTheme(newResolved)
      applyTheme(newResolved)
    }
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, density, setDensity }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}