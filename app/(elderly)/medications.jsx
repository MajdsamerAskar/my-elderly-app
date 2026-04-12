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
  Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  getTodayMedications,
  getAllMedications,
  addMedication,
  editMedication,
  removeMedication,
  markMedicationTaken,
  pickMedicationImage,
  takeMedicationPhoto,
} from '../../services/medications.service'
import { getCurrentUser } from '../../services/auth.service'

const { width } = Dimensions.get('window')

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABELS = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' }

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#F7F3EE',
  card:        '#FFFFFF',
  primary:     '#2D6A4F',
  primaryLight:'#52B788',
  accent:      '#E76F51',
  accentLight: '#FDDAC9',
  warn:        '#F4A261',
  warnLight:   '#FDEBD0',
  text:        '#1A1A2E',
  textMid:     '#555570',
  textLight:   '#9999AA',
  border:      '#E8E4DE',
  taken:       '#52B788',
  takenBg:     '#D8F3DC',
  missed:      '#E63946',
  missedBg:    '#FFE5E7',
  pending:     '#F4A261',
  pendingBg:   '#FEF0E3',
  shadow:      'rgba(45,106,79,0.12)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

function StatusBadge({ status }) {
  const configs = {
    taken:   { label: 'Taken ✓',   bg: C.takenBg,   color: C.taken },
    missed:  { label: 'Missed',    bg: C.missedBg,  color: C.missed },
    skipped: { label: 'Skipped',   bg: C.warnLight, color: C.warn },
    pending: { label: 'Pending',   bg: C.pendingBg, color: C.pending },
  }
  const cfg = configs[status] || configs.pending
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}

// ─── Today Med Card ───────────────────────────────────────────────────────────
function TodayMedCard({ med, onConfirm }) {
  const isTaken = med.status === 'taken'

  return (
    <View style={[styles.todayCard, isTaken && styles.todayCardTaken]}>
      {/* Photo */}
      <View style={styles.todayPhotoWrap}>
        {med.photo_url ? (
          <Image source={{ uri: med.photo_url }} style={styles.todayPhoto} />
        ) : (
          <View style={[styles.todayPhoto, styles.todayPhotoPlaceholder]}>
            <Text style={styles.todayPhotoIcon}>💊</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.todayInfo}>
        <Text style={styles.todayName}>{med.name}</Text>
        {med.dosage ? <Text style={styles.todayDosage}>{med.dosage}</Text> : null}
        <Text style={styles.todayTime}>⏰ {formatTime(med.scheduled_time)}</Text>
        {med.purpose ? <Text style={styles.todayPurpose}>{med.purpose}</Text> : null}
      </View>

      {/* Status / Action */}
      <View style={styles.todayAction}>
        {isTaken ? (
          <StatusBadge status="taken" />
        ) : (
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm(med)}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─── All-Med Card ─────────────────────────────────────────────────────────────
function AllMedCard({ med, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const dayLabels = med.medication_schedules
    ?.flatMap(s => s.medication_schedule_days?.map(d => DAY_LABELS[d.day_of_week]) || [])
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .join(', ')

  const times = med.medication_schedules
    ?.map(s => formatTime(s.scheduled_time))
    .join(', ')

  return (
    <TouchableOpacity
      style={styles.allCard}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.85}
    >
      <View style={styles.allCardHeader}>
        {/* Photo */}
        <View style={styles.allPhotoWrap}>
          {med.photo_url ? (
            <Image source={{ uri: med.photo_url }} style={styles.allPhoto} />
          ) : (
            <View style={[styles.allPhoto, styles.allPhotoPlaceholder]}>
              <Text style={{ fontSize: 24 }}>💊</Text>
            </View>
          )}
        </View>

        {/* Name + dosage */}
        <View style={{ flex: 1 }}>
          <Text style={styles.allName}>{med.name}</Text>
          {med.dosage ? <Text style={styles.allDosage}>{med.dosage}</Text> : null}
          {times ? <Text style={styles.allTime}>⏰ {times}</Text> : null}
          {dayLabels ? <Text style={styles.allDays}>{dayLabels}</Text> : null}
        </View>

        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.allExpanded}>
          {med.purpose ? (
            <Text style={styles.allDetail}><Text style={styles.allDetailLabel}>Purpose: </Text>{med.purpose}</Text>
          ) : null}
          {med.instructions ? (
            <Text style={styles.allDetail}><Text style={styles.allDetailLabel}>Instructions: </Text>{med.instructions}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(med)}
          >
            <Text style={styles.deleteBtnText}>🗑  Remove Medication</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onEdit(med)}
          >
            <Text style={styles.editBtnText}>✏️  Edit Medication</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─── Add Medication Modal ─────────────────────────────────────────────────────
function AddMedModal({ visible, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', purpose: '', dosage: '', instructions: '',
    scheduledTime: '', daysOfWeek: [], photoUri: null,
  })
  const [saving, setSaving] = useState(false)

  function reset() {
    setForm({ name: '', purpose: '', dosage: '', instructions: '', scheduledTime: '', daysOfWeek: [], photoUri: null })
  }

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day],
    }))
  }

  async function handlePickPhoto() {
    try {
      const uri = await pickMedicationImage()
      if (uri) setForm(f => ({ ...f, photoUri: uri }))
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleCamera() {
    try {
      const uri = await takeMedicationPhoto()
      if (uri) setForm(f => ({ ...f, photoUri: uri }))
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Please enter the medication name.')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      reset()
      onClose()
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Add Medication</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Photo picker */}
            <Text style={styles.label}>Medication Photo</Text>
            <View style={styles.photoPicker}>
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholderLarge}>
                  <Text style={{ fontSize: 40 }}>💊</Text>
                  <Text style={styles.photoPlaceholderText}>Add a photo so you can recognize it</Text>
                </View>
              )}
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
                  <Text style={styles.photoBtnText}>📷 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                  <Text style={styles.photoBtnText}>🖼 Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Name */}
            <Text style={styles.label}>Medication Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Aspirin"
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />

            <Text style={styles.label}>Purpose</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Blood thinner"
              value={form.purpose}
              onChangeText={v => setForm(f => ({ ...f, purpose: v }))}
            />

            <Text style={styles.label}>Dosage</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100mg"
              value={form.dosage}
              onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
            />

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="e.g. Take after meals"
              multiline
              value={form.instructions}
              onChangeText={v => setForm(f => ({ ...f, instructions: v }))}
            />

            {/* Time */}
            <Text style={styles.label}>Scheduled Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 08:00"
              value={form.scheduledTime}
              onChangeText={v => setForm(f => ({ ...f, scheduledTime: v }))}
              keyboardType="numbers-and-punctuation"
            />

            {/* Days */}
            <Text style={styles.label}>Days of Week</Text>
            <View style={styles.daysRow}>
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    form.daysOfWeek.includes(day) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[
                    styles.dayChipText,
                    form.daysOfWeek.includes(day) && styles.dayChipTextActive,
                  ]}>
                    {DAY_LABELS[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveMedBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveMedBtnText}>Save Medication</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose() }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ visible, med, onClose, onConfirm }) {
  const [photoUri, setPhotoUri] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleCamera() {
    try {
      const uri = await takeMedicationPhoto()
      if (uri) setPhotoUri(uri)
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleGallery() {
    try {
      const uri = await pickMedicationImage()
      if (uri) setPhotoUri(uri)
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm(med.schedule_id, photoUri)
      setPhotoUri(null)
      onClose()
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!med) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Confirm Taking</Text>

          {/* Medication info */}
          <View style={styles.confirmMedInfo}>
            {med.photo_url ? (
              <Image source={{ uri: med.photo_url }} style={styles.confirmMedPhoto} />
            ) : (
              <View style={[styles.confirmMedPhoto, { backgroundColor: C.pendingBg, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 40 }}>💊</Text>
              </View>
            )}
            <Text style={styles.confirmMedName}>{med.name}</Text>
            <Text style={styles.confirmMedDosage}>{med.dosage}</Text>
          </View>

          <Text style={styles.confirmPrompt}>
            Optionally take a photo of your medication as proof
          </Text>

          {/* Proof photo */}
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.confirmProofPhoto} />
          ) : (
            <View style={styles.proofPhotoPlaceholder}>
              <Text style={{ fontSize: 30 }}>📸</Text>
              <Text style={styles.proofPlaceholderText}>No photo yet</Text>
            </View>
          )}

          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
              <Text style={styles.photoBtnText}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={handleGallery}>
              <Text style={styles.photoBtnText}>🖼 Gallery</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveMedBtn, loading && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveMedBtnText}>✓ Mark as Taken</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPhotoUri(null); onClose() }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Edit Medication Modal ────────────────────────────────────────────────────
function EditMedModal({ visible, med, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', purpose: '', dosage: '', instructions: '',
    scheduledTime: '', daysOfWeek: [], photoUri: null,
  })
  const [saving, setSaving] = useState(false)

  // Pre-fill form when med changes
  useEffect(() => {
    if (!med) return
    const firstSchedule = med.medication_schedules?.[0]
    const days = med.medication_schedules
      ?.flatMap(s => s.medication_schedule_days?.map(d => d.day_of_week) || [])
      .filter((v, i, a) => a.indexOf(v) === i)

    setForm({
      name: med.name || '',
      purpose: med.purpose || '',
      dosage: med.dosage || '',
      instructions: med.instructions || '',
      scheduledTime: firstSchedule?.scheduled_time?.slice(0, 5) || '',
      daysOfWeek: days || [],
      photoUri: med.photo_url || null,
    })
  }, [med])

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day],
    }))
  }

  async function handlePickPhoto() {
    try {
      const uri = await pickMedicationImage()
      if (uri) setForm(f => ({ ...f, photoUri: uri }))
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleCamera() {
    try {
      const uri = await takeMedicationPhoto()
      if (uri) setForm(f => ({ ...f, photoUri: uri }))
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Please enter the medication name.')
      return
    }
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

  if (!med) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit Medication</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Photo */}
            <Text style={styles.label}>Medication Photo</Text>
            <View style={styles.photoPicker}>
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholderLarge}>
                  <Text style={{ fontSize: 40 }}>💊</Text>
                  <Text style={styles.photoPlaceholderText}>Tap to add a photo</Text>
                </View>
              )}
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
                  <Text style={styles.photoBtnText}>📷 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                  <Text style={styles.photoBtnText}>🖼 Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>Medication Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Aspirin"
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />

            <Text style={styles.label}>Purpose</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Blood thinner"
              value={form.purpose}
              onChangeText={v => setForm(f => ({ ...f, purpose: v }))}
            />

            <Text style={styles.label}>Dosage</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100mg"
              value={form.dosage}
              onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
            />

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="e.g. Take after meals"
              multiline
              value={form.instructions}
              onChangeText={v => setForm(f => ({ ...f, instructions: v }))}
            />

            <Text style={styles.label}>Scheduled Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 08:00"
              value={form.scheduledTime}
              onChangeText={v => setForm(f => ({ ...f, scheduledTime: v }))}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>Days of Week</Text>
            <View style={styles.daysRow}>
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    form.daysOfWeek.includes(day) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[
                    styles.dayChipText,
                    form.daysOfWeek.includes(day) && styles.dayChipTextActive,
                  ]}>
                    {DAY_LABELS[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveMedBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveMedBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MedicationsScreen() {
  const [userId, setUserId] = useState(null)
  const [tab, setTab] = useState('today') // 'today' | 'all'
  const [todayMeds, setTodayMeds] = useState([])
  const [allMeds, setAllMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  // Load user once
  useEffect(() => {
    getCurrentUser().then(u => u && setUserId(u.user_id)).catch(console.error)
  }, [])

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      if (userId) loadData()
    }, [userId])
  )

  async function loadData() {
    setLoading(true)
    try {
      const [today, all] = await Promise.all([
        getTodayMedications(userId),
        getAllMedications(userId),
      ])
      setTodayMeds(today)
      setAllMeds(all)
    } catch (e) {
      Alert.alert('Error', 'Could not load medications.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMed(formData) {
    await addMedication(userId, formData)
    await loadData()
  }

  async function handleDelete(med) {
    Alert.alert(
      'Remove Medication',
      `Remove "${med.name}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeMedication(med.medication_id)
            await loadData()
          },
        },
      ]
    )
  }

  async function handleConfirm(scheduleId, photoUri) {
    await markMedicationTaken(scheduleId, photoUri)
    await loadData()
  }

  async function handleEdit(formData) {
    await editMedication(editTarget.medication_id, userId, formData)
    await loadData()
  }

  // Stats for today
  const takenCount = todayMeds.filter(m => m.status === 'taken').length
  const totalToday = todayMeds.length

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medications</Text>
          <Text style={styles.headerSub}>
            {totalToday > 0
              ? `${takenCount} of ${totalToday} taken today`
              : 'No medications scheduled today'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addFab} onPress={() => setShowAdd(true)}>
          <Text style={styles.addFabText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {totalToday > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(takenCount / totalToday) * 100}%` }]} />
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'today' && styles.tabActive]}
          onPress={() => setTab('today')}
        >
          <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>
            Today {totalToday > 0 ? `(${totalToday})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            All Medications {allMeds.length > 0 ? `(${allMeds.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading medications…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'today' ? (
            todayMeds.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🌿</Text>
                <Text style={styles.emptyTitle}>No medications today</Text>
                <Text style={styles.emptyText}>You have no medications scheduled for today.</Text>
              </View>
            ) : (
              todayMeds.map(med => (
                <TodayMedCard
                  key={`${med.medication_id}_${med.schedule_id}`}
                  med={med}
                  onConfirm={setConfirmTarget}
                />
              ))
            )
          ) : (
            allMeds.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💊</Text>
                <Text style={styles.emptyTitle}>No medications added yet</Text>
                <Text style={styles.emptyText}>Tap "+ Add" to add your first medication.</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
                  <Text style={styles.emptyAddBtnText}>+ Add Medication</Text>
                </TouchableOpacity>
              </View>
            ) : (
              allMeds.map(med => (
                <AllMedCard
                  key={med.medication_id}
                  med={med}
                  onDelete={handleDelete}
                  onEdit={setEditTarget}
                />
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Modals */}
      <AddMedModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddMed} />
      <EditMedModal
        visible={!!editTarget}
        med={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
      />
      <ConfirmModal
        visible={!!confirmTarget}
        med={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: C.textMid, marginTop: 2 },
  addFab: {
    backgroundColor: C.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addFabText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Progress
  progressWrap: { paddingHorizontal: 20, marginBottom: 12 },
  progressBar: {
    height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: 6, backgroundColor: C.primaryLight, borderRadius: 3,
  },

  // Tabs
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: C.border, borderRadius: 12, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.card, shadowColor: C.shadow, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  tabTextActive: { color: C.primary },

  // Today Card
  todayCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 16, marginHorizontal: 20, marginBottom: 12,
    padding: 14, shadowColor: C.shadow, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: C.primaryLight,
  },
  todayCardTaken: { borderLeftColor: C.taken, opacity: 0.75 },
  todayPhotoWrap: { marginRight: 12 },
  todayPhoto: { width: 64, height: 64, borderRadius: 12 },
  todayPhotoPlaceholder: {
    backgroundColor: C.pendingBg, alignItems: 'center', justifyContent: 'center',
  },
  todayPhotoIcon: { fontSize: 28 },
  todayInfo: { flex: 1 },
  todayName: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
  todayDosage: { fontSize: 13, color: C.primaryLight, fontWeight: '600', marginBottom: 2 },
  todayTime: { fontSize: 12, color: C.textMid },
  todayPurpose: { fontSize: 11, color: C.textLight, marginTop: 2 },
  todayAction: { marginLeft: 8, alignItems: 'center' },
  confirmBtn: {
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // All Med Card
  allCard: {
    backgroundColor: C.card, borderRadius: 16, marginHorizontal: 20, marginBottom: 12,
    padding: 14, shadowColor: C.shadow, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  allCardHeader: { flexDirection: 'row', alignItems: 'center' },
  allPhotoWrap: { marginRight: 12 },
  allPhoto: { width: 56, height: 56, borderRadius: 10 },
  allPhotoPlaceholder: {
    backgroundColor: C.pendingBg, alignItems: 'center', justifyContent: 'center',
  },
  allName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  allDosage: { fontSize: 12, color: C.primaryLight, fontWeight: '600' },
  allTime: { fontSize: 11, color: C.textMid, marginTop: 2 },
  allDays: { fontSize: 11, color: C.textLight },
  chevron: { fontSize: 12, color: C.textLight, paddingLeft: 8 },
  allExpanded: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  allDetail: { fontSize: 13, color: C.textMid, marginBottom: 6, lineHeight: 18 },
  allDetailLabel: { fontWeight: '700', color: C.text },
  deleteBtn: {
    marginTop: 8, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center',
  },
  deleteBtnText: { color: C.missed, fontWeight: '700', fontSize: 13 },
  editBtn: {
    marginTop: 8, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#EBF5FB', alignItems: 'center',
  },
  editBtnText: { color: '#2980B9', fontWeight: '700', fontSize: 13 },

  // Badge
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20,
  },
  label: {
    fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6, marginTop: 14,
  },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.text,
    backgroundColor: '#FAFAFA',
  },

  // Photo picker
  photoPicker: { alignItems: 'center', marginBottom: 8 },
  photoPreview: { width: 120, height: 120, borderRadius: 16, marginBottom: 12 },
  photoPlaceholderLarge: {
    width: 120, height: 120, borderRadius: 16,
    backgroundColor: C.pendingBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  photoPlaceholderText: { fontSize: 11, color: C.textMid, textAlign: 'center', marginTop: 4, maxWidth: 100 },
  photoButtons: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  photoBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center',
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: C.text },

  // Days chips
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
  },
  dayChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  dayChipText: { fontSize: 12, fontWeight: '600', color: C.textMid },
  dayChipTextActive: { color: '#fff' },

  // Save / Cancel
  saveMedBtn: {
    marginTop: 20, backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  saveMedBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: C.textMid, fontWeight: '600', fontSize: 14 },

  // Confirm modal
  confirmMedInfo: { alignItems: 'center', marginBottom: 16 },
  confirmMedPhoto: { width: 90, height: 90, borderRadius: 18, marginBottom: 10 },
  confirmMedName: { fontSize: 18, fontWeight: '800', color: C.text },
  confirmMedDosage: { fontSize: 14, color: C.primaryLight, fontWeight: '600', marginTop: 2 },
  confirmPrompt: { fontSize: 13, color: C.textMid, textAlign: 'center', marginBottom: 12 },
  confirmProofPhoto: { width: '100%', height: 180, borderRadius: 14, marginBottom: 8 },
  proofPhotoPlaceholder: {
    width: '100%', height: 120, borderRadius: 14,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', marginBottom: 8,
  },
  proofPlaceholderText: { fontSize: 12, color: C.textLight, marginTop: 4 },

  // List
  listContent: { paddingBottom: 40 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    marginTop: 20, backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Misc
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: C.textMid, fontSize: 14 },
})