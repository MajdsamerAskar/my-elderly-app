import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'

export default function ElderlyLayout() {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5B8CFF',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#9ca3af',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          backgroundColor: isDark ? '#16213E' : '#FFFFFF',
          borderTopColor: isDark ? '#334155' : '#E5E7EB',
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: t('home') || 'Home', 
          tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="medications" 
        options={{ 
          title: t('medications') || 'Meds', 
          tabBarIcon: ({ color }) => <Ionicons name="medkit" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="health" 
        options={{ 
          title: t('health') || 'Health', 
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="calendar" 
        options={{ 
          title: t('calendar') || 'Calendar', 
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: t('profile') || 'Profile', 
          tabBarIcon: ({ color }) => <Ionicons name="person" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="Pendingrequests" 
        options={{
          title: t('pendingRequests') || 'Pending Requests',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={28} color={color} />
        }}
      />
    </Tabs>
  )
}