import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import { getCurrentUser } from '../../services/auth.service'
import { supabase } from '../../lib/supabase'

function getAlertsLocale(language) {
  const candidates = language?.startsWith('ar')
    ? ['ar-IQ', 'ar']
    : language?.startsWith('ku')
      ? ['ckb-IQ', 'ku', 'ar-IQ']
      : ['en-US', 'en']

  for (const locale of candidates) {
    try {
      if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length) return locale
    } catch {}
  }

  return 'en-US'
}

export default function Notifications() {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const locale = getAlertsLocale(i18n.language)

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    setError(null)

    try {
      const user = await getCurrentUser()
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.user_id)
        .order('sent_at', { ascending: false })
        .limit(50)

      if (queryError) throw queryError
      setNotifications(data ?? [])
    } catch (fetchError) {
      setError(fetchError.message || (t('couldNotLoadAlerts') || 'Could not load alerts.'))
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id) {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('notification_id', id)

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.notification_id === id
          ? { ...notification, is_read: true }
          : notification
      )
    )
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B8CFF" />
          <Text className="text-text-secondary mt-4">
            {t('loadingAlerts') || 'Loading alerts...'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="px-4 py-4 bg-surface border-b border-border">
        <Text className="text-2xl font-bold text-text">
          {t('alerts') || 'Alerts'}
        </Text>
        <Text className="text-text-secondary mt-1">
          {t('caregiverAlertsSubtitle') || 'Recent updates from the people you care for'}
        </Text>
      </View>

      {error ? (
        <View className="px-4 pt-4">
          <View className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-2xl px-4 py-3">
            <Text className="text-red-600 dark:text-red-300 text-center">
              {error}
            </Text>
            <TouchableOpacity onPress={fetchNotifications} className="mt-3 items-center">
              <Text className="text-blue-600 dark:text-blue-300 font-semibold">
                {t('tryAgain') || 'Try again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.notification_id}
        contentContainerClassName="px-4 py-4 pb-10"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons
              name="notifications-outline"
              size={48}
              color={isDark ? '#475569' : '#CBD5E1'}
            />
            <Text className="text-lg font-semibold text-text mt-4 mb-1">
              {t('noNotificationsYet') || 'No notifications yet.'}
            </Text>
            <Text className="text-text-secondary text-center">
              {t('caregiverAlertsEmpty') || 'New activity and reminders will appear here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className={`bg-surface rounded-2xl p-4 mb-3 border ${
              item.is_read ? 'border-border' : 'border-blue-200 dark:border-blue-900'
            }`}
            onPress={() => markRead(item.notification_id)}
            activeOpacity={0.8}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-text flex-1 pr-3">
                {item.title}
              </Text>
              {!item.is_read ? (
                <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              ) : null}
            </View>
            <Text className="text-text-secondary mt-2 leading-5">
              {item.body}
            </Text>
            <Text className="text-sm text-text-secondary mt-2">
              {new Date(item.sent_at).toLocaleString(locale, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}
