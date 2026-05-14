// ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('theme').then(saved => {
      if (saved === 'dark') setIsDark(true)
      setLoaded(true)
    })
  }, [])

  const toggleTheme = async (mode) => {
    const dark = mode === 'dark'
    setIsDark(dark)
    await AsyncStorage.setItem('theme', dark ? 'dark' : 'light')
  }

  if (!loaded) return null

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)