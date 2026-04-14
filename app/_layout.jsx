import '../global.css'
import 'react-native-url-polyfill/auto'

import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F9FA' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(elderly)" />
      <Stack.Screen name="(caregiver)" />
    </Stack>
  )
}