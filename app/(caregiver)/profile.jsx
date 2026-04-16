import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { logoutUser } from '../../services/auth.service'

export default function CaregiverProfile() {
  const router = useRouter()

  async function handleLogout() {
    await logoutUser()
    router.replace('/')
  }

  return (
    <View className="flex-1 items-center justify-center bg-[#F4F6FA]">
  <Text className="text-[22px] font-bold mb-8 text-[#1A1A2E]">Profile</Text>
  
  <TouchableOpacity 
    className="bg-[#E63946] rounded-xl px-10 py-3.5"
    onPress={handleLogout}
  >
    <Text className="text-white font-bold text-base">Log Out</Text>
  </TouchableOpacity>
    
  <TouchableOpacity 
    className="mt-4 bg-[#007AFF] rounded-xl px-10 py-3.5"
    onPress={() => router.push('/(caregiver)/SearchElderly')}
  >
    <Text className="text-white font-bold text-base">Find Elderly</Text>
  </TouchableOpacity>
</View>
    
  )
}

