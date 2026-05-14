import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        t('error') || 'Error',
        t('enterEmailAndPassword') || 'Please enter your email and password'
      )
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      Alert.alert(t('loginFailed') || 'Login Failed', error.message)
      setLoading(false)
      return
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', data.user.id)
      .single()

    if (userError) {
      Alert.alert(
        t('error') || 'Error',
        t('couldNotFetchUserInfo') || 'Could not fetch user info'
      )
      setLoading(false)
      return
    }

    if (userData.role === 'elderly') {
      router.replace('/(elderly)/home')
    } else if (userData.role === 'caregiver') {
      router.replace('/(caregiver)/home')
    }

    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="flex-1 justify-center px-7">
        <View className="mb-10">
          <Text className="text-[32px] font-bold text-text mb-1.5">
            {t('welcomeBack') || 'Welcome Back'}
          </Text>
          <Text className="text-base text-text-secondary">
            {t('signInToContinue') || 'Sign in to continue'}
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-[15px] font-semibold text-text mb-2 mt-4">
            {t('email') || 'Email'}
          </Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3.5 text-md text-text"
            placeholder={t('enterYourEmail') || 'Enter your email'}
            placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text className="text-[15px] font-semibold text-text mb-2 mt-4">
            {t('password') || 'Password'}
          </Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3.5 text-base text-text"
            placeholder={t('enterYourPassword') || 'Enter your password'}
            placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            className={`bg-primary_blue rounded-xl py-4 items-center mt-7 ${loading ? 'opacity-60' : ''}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-[17px] font-bold">
                {t('signIn') || 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text className="text-center text-text-secondary text-[15px]">
            {t('dontHaveAccount') || "Don't have an account?"}{' '}
            <Text className="text-blue-600 dark:text-blue-300 font-bold">
              {t('register') || 'Register'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
