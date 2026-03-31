import { useState, useEffect, useCallback } from 'react'
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

  useEffect(() => {
    loadData()
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>
            {user?.first_name} {user?.last_name} 👋
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* SOS Button */}
      <View style={styles.sosContainer}>
        <TouchableOpacity
          style={[styles.sosButton, sosLoading && styles.sosButtonDisabled]}
          onPress={handleSOS}
          disabled={sosLoading}
          activeOpacity={0.8}
        >
          {sosLoading ? (
            <ActivityIndicator size="large" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.sosIcon}>🆘</Text>
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.sosSubtext}>Press for Emergency</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.sosHint}>
          Tap to call your caregiver immediately
        </Text>
      </View>

      {/* Medications Today */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="medical" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Today's Medications</Text>
          {pendingMeds.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingMeds.length}</Text>
            </View>
          )}
        </View>

        {medications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>✅ No medications today</Text>
          </View>
        ) : (
          medications.map((med, index) => (
            <View key={index} style={styles.medCard}>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDosage}>{med.dosage}</Text>
                <Text style={styles.medTime}>
                  🕐 {med.scheduled_time?.slice(0, 5)}
                </Text>
              </View>
              <View style={styles.medStatus}>
                <Ionicons
                  name="checkmark-circle"
                  size={28}
                  color={COLORS.border}
                />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Health Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="heart" size={20} color={COLORS.danger} />
          <Text style={styles.sectionTitle}>Health Summary</Text>
        </View>

        <View style={styles.healthGrid}>
          <TouchableOpacity style={styles.healthCard}>
            <Text style={styles.healthEmoji}>❤️</Text>
            <Text style={styles.healthLabel}>Blood Pressure</Text>
            <Text style={styles.healthValue}>-- / --</Text>
            <Text style={styles.healthHint}>Tap to log</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.healthCard}>
            <Text style={styles.healthEmoji}>😊</Text>
            <Text style={styles.healthLabel}>Today's Mood</Text>
            <Text style={styles.healthValue}>--</Text>
            <Text style={styles.healthHint}>Tap to log</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.healthCard}>
            <Text style={styles.healthEmoji}>😴</Text>
            <Text style={styles.healthLabel}>Last Sleep</Text>
            <Text style={styles.healthValue}>-- hrs</Text>
            <Text style={styles.healthHint}>Tap to log</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.healthCard}>
            <Text style={styles.healthEmoji}>🩸</Text>
            <Text style={styles.healthLabel}>Blood Sugar</Text>
            <Text style={styles.healthValue}>-- mg</Text>
            <Text style={styles.healthHint}>Tap to log</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: COLORS.primary,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: COLORS.white,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 6,
    borderColor: COLORS.dangerDark,
  },
  sosButtonDisabled: {
    opacity: 0.7,
  },
  sosIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  sosText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  sosHint: {
    marginTop: 16,
    fontSize: 13,
    color: COLORS.subtle,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.subtle,
  },
  medCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  medDosage: {
    fontSize: 13,
    color: COLORS.subtle,
    marginTop: 2,
  },
  medTime: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  medStatus: {
    marginLeft: 12,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  healthCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  healthEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 12,
    color: COLORS.subtle,
    textAlign: 'center',
  },
  healthValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  healthHint: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
  },
})