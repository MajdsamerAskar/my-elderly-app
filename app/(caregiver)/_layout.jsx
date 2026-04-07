import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CaregiverLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF' }}>
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="alerts" 
        options={{ 
          title: 'Alerts', 
          tabBarIcon: ({ color }) => <Ionicons name="warning" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="calendar" 
        options={{ 
          title: 'Calendar', 
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="health" 
        options={{ 
          title: 'Health', 
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="medications" 
        options={{ 
          title: 'Meds', 
          tabBarIcon: ({ color }) => <Ionicons name="medkit" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> 
        }} 
      />
      
      {/* Hidden from the bottom tab bar but still accessible via routing */}
      <Tabs.Screen name="link-elderly"
       options={{ 
        title: 'Link Elderly',
            tabBarIcon: ({ color }) => <Ionicons name="link" size={24} color={color} />,
 }} />
    </Tabs>
  );
}