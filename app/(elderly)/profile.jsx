import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { logoutUser } from '../../services/auth.service'

export default function ElderlyProfile() {
  const router = useRouter()

  async function handleLogout() {
    await logoutUser()
    router.replace('/')
  }

  return (
    <View className="flex-1 items-center justify-center bg-[#F7F3EE]">
  <Text className="text-[22px] font-bold text-[#1A1A2E] mb-8">Profile</Text>
  <TouchableOpacity
    className="bg-[#E63946] rounded-xl px-10 py-[14px]"
    onPress={handleLogout}
  >
    <Text className="text-white font-bold text-base">Log Out</Text>
  </TouchableOpacity>
</View>
  )
}
