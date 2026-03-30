import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getCurrentUser } from '../services/auth.service'

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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2D6A4F" />
    </View>
  )
}