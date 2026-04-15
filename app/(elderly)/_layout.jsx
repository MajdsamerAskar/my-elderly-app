import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ElderlyLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#5B8CFF',
      tabBarStyle: { height: 70, paddingBottom: 10 } // Slightly larger for better accessibility
    }}>
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="medications" 
        options={{ 
          title: 'Meds', 
          tabBarIcon: ({ color }) => <Ionicons name="medkit" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="health" 
        options={{ 
          title: 'Health', 
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="calendar" 
        options={{ 
          title: 'Calendar', 
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }) => <Ionicons name="person" size={28} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="Pendingrequests" 
        options={{
          title: 'Pending Requests',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={28} color={color} />
        }}
      />
    </Tabs>
  );
}