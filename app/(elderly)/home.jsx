import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getCurrentUser } from '../../services/auth.service'
import { getPhysicalMetrics } from '../../services/elderlyLocal.service'
import { uniTheme } from '../../constants/uniTheme'
import SectionHeader from '../../components/ui/SectionHeader'

export default function ElderlyHome() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [physical, setPhysical] = useState({ steps: 0, caloriesBurned: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      const activity = await getPhysicalMetrics(currentUser.user_id)
      setPhysical(activity)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-uni-canvas">
        <ActivityIndicator size="large" color={uniTheme.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-uni-canvas"
      contentContainerClassName="pb-8"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="flex-row items-center justify-between bg-uni-primary px-6 pb-6 pt-16">
        <View>
          <Text className="text-sm text-white/80">{getGreeting()}</Text>
          <Text className="mt-0.5 text-[22px] font-bold text-white">
            {user?.first_name} {user?.last_name} 👋
          </Text>
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

      <View className="mx-4 mt-4 mb-4">
        <SectionHeader icon="walk-outline" title="Physical activity" />

        <View className="rounded-2xl border border-uni-border bg-uni-surface p-4">
          <View className="mb-3 flex-row items-center">
            <View className="rounded-full bg-uni-primary/10 p-2">
              <Ionicons name="walk-outline" size={22} color={uniTheme.primary} />
            </View>
            <Text className="ml-2 text-lg font-bold text-uni-ink">{"Today's movement"}</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <View className="min-w-[46%] flex-1 rounded-xl bg-uni-canvas px-4 py-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-uni-muted-light">
                Steps today
              </Text>
              <Text className="mt-1 text-2xl font-bold text-uni-ink">
                {physical.steps.toLocaleString()}
              </Text>
            </View>
            <View className="min-w-[46%] flex-1 rounded-xl bg-uni-canvas px-4 py-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-uni-muted-light">
                Calories burned
              </Text>
              <Text className="mt-1 text-2xl font-bold text-uni-primary">
                {physical.caloriesBurned} kcal
              </Text>
            </View>
          </View>
          <Text className="mt-3 text-[12px] leading-4 text-uni-muted-light">
            You can update totals on the Health page when your wearable or clinic slip shows different
            numbers.
          </Text>
        </View>
      </View>

      <View className="mx-4 mb-4">
        <SectionHeader icon="git-network-outline" title="Mental activity" />

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/(elderly)/mental')}
          className="rounded-2xl border border-uni-primary/35 bg-uni-primary/10 p-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center pr-2">
              <View className="rounded-full bg-uni-surface p-2">
                <Ionicons name="git-network-outline" size={22} color={uniTheme.primary} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-lg font-bold text-uni-ink">Family & memory</Text>
                <Text className="mt-1 text-[14px] leading-5 text-uni-muted">
                  Build your family list and take a short quiz to stay sharp.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={uniTheme.primary} />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
