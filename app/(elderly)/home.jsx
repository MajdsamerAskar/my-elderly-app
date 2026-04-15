import { useState, useEffect, useCallback , useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getCurrentUser } from '../../services/auth.service'
import { triggerSOS } from '../../services/sos.service'
import { getTodayMedications } from '../../services/medications.service'
import { updateMyLocation } from '../../services/location.service'
import { checkBreachAndNotify } from '../../services/geofence.service'
import { supabase } from '../../lib/supabase'

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

export default function ElderlyHome() {
  const [user, setUser] = useState(null)
  const [medications, setMedications] = useState([])
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

      const meds = await getTodayMedications(currentUser.user_id)
      setMedications(meds)
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
    // Double confirm before calling
    Alert.alert(
      '🆘 Emergency SOS',
      'This will call your caregiver immediately. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: confirmSOS,
        },
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.bg || '#fff' }}>
  <ActivityIndicator size="large" color={COLORS.primary} />
</View>
    )
  }

  return (
    <ScrollView
  className="flex-1 bg-[COLORS.background]"
  contentContainerStyle={{ paddingBottom: 32 }}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
  {/* Header */}
  <View
    className="flex-row bg-[#5B8CFF] justify-between items-center px-6 pt-[60px] pb-6"
  >
    <View>
      <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
        {getGreeting()}
      </Text>
      <Text className="text-[22px] font-bold text-white mt-0.5">
        {user?.first_name} {user?.last_name} 👋
      </Text>
    </View>
    <View className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
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
      className={`w-[180px] h-[180px] rounded-full justify-center items-center border-[6px] ${sosLoading ? 'opacity-70' : ''}`}
      style={{
        backgroundColor: COLORS.danger,
        borderColor: COLORS.dangerDark,
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
          <Text className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Press for Emergency
          </Text>
        </>
      )}
    </TouchableOpacity>
    <Text className="mt-4 text-[13px]" style={{ color: COLORS.subtle }}>
      Tap to call your caregiver immediately
    </Text>
  </View>

  {/* Medications Today */}
  <View className="mx-4 mb-4">
    <View className="flex-row items-center mb-3 gap-2">
      <Ionicons name="medical" size={20} color={COLORS.primary} />
      <Text className="text-[17px] font-bold flex-1" style={{ color: COLORS.text }}>
        Today's Medications
      </Text>
      {pendingMeds.length > 0 && (
        <View
          className="rounded-xl px-2 py-0.5"
          style={{ backgroundColor: COLORS.danger }}
        >
          <Text className="text-white text-xs font-bold">{pendingMeds.length}</Text>
        </View>
      )}
    </View>

    {medications.length === 0 ? (
      <View
        className="bg-white rounded-xl p-5 items-center border"
        style={{ borderColor: COLORS.border }}
      >
        <Text className="text-[15px]" style={{ color: COLORS.subtle }}>
          ✅ No medications today
        </Text>
      </View>
    ) : (
      medications.map((med, index) => (
        <View
          key={index}
          className="bg-white rounded-xl p-4 mb-2 flex-row items-center border"
          style={{
            borderColor: COLORS.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="flex-1">
            <Text className="text-base font-bold" style={{ color: COLORS.text }}>
              {med.name}
            </Text>
            <Text className="text-[13px] mt-0.5" style={{ color: COLORS.subtle }}>
              {med.dosage}
            </Text>
            <Text className="text-[13px] mt-1 font-semibold" style={{ color: COLORS.primary }}>
              🕐 {med.scheduled_time?.slice(0, 5)}
            </Text>
          </View>
          <View className="ml-3">
            <Ionicons name="checkmark-circle" size={28} color={COLORS.border} />
          </View>
        </View>
      ))
    )}
  </View>

  {/* Health Summary */}
  <View className="mx-4 mb-4">
    <View className="flex-row items-center mb-3 gap-2">
      <Ionicons name="heart" size={20} color={COLORS.danger} />
      <Text className="text-[17px] font-bold flex-1" style={{ color: COLORS.text }}>
        Health Summary
      </Text>
    </View>

    <View className="flex-row flex-wrap gap-[10px]">
      {[
        { emoji: '❤️', label: 'Blood Pressure', value: '-- / --' },
        { emoji: '😊', label: "Today's Mood",   value: '--'       },
        { emoji: '😴', label: 'Last Sleep',      value: '-- hrs'  },
        { emoji: '🩸', label: 'Blood Sugar',     value: '-- mg'   },
      ].map(({ emoji, label, value }) => (
        <TouchableOpacity
          key={label}
          className="bg-white rounded-xl p-4 items-center border"
          style={{
            width: '47%',
            borderColor: COLORS.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <Text className="text-[28px] mb-2">{emoji}</Text>
          <Text className="text-xs text-center" style={{ color: COLORS.subtle }}>{label}</Text>
          <Text className="text-[18px] font-bold mt-1" style={{ color: COLORS.text }}>{value}</Text>
          <Text className="text-[11px] mt-1" style={{ color: COLORS.primary }}>Tap to log</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>

</ScrollView>
  )
}