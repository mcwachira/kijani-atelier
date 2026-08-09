import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
  
} from 'react'
import type {ReactNode} from 'react';
import {
  getAuthToken,
  setAuthToken as persistAuthToken
  
} from '@/lib/api'
import type { User } from '@/types'



interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  // Called by login/register success handlers — updates BOTH the
  // in-memory React state (so Navbar re-renders immediately) and the
  // underlying localStorage token that apiFetch reads from.
  setSession: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser():User | null {
  if(typeof window === 'undefined') return null;
  try{
    const raw = localStorage.getItem('kijani_user')
    return raw ? (JSON.parse(raw) as User) : null
  }catch{
    return null
  }
}

export function AuthProvider({children}:{children:ReactNode}){
  const [user, setUser] = useState<User | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Runs once on mount — reads whatever's already in localStorage (from
  // a previous session) so a page refresh doesn't briefly show "logged
  // out" before catching up. This is the client-side equivalent of the
  // SSR-safety pattern used elsewhere (typeof window checks in api.ts).
  useEffect(() => {
    const token = getAuthToken()
    const storedUser = readStoredUser()
    if (token && storedUser) {
      setUser(storedUser)
    }
    setHydrated(true)
  }, [])

  const setSession = useCallback((token: string, nextUser: User) => {
    persistAuthToken(token)
    localStorage.setItem('kijani_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    persistAuthToken(null)
    localStorage.removeItem('kijani_user')
    setUser(null)
  }, [])
  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, hydrated, setSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  const ctx = useContext(AuthContext);
  if(!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}