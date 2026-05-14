// app/(caregiver)/_layout.jsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'

export default function CaregiverLayout() {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: isDark ? '#94A3B8' : '#6B7280',
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
        },
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: t('home') || 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="alerts" 
        options={{ 
          title: t('alerts') || 'Alerts', 
          tabBarIcon: ({ color }) => <Ionicons name="warning" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="calendar" 
        options={{ 
          title: t('calendarTab') || t('calendar') || 'Calendar', 
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="health" 
        options={{ 
          title: t('health') || 'Health', 
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="medications" 
        options={{ 
          title: t('medications') || 'Meds', 
          tabBarIcon: ({ color }) => <Ionicons name="medkit" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: t('profile') || 'Profile', 
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="SearchElderly"
        options={{ 
          title: t('searchElderly') || 'Search Elderly',
          href: null,
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={22} color={color} />,
        }} 
      />
    </Tabs>
  )
}
