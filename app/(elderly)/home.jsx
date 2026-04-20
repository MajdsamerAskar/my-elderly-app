import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { getCurrentUser } from '../../services/auth.service'
import { triggerSOS } from '../../services/sos.service'
import { getTodayMedications } from '../../services/medications.service'
import { updateMyLocation } from '../../services/location.service'
import { checkBreachAndNotify } from '../../services/geofence.service'
import { supabase } from '../../lib/supabase'
import {
  getLatestBiometrics,
  getSleepSessions,
  getTodayCheckin,
} from '../../services/health.service'

const COLORS = {
  primary: '#2D6A4F',
  danger: '#E63946',
  dangerDark: '#C1121F',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  subtle: '#666666',
  border: '#E0E0E0',
  success: '#52B788',
  warning: '#F4A261',
  card: '#FFFFFF',
}

// ─── local-aware "today" date string ─────────────────────────────────────────
function localToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ElderlyHome() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [medications, setMedications] = useState([])
  const [healthSummary, setHealthSummary] = useState({
    heartRate: null,
    mood: null,
    sleepHours: null,
    spo2: null,
  })
  const [loading, setLoading] = useState(true)
  const [sosLoading, setSosLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const startTracking = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) return

      const tick = async () => {
        try {
          const coords = await updateMyLocation(currentUser.user_id)
          const { data: link } = await supabase
            .from('caregiver_elderly_links')
            .select('caregiver_user_id')
            .eq('elderly_user_id', currentUser.user_id)
            .eq('status', 'active')
            .limit(1)
            .single()

          if (link) {
            await checkBreachAndNotify({
              elderlyUserId: currentUser.user_id,
              caregiverId: link.caregiver_user_id,
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          }
        } catch (e) {
          console.warn('Location tick error:', e.message)
        }
      }

      tick()
      intervalRef.current = setInterval(tick, 60_000)
    }

    startTracking()
    return () => clearInterval(intervalRef.current)
  }, [])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      // Run all fetches in parallel
      const [meds, biometrics, sleepSessions, checkin] = await Promise.allSettled([
        getTodayMedications(currentUser.user_id),
        getLatestBiometrics(currentUser.user_id),
        getSleepSessions(currentUser.user_id, 1),
        getTodayCheckin(),
      ])

      // Medications
      if (meds.status === 'fulfilled') setMedications(meds.value)

      // Health summary
      const summary = { heartRate: null, mood: null, sleepHours: null, spo2: null }

      if (biometrics.status === 'fulfilled') {
        const today = localToday()
        const hr = biometrics.value?.heart_rate
        const sp = biometrics.value?.spo2
        // Only show if recorded today
        if (hr?.recorded_at?.startsWith(today)) summary.heartRate = Math.round(hr.value)
        if (sp?.recorded_at?.startsWith(today)) summary.spo2 = Math.round(sp.value)
      }

      if (sleepSessions.status === 'fulfilled') {
        const latest = sleepSessions.value?.[0]
        if (latest?.duration_minutes) {
          summary.sleepHours = (latest.duration_minutes / 60).toFixed(1)
        }
      }

      if (checkin.status === 'fulfilled' && checkin.value) {
        const score = checkin.value.mood_score // 1–5
        const labels = { 1: 'Very low', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' }
        summary.mood = labels[score] ?? null
      }

      setHealthSummary(summary)
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

  const handleSOS = () => {
    Alert.alert(
      '🆘 Emergency SOS',
      'This will call your caregiver immediately. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', style: 'destructive', onPress: confirmSOS },
      ]
    )
  }

  const confirmSOS = async () => {
    setSosLoading(true)
    try {
      const result = await triggerSOS(user.user_id)
      if (result.type === 'caregiver') {
        Alert.alert('📞 Calling Caregiver', `Calling ${result.calledName}...`)
      } else {
        Alert.alert('🚨 Calling 911', 'No caregiver linked. Calling emergency services...')
      }
    } catch (error) {
      Alert.alert('SOS Error', 'Could not make the call. Please call manually.')
    } finally {
      setSosLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const pendingMeds = medications.filter(m => !m.taken)

  // ─── Health summary card definitions ───────────────────────────────────────
  const healthCards = [
    {
      emoji: '❤️',
      label: 'Heart Rate',
      value: healthSummary.heartRate ? `${healthSummary.heartRate}` : '—',
      unit: healthSummary.heartRate ? 'bpm' : null,
      sub: healthSummary.heartRate ? 'Today' : 'Not logged today',
    },
    {
      emoji: '😊',
      label: "Today's Mood",
      value: healthSummary.mood ?? '—',
      unit: null,
      sub: healthSummary.mood ? 'Checked in' : 'No check-in yet',
    },
    {
      emoji: '😴',
      label: 'Last Sleep',
      value: healthSummary.sleepHours ? `${healthSummary.sleepHours}` : '—',
      unit: healthSummary.sleepHours ? 'hrs' : null,
      sub: healthSummary.sleepHours ? 'Last session' : 'Not logged',
    },
    {
      emoji: '🩸',
      label: 'Blood Oxygen',
      value: healthSummary.spo2 ? `${healthSummary.spo2}` : '—',
      unit: healthSummary.spo2 ? '%' : null,
      sub: healthSummary.spo2 ? 'Today' : 'Not logged today',
    },
  ]

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="flex-row bg-[#5B8CFF] justify-between items-center px-6 pt-[60px] pb-6">
        <View>
          <Text className="text-sm text-white">{getGreeting()}</Text>
          <Text className="text-[22px] font-bold text-white mt-0.5">
            {user?.first_name} {user?.last_name} 👋
          </Text>
        </View>
        <View className="rounded-lg px-2.5 py-1.5">
          <Text className="text-white text-[13px] font-semibold">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* SOS Button */}
      <View
        className="items-center py-8 bg-white mb-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <TouchableOpacity
          className={`w-[180px] h-[180px] rounded-full justify-center items-center border-[6px] bg-[#E63946] border-[#C1121F] ${sosLoading ? 'opacity-70' : ''}`}
          style={{
            shadowColor: COLORS.danger,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
          }}
          onPress={handleSOS}
          disabled={sosLoading}
          activeOpacity={0.8}
        >
          {sosLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Text className="text-[48px] mb-1">🆘</Text>
              <Text className="text-[32px] font-black text-white tracking-[4px]">SOS</Text>
              <Text className="text-[11px] mt-0.5 text-white">Press for Emergency</Text>
            </>
          )}
        </TouchableOpacity>
        <Text className="mt-4 text-[13px] text-[#666666]">
          Tap to call your caregiver immediately
        </Text>
      </View>

      {/* Medications Today */}
      <View className="mx-4 mb-4">
        <View className="flex-row items-center mb-3 gap-2">
          <Ionicons name="medical" size={20} color="#007AFF" />
          <Text className="text-[17px] font-bold flex-1 text-[#1A1A2D]">
            Today's Medications
          </Text>
          {pendingMeds.length > 0 && (
            <View className="rounded-xl px-2 py-0.5 bg-[#E63946]">
              <Text className="text-white text-xs font-bold">{pendingMeds.length}</Text>
            </View>
          )}
        </View>

        {medications.length === 0 ? (
          <View className="bg-white rounded-xl p-5 items-center border border-[#E0E0E0]">
            <Text className="text-[15px] text-[#666666]">✅ No medications today</Text>
          </View>
        ) : (
          medications.map((med, index) => (
            <View
              key={index}
              className="bg-white rounded-xl p-4 mb-2 flex-row items-center border border-[#E0E0E0]"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="flex-1">
                <Text className="text-base font-bold text-[#1A1A2D]">{med.name}</Text>
                <Text className="text-[13px] mt-0.5 text-[#666666]">{med.dosage}</Text>
                <Text className="text-[13px] mt-1 font-semibold text-[#007AFF]">
                  🕐 {med.scheduled_time?.slice(0, 5)}
                </Text>
              </View>
              <View className="ml-3">
                <Ionicons
                  name={med.taken ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={28}
                  color={med.taken ? '#52B788' : '#E0E0E0'}
                />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Health Summary */}
      <View className="mx-4 mb-4">
        <View className="flex-row items-center mb-3 gap-2">
          <Ionicons name="heart" size={20} color="#E63946" />
          <Text className="text-[17px] font-bold flex-1 text-[#1A1A2D]">Health Summary</Text>
        </View>

        <View className="flex-row flex-wrap gap-[10px]">
          {healthCards.map(({ emoji, label, value, unit, sub }) => (
            <TouchableOpacity
              key={label}
              className="bg-white rounded-xl p-4 items-center border border-[#E0E0E0]"
              onPress={() => router.push('/(elderly)/health')}
              style={{
                width: '47.5%',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text className="text-[28px] mb-2">{emoji}</Text>
              <Text className="text-xs text-center text-[#666666]">{label}</Text>
              <View className="flex-row items-baseline gap-1 mt-1">
                <Text className="text-[18px] font-bold text-[#1A1A2D]">{value}</Text>
                {unit && <Text className="text-[12px] text-[#666666]">{unit}</Text>}
              </View>
              <Text className="text-[11px] mt-1 text-[#007AFF]">{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}