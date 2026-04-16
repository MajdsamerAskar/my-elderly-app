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
  <Text className="text-xs font-bold text-[#9999AA] tracking-[0.8px] uppercase ml-5 mb-2.5">
    Select Patient
  </Text>
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false} 
    contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 4 }}
  >
    {list.map(e => {
      const active = selected?.user_id === e.user_id
      const age = calcAge(e.date_of_birth)
      return (
        <TouchableOpacity
          key={e.user_id}
          className={`items-center py-2.5 px-3.5 rounded-2xl border-[1.5px] min-w-[72px] ${active ? 'border-[#3B5BDB] bg-[#EDF2FF]' : 'border-[#E2E8F0] bg-white'}`}
          onPress={() => onSelect(e)}
          activeOpacity={0.8}
        >
          <View className={`w-11 h-11 rounded-full items-center justify-center mb-1.5 ${active ? 'bg-[#C5D3FF]' : 'bg-[#E2E8F0]'}`}>
            <Text className={`text-[15px] font-extrabold ${active ? 'text-[#3B5BDB]' : 'text-[#555570]'}`}>
              {getInitials(e.first_name, e.last_name)}
            </Text>
          </View>
          <Text className={`text-xs font-bold ${active ? 'text-[#3B5BDB]' : 'text-[#1A1A2E]'}`}>
            {e.first_name}
          </Text>
          {age ? <Text className="text-[10px] text-[#9999AA] mt-0.5">{age} yrs</Text> : null}
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
    <TouchableOpacity 
  className="bg-white rounded-2xl mx-5 mb-3 p-3.5"
  style={{
    shadowColor: C.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  }}
  onPress={() => setExpanded(e => !e)} 
  activeOpacity={0.88}
>
  <View className="flex-row items-center gap-3">
    {/* Photo */}
    {med.photo_url
      ? <Image source={{ uri: med.photo_url }} className="w-[54px] h-[54px] rounded-lg" />
      : <View className="w-[54px] h-[54px] rounded-lg bg-[#EEF2FF] items-center justify-center"><Text className="text-[22px]">💊</Text></View>
    }

    {/* Info */}
    <View className="flex-1">
      <Text className="text-[15px] font-bold text-[#1A1A2E]">{med.name}</Text>
      {med.dosage ? <Text className="text-xs text-[#748FFC] font-semibold mt-0.5">{med.dosage}</Text> : null}
      <View className="flex-row flex-wrap gap-1.5 mt-1">
        {times ? <View className="bg-[#EDF2FF] rounded-full px-2 py-0.5"><Text className="text-[10px] text-[#3B5BDB] font-semibold">⏰ {times}</Text></View> : null}
        {days  ? <View className="bg-[#EDF2FF] rounded-full px-2 py-0.5"><Text className="text-[10px] text-[#3B5BDB] font-semibold">{days}</Text></View>  : null}
      </View>
    </View>

    <Text className="text-xs text-[#9999AA] pl-1.5">{expanded ? '▲' : '▼'}</Text>
  </View>

  {expanded && (
    <View className="mt-3 pt-3 border-t border-[#E2E8F0]">
      {med.purpose      ? <Text className="text-[15px] text-[#555570] mb-1 leading-[18px]"><Text className="font-bold text-[#1A1A2E]">Purpose: </Text>{med.purpose}</Text> : null}
      {med.instructions ? <Text className="text-[15px] text-[#555570] mb-1 leading-[18px]"><Text className="font-bold text-[#1A1A2E]">Instructions: </Text>{med.instructions}</Text> : null}

      <View className="flex-row gap-2.5 mt-3">
        <TouchableOpacity className="flex-1 py-2.5 rounded-lg items-center bg-[#EDF2FF]" onPress={() => onEdit(med)}>
          <Text className="font-bold text-[15px] text-[#3B5BDB]">✏️  Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 py-2.5 rounded-lg items-center bg-[#FFF5F5]" onPress={() => onDelete(med)}>
          <Text className="font-bold text-[15px] text-[#F03E3E]">🗑  Remove</Text>
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
  <KeyboardAvoidingView 
    className="flex-1 justify-end bg-black-45%" 
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View 
      className="rounded-t-3xl p-6 max-h-[92%] bg-white"
    >
      <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mb-5" />
      <Text className="text-xl font-extrabold text-[#1A1A2E] mb-5">{title}</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <Text className="text-[15px] font-bold text-[#1A1A2E] mb-1.5 mt-3.5">Photo</Text>
        <View className="items-center mb-2">
          {form.photoUri
            ? <Image source={{ uri: form.photoUri }} className="w-[110px] h-[110px] rounded-[14px]" />
            : <View className="w-[110px] h-[110px] rounded-[14px] bg-[#EEF2FF] items-center justify-center">
                <Text className="text-[36px]">💊</Text>
                <Text className="text-[11px] text-[#555570] mt-1">Add a photo</Text>
              </View>
          }
          <View className="flex-row gap-2.5 mt-2.5">
            <TouchableOpacity 
              className="flex-1 py-2.5 rounded-lg items-center border-[1.5px] bg-[#F4F6FA] border-[#E2E8F0]"
              onPress={() => pickPhoto(true)}
            >
              <Text className="text-[15px] font-semibold text-[#1A1A2E]">📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 py-2.5 rounded-lg items-center border-[1.5px] bg-[#F4F6FA] border-[#E2E8F0]"
              onPress={() => pickPhoto(false)}
            >
              <Text className="text-[15px] font-semibold text-[#1A1A2E]">🖼 Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-[15px] font-bold text-[#1A1A2E] mb-1.5 mt-3.5">Name *</Text>
        <TextInput 
          className="border-[1.5px] rounded-xl px-3.5 py-2.5 text-[15px] text-[#1A1A2E] bg-[#FAFAFA] border-[#E2E8F0]"
          placeholder="e.g. Metformin" 
          value={form.name} 
          onChangeText={v => set('name', v)} 
        />

        <Text className="text-[15px] font-bold text-[#1A1A2E] mb-1.5 mt-3.5">Purpose</Text>
        <TextInput 
          className="border-[1.5px] rounded-xl px-3.5 py-2.5 text-[15px] text-[#1A1A2E] bg-[#FAFAFA] border-[#E2E8F0]"
          placeholder="e.g. Blood sugar control" 
          value={form.purpose} 
          onChangeText={v => set('purpose', v)} 
        />

        <Text className="text-[15px] font-bold text-[#1A1A2E] mb-1.5 mt-3.5">Dosage</Text>
        <TextInput 
          className="border-[1.5px] rounded-xl px-3.5 py-2.5 text-[15px] text-[#1A1A2E] bg-[#FAFAFA] border-[#E2E8F0]"
          placeholder="e.g. 500mg" 
          value={form.dosage} 
          onChangeText={v => set('dosage', v)} 
        />

        <Text className="text-[15px] font-bold text-[#1A1A2E] mb-1.5 mt-3.5">Instructions</Text>
        <TextInput 
          className="border-[1.5px] rounded-xl px-3.5 py-2.5 text-[15px] text-[#1A1A2E] bg-[#FAFAFA] h-[70px] border-[#E2E8F0]"
          placeholder="e.g. Take with food" 
          multiline 
          value={form.instructions} 
          onChangeText={v => set('instructions', v)} 
        />

        <Text className="text-[15px] font-bold text-[#1A1A2E] mb-1.5 mt-3.5">Scheduled Time (HH:MM)</Text>
        <TextInput 
          className="border-[1.5px] rounded-xl px-3.5 py-2.5 text-[15px] text-[#1A1A2E] bg-[#FAFAFA] border-[#E2E8F0]"
          placeholder="e.g. 08:00" 
          value={form.scheduledTime} 
          onChangeText={v => set('scheduledTime', v)} 
          keyboardType="numbers-and-punctuation" 
        />

        <Text className="text-[15px] font-bold text-[#1A1A2E] mb-1.5 mt-3.5">Days of Week</Text>
        <View className="flex-row flex-wrap gap-2 mt-1">
          {DAYS.map(day => {
            const on = form.daysOfWeek.includes(day)
            return (
              <TouchableOpacity
                key={day}
                className={`px-3 py-1.5 rounded-full border-[1.5px] ${on ? 'bg-[#3B5BDB] border-[#3B5BDB]' : 'bg-[#F4F6FA] border-[#E2E8F0]'}`}
                onPress={() => toggleDay(day)}
              >
                <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-[#9999AA]'}`}>
                  {DAY_LABELS[day]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity 
          className={`mt-5 rounded-xl py-3.5 items-center ${saving ? 'opacity-60' : ''} bg-[#3B5BDB]`}
          onPress={handleSave} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-extrabold text-base">Save</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          className="mt-2.5 py-3 items-center" 
          onPress={onClose}
        >
          <Text className="text-[#555570] font-semibold text-sm">Cancel</Text>
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
      <SafeAreaView className="flex-1 bg-[#FAFAFA]">
  <View className="flex-1 items-center justify-center p-8">
    <ActivityIndicator size="large" color={C.primary} />
    <Text className="mt-3 text-[#555570]">Loading patients…</Text>
  </View>
</SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
  <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

  {/* Header */}
  <View className="flex-row justify-between items-center px-5 pt-4 pb-3">
    <View>
      <Text className="text-[28px] font-extrabold text-[#1A1A2E] tracking-[-0.5px]">Medications</Text>
      <Text className="text-[15px] text-[#555570] mt-0.5">Manage your patients' medications</Text>
    </View>
    {selected && (
      <TouchableOpacity 
        className="bg-[#3B5BDB] rounded-full px-4 py-2"
        onPress={() => setShowAdd(true)}
      >
        <Text className="text-white font-bold text-sm">+ Add</Text>
      </TouchableOpacity>
    )}
  </View>

  {/* No patients linked */}
  {elderlyList.length === 0 ? (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-5xl mb-4">👥</Text>
      <Text className="text-[17px] font-bold text-[#1A1A2E] mb-2">No patients linked</Text>
      <Text className="text-sm text-[#555570] text-center leading-5">Link an elderly patient to your account first.</Text>
    </View>
  ) : (
    <>
      {/* Patient selector */}
      <ElderlySelector list={elderlyList} selected={selected} onSelect={e => { setSelected(e); loadMeds(e.user_id) }} />

      {/* Divider with patient name */}
      {selected && (
        <View className="flex-row items-center mx-5 mt-4 mb-2.5">
          <View className="w-2 h-2 rounded-full bg-[#3B5BDB] mr-2" />
          <Text className="text-[15px] font-semibold text-[#555570]">
            {selected.first_name} {selected.last_name} — {meds.length} medication{meds.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Medications list */}
      {loadingMeds ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator className="text-[#3B5BDB]" />
        </View>
      ) : meds.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-[44px] mb-3">💊</Text>
          <Text className="text-[17px] font-bold text-[#1A1A2E] mb-2">No medications yet</Text>
          <Text className="text-sm text-[#555570] text-center leading-5">Tap "+ Add" to add a medication for {selected?.first_name}.</Text>
          <TouchableOpacity 
            className="mt-5 rounded-xl py-3.5 items-center px-7 bg-[#3B5BDB]"
            onPress={() => setShowAdd(true)}
          >
            <Text className="text-white font-extrabold text-base">+ Add Medication</Text>
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

