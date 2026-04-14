import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getCurrentUser } from '../services/auth.service'
import { uniTheme } from '../constants/uniTheme'

export default function Index() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const user = await getCurrentUser()

      if (!user) {
        router.replace('/(auth)/login')
        return
      }

      if (user.role === 'elderly') {
        router.replace('/(elderly)/home')
      } else if (user.role === 'caregiver') {
        router.replace('/(caregiver)/home')
      }

    } catch (error) {
      router.replace('/(auth)/login')
    } finally {
      setChecking(false)
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-uni-canvas">
      <ActivityIndicator size="large" color={uniTheme.primary} />
    </View>
  )
}