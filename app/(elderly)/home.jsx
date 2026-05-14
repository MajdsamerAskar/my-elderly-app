import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
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

function localToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ElderlyHome() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isDark } = useTheme()
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

      const [meds, biometrics, sleepSessions, checkin] = await Promise.allSettled([
        getTodayMedications(currentUser.user_id),
        getLatestBiometrics(currentUser.user_id),
        getSleepSessions(currentUser.user_id, 1),
        getTodayCheckin(),
      ])

      if (meds.status === 'fulfilled') setMedications(meds.value)

      const summary = { heartRate: null, mood: null, sleepHours: null, spo2: null }

      if (biometrics.status === 'fulfilled') {
        const today = localToday()
        const hr = biometrics.value?.heart_rate
        const sp = biometrics.value?.spo2
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
        const score = checkin.value.mood_score
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
  t('emergencySOS'),
  t('sosConfirmMessage'),
  [
    { text: t('cancel'), style: 'cancel' },
    { text: t('callNow'), style: 'destructive', onPress: confirmSOS },
  ]
)
  }

  const confirmSOS = async () => {
    setSosLoading(true)
    try {
      const result = await triggerSOS(user.user_id)
      if (result.type === 'caregiver') {
        Alert.alert(t('callingCaregiver'), t('callingCaregiverDesc', { name: result.calledName }))
      } else {
        Alert.alert(t('calling911'), t('calling911Desc'))
      }
    } catch (error) {
      Alert.alert(t('sosError'), t('sosErrorDesc'))
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
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#5B8CFF" />
      </View>
    )
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row bg-[#5B8CFF] justify-between items-center px-6 pt-12 pb-6">
          <View>
            <Text className="text-sm text-white/80">{getGreeting()}</Text>
            <Text className="text-[22px] font-bold text-white mt-0.5">
              {user?.first_name} {user?.last_name} 👋
            </Text>
          </View>
          <View className="rounded-lg px-2.5 py-1.5 bg-white/20">
            <Text className="text-white/90 text-[13px] font-semibold">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* SOS Button */}
        <View className="items-center py-8 bg-surface mb-4 mx-4 mt-4 rounded-2xl shadow-sm">
          <TouchableOpacity
            className={`w-[180px] h-[180px] rounded-full justify-center items-center border-[6px] border-white dark:border-gray-700 ${sosLoading ? 'opacity-70' : ''}`}
            style={{
              backgroundColor: '#E63946',
              shadowColor: '#E63946',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 15,
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
                <Text className="text-[11px] mt-0.5 text-white/90">{t('pressForEmergency')}</Text>
              </>
            )}
          </TouchableOpacity>
          <Text className="mt-4 text-[13px] text-text-secondary text-center px-4">
  {t('tapToCallCaregiver')}
</Text>
        </View>

        {/* Medications Today */}
        <View className="mx-4 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="medical" size={20} color="#5B8CFF" style={{ marginRight: 8 }} />
            <Text className="text-[17px] font-bold flex-1 text-text">
  {t('todaysMedications')}
</Text>
            {pendingMeds.length > 0 && (
              <View className="rounded-xl px-2 py-0.5 bg-[#E63946]">
                <Text className="text-white text-xs font-bold">{pendingMeds.length}</Text>
              </View>
            )}
          </View>

          {medications.length === 0 ? (
            <View className="bg-surface rounded-xl p-5 items-center border border-border">
              <Text className="text-[15px] text-text-secondary">✅ {t('noMedicationsToday')}</Text>
            </View>
          ) : (
            medications.map((med, index) => (
              <View
                key={index}
                className="bg-surface rounded-xl p-4 mb-2 flex-row items-center border border-border"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="flex-1">
                  <Text className="text-base font-bold text-text">{med.name}</Text>
                  <Text className="text-[13px] mt-0.5 text-text-secondary">{med.dosage}</Text>
                  <Text className="text-[13px] mt-1 font-semibold text-primary">
                    🕐 {med.scheduled_time?.slice(0, 5)}
                  </Text>
                </View>
                <View className="ml-3">
                  <Ionicons
                    name={med.taken ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={28}
                    color={med.taken ? '#52B788' : isDark ? '#475569' : '#E0E0E0'}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Health Summary */}
        <View className="mx-4 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="heart" size={20} color="#E63946" style={{ marginRight: 8 }} />
            <Text className="text-[17px] font-bold flex-1 text-text">{t('healthSummary')}</Text>
          </View>

          <View className="flex-row flex-wrap gap-[10px]">
            {healthCards.map(({ emoji, label, value, unit, sub }) => (
              <TouchableOpacity
                key={label}
                className="bg-surface rounded-xl p-4 items-center border border-border"
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
                <Text className="text-xs text-center text-text-secondary">{label}</Text>
                <View className="flex-row items-baseline mt-1">
                  <Text className="text-[18px] font-bold text-text">{value}</Text>
                  {unit && <Text className="text-[12px] text-text-secondary ml-1">{unit}</Text>}
                </View>
                <Text className="text-[11px] mt-1 text-primary">{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  )
}