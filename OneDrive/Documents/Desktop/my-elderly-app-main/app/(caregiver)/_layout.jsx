import { Stack } from 'expo-router'

export default function CaregiverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F8F9FA' },
      }}
    />
  )
}
