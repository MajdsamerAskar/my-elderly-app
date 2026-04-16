import { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Dimensions
} from 'react-native'
import MapView, { Marker, Circle } from 'react-native-maps'
import { getCurrentUser } from '../../services/auth.service'
import { getLatestElderlyLocation } from '../../services/location.service'
import { saveGeoFence, getActiveFence } from '../../services/geofence.service'
import { getLinkedElderly } from '../../services/Caregiver.service'

const { height } = Dimensions.get('window')

export default function CaregiverHome() {
  const [elderlyLocation, setElderlyLocation] = useState(null)
  const [fence, setFence] = useState(null)
  const [pendingFence, setPendingFence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elderlyId, setElderlyId] = useState(null)
  const mapRef = useRef(null)

  // ─── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const user = await getCurrentUser()
        const linked = await getLinkedElderly(user.user_id)
        if (!linked.length) { setLoading(false); return }

        const id = linked[0].user_id
        setElderlyId(id)

        const [loc, activeFence] = await Promise.all([
          getLatestElderlyLocation(id),
          getActiveFence(id),
        ])

        setElderlyLocation(loc)
        setFence(activeFence)

        if (loc && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000)
        }
      } catch (e) {
        console.warn(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // ─── Poll elderly location every 30s ─────────────────────────────────────────
  useEffect(() => {
    if (!elderlyId) return
    const interval = setInterval(async () => {
      try {
        const loc = await getLatestElderlyLocation(elderlyId)
        setElderlyLocation(loc)
      } catch (e) {
        console.warn('Poll error:', e.message)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [elderlyId])

  // ─── Map press — place or reposition fence ───────────────────────────────────
  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate
    if (pendingFence) {
      setPendingFence({ ...pendingFence, latitude, longitude })
    } else {
      setPendingFence({ latitude, longitude, radiusMeters: 200 })
    }
  }

  // ─── Save fence to DB ─────────────────────────────────────────────────────────
  const saveFence = async () => {
    if (!pendingFence || !elderlyId) return
    try {
      const saved = await saveGeoFence({
        userId: elderlyId,
        name: 'Safe Zone',
        ...pendingFence,
      })
      setFence(saved)
      setPendingFence(null)
      Alert.alert('Saved', 'Geo-fence saved successfully.')
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  if (loading) return <ActivityIndicator classname="flex-1" />

  const initialRegion = elderlyLocation
    ? {
        latitude: elderlyLocation.latitude,
        longitude: elderlyLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : { latitude: 33.3152, longitude: 44.3661, latitudeDelta: 0.05, longitudeDelta: 0.05 }

  return (
    <ScrollView className="flex-1 bg-[#f5f5f5]" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>

  {/* Header */}
  <Text className="text-xl font-semibold text-gray-900 mb-1">Patient Overview</Text>

  {/* No location banner */}
  {!elderlyLocation && (
    <View className="bg-[#fff3cd] p-2.5 rounded-lg">
      <Text className="text-[#856404] text-center">No location data yet for your patient.</Text>
    </View>
  )}

  {/* Map card */}
  <View className="rounded-xl overflow-hidden border border-gray-200">
    <MapView
      ref={mapRef}
      className="w-full"
      style={{ height: height * 0.35 }}
      initialRegion={initialRegion}
      onPress={handleMapPress}
    >
      {/* Patient location marker */}
      {elderlyLocation && (
        <Marker
          coordinate={{
            latitude: elderlyLocation.latitude,
            longitude: elderlyLocation.longitude,
          }}
          title="Patient Location"
          pinColor="blue"
        />
      )}

      {/* Saved fence — blue */}
      {fence && (
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
      )}

      {/* Pending fence — orange */}
      {pendingFence && (
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
            title="Tap map to reposition"
          />
        </>
      )}
    </MapView>
  </View>

  {/* Pending fence controls */}
  {pendingFence && (
    <View className="bg-white rounded-xl p-3.5 border border-gray-200">
      <Text className="text-xs text-gray-500 mb-2">Tap map to move · + / − to resize</Text>
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-sm text-gray-800">Radius: {pendingFence.radiusMeters}m</Text>
        <TouchableOpacity
          onPress={() =>
            setPendingFence(p => ({ ...p, radiusMeters: Math.max(10, p.radiusMeters - 10) }))
          }
        >
          <Text className="text-[22px] px-2.5 text-gray-800">−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            setPendingFence(p => ({ ...p, radiusMeters: p.radiusMeters + 10 }))
          }
        >
          <Text className="text-[22px] px-2.5 text-gray-800">+</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-[#0070f3] rounded-lg px-3.5 py-2" onPress={saveFence}>
          <Text className="text-white font-semibold text-sm">Save</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPendingFence(null)}>
          <Text className="text-[#E63946] font-semibold text-sm px-1">Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  )}

  {/* ── Add more home screen sections below here ── */}

</ScrollView>
  )
}