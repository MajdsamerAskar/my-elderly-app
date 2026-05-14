// app/_layout.jsx
import '../global.css'
import '../i18n'
import { ThemeProvider, useTheme } from '../ThemeContext'
import { Slot } from 'expo-router'
import { View } from 'react-native'

function ThemedLayout() {
  const { isDark } = useTheme()
  
  return (
    <View className={`flex-1 ${isDark ? 'dark' : ''}`}>
      <Slot />
    </View>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedLayout />
    </ThemeProvider>
  )
}