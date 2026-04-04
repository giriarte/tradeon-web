import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(() => localStorage.getItem('userId'))

  const login = (id) => {
    localStorage.setItem('userId', id)
    setUserId(id)
  }

  const logout = () => {
    localStorage.removeItem('userId')
    setUserId(null)
  }

  return (
    <AuthContext.Provider value={{ userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
