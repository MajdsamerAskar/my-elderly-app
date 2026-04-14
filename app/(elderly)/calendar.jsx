import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AppInput from '../../components/ui/AppInput'
import AppButton from '../../components/ui/AppButton'
import { getCurrentUser } from '../../services/auth.service'
import { uniTheme } from '../../constants/uniTheme'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'Every other day', 'Weekly', 'As needed']
const EVENT_TYPES = ['Appointment', 'Gathering', 'Exercise', 'Check-up', 'Other']

function getWeekDates() {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })
}

function isSameDay(date1, date2) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

function isToday(date) {
  return isSameDay(date, new Date())
}

function isPast(date) {
  return date < new Date() && !isToday(date)
}

// ─── Mock data (replace with real service calls) ──────────────────────────────

const MOCK_MEDICATIONS = [
  {
    id: '1',
    name: 'Metformin',
    purpose: 'Blood sugar management',
    frequency: 'Twice daily',
    nextDose: '2:00 PM today',
    taken: false,
    color: '#1B6CA8',
  },
  {
    id: '2',
    name: 'Amlodipine',
    purpose: 'Blood pressure control',
    frequency: 'Once daily',
    nextDose: '8:00 AM tomorrow',
    taken: true,
    color: '#2EAF7D',
  },
  {
    id: '3',
    name: 'Aspirin',
    purpose: 'Heart health & clot prevention',
    frequency: 'Once daily',
    nextDose: '8:00 AM tomorrow',
    taken: true,
    color: '#E05C5C',
  },
]

const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Cardiology Check-up',
    type: 'Appointment',
    location: 'Al-Kindi Hospital, Room 3',
    note: 'Dr. Kamal Ali',
    dayIndex: 1, // Monday
    time: '10:00 AM',
    done: false,
  },
  {
    id: '2',
    title: 'Family Lunch',
    type: 'Gathering',
    location: "Sara's home",
    note: 'Bring medication',
    dayIndex: 4, // Thursday
    time: '1:00 PM',
    done: false,
  },
  {
    id: '3',
    title: 'Physiotherapy',
    type: 'Appointment',
    location: 'City Medical Centre',
    note: 'Room 14',
    dayIndex: 3, // Wednesday
    time: '2:30 PM',
    done: true,
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabPill({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 items-center rounded-xl py-3 ${
        active ? 'bg-uni-primary' : 'bg-transparent'
      }`}
      activeOpacity={0.75}
    >
      <Text
        className={`text-[15px] font-bold ${
          active ? 'text-white' : 'text-uni-muted'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Medication card ──────────────────────────────────────────────────────────

function MedicationCard({ med, onToggle, onEdit, onDelete }) {
  return (
    <View
      className={`mb-3 rounded-2xl border bg-uni-surface p-4 ${
        med.taken ? 'border-uni-border opacity-70' : 'border-uni-primary/30'
      }`}
    >
      <View className="flex-row items-start gap-3">
        {/* Icon */}
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: med.color + '18' }}
        >
          <Text className="text-2xl">💊</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[17px] font-bold text-uni-ink">{med.name}</Text>
            {med.taken && (
              <View className="rounded-full bg-green-100 px-2 py-0.5">
                <Text className="text-[11px] font-bold text-green-700">✓ Taken</Text>
              </View>
            )}
          </View>

          <View className="mt-1 flex-row flex-wrap gap-x-1">
            <Text className="text-[13px] font-bold text-uni-muted">Purpose:</Text>
            <Text className="text-[13px] text-uni-ink">{med.purpose}</Text>
          </View>
          <View className="flex-row flex-wrap gap-x-1">
            <Text className="text-[13px] font-bold text-uni-muted">Frequency:</Text>
            <Text className="text-[13px] text-uni-ink">{med.frequency}</Text>
          </View>
          <View className="mt-2 flex-row items-center gap-1">
            <Ionicons name="time-outline" size={13} color={uniTheme.amber} />
            <Text className="text-[12px] font-semibold text-amber-600">
              Next: {med.nextDose}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="mt-3 flex-row gap-2">
        {!med.taken && (
          <TouchableOpacity
            onPress={() => onToggle(med.id)}
            className="flex-1 items-center rounded-xl bg-uni-primary py-3"
            activeOpacity={0.8}
          >
            <Text className="text-[14px] font-bold text-white">Mark as Taken</Text>
          </TouchableOpacity>
        )}
        {med.taken && (
          <TouchableOpacity
            onPress={() => onToggle(med.id)}
            className="flex-1 items-center rounded-xl border border-uni-border py-3"
            activeOpacity={0.8}
          >
            <Text className="text-[14px] font-semibold text-uni-muted">Undo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onEdit(med)}
          className="h-11 w-11 items-center justify-center rounded-xl border border-uni-border"
        >
          <Ionicons name="pencil-outline" size={16} color={uniTheme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(med.id)}
          className="h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50"
        >
          <Ionicons name="trash-outline" size={16} color="#E05C5C" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, onToggle, onEdit, onDelete, weekDates }) {
  const eventDate = weekDates[event.dayIndex]
  const past = isPast(eventDate)

  return (
    <View
      className={`mb-3 rounded-2xl border bg-uni-surface p-4 ${
        event.done || past ? 'border-uni-border opacity-70' : 'border-amber-300/60'
      }`}
    >
      {/* Time badge */}
      <View className="mb-2 flex-row items-center gap-2">
        <View className="rounded-full bg-amber-100 px-3 py-1">
          <Text className="text-[12px] font-bold text-amber-700">
            {DAYS[event.dayIndex]} · {event.time}
          </Text>
        </View>
        <View className="rounded-full bg-uni-primary/10 px-2 py-1">
          <Text className="text-[11px] font-semibold text-uni-primary">{event.type}</Text>
        </View>
        {(event.done || past) && (
          <View className="rounded-full bg-green-100 px-2 py-1">
            <Text className="text-[11px] font-bold text-green-700">
              {event.done ? '✓ Done' : 'Past'}
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      <Text className="text-[16px] font-bold text-uni-ink">{event.title}</Text>
      {event.location ? (
        <View className="mt-1 flex-row items-center gap-1">
          <Ionicons name="location-outline" size={13} color={uniTheme.muted} />
          <Text className="text-[13px] text-uni-muted">{event.location}</Text>
        </View>
      ) : null}
      {event.note ? (
        <View className="mt-0.5 flex-row items-center gap-1">
          <Ionicons name="document-text-outline" size={13} color={uniTheme.muted} />
          <Text className="text-[13px] text-uni-muted">{event.note}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View className="mt-3 flex-row gap-2">
        {!event.done && !past && (
          <TouchableOpacity
            onPress={() => onToggle(event.id)}
            className="flex-1 items-center rounded-xl border border-amber-300 bg-amber-50 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-[14px] font-bold text-amber-700">Mark Complete</Text>
          </TouchableOpacity>
        )}
        {event.done && (
          <TouchableOpacity
            onPress={() => onToggle(event.id)}
            className="flex-1 items-center rounded-xl border border-uni-border py-3"
            activeOpacity={0.8}
          >
            <Text className="text-[14px] font-semibold text-uni-muted">Undo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onEdit(event)}
          className="h-11 w-11 items-center justify-center rounded-xl border border-uni-border"
        >
          <Ionicons name="pencil-outline" size={16} color={uniTheme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(event.id)}
          className="h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50"
        >
          <Ionicons name="trash-outline" size={16} color="#E05C5C" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Add / Edit Medication Modal ──────────────────────────────────────────────

function MedicationModal({ visible, onClose, onSave, editing }) {
  const [name, setName]           = useState(editing?.name || '')
  const [purpose, setPurpose]     = useState(editing?.purpose || '')
  const [frequency, setFrequency] = useState(editing?.frequency || FREQ_OPTIONS[0])
  const [nextDose, setNextDose]   = useState(editing?.nextDose || '')
  const [saving, setSaving]       = useState(false)

  // Reset when editing changes
  useCallback(() => {
    setName(editing?.name || '')
    setPurpose(editing?.purpose || '')
    setFrequency(editing?.frequency || FREQ_OPTIONS[0])
    setNextDose(editing?.nextDose || '')
  }, [editing])

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter a medication name.')
    setSaving(true)
    try {
      await onSave({ name: name.trim(), purpose: purpose.trim(), frequency, nextDose: nextDose.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-uni-canvas"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-uni-border px-5 py-4">
          <Text className="text-[18px] font-bold text-uni-ink">
            {editing ? 'Edit Medication' : 'Add Medication'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={uniTheme.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
          <AppInput
            label="Medication name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Metformin"
          />
          <AppInput
            label="Purpose"
            value={purpose}
            onChangeText={setPurpose}
            placeholder="e.g. Blood sugar management"
          />

          {/* Frequency picker */}
          <Text className="mb-2 mt-3 text-[14px] font-semibold text-uni-ink">Frequency</Text>
          <View className="flex-row flex-wrap gap-2">
            {FREQ_OPTIONS.map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFrequency(f)}
                className={`rounded-full border px-3 py-2 ${
                  frequency === f
                    ? 'border-uni-primary bg-uni-primary'
                    : 'border-uni-border bg-uni-surface'
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    frequency === f ? 'text-white' : 'text-uni-muted'
                  }`}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Next dose time"
            value={nextDose}
            onChangeText={setNextDose}
            placeholder="e.g. 2:00 PM today"
            className="mt-3"
          />

          <AppButton
            title={editing ? 'Save changes' : 'Add medication'}
            onPress={handleSave}
            loading={saving}
            className="mt-6 mb-10"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Add / Edit Event Modal ───────────────────────────────────────────────────

function EventModal({ visible, onClose, onSave, editing, weekDates }) {
  const [title, setTitle]       = useState(editing?.title || '')
  const [type, setType]         = useState(editing?.type || EVENT_TYPES[0])
  const [location, setLocation] = useState(editing?.location || '')
  const [note, setNote]         = useState(editing?.note || '')
  const [dayIndex, setDayIndex] = useState(editing?.dayIndex ?? new Date().getDay())
  const [time, setTime]         = useState(editing?.time || '')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter an event title.')
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        type,
        location: location.trim(),
        note: note.trim(),
        dayIndex,
        time: time.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-uni-canvas"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-uni-border px-5 py-4">
          <Text className="text-[18px] font-bold text-uni-ink">
            {editing ? 'Edit Event' : 'Add Event'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={uniTheme.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
          <AppInput
            label="Event title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Cardiology check-up"
          />

          {/* Event type */}
          <Text className="mb-2 mt-3 text-[14px] font-semibold text-uni-ink">Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {EVENT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                className={`rounded-full border px-3 py-2 ${
                  type === t
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-uni-border bg-uni-surface'
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    type === t ? 'text-white' : 'text-uni-muted'
                  }`}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Day picker */}
          <Text className="mb-2 mt-4 text-[14px] font-semibold text-uni-ink">Day this week</Text>
          <View className="flex-row justify-between gap-1">
            {weekDates.map((date, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setDayIndex(i)}
                className={`flex-1 items-center rounded-xl py-2 ${
                  dayIndex === i
                    ? 'bg-uni-primary'
                    : isToday(date)
                    ? 'border border-uni-primary bg-uni-surface'
                    : 'bg-uni-surface'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    dayIndex === i ? 'text-white' : 'text-uni-muted'
                  }`}
                >
                  {DAYS[i]}
                </Text>
                <Text
                  className={`text-[14px] font-bold ${
                    dayIndex === i ? 'text-white' : 'text-uni-ink'
                  }`}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Time"
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 10:00 AM"
            className="mt-3"
          />
          <AppInput
            label="Location (optional)"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Al-Kindi Hospital, Room 3"
          />
          <AppInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Dr. Kamal Ali"
          />

          <AppButton
            title={editing ? 'Save changes' : 'Add event'}
            onPress={handleSave}
            loading={saving}
            className="mt-6 mb-10"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const [tab, setTab]               = useState('medications') // 'medications' | 'events'
  const [loading, setLoading]       = useState(false)
  const [medications, setMedications] = useState(MOCK_MEDICATIONS)
  const [events, setEvents]         = useState(MOCK_EVENTS)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())

  // Modal state
  const [medModal, setMedModal]         = useState(false)
  const [eventModal, setEventModal]     = useState(false)
  const [editingMed, setEditingMed]     = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)

  const weekDates = getWeekDates()

  // ── Medication handlers ─────────────────────────────────────────────────
  const toggleMedication = (id) => {
    setMedications(prev =>
      prev.map(m => (m.id === id ? { ...m, taken: !m.taken } : m))
    )
  }

  const openAddMed = () => { setEditingMed(null); setMedModal(true) }
  const openEditMed = (med) => { setEditingMed(med); setMedModal(true) }

  const saveMedication = async (data) => {
    // TODO: replace with real API call
    if (editingMed) {
      setMedications(prev =>
        prev.map(m => (m.id === editingMed.id ? { ...m, ...data } : m))
      )
    } else {
      setMedications(prev => [
        ...prev,
        { id: Date.now().toString(), ...data, taken: false, color: '#1B6CA8' },
      ])
    }
  }

  const deleteMedication = (id) => {
    Alert.alert('Remove medication', 'Are you sure you want to remove this medication?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setMedications(prev => prev.filter(m => m.id !== id)),
      },
    ])
  }

  // ── Event handlers ──────────────────────────────────────────────────────
  const toggleEvent = (id) => {
    setEvents(prev =>
      prev.map(e => (e.id === id ? { ...e, done: !e.done } : e))
    )
  }

  const openAddEvent = () => { setEditingEvent(null); setEventModal(true) }
  const openEditEvent = (event) => { setEditingEvent(event); setEventModal(true) }

  const saveEvent = async (data) => {
    // TODO: replace with real API call
    if (editingEvent) {
      setEvents(prev =>
        prev.map(e => (e.id === editingEvent.id ? { ...e, ...data } : e))
      )
    } else {
      setEvents(prev => [
        ...prev,
        { id: Date.now().toString(), ...data, done: false },
      ])
    }
  }

  const deleteEvent = (id) => {
    Alert.alert('Remove event', 'Are you sure you want to remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setEvents(prev => prev.filter(e => e.id !== id)),
      },
    ])
  }

  // ── Derived data ────────────────────────────────────────────────────────
  const eventsForDay = events.filter(e => e.dayIndex === selectedDay)
  const takenCount   = medications.filter(m => m.taken).length
  const doneCount    = events.filter(e => e.done).length

  return (
    <SafeAreaView className="flex-1 bg-uni-canvas" edges={['top']}>
      {/* Header */}
      <View className="border-b border-uni-border bg-uni-surface px-4 py-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-uni-muted">
          This week
        </Text>
        <Text className="text-lg font-bold text-uni-ink">Reminders</Text>
      </View>

      {/* Tab switcher */}
      <View className="flex-row gap-2 border-b border-uni-border bg-uni-surface px-4 pb-3 pt-2">
        <TabPill
          label={`💊 Medications (${takenCount}/${medications.length})`}
          active={tab === 'medications'}
          onPress={() => setTab('medications')}
        />
        <TabPill
          label={`📅 Events (${doneCount}/${events.length})`}
          active={tab === 'events'}
          onPress={() => setTab('events')}
        />
      </View>

      {/* ── MEDICATIONS TAB ─────────────────────────────────────────────── */}
      {tab === 'medications' && (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary strip */}
          <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-uni-border bg-uni-surface px-4 py-3">
            <View>
              <Text className="text-[13px] text-uni-muted">Today's progress</Text>
              <Text className="text-[22px] font-black text-uni-ink">
                {takenCount}
                <Text className="text-[15px] font-normal text-uni-muted">
                  {' '}/ {medications.length} taken
                </Text>
              </Text>
            </View>
            <View
              className="h-14 w-14 items-center justify-center rounded-full border-4"
              style={{
                borderColor: takenCount === medications.length ? '#2EAF7D' : uniTheme.primary,
              }}
            >
              <Text className="text-[15px] font-black text-uni-ink">
                {medications.length > 0
                  ? Math.round((takenCount / medications.length) * 100)
                  : 0}%
              </Text>
            </View>
          </View>

          {/* Medication cards */}
          {medications.length === 0 ? (
            <View className="mt-10 items-center">
              <Text className="text-4xl">💊</Text>
              <Text className="mt-3 text-[16px] font-semibold text-uni-muted">
                No medications added yet
              </Text>
            </View>
          ) : (
            medications.map(med => (
              <MedicationCard
                key={med.id}
                med={med}
                onToggle={toggleMedication}
                onEdit={openEditMed}
                onDelete={deleteMedication}
              />
            ))
          )}

          {/* Add button */}
          <TouchableOpacity
            onPress={openAddMed}
            className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-uni-primary/40 bg-uni-primary/5 py-4"
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={uniTheme.primary} />
            <Text className="text-[15px] font-bold text-uni-primary">Add Medication</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── EVENTS TAB ──────────────────────────────────────────────────── */}
      {tab === 'events' && (
        <View className="flex-1">
          {/* Day strip */}
          <View className="border-b border-uni-border bg-uni-surface px-3 py-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {weekDates.map((date, i) => {
                  const hasEvents = events.some(e => e.dayIndex === i)
                  const active    = selectedDay === i
                  const todayDay  = isToday(date)
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setSelectedDay(i)}
                      className={`min-w-[52px] items-center rounded-2xl py-2 px-1 ${
                        active
                          ? 'bg-uni-primary'
                          : todayDay
                          ? 'border border-uni-primary bg-uni-surface'
                          : 'bg-uni-surface'
                      }`}
                      activeOpacity={0.75}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          active ? 'text-white' : 'text-uni-muted'
                        }`}
                      >
                        {DAYS[i]}
                      </Text>
                      <Text
                        className={`text-[18px] font-black ${
                          active ? 'text-white' : 'text-uni-ink'
                        }`}
                      >
                        {date.getDate()}
                      </Text>
                      {/* Dot indicator for days with events */}
                      <View
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${
                          hasEvents
                            ? active
                              ? 'bg-white'
                              : 'bg-amber-400'
                            : 'bg-transparent'
                        }`}
                      />
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>

          {/* Day label */}
          <View className="px-4 pt-3 pb-1">
            <Text className="text-[13px] font-semibold text-uni-muted">
              {isToday(weekDates[selectedDay])
                ? 'Today'
                : DAY_LABELS[selectedDay]}{' '}
              · {weekDates[selectedDay].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Text>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {eventsForDay.length === 0 ? (
              <View className="mt-10 items-center">
                <Text className="text-4xl">📅</Text>
                <Text className="mt-3 text-[16px] font-semibold text-uni-muted">
                  No events on this day
                </Text>
                <Text className="mt-1 text-[13px] text-uni-muted">
                  Tap the button below to add one
                </Text>
              </View>
            ) : (
              eventsForDay
                .sort((a, b) => (a.time > b.time ? 1 : -1))
                .map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onToggle={toggleEvent}
                    onEdit={openEditEvent}
                    onDelete={deleteEvent}
                    weekDates={weekDates}
                  />
                ))
            )}

            {/* Add button */}
            <TouchableOpacity
              onPress={openAddEvent}
              className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-50 py-4"
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color="#F0A500" />
              <Text className="text-[15px] font-bold text-amber-600">Add Event</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Modals */}
      <MedicationModal
        visible={medModal}
        onClose={() => setMedModal(false)}
        onSave={saveMedication}
        editing={editingMed}
      />
      <EventModal
        visible={eventModal}
        onClose={() => setEventModal(false)}
        onSave={saveEvent}
        editing={editingEvent}
        weekDates={weekDates}
      />
    </SafeAreaView>
  )
}