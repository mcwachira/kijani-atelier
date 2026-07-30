import { useEffect, useState } from 'react'

export function usePersistedState<T>(
  key: string,
  parse: (raw: string | null) => T,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(parse(null))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const restored = parse(
      typeof window !== 'undefined'
        ? window.localStorage.getItem(key)
        : null,
    )
    setState(restored)
    setHydrated(true)
  }, [key, parse])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch { /* quota */ }
  }, [key, state, hydrated])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setState(parse(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, parse])

  return [state, setState, hydrated]
}
