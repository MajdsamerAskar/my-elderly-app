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
    taken:   { label: 'Taken ✓',   bg: 'bg-green-100',   color: 'text-green-700' },
    missed:  { label: 'Missed',    bg: 'bg-red-100',     color: 'text-red-700' },
    skipped: { label: 'Skipped',   bg: 'bg-yellow-100',  color: 'text-yellow-700' },
    pending: { label: 'Pending',     bg: 'bg-orange-100', color: 'text-orange-700' },
  }
  const cfg = configs[status] || configs.pending
  
  return (
    <View className={`px-3 py-1.5 rounded-full ${cfg.bg}`}>
      <Text className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</Text>
    </View>
  )
}

// ─── Today Med Card ───────────────────────────────────────────────────────────
function TodayMedCard({ med, onConfirm }) {
  const isTaken = med.status === 'taken'

  return (
    <View className={`flex-row items-center p-4 mb-3 rounded-xl border ${isTaken ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'} shadow-sm`}>
  {/* Photo */}
  <View className="mr-3">
    {med.photo_url ? (
      <Image source={{ uri: med.photo_url }} className="w-14 h-14 rounded-lg" />
    ) : (
      <View className="w-14 h-14 rounded-lg bg-gray-100 items-center justify-center">
        <Text className="text-2xl">💊</Text>
      </View>
    )}
  </View>

  {/* Info */}
  <View className="flex-1">
    <Text className={`text-base font-bold ${isTaken ? 'text-green-800' : 'text-gray-900'}`}>{med.name}</Text>
    {med.dosage ? <Text className="text-md text-gray-500 mt-0.5">{med.dosage}</Text> : null}
    <Text className="text-md text-blue-600 mt-0.5">⏰ {formatTime(med.scheduled_time)}</Text>
    {med.purpose ? <Text className="text-md text-gray-400 mt-0.5">{med.purpose}</Text> : null}
  </View>

  {/* Status / Action */}
  <View className="ml-2">
    {isTaken ? (
      <StatusBadge status="taken" />
    ) : (
      <TouchableOpacity
        className="bg-blue-600 px-4 py-2 rounded-lg"
        onPress={() => onConfirm(med)}
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold text-md">Confirm</Text>
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
  className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
  onPress={() => setExpanded(e => !e)}
  activeOpacity={0.85}
>
  <View className="flex-row items-center">
    {/* Photo */}
    <View className="mr-3">
      {med.photo_url ? (
        <Image source={{ uri: med.photo_url }} className="w-14 h-14 rounded-lg" />
      ) : (
        <View className="w-14 h-14 rounded-lg bg-gray-100 items-center justify-center">
          <Text className="text-2xl">💊</Text>
        </View>
      )}
    </View>

    {/* Name + dosage */}
    <View className="flex-1">
      <Text className="text-base text-lg font-bold text-gray-900">{med.name}</Text>
      {med.dosage ? <Text className="text-md text-gray-500 mt-0.5">{med.dosage}</Text> : null}
      {times ? <Text className="text-md text-blue-600 mt-0.5">⏰ {times}</Text> : null}
      {dayLabels ? <Text className="text-md text-gray-400 mt-0.5">{dayLabels}</Text> : null}
    </View>

    <Text className="text-lg text-gray-400 ml-2">{expanded ? '▲' : '▼'}</Text>
  </View>

  {expanded && (
    <View className="mt-4 pt-4 border-t border-gray-100">
      {med.purpose ? (
        <Text className="text-md text-gray-600 mb-2"><Text className="font-semibold text-gray-700">Purpose: </Text>{med.purpose}</Text>
      ) : null}
      {med.instructions ? (
        <Text className="text-md text-gray-600 mb-4"><Text className="font-semibold text-gray-700">Instructions: </Text>{med.instructions}</Text>
      ) : null}

      <TouchableOpacity
        className="bg-red-50 py-3 rounded-lg items-center mb-2"
        onPress={() => onDelete(med)}
      >
        <Text className="text-red-600 font-semibold">🗑  Remove Medication</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="bg-blue-50 py-3 rounded-lg items-center"
        onPress={() => onEdit(med)}
      >
        <Text className="text-blue-600 font-semibold">✏️  Edit Medication</Text>
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
    className="flex-1 justify-end bg-black/50"
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
      <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />

      <Text className="text-xl font-bold text-gray-900 mb-4">Add Medication</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo picker */}
        <Text className="text-md font-semibold text-gray-700 mb-2">Medication Photo</Text>
        <View className="items-center mb-4">
          {form.photoUri ? (
            <Image source={{ uri: form.photoUri }} className="w-32 h-32 rounded-xl" />
          ) : (
            <View className="w-32 h-32 rounded-xl bg-gray-100 justify-center items-center border-2 border-dashed border-gray-300">
              <Text className="text-4xl">💊</Text>
              <Text className="text-xs text-gray-500 mt-2 text-center px-2">Add a photo so you can recognize it</Text>
            </View>
          )}
          <View className="flex-row mt-3 gap-2">
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-lg" onPress={handleCamera}>
              <Text className="text-md text-gray-700">📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-lg" onPress={handlePickPhoto}>
              <Text className="text-md text-gray-700">🖼 Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name */}
        <Text className="text-lg font-semibold text-gray-700 mb-2">Medication Name *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. Aspirin"
          value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))}
        />

        <Text className="text- font-semibold text-gray-700 mb-2">Purpose</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. Blood thinner"
          value={form.purpose}
          onChangeText={v => setForm(f => ({ ...f, purpose: v }))}
        />

        <Text className="text-lg font-semibold text-gray-700 mb-2">Dosage</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. 100mg"
          value={form.dosage}
          onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
        />

        <Text className="text-lg font-semibold text-gray-700 mb-2">Instructions</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 h-20"
          placeholder="e.g. Take after meals"
          multiline
          value={form.instructions}
          onChangeText={v => setForm(f => ({ ...f, instructions: v }))}
        />

        {/* Time */}
        <Text className="text-lg font-semibold text-gray-700 mb-2">Scheduled Time (HH:MM)</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. 08:00"
          value={form.scheduledTime}
          onChangeText={v => setForm(f => ({ ...f, scheduledTime: v }))}
          keyboardType="numbers-and-punctuation"
        />

        {/* Days */}
        <Text className="text-lg font-semibold text-gray-700 mb-2">Days of Week</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {DAYS.map(day => (
            <TouchableOpacity
              key={day}
              className={`px-4 py-2 rounded-full border ${form.daysOfWeek.includes(day) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
              onPress={() => toggleDay(day)}
            >
              <Text className={`text-lg font-medium ${form.daysOfWeek.includes(day) ? 'text-white' : 'text-gray-700'}`}>
                {DAY_LABELS[day]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          className={`bg-blue-600 py-4 rounded-xl items-center mb-3 ${saving ? 'opacity-60' : ''}`}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-semibold text-base">Save Medication</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity className="py-3 items-center" onPress={() => { reset(); onClose() }}>
          <Text className="text-gray-500 font-medium">Cancel</Text>
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
  <View className="flex-1 justify-center items-center bg-black/50 px-4">
    <View className="bg-white rounded-2xl p-5 w-full max-h-[80%]">
      <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
      <Text className="text-xl font-bold text-gray-900 text-center mb-4">Confirm Taking</Text>

      {/* Medication info */}
      <View className="items-center mb-4">
        {med.photo_url ? (
          <Image source={{ uri: med.photo_url }} className="w-24 h-24 rounded-xl mb-3" />
        ) : (
          <View className="w-24 h-24 rounded-xl bg-yellow-100 items-center justify-center mb-3">
            <Text className="text-4xl">💊</Text>
          </View>
        )}
        <Text className="text-lg font-bold text-gray-900 text-center">{med.name}</Text>
        <Text className="text-md text-gray-500 text-center">{med.dosage}</Text>
      </View>

      <Text className="text-lg text-gray-600 text-center mb-4">
        Optionally take a photo of your medication as proof
      </Text>

      {/* Proof photo */}
      {photoUri ? (
        <Image source={{ uri: photoUri }} className="w-full h-40 rounded-xl mb-4" />
      ) : (
        <View className="w-full h-40 rounded-xl bg-gray-100 items-center justify-center mb-4 border-2 border-dashed border-gray-300">
          <Text className="text-3xl">📸</Text>
          <Text className="text-lg text-gray-500 mt-2">No photo yet</Text>
        </View>
      )}

      <View className="flex-row justify-center gap-3 mb-4">
        <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-lg flex-1 items-center" onPress={handleCamera}>
          <Text className="text-lg text-gray-700">📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-lg flex-1 items-center" onPress={handleGallery}>
          <Text className="text-lg text-gray-700">🖼 Gallery</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className={`bg-blue-600 py-4 rounded-xl items-center mb-3 ${loading ? 'opacity-60' : ''}`}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text className="text-white font-semibold text-base">✓ Mark as Taken</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity className="py-3 items-center" onPress={() => { setPhotoUri(null); onClose() }}>
        <Text className="text-gray-500 font-medium">Cancel</Text>
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
    className="flex-1 justify-end bg-black/50"
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
      <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
      <Text className="text-xl font-bold text-gray-900 mb-4">Edit Medication</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <Text className="text-lg font-semibold text-gray-700 mb-2">Medication Photo</Text>
        <View className="items-center mb-4">
          {form.photoUri ? (
            <Image source={{ uri: form.photoUri }} className="w-32 h-32 rounded-xl" />
          ) : (
            <View className="w-32 h-32 rounded-xl bg-gray-100 justify-center items-center border-2 border-dashed border-gray-300">
              <Text className="text-4xl">💊</Text>
              <Text className="text-xs text-gray-500 mt-2">Tap to add a photo</Text>
            </View>
          )}
          <View className="flex-row mt-3 gap-2">
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-lg" onPress={handleCamera}>
              <Text className="text-md text-gray-700">📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-lg" onPress={handlePickPhoto}>
              <Text className="text-md text-gray-700">🖼 Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-lg font-semibold text-gray-700 mb-2">Medication Name *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. Aspirin"
          value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))}
        />

        <Text className="text-lg font-semibold text-gray-700 mb-2">Purpose</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. Blood thinner"
          value={form.purpose}
          onChangeText={v => setForm(f => ({ ...f, purpose: v }))}
        />

        <Text className="text-lg font-semibold text-gray-700 mb-2">Dosage</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. 100mg"
          value={form.dosage}
          onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
        />

        <Text className="text-lg font-semibold text-gray-700 mb-2">Instructions</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 h-20"
          placeholder="e.g. Take after meals"
          multiline
          value={form.instructions}
          onChangeText={v => setForm(f => ({ ...f, instructions: v }))}
        />

        <Text className="text-lg font-semibold text-gray-700 mb-2">Scheduled Time (HH:MM)</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base bg-gray-50"
          placeholder="e.g. 08:00"
          value={form.scheduledTime}
          onChangeText={v => setForm(f => ({ ...f, scheduledTime: v }))}
          keyboardType="numbers-and-punctuation"
        />

        <Text className="text-lg font-semibold text-gray-700 mb-2">Days of Week</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {DAYS.map(day => (
            <TouchableOpacity
              key={day}
              className={`px-4 py-2 rounded-full border ${form.daysOfWeek.includes(day) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
              onPress={() => toggleDay(day)}
            >
              <Text className={`text-lg font-medium ${form.daysOfWeek.includes(day) ? 'text-white' : 'text-gray-700'}`}>
                {DAY_LABELS[day]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className={`bg-blue-600 py-4 rounded-xl items-center mb-3 ${saving ? 'opacity-60' : ''}`}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-semibold text-base">Save Changes</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity className="py-3 items-center" onPress={onClose}>
          <Text className="text-gray-500 font-medium">Cancel</Text>
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View>
          <Text className="text-xl font-bold text-gray-900">Medications</Text>
          <Text className="text-md text-gray-500 mt-1">
            {totalToday > 0
              ? `${takenCount} of ${totalToday} taken today`
              : 'No medications scheduled today'}
          </Text>
        </View>
        <TouchableOpacity 
          className="bg-blue-600 px-4 py-2 rounded" 
          onPress={() => setShowAdd(true)}
        >
          <Text className="text-white font-semibold text-lg">+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {totalToday > 0 && (
        <View className="px-4 py-3 bg-white">
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View 
              className="h-full bg-blue-600 rounded-full" 
              style={{ width: `${(takenCount / totalToday) * 100}%` }} 
            />
          </View>
        </View>
      )}

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-3 items-center border-b-2 ${tab === 'today' ? 'border-blue-600' : 'border-transparent'}`}
          onPress={() => setTab('today')}
        >
          <Text className={`text-md font-medium ${tab === 'today' ? 'text-blue-600' : 'text-gray-500'}`}>
            Today {totalToday > 0 ? `(${totalToday})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 items-center border-b-2 ${tab === 'all' ? 'border-blue-600' : 'border-transparent'}`}
          onPress={() => setTab('all')}
        >
          <Text className={`text-md font-medium ${tab === 'all' ? 'text-blue-600' : 'text-gray-500'}`}>
            All Medications {allMeds.length > 0 ? `(${allMeds.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={C.primary} />
          <Text className="mt-3 text-gray-500 text-base">Loading medications…</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          showsVerticalScrollIndicator={false}
        >
          {tab === 'today' ? (
            todayMeds.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-5xl mb-4">🌿</Text>
                <Text className="text-lg font-semibold text-gray-900 mb-2">No medications today</Text>
                <Text className="text-md text-gray-500 text-center">You have no medications scheduled for today.</Text>
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
              <View className="items-center justify-center py-12">
                <Text className="text-5xl mb-4">💊</Text>
                <Text className="text-lg font-semibold text-gray-900 mb-2">No medications added yet</Text>
                <Text className="text-md text-gray-500 text-center mb-6">Tap "+ Add" to add your first medication.</Text>
                <TouchableOpacity 
                  className="bg-blue-600 px-6 py-3 rounded-full" 
                  onPress={() => setShowAdd(true)}
                >
                  <Text className="text-white font-semibold">+ Add Medication</Text>
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
