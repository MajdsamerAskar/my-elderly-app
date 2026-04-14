import { useState, useCallback } from 'react'
import { View, Text, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AppButton from '../../components/ui/AppButton'
import { getCurrentUser, logoutUser } from '../../services/auth.service'
import { getProfileSettings, saveProfileSettings } from '../../services/elderlyLocal.service'
import { uniTheme } from '../../constants/uniTheme'
import SectionHeader from '../../components/ui/SectionHeader'

export default function ProfileScreen() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmActions, setConfirmActions] = useState(true)
  const [reminderHints, setReminderHints] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const current = await getCurrentUser()
      setUser(current)
      if (current?.user_id) {
        setUserId(current.user_id)
        const s = await getProfileSettings(current.user_id)
        setConfirmActions(!!s.confirmActions)
        setReminderHints(!!s.reminderHints)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const persistSettings = async (next) => {
    if (!userId) return
    await saveProfileSettings(userId, next)
  }

  const toggleConfirm = async (value) => {
    setConfirmActions(value)
    await persistSettings({ confirmActions: value, reminderHints })
  }

  const toggleReminders = async (value) => {
    setReminderHints(value)
    await persistSettings({ confirmActions, reminderHints: value })
  }

  const handleLogout = () => {
    Alert.alert('Log out', 'You will need your email and password to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          try {
            await logoutUser()
            router.replace('/(auth)/login')
          } catch (e) {
            Alert.alert('Log out failed', 'Please try again.')
          } finally {
            setLoggingOut(false)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-uni-canvas">
        <ActivityIndicator size="large" color={uniTheme.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-uni-canvas" edges={['top']}>
      <View className="border-b border-uni-border bg-uni-surface px-4 py-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-uni-primary">Profile</Text>
        <Text className="text-lg font-bold text-uni-ink">Account & settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-10">
        <View className="rounded-2xl border border-uni-border bg-uni-surface p-5">
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-uni-primary/15">
              <Ionicons name="person" size={32} color={uniTheme.primary} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-bold text-uni-ink">
                {user?.first_name} {user?.last_name}
              </Text>
              {user?.email ? (
                <Text className="mt-1 text-[14px] text-uni-muted">{user.email}</Text>
              ) : null}
              {user?.phone_number ? (
                <Text className="mt-0.5 text-[14px] text-uni-muted">{user.phone_number}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View className="mt-6">
          <SectionHeader icon="settings-outline" title="Settings" />
        </View>
        <View className="rounded-2xl border border-uni-border bg-uni-surface px-4 py-2">
          <View className="flex-row items-center justify-between border-b border-uni-border py-4">
            <View className="mr-3 flex-1">
              <Text className="text-[16px] font-semibold text-uni-ink">Extra confirmations</Text>
              <Text className="mt-1 text-[13px] leading-5 text-uni-muted">
                Ask one more time before SOS or other sensitive actions.
              </Text>
            </View>
            <Switch
              value={confirmActions}
              onValueChange={toggleConfirm}
              trackColor={{ false: uniTheme.border, true: uniTheme.primarySoft }}
              thumbColor={confirmActions ? uniTheme.primary : '#f4f4f5'}
            />
          </View>
          <View className="flex-row items-center justify-between py-4">
            <View className="mr-3 flex-1">
              <Text className="text-[16px] font-semibold text-uni-ink">Gentle reminder hints</Text>
              <Text className="mt-1 text-[13px] leading-5 text-uni-muted">
                Show short tips on Home and Health about updating your numbers.
              </Text>
            </View>
            <Switch
              value={reminderHints}
              onValueChange={toggleReminders}
              trackColor={{ false: uniTheme.border, true: uniTheme.primarySoft }}
              thumbColor={reminderHints ? uniTheme.primary : '#f4f4f5'}
            />
          </View>
        </View>

        <View className="mt-8">
          <AppButton title="Log out" variant="outline" onPress={handleLogout} loading={loggingOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
