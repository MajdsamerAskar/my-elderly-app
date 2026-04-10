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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />

  const initialRegion = elderlyLocation
    ? {
        latitude: elderlyLocation.latitude,
        longitude: elderlyLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : { latitude: 33.3152, longitude: 44.3661, latitudeDelta: 0.05, longitudeDelta: 0.05 }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <Text style={styles.heading}>Patient Overview</Text>

      {/* No location banner */}
      {!elderlyLocation && (
        <View style={styles.banner}>
          <Text style={styles.bannerTxt}>No location data yet for your patient.</Text>
        </View>
      )}

      {/* Map card */}
      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={styles.map}
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
        <View style={styles.panel}>
          <Text style={styles.hint}>Tap map to move · + / − to resize</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Radius: {pendingFence.radiusMeters}m</Text>
            <TouchableOpacity
              onPress={() =>
                setPendingFence(p => ({ ...p, radiusMeters: Math.max(10, p.radiusMeters - 10) }))
              }
            >
              <Text style={styles.btn}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setPendingFence(p => ({ ...p, radiusMeters: p.radiusMeters + 10 }))
              }
            >
              <Text style={styles.btn}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveFence}>
              <Text style={styles.saveTxt}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingFence(null)}>
              <Text style={styles.resetTxt}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Add more home screen sections below here ── */}

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  heading: { fontSize: 20, fontWeight: '600', color: '#111', marginBottom: 4 },

  mapCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: { height: height * 0.35 },

  panel: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hint: { fontSize: 12, color: '#888', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 14, color: '#333' },
  btn: { fontSize: 22, paddingHorizontal: 10, color: '#333' },
  saveBtn: {
    backgroundColor: '#0070f3',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveTxt: { color: 'white', fontWeight: '600', fontSize: 14 },
  resetTxt: { color: '#E63946', fontWeight: '600', fontSize: 14, paddingHorizontal: 4 },

  banner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
  },
  bannerTxt: { color: '#856404', textAlign: 'center' },
})