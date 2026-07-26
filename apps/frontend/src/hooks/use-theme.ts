import {useCallback, useEffect, useState} from 'react'

type Theme = 'light' | 'dark'
const STORAGE_KEY  = 'kijani-theme';

export function useTheme(){
  const [theme, setThemeState] = useState<Theme>('light')
  
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null

    const initial: Theme =
      stored ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light')
    setThemeState(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const setTheme =useCallback((next:Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.classList.toggle("dark", next === "dark")
  },[])

  const toggleTheme =useCallback(() => setTheme(document.documentElement.classList.contains("dark")? "light":"dark"),[setTheme])

  return {theme,setTheme,toggleTheme}
}

