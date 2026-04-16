import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

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
    <KeyboardAvoidingView
  className="flex-1 bg-[#F8F9FA]"
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
  <View className="flex-1 justify-center px-7">

    {/* Header */}
    <View className="mb-10">
      <Text className="text-[32px] font-bold text-[#1A1A2E] mb-1.5">Welcome Back</Text>
      <Text className="text-base text-gray-500">Sign in to continue</Text>
    </View>

    {/* Form */}
    <View className="mb-6">
      <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-4">Email</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-md text-[#1A1A2E]"
        placeholder="Enter your email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-4">Password</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-[#1A1A2E]"
        placeholder="Enter your password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className={`bg-[#007AFF] rounded-xl py-4 items-center mt-7 ${loading ? 'opacity-60' : ''}`}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-[17px] font-bold">Sign In</Text>
        )}
      </TouchableOpacity>
    </View>

    {/* Register Link */}
    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
      <Text className="text-center text-gray-500 text-[15px]">
        Don't have an account?{' '}
        <Text className="text-[#007AFF] font-bold">Register</Text>
      </Text>
    </TouchableOpacity>

  </View>
</KeyboardAvoidingView>
  )
}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F8F9FA',
//   },
//   inner: {
//     flex: 1,
//     justifyContent: 'center',
//     paddingHorizontal: 28,
//   },
//   header: {
//     marginBottom: 40,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '700',
//     color: '#1A1A2E',
//     marginBottom: 6,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666',
//   },
//   form: {
//     marginBottom: 24,
//   },
//   label: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 8,
//     marginTop: 16,
//   },
//   input: {
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     color: '#1A1A2E',
//   },
//   button: {
//     backgroundColor: '#2D6A4F',
//     borderRadius: 12,
//     paddingVertical: 16,
//     alignItems: 'center',
//     marginTop: 28,
//   },
//   buttonDisabled: {
//     opacity: 0.6,
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '700',
//   },
//   registerText: {
//     textAlign: 'center',
//     color: '#666',
//     fontSize: 15,
//   },
//   registerLink: {
//     color: '#2D6A4F',
//     fontWeight: '700',
//   },
// })