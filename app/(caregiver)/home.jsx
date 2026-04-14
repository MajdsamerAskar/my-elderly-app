import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getCurrentUser, logoutUser } from '../../services/auth.service'
import SectionHeader from '../../components/ui/SectionHeader'
import AppButton from '../../components/ui/AppButton'
import { uniTheme } from '../../constants/uniTheme'

export default function CaregiverHome() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  const load = useCallback(async () => {
    try {
      const u = await getCurrentUser()
      setUser(u)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const onLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          try {
            await logoutUser()
            router.replace('/(auth)/login')
          } catch (err) {
            Alert.alert('Error', err?.message ?? 'Could not sign out')
          } finally {
            setSigningOut(false)
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
    <ScrollView className="flex-1 bg-uni-canvas" contentContainerClassName="pb-10">
      <View className="flex-row items-center justify-between bg-uni-primary px-6 pb-6 pt-16">
        <View className="flex-1 pr-2">
          <Text className="text-sm text-white/80">{greeting()}</Text>
          <Text className="mt-0.5 text-[22px] font-bold text-white">
            {user?.first_name} {user?.last_name}
          </Text>
          <Text className="mt-1 text-[13px] text-white/85">Caregiver dashboard</Text>
        </View>
        <View className="rounded-lg bg-white/20 px-2.5 py-1.5">
          <Text className="text-[13px] font-semibold text-white">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <View className="mx-4 -mt-4 rounded-uni-card border border-uni-border bg-uni-surface p-4 shadow-sm">
        <Text className="text-center text-xs font-semibold uppercase tracking-wide text-uni-muted">
          Today&apos;s overview
        </Text>
        <View className="mt-4 flex-row justify-between">
          <View className="flex-1 items-center border-r border-uni-border py-1">
            <Text className="text-2xl font-bold text-uni-primary">—</Text>
            <Text className="mt-1 text-center text-[11px] text-uni-muted">Active clients</Text>
          </View>
          <View className="flex-1 items-center border-r border-uni-border py-1">
            <Text className="text-2xl font-bold text-uni-ink">—</Text>
            <Text className="mt-1 text-center text-[11px] text-uni-muted">Check-ins</Text>
          </View>
          <View className="flex-1 items-center py-1">
            <Text className="text-2xl font-bold text-uni-danger">—</Text>
            <Text className="mt-1 text-center text-[11px] text-uni-muted">Alerts</Text>
          </View>
        </View>
      </View>

      <View className="mx-4 mt-6">
        <SectionHeader icon="people-outline" title="People you support" />
        <View className="items-center rounded-uni-card border border-dashed border-uni-border bg-uni-surface px-4 py-10">
          <Ionicons name="heart-outline" size={40} color={uniTheme.mutedLight} />
          <Text className="mt-3 text-center text-[15px] font-semibold text-uni-ink">No linked profiles yet</Text>
          <Text className="mt-1 text-center text-[14px] leading-5 text-uni-muted">
            When an elderly user links to you in Supabase, their summary will appear here.
          </Text>
        </View>
      </View>

      <View className="mx-4 mt-6">
        <SectionHeader icon="flash-outline" title="Quick actions" />
        <TouchableOpacity
          activeOpacity={0.88}
          className="mb-3 flex-row items-center rounded-uni-card border border-uni-border bg-uni-surface px-4 py-4"
        >
          <View className="rounded-full bg-uni-primary-soft p-2.5">
            <Ionicons name="call-outline" size={22} color={uniTheme.primary} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-uni-ink">Call check-in</Text>
            <Text className="mt-0.5 text-[13px] text-uni-muted">Placeholder for voice / video routine</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={uniTheme.mutedLight} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.88}
          className="flex-row items-center rounded-uni-card border border-uni-border bg-uni-surface px-4 py-4"
        >
          <View className="rounded-full bg-uni-primary-soft p-2.5">
            <Ionicons name="document-text-outline" size={22} color={uniTheme.primary} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-uni-ink">Care notes</Text>
            <Text className="mt-0.5 text-[13px] text-uni-muted">Placeholder for visit log</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={uniTheme.mutedLight} />
        </TouchableOpacity>
      </View>

      <View className="mx-4 mt-8">
        <AppButton title="Sign out" variant="outline" onPress={onLogout} loading={signingOut} />
      </View>
    </ScrollView>
  )
}
