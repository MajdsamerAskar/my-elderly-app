import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import MapView, { Marker, Circle } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import { getCurrentUser } from '../../services/auth.service'
import { getLatestElderlyLocation } from '../../services/location.service'
import { saveGeoFence, getActiveFence } from '../../services/geofence.service'
import { getLinkedElderly } from '../../services/Caregiver.service'
import { supabase } from '../../lib/supabase'

const { height } = Dimensions.get('window')

function getInitials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function calcAge(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function ElderlySelector({ list, selected, onSelect }) {
  const { t } = useTranslation()

  if (!list.length) return null

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">
        {t('selectPatient') || 'Select patient'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3 pb-1">
          {list.map((elderly) => {
            const active = selected?.user_id === elderly.user_id
            const age = calcAge(elderly.date_of_birth)

            return (
              <TouchableOpacity
                key={elderly.user_id}
                className={`items-center py-2.5 px-3.5 rounded-2xl border min-w-[72px] ${
                  active
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-border bg-surface'
                }`}
                onPress={() => onSelect(elderly)}
                activeOpacity={0.8}
              >
                <View
                  className={`w-11 h-11 rounded-full items-center justify-center mb-1.5 ${
                    active
                      ? 'bg-blue-100 dark:bg-blue-900/50'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      active ? 'text-blue-600 dark:text-blue-300' : 'text-text-secondary'
                    }`}
                  >
                    {getInitials(elderly.first_name, elderly.last_name)}
                  </Text>
                </View>
                <Text
                  className={`text-sm font-bold ${
                    active ? 'text-blue-600 dark:text-blue-300' : 'text-text'
                  }`}
                >
                  {elderly.first_name}
                </Text>
                {age ? (
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {age} {t('yearsAbbrev') || 'yrs'}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

export default function CaregiverHome() {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  const [linkedPatients, setLinkedPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [elderlyLocation, setElderlyLocation] = useState(null)
  const [fence, setFence] = useState(null)
  const [pendingFence, setPendingFence] = useState(null)
  const [loadingData, setLoadingData] = useState(false)

  const mapRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    ;(async () => {
      try {
        const user = await getCurrentUser()
        const linked = await getLinkedElderly(user.user_id)

        let patients = linked
        if (linked.length && !linked[0].date_of_birth) {
          const ids = linked.map((patient) => patient.user_id)
          const { data } = await supabase
            .from('users')
            .select('user_id, first_name, last_name, date_of_birth, profile_photo_url')
            .in('user_id', ids)

          if (data) patients = data
        }

        setLinkedPatients(patients)
        if (patients.length) setSelectedPatient(patients[0])
      } catch (error) {
        console.warn('Failed to load patients:', error.message)
      } finally {
        setLoadingPatients(false)
      }
    })()
  }, [])

  const loadPatientData = useCallback(async (patient) => {
    if (!patient) return

    setLoadingData(true)
    setElderlyLocation(null)
    setFence(null)
    setPendingFence(null)

    try {
      const [location, activeFence] = await Promise.all([
        getLatestElderlyLocation(patient.user_id),
        getActiveFence(patient.user_id),
      ])

      setElderlyLocation(location)
      setFence(activeFence)

      if (location && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 800)
      }
    } catch (error) {
      console.warn('Patient data error:', error.message)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    loadPatientData(selectedPatient)
  }, [loadPatientData, selectedPatient])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!selectedPatient) return

    pollRef.current = setInterval(async () => {
      try {
        const location = await getLatestElderlyLocation(selectedPatient.user_id)
        setElderlyLocation(location)
      } catch (error) {
        console.warn('Poll error:', error.message)
      }
    }, 30_000)

    return () => clearInterval(pollRef.current)
  }, [selectedPatient])

  function handleMapPress(event) {
    const { latitude, longitude } = event.nativeEvent.coordinate
    if (pendingFence) {
      setPendingFence({ ...pendingFence, latitude, longitude })
    } else {
      setPendingFence({ latitude, longitude, radiusMeters: 200 })
    }
  }

  async function handleSaveFence() {
    if (!pendingFence || !selectedPatient) return

    try {
      const saved = await saveGeoFence({
        userId: selectedPatient.user_id,
        name: t('safeZone') || 'Safe Zone',
        ...pendingFence,
      })

      setFence(saved)
      setPendingFence(null)
      Alert.alert(
        t('saved') || 'Saved',
        t('geofenceSaved') || 'Geo-fence saved successfully.'
      )
    } catch (error) {
      Alert.alert(t('error') || 'Error', error.message)
    }
  }

  const initialRegion = elderlyLocation
    ? {
        latitude: elderlyLocation.latitude,
        longitude: elderlyLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 33.3152,
        longitude: 44.3661,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }

  if (loadingPatients) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0070F3" />
          <Text className="text-text-secondary mt-4">
            {t('loadingPatients') || 'Loading patients...'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-10">
        <Text className="text-2xl font-bold text-text mb-1">
          {t('patientOverview') || 'Patient overview'}
        </Text>
        <Text className="text-text-secondary mb-5">
          {t('caregiverHomeSubtitle') || 'Check location updates and manage safe zones'}
        </Text>

        {linkedPatients.length === 0 ? (
          <View className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-2xl p-4">
            <Text className="text-yellow-800 dark:text-yellow-200 text-center">
              {t('noLinkedPatientsYet') || 'No linked patients yet. Send a request to get started.'}
            </Text>
          </View>
        ) : (
          <ElderlySelector
            list={linkedPatients}
            selected={selectedPatient}
            onSelect={setSelectedPatient}
          />
        )}

        {loadingData ? (
          <View className="flex-row items-center gap-2 py-3">
            <ActivityIndicator size="small" color="#0070F3" />
            <Text className="text-text-secondary">
              {t('loadingPatientData') || 'Loading patient data...'}
            </Text>
          </View>
        ) : null}

        {!loadingData && selectedPatient && !elderlyLocation ? (
          <View className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-2xl p-4 mb-4">
            <Text className="text-yellow-800 dark:text-yellow-200 text-center">
              {t('noLocationDataForPatient', {
                name: selectedPatient.first_name,
                defaultValue: `No location data yet for ${selectedPatient.first_name}.`,
              })}
            </Text>
          </View>
        ) : null}

        {selectedPatient ? (
          <View className="rounded-2xl overflow-hidden border border-border bg-surface">
            <MapView
              ref={mapRef}
              style={{ width: '100%', height: height * 0.35 }}
              initialRegion={initialRegion}
              onPress={handleMapPress}
            >
              {elderlyLocation ? (
                <Marker
                  coordinate={{
                    latitude: elderlyLocation.latitude,
                    longitude: elderlyLocation.longitude,
                  }}
                  title={t('patientLocationTitle', {
                    name: selectedPatient.first_name,
                    defaultValue: `${selectedPatient.first_name}'s Location`,
                  })}
                  pinColor="blue"
                />
              ) : null}

              {fence ? (
                <Circle
                  center={{
                    latitude: Number(fence.center_latitude),
                    longitude: Number(fence.center_longitude),
                  }}
                  radius={fence.radius_meters}
                  fillColor="rgba(0,150,255,0.15)"
                  strokeColor="rgba(0,100,255,0.5)"
                  strokeWidth={2}
                />
              ) : null}

              {pendingFence ? (
                <>
                  <Circle
                    center={{
                      latitude: pendingFence.latitude,
                      longitude: pendingFence.longitude,
                    }}
                    radius={pendingFence.radiusMeters}
                    fillColor="rgba(255,165,0,0.15)"
                    strokeColor="rgba(255,140,0,0.7)"
                    strokeWidth={2}
                  />
                  <Marker
                    coordinate={{
                      latitude: pendingFence.latitude,
                      longitude: pendingFence.longitude,
                    }}
                    pinColor="orange"
                    title={t('tapMapToReposition') || 'Tap map to reposition'}
                  />
                </>
              ) : null}
            </MapView>
          </View>
        ) : null}

        {pendingFence ? (
          <View className="bg-surface rounded-2xl p-4 border border-border mt-4">
            <Text className="text-sm text-text-secondary mb-3">
              {t('tapMapMoveResizeFence') || 'Tap map to move · + / - to resize'}
            </Text>
            <View className="flex-row items-center flex-wrap gap-2">
              <Text className="flex-1 text-base text-text">
                {t('radiusMeters', {
                  radius: pendingFence.radiusMeters,
                  defaultValue: `Radius: ${pendingFence.radiusMeters}m`,
                })}
              </Text>
              <TouchableOpacity
                className="px-3 py-1.5 rounded-lg bg-background border border-border"
                onPress={() =>
                  setPendingFence((value) => ({
                    ...value,
                    radiusMeters: Math.max(10, value.radiusMeters - 10),
                  }))
                }
              >
                <Text className="text-xl text-text">-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-3 py-1.5 rounded-lg bg-background border border-border"
                onPress={() =>
                  setPendingFence((value) => ({
                    ...value,
                    radiusMeters: value.radiusMeters + 10,
                  }))
                }
              >
                <Text className="text-xl text-text">+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-primary_blue rounded-lg px-4 py-2.5"
                onPress={handleSaveFence}
              >
                <Text className="text-white font-semibold">
                  {t('save') || 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPendingFence(null)}>
                <Text className="text-red-600 dark:text-red-300 font-semibold px-2">
                  {t('reset') || 'Reset'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
