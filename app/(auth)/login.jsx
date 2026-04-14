import { useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import AuthContainer from '../../components/ui/AuthContainer'
import AppInput from '../../components/ui/AppInput'
import AppButton from '../../components/ui/AppButton'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      Alert.alert('Login Failed', error.message)
      setLoading(false)
      return
    }

    // Get the user's role from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', data.user.id)
      .single()

    if (userError) {
      Alert.alert('Error', 'Could not fetch user info')
      setLoading(false)
      return
    }

    // Redirect based on role
    if (userData.role === 'elderly') {
      router.replace('/(elderly)/home')
    } else if (userData.role === 'caregiver') {
      router.replace('/(caregiver)/home')
    }

    setLoading(false)
  }

  return (
    <AuthContainer heroSubtitle="Secure access for elderly users and caregivers.">
      <View className="flex-1 justify-center">
        <View className="mb-10">
          <Text className="mb-1 text-3xl font-bold text-uni-ink">Welcome back</Text>
          <Text className="text-base text-uni-muted">Sign in with your email and password.</Text>
        </View>

        <View className="mb-6">
          <AppInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="mt-0"
          />

          <AppInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <AppButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            className="mt-7"
          />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text className="text-center text-[15px] text-uni-muted">
            Don&apos;t have an account?{' '}
            <Text className="font-bold text-uni-primary">Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </AuthContainer>
  )
}