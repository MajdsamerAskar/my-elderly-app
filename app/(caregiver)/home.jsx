import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Dimensions
} from 'react-native'
import MapView, { Marker, Circle } from 'react-native-maps'
import { getCurrentUser } from '../../services/auth.service'
import { getLatestElderlyLocation } from '../../services/location.service'
import { saveGeoFence, getActiveFence } from '../../services/geofence.service'
import { getLinkedElderly } from '../../services/Caregiver.service'
import { supabase } from '../../lib/supabase'

const { height } = Dimensions.get('window')

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}
function calcAge(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

// ─── ElderlySelector ─────────────────────────────────────────────────────────
function ElderlySelector({ list, selected, onSelect }) {
  if (!list.length) return null
  return (
    <View style={sel.wrapper}>
      <Text style={sel.label}>Select Patient</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sel.row}
      >
        {list.map((e) => {
          const active = selected?.user_id === e.user_id
          const age    = calcAge(e.date_of_birth)
          return (
            <TouchableOpacity
              key={e.user_id}
              style={[sel.chip, active && sel.chipActive]}
              onPress={() => onSelect(e)}
              activeOpacity={0.8}
            >
              <View style={[sel.avatar, active && sel.avatarActive]}>
                <Text style={[sel.initials, active && sel.initialsActive]}>
                  {getInitials(e.first_name, e.last_name)}
                </Text>
              </View>
              <Text style={[sel.name, active && sel.nameActive]}>{e.first_name}</Text>
              {age ? <Text style={sel.age}>{age} yrs</Text> : null}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const sel = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9999AA',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 0,
    marginBottom: 10,
  },
  row: { gap: 10, paddingBottom: 4 },
  chip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    minWidth: 72,
  },
  chipActive:     { borderColor: '#0070f3', backgroundColor: '#EDF2FF' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E2E8F0', marginBottom: 6,
  },
  avatarActive:   { backgroundColor: '#C5D3FF' },
  initials:       { fontSize: 15, fontWeight: '800', color: '#555570' },
  initialsActive: { color: '#0070f3' },
  name:           { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  nameActive:     { color: '#0070f3' },
  age:            { fontSize: 10, color: '#9999AA', marginTop: 2 },
})

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CaregiverHome() {
  const [linkedPatients,  setLinkedPatients]  = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loadingPatients, setLoadingPatients] = useState(true)

  const [elderlyLocation, setElderlyLocation] = useState(null)
  const [fence,           setFence]           = useState(null)
  const [pendingFence,    setPendingFence]     = useState(null)
  const [loadingData,     setLoadingData]      = useState(false)

  const mapRef     = useRef(null)
  const pollRef    = useRef(null)

  // ── 1. Load caregiver + linked patients once ───────────────
  useEffect(() => {
    ;(async () => {
      try {
        const user    = await getCurrentUser()
        const linked  = await getLinkedElderly(user.user_id)

        // getLinkedElderly may return partial objects — enrich with DOB if missing
        // by querying users table for date_of_birth
        let patients = linked
        if (linked.length && !linked[0].date_of_birth) {
          const ids = linked.map(p => p.user_id)
          const { data } = await supabase
            .from('users')
            .select('user_id, first_name, last_name, date_of_birth, profile_photo_url')
            .in('user_id', ids)
          if (data) patients = data
        }

        setLinkedPatients(patients)
        if (patients.length) setSelectedPatient(patients[0])
      } catch (e) {
        console.warn('Failed to load patients:', e.message)
      } finally {
        setLoadingPatients(false)
      }
    })()
  }, [])

  // ── 2. Load location + fence when selected patient changes ─
  const loadPatientData = useCallback(async (patient) => {
    if (!patient) return
    setLoadingData(true)
    setElderlyLocation(null)
    setFence(null)
    setPendingFence(null)
    try {
      const [loc, activeFence] = await Promise.all([
        getLatestElderlyLocation(patient.user_id),
        getActiveFence(patient.user_id),
      ])
      setElderlyLocation(loc)
      setFence(activeFence)

      if (loc && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude:      loc.latitude,
          longitude:     loc.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 800)
      }
    } catch (e) {
      console.warn('Patient data error:', e.message)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    loadPatientData(selectedPatient)
  }, [selectedPatient])

  // ── 3. Poll location every 30s for selected patient ────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!selectedPatient) return

    pollRef.current = setInterval(async () => {
      try {
        const loc = await getLatestElderlyLocation(selectedPatient.user_id)
        setElderlyLocation(loc)
      } catch (e) {
        console.warn('Poll error:', e.message)
      }
    }, 30_000)

    return () => clearInterval(pollRef.current)
  }, [selectedPatient])

  // ── Map press ──────────────────────────────────────────────
  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate
    if (pendingFence) {
      setPendingFence({ ...pendingFence, latitude, longitude })
    } else {
      setPendingFence({ latitude, longitude, radiusMeters: 200 })
    }
  }

  // ── Save fence ─────────────────────────────────────────────
  const saveFence = async () => {
    if (!pendingFence || !selectedPatient) return
    try {
      const saved = await saveGeoFence({
        userId: selectedPatient.user_id,
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

  // ── Map initial region ─────────────────────────────────────
  const initialRegion = elderlyLocation
    ? {
        latitude:      elderlyLocation.latitude,
        longitude:     elderlyLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : { latitude: 33.3152, longitude: 44.3661, latitudeDelta: 0.05, longitudeDelta: 0.05 }

  // ─────────────────────────────────────────────────────────────
  if (loadingPatients) {
    return (
      <View style={styles.centerLoad}>
        <ActivityIndicator size="large" color="#0070f3" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {/* ── Header ── */}
      <Text style={styles.title}>Patient Overview</Text>

      {/* ── Patient selector ── */}
      {linkedPatients.length === 0 ? (
        <View style={styles.noPatientsBox}>
          <Text style={styles.noPatientsText}>
            No linked patients yet. Send a request to get started.
          </Text>
        </View>
      ) : (
        <ElderlySelector
          list={linkedPatients}
          selected={selectedPatient}
          onSelect={(p) => setSelectedPatient(p)}
        />
      )}

      {/* ── Loading indicator while switching patients ── */}
      {loadingData && (
        <View style={styles.dataLoad}>
          <ActivityIndicator size="small" color="#0070f3" />
          <Text style={styles.dataLoadText}>Loading patient data…</Text>
        </View>
      )}

      {/* ── No location banner ── */}
      {!loadingData && selectedPatient && !elderlyLocation && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>
            No location data yet for {selectedPatient.first_name}.
          </Text>
        </View>
      )}

      {/* ── Map card ── */}
      {selectedPatient && (
        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            style={{ width: '100%', height: height * 0.35 }}
            initialRegion={initialRegion}
            onPress={handleMapPress}
          >
            {elderlyLocation && (
              <Marker
                coordinate={{
                  latitude:  elderlyLocation.latitude,
                  longitude: elderlyLocation.longitude,
                }}
                title={`${selectedPatient.first_name}'s Location`}
                pinColor="blue"
              />
            )}

            {fence && (
              <Circle
                center={{
                  latitude:  Number(fence.center_latitude),
                  longitude: Number(fence.center_longitude),
                }}
                radius={fence.radius_meters}
                fillColor="rgba(0,150,255,0.15)"
                strokeColor="rgba(0,100,255,0.5)"
                strokeWidth={2}
              />
            )}

            {pendingFence && (
              <>
                <Circle
                  center={{
                    latitude:  pendingFence.latitude,
                    longitude: pendingFence.longitude,
                  }}
                  radius={pendingFence.radiusMeters}
                  fillColor="rgba(255,165,0,0.15)"
                  strokeColor="rgba(255,140,0,0.7)"
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{
                    latitude:  pendingFence.latitude,
                    longitude: pendingFence.longitude,
                  }}
                  pinColor="orange"
                  title="Tap map to reposition"
                />
              </>
            )}
          </MapView>
        </View>
      )}

      {/* ── Fence controls ── */}
      {pendingFence && (
        <View style={styles.fenceCard}>
          <Text style={styles.fenceHint}>Tap map to move · + / − to resize</Text>
          <View style={styles.fenceRow}>
            <Text style={styles.fenceRadius}>Radius: {pendingFence.radiusMeters}m</Text>
            <TouchableOpacity
              style={styles.fenceBtn}
              onPress={() =>
                setPendingFence(p => ({ ...p, radiusMeters: Math.max(10, p.radiusMeters - 10) }))
              }
            >
              <Text style={styles.fenceBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fenceBtn}
              onPress={() =>
                setPendingFence(p => ({ ...p, radiusMeters: p.radiusMeters + 10 }))
              }
            >
              <Text style={styles.fenceBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveFenceBtn} onPress={saveFence}>
              <Text style={styles.saveFenceBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingFence(null)}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Add more home screen sections below here ── */}

    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centerLoad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:   { flex: 1, backgroundColor: '#F5F5F5' },
  content:  { padding: 16, gap: 12, paddingBottom: 40 },

  title: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 4 },

  // No patients
  noPatientsBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
  },
  noPatientsText: { color: '#856404', textAlign: 'center', fontSize: 13 },

  // Loading while switching
  dataLoad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dataLoadText: { fontSize: 13, color: '#9999AA' },

  // Warning banner
  warnBanner: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 10,
  },
  warnText: { color: '#856404', textAlign: 'center', fontSize: 13 },

  // Map
  mapCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Fence controls
  fenceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fenceHint:   { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  fenceRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fenceRadius: { flex: 1, fontSize: 14, color: '#1F2937' },
  fenceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fenceBtnText:    { fontSize: 22, color: '#1F2937' },
  saveFenceBtn:    { backgroundColor: '#0070f3', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveFenceBtnText:{ color: '#FFF', fontWeight: '600', fontSize: 14 },
  resetText:       { color: '#E63946', fontWeight: '600', fontSize: 14, paddingHorizontal: 4 },
})