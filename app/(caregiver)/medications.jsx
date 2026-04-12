import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  getAllMedications,
  addMedication,
  editMedication,
  removeMedication,
  pickMedicationImage,
  takeMedicationPhoto,
} from '../../services/medications.service'
import { getLinkedElderly } from '../../services/Caregiver.service'
import { getCurrentUser } from '../../services/auth.service'

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABELS = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' }

const C = {
  bg:          '#F4F6FA',
  card:        '#FFFFFF',
  primary:     '#3B5BDB',
  primaryLight:'#748FFC',
  primaryBg:   '#EDF2FF',
  accent:      '#F03E3E',
  accentBg:    '#FFF5F5',
  success:     '#2F9E44',
  successBg:   '#EBFBEE',
  text:        '#1A1A2E',
  textMid:     '#555570',
  textLight:   '#9999AA',
  border:      '#E2E8F0',
  shadow:      'rgba(59,91,219,0.10)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

// ─── Elderly Selector ─────────────────────────────────────────────────────────
function ElderlySelector({ list, selected, onSelect }) {
  return (
    <View>
      <Text style={st.sectionLabel}>Select Patient</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 4 }}>
        {list.map(e => {
          const active = selected?.user_id === e.user_id
          const age = calcAge(e.date_of_birth)
          return (
            <TouchableOpacity
              key={e.user_id}
              style={[st.elderlyChip, active && st.elderlyChipActive]}
              onPress={() => onSelect(e)}
              activeOpacity={0.8}
            >
              <View style={[st.avatar, active && st.avatarActive]}>
                <Text style={[st.avatarText, active && { color: C.primary }]}>
                  {getInitials(e.first_name, e.last_name)}
                </Text>
              </View>
              <Text style={[st.elderlyName, active && st.elderlyNameActive]}>
                {e.first_name}
              </Text>
              {age ? <Text style={st.elderlyAge}>{age} yrs</Text> : null}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─── Med Card ─────────────────────────────────────────────────────────────────
function MedCard({ med, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  const days = med.medication_schedules
    ?.flatMap(s => s.medication_schedule_days?.map(d => DAY_LABELS[d.day_of_week]) || [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(' · ')

  const times = med.medication_schedules
    ?.map(s => formatTime(s.scheduled_time))
    .join(', ')

  return (
    <TouchableOpacity style={st.card} onPress={() => setExpanded(e => !e)} activeOpacity={0.88}>
      <View style={st.cardRow}>
        {/* Photo */}
        {med.photo_url
          ? <Image source={{ uri: med.photo_url }} style={st.medPhoto} />
          : <View style={[st.medPhoto, st.medPhotoPlaceholder]}><Text style={{ fontSize: 22 }}>💊</Text></View>
        }

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={st.medName}>{med.name}</Text>
          {med.dosage ? <Text style={st.medDosage}>{med.dosage}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {times ? <View style={st.pill}><Text style={st.pillText}>⏰ {times}</Text></View> : null}
            {days  ? <View style={st.pill}><Text style={st.pillText}>{days}</Text></View>  : null}
          </View>
        </View>

        <Text style={{ fontSize: 12, color: C.textLight, paddingLeft: 6 }}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={st.cardExpanded}>
          {med.purpose      ? <Text style={st.detail}><Text style={st.detailLabel}>Purpose: </Text>{med.purpose}</Text> : null}
          {med.instructions ? <Text style={st.detail}><Text style={st.detailLabel}>Instructions: </Text>{med.instructions}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.primaryBg }]} onPress={() => onEdit(med)}>
              <Text style={[st.actionBtnText, { color: C.primary }]}>✏️  Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.accentBg }]} onPress={() => onDelete(med)}>
              <Text style={[st.actionBtnText, { color: C.accent }]}>🗑  Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─── Med Form Modal (shared by Add & Edit) ────────────────────────────────────
function MedFormModal({ visible, initial, onClose, onSave, title }) {
  const empty = { name: '', purpose: '', dosage: '', instructions: '', scheduledTime: '', daysOfWeek: [], photoUri: null }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (initial) {
      const firstSched = initial.medication_schedules?.[0]
      const days = initial.medication_schedules
        ?.flatMap(s => s.medication_schedule_days?.map(d => d.day_of_week) || [])
        .filter((v, i, a) => a.indexOf(v) === i)
      setForm({
        name:          initial.name || '',
        purpose:       initial.purpose || '',
        dosage:        initial.dosage || '',
        instructions:  initial.instructions || '',
        scheduledTime: firstSched?.scheduled_time?.slice(0, 5) || '',
        daysOfWeek:    days || [],
        photoUri:      initial.photo_url || null,
      })
    } else {
      setForm(empty)
    }
  }, [visible, initial])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day],
    }))
  }

  async function pickPhoto(useCamera) {
    try {
      const uri = useCamera ? await takeMedicationPhoto() : await pickMedicationImage()
      if (uri) set('photoUri', uri)
    } catch (e) { Alert.alert('Error', e.message) }
  }

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('Required', 'Please enter the medication name.'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.sheet}>
          <View style={st.handle} />
          <Text style={st.sheetTitle}>{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Photo */}
            <Text style={st.label}>Photo</Text>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              {form.photoUri
                ? <Image source={{ uri: form.photoUri }} style={st.photoPreview} />
                : <View style={st.photoPreviewEmpty}><Text style={{ fontSize: 36 }}>💊</Text><Text style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>Add a photo</Text></View>
              }
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={st.photoBtn} onPress={() => pickPhoto(true)}>
                  <Text style={st.photoBtnText}>📷 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.photoBtn} onPress={() => pickPhoto(false)}>
                  <Text style={st.photoBtnText}>🖼 Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={st.label}>Name *</Text>
            <TextInput style={st.input} placeholder="e.g. Metformin" value={form.name} onChangeText={v => set('name', v)} />

            <Text style={st.label}>Purpose</Text>
            <TextInput style={st.input} placeholder="e.g. Blood sugar control" value={form.purpose} onChangeText={v => set('purpose', v)} />

            <Text style={st.label}>Dosage</Text>
            <TextInput style={st.input} placeholder="e.g. 500mg" value={form.dosage} onChangeText={v => set('dosage', v)} />

            <Text style={st.label}>Instructions</Text>
            <TextInput style={[st.input, { height: 70 }]} placeholder="e.g. Take with food" multiline value={form.instructions} onChangeText={v => set('instructions', v)} />

            <Text style={st.label}>Scheduled Time (HH:MM)</Text>
            <TextInput style={st.input} placeholder="e.g. 08:00" value={form.scheduledTime} onChangeText={v => set('scheduledTime', v)} keyboardType="numbers-and-punctuation" />

            <Text style={st.label}>Days of Week</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {DAYS.map(day => {
                const on = form.daysOfWeek.includes(day)
                return (
                  <TouchableOpacity
                    key={day}
                    style={[st.dayChip, on && st.dayChipOn]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[st.dayChipText, on && st.dayChipTextOn]}>{DAY_LABELS[day]}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity style={[st.primaryBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryBtnText}>Save</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={st.ghostBtn} onPress={onClose}>
              <Text style={st.ghostBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CaregiverMedicationsScreen() {
  const [caregiverId, setCaregiverId]   = useState(null)
  const [elderlyList, setElderlyList]   = useState([])
  const [selected, setSelected]         = useState(null)   // selected elderly
  const [meds, setMeds]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadingMeds, setLoadingMeds]   = useState(false)
  const [showAdd, setShowAdd]           = useState(false)
  const [editTarget, setEditTarget]     = useState(null)

  // Load caregiver + their linked elderly
  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser()
        if (!user) return
        setCaregiverId(user.user_id)
        const linked = await getLinkedElderly(user.user_id)
        setElderlyList(linked)
        if (linked.length > 0) setSelected(linked[0])
      } catch (e) {
        Alert.alert('Error', 'Could not load patients.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Load meds when selected elderly changes
  useFocusEffect(
    useCallback(() => {
      if (selected) loadMeds(selected.user_id)
    }, [selected])
  )

  async function loadMeds(userId) {
    setLoadingMeds(true)
    try {
      const data = await getAllMedications(userId)
      setMeds(data)
    } catch (e) {
      Alert.alert('Error', 'Could not load medications.')
    } finally {
      setLoadingMeds(false)
    }
  }

  async function handleAdd(formData) {
    await addMedication(selected.user_id, formData)
    await loadMeds(selected.user_id)
  }

  async function handleEdit(formData) {
    await editMedication(editTarget.medication_id, selected.user_id, formData)
    await loadMeds(selected.user_id)
  }

  async function handleDelete(med) {
    Alert.alert(
      'Remove Medication',
      `Remove "${med.name}" from ${selected.first_name}'s list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeMedication(med.medication_id)
            await loadMeds(selected.user_id)
          },
        },
      ]
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ marginTop: 12, color: C.textMid }}>Loading patients…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.headerTitle}>Medications</Text>
          <Text style={st.headerSub}>Manage your patients' medications</Text>
        </View>
        {selected && (
          <TouchableOpacity style={st.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={st.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* No patients linked */}
      {elderlyList.length === 0 ? (
        <View style={st.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>👥</Text>
          <Text style={st.emptyTitle}>No patients linked</Text>
          <Text style={st.emptyText}>Link an elderly patient to your account first.</Text>
        </View>
      ) : (
        <>
          {/* Patient selector */}
          <ElderlySelector list={elderlyList} selected={selected} onSelect={e => { setSelected(e); loadMeds(e.user_id) }} />

          {/* Divider with patient name */}
          {selected && (
            <View style={st.patientBar}>
              <View style={st.patientBarDot} />
              <Text style={st.patientBarText}>
                {selected.first_name} {selected.last_name} — {meds.length} medication{meds.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Medications list */}
          {loadingMeds ? (
            <View style={st.centered}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : meds.length === 0 ? (
            <View style={st.centered}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>💊</Text>
              <Text style={st.emptyTitle}>No medications yet</Text>
              <Text style={st.emptyText}>Tap "+ Add" to add a medication for {selected?.first_name}.</Text>
              <TouchableOpacity style={[st.primaryBtn, { marginTop: 20, paddingHorizontal: 28 }]} onPress={() => setShowAdd(true)}>
                <Text style={st.primaryBtnText}>+ Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {meds.map(med => (
                <MedCard
                  key={med.medication_id}
                  med={med}
                  onEdit={m => setEditTarget(m)}
                  onDelete={handleDelete}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Modals */}
      <MedFormModal
        visible={showAdd}
        initial={null}
        title={`Add for ${selected?.first_name ?? 'Patient'}`}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
      />
      <MedFormModal
        visible={!!editTarget}
        initial={editTarget}
        title="Edit Medication"
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: C.textMid, marginTop: 2 },
  addBtn: {
    backgroundColor: C.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: C.textLight,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginLeft: 20, marginBottom: 10,
  },

  // Elderly chips
  elderlyChip: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border,
    minWidth: 72,
  },
  elderlyChipActive: {
    borderColor: C.primary, backgroundColor: C.primaryBg,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  avatarActive: { backgroundColor: '#C5D3FF' },
  avatarText:   { fontSize: 15, fontWeight: '800', color: C.textMid },
  elderlyName:  { fontSize: 12, fontWeight: '700', color: C.text },
  elderlyNameActive: { color: C.primary },
  elderlyAge:   { fontSize: 10, color: C.textLight, marginTop: 1 },

  // Patient bar
  patientBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 16, marginBottom: 10,
  },
  patientBarDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.primary, marginRight: 8,
  },
  patientBarText: { fontSize: 13, fontWeight: '600', color: C.textMid },

  // Med card
  card: {
    backgroundColor: C.card, borderRadius: 16,
    marginHorizontal: 20, marginBottom: 12,
    padding: 14,
    shadowColor: C.shadow, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medPhoto: { width: 54, height: 54, borderRadius: 10 },
  medPhotoPlaceholder: {
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  medName:   { fontSize: 15, fontWeight: '700', color: C.text },
  medDosage: { fontSize: 12, color: C.primaryLight, fontWeight: '600', marginTop: 2 },
  pill: {
    backgroundColor: C.primaryBg, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pillText: { fontSize: 10, color: C.primary, fontWeight: '600' },
  cardExpanded: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  detail:      { fontSize: 13, color: C.textMid, marginBottom: 5, lineHeight: 18 },
  detailLabel: { fontWeight: '700', color: C.text },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  actionBtnText: { fontWeight: '700', fontSize: 13 },

  // Empty
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptyText:  { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 20 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 },
  label:  { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.text,
    backgroundColor: '#FAFAFA',
  },

  // Photo
  photoPreview:      { width: 110, height: 110, borderRadius: 14 },
  photoPreviewEmpty: {
    width: 110, height: 110, borderRadius: 14,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  photoBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center',
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: C.text },

  // Day chips
  dayChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  dayChipOn:   { backgroundColor: C.primary, borderColor: C.primary },
  dayChipText: { fontSize: 12, fontWeight: '600', color: C.textMid },
  dayChipTextOn: { color: '#fff' },

  // Buttons
  primaryBtn: {
    marginTop: 20, backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ghostBtn:     { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: C.textMid, fontWeight: '600', fontSize: 14 },
})