import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext' 
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
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
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

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const configs = {
    taken:   { label: t('taken') || 'Taken ✓',   bg: 'bg-green-100 dark:bg-green-900/30',   color: 'text-green-700 dark:text-green-400' },
    missed:  { label: t('missed') || 'Missed',    bg: 'bg-red-100 dark:bg-red-900/30',     color: 'text-red-700 dark:text-red-400' },
    skipped: { label: t('skipped') || 'Skipped',   bg: 'bg-yellow-100 dark:bg-yellow-900/30',  color: 'text-yellow-700 dark:text-yellow-400' },
    pending: { label: t('pending') || 'Pending',     bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-700 dark:text-orange-400' },
  }
  const cfg = configs[status] || configs.pending
  
  return (
    <View className={`px-3 py-1.5 rounded-full ${cfg.bg}`}>
      <Text className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</Text>
    </View>
  )
}

function TodayMedCard({ med, onConfirm }) {
  const { t } = useTranslation()
  const isTaken = med.status === 'taken'

  return (
    <View className={`flex-row items-center p-4 mb-3 rounded-xl border ${isTaken ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-surface border-border'} shadow-sm`}>
      <View className="mr-3">
        {med.photo_url ? (
          <Image source={{ uri: med.photo_url }} className="w-14 h-14 rounded-lg" />
        ) : (
          <View className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 items-center justify-center">
            <Text className="text-2xl">💊</Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className={`text-base font-bold ${isTaken ? 'text-green-800 dark:text-green-200' : 'text-text'}`}>{med.name}</Text>
        {med.dosage ? <Text className="text-md text-text-secondary mt-0.5">{med.dosage}</Text> : null}
        <Text className="text-md text-primary mt-0.5">⏰ {formatTime(med.scheduled_time)}</Text>
        {med.purpose ? <Text className="text-md text-text-secondary mt-0.5">{med.purpose}</Text> : null}
      </View>

      <View className="ml-2">
        {isTaken ? (
          <StatusBadge status="taken" />
        ) : (
          <TouchableOpacity
            className="bg-primary_blue px-4 py-2 rounded-lg"
            onPress={() => onConfirm(med)}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-md">{t('confirm') || 'Confirm'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function AllMedCard({ med, onDelete, onEdit }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const dayLabels = med.medication_schedules
    ?.flatMap(s => s.medication_schedule_days?.map(d => DAY_LABELS[d.day_of_week]) || [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ')

  const times = med.medication_schedules
    ?.map(s => formatTime(s.scheduled_time))
    .join(', ')

  return (
    <TouchableOpacity
      className="bg-surface rounded-xl p-4 mb-3 shadow-sm border border-border"
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.85}
    >
      <View className="flex-row items-center">
        <View className="mr-3">
          {med.photo_url ? (
            <Image source={{ uri: med.photo_url }} className="w-14 h-14 rounded-lg" />
          ) : (
            <View className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Text className="text-2xl">💊</Text>
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text className="text-base text-lg font-bold text-text">{med.name}</Text>
          {med.dosage ? <Text className="text-md text-text-secondary mt-0.5">{med.dosage}</Text> : null}
          {times ? <Text className="text-md text-primary mt-0.5">⏰ {times}</Text> : null}
          {dayLabels ? <Text className="text-md text-text-secondary mt-0.5">{dayLabels}</Text> : null}
        </View>

        <Text className="text-lg text-text-secondary ml-2">{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View className="mt-4 pt-4 border-t border-border">
          {med.purpose ? (
            <Text className="text-md text-text-secondary mb-2"><Text className="font-semibold text-text">{t('purpose') || 'Purpose'}: </Text>{med.purpose}</Text>
          ) : null}
          {med.instructions ? (
            <Text className="text-md text-text-secondary mb-4"><Text className="font-semibold text-text">{t('instructions') || 'Instructions'}: </Text>{med.instructions}</Text>
          ) : null}

          <TouchableOpacity
            className="bg-red-50 dark:bg-red-900/20 py-3 rounded-lg items-center mb-2"
            onPress={() => onDelete(med)}
          >
            <Text className="text-red-600 dark:text-red-400 font-semibold">🗑  {t('removeMedication') || 'Remove Medication'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-50 dark:bg-blue-900/20 py-3 rounded-lg items-center"
            onPress={() => onEdit(med)}
          >
            <Text className="text-blue-600 dark:text-blue-400 font-semibold">✏️  {t('editMedication') || 'Edit Medication'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

function AddMedModal({ visible, onClose, onSave }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
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
      Alert.alert(t('error') || 'Error', e.message)
    }
  }

  async function handleCamera() {
    try {
      const uri = await takeMedicationPhoto()
      if (uri) setForm(f => ({ ...f, photoUri: uri }))
    } catch (e) {
      Alert.alert(t('error') || 'Error', e.message)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert(t('required') || 'Required', t('pleaseEnterName') || 'Please enter the medication name.')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      reset()
      onClose()
    } catch (e) {
      Alert.alert(t('error') || 'Error', e.message)
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
        <View className="bg-surface rounded-t-3xl p-5 max-h-[90%]">
          <View className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full self-center mb-4" />

          <Text className="text-xl font-bold text-text mb-4">{t('addMedication') || 'Add Medication'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-md font-semibold text-text mb-2">{t('medicationPhoto') || 'Medication Photo'}</Text>
            <View className="items-center mb-4">
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} className="w-32 h-32 rounded-xl" />
              ) : (
                <View className="w-32 h-32 rounded-xl bg-gray-100 dark:bg-gray-800 justify-center items-center border-2 border-dashed border-border">
                  <Text className="text-4xl">💊</Text>
                  <Text className="text-xs text-text-secondary mt-2 text-center px-2">{t('addPhotoSoYouRecognize') || 'Add a photo so you can recognize it'}</Text>
                </View>
              )}
              <View className="flex-row mt-3 gap-2">
                <TouchableOpacity className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg" onPress={handleCamera}>
                  <Text className="text-md text-text">📷 {t('camera') || 'Camera'}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg" onPress={handlePickPhoto}>
                  <Text className="text-md text-text">🖼 {t('gallery') || 'Gallery'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-lg font-semibold text-text mb-2">{t('medicationName') || 'Medication Name'} *</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('egAspirin') || 'e.g. Aspirin'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('purpose') || 'Purpose'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('egBloodThinner') || 'e.g. Blood thinner'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.purpose}
              onChangeText={v => setForm(f => ({ ...f, purpose: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('dosage') || 'Dosage'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('eg100mg') || 'e.g. 100mg'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.dosage}
              onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('instructions') || 'Instructions'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text h-20"
              placeholder={t('egAfterMeals') || 'e.g. Take after meals'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              multiline
              value={form.instructions}
              onChangeText={v => setForm(f => ({ ...f, instructions: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('scheduledTime') || 'Scheduled Time (HH:MM)'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('eg0800') || 'e.g. 08:00'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.scheduledTime}
              onChangeText={v => setForm(f => ({ ...f, scheduledTime: v }))}
              keyboardType="numbers-and-punctuation"
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('daysOfWeek') || 'Days of Week'}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  className={`px-4 py-2 rounded-full border ${form.daysOfWeek.includes(day) ? 'bg-primary_blue border-primary' : 'bg-surface border-border'}`}
                  onPress={() => toggleDay(day)}
                >
                  <Text className={`text-lg font-medium ${form.daysOfWeek.includes(day) ? 'text-white' : 'text-text'}`}>
                    {DAY_LABELS[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className={`bg-primary_blue py-4 rounded-xl items-center mb-3 ${saving ? 'opacity-60' : ''}`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-semibold text-base">{t('saveMedication') || 'Save Medication'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity className="py-3 items-center" onPress={() => { reset(); onClose() }}>
              <Text className="text-text-secondary font-medium">{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ConfirmModal({ visible, med, onClose, onConfirm }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [photoUri, setPhotoUri] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleCamera() {
    try {
      const uri = await takeMedicationPhoto()
      if (uri) setPhotoUri(uri)
    } catch (e) {
      Alert.alert(t('error') || 'Error', e.message)
    }
  }

  async function handleGallery() {
    try {
      const uri = await pickMedicationImage()
      if (uri) setPhotoUri(uri)
    } catch (e) {
      Alert.alert(t('error') || 'Error', e.message)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm(med.schedule_id, photoUri)
      setPhotoUri(null)
      onClose()
    } catch (e) {
      Alert.alert(t('error') || 'Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!med) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <View className="bg-surface rounded-2xl p-5 w-full max-h-[80%]">
          <View className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full self-center mb-4" />
          <Text className="text-xl font-bold text-text text-center mb-4">{t('confirmTaking') || 'Confirm Taking'}</Text>

          <View className="items-center mb-4">
            {med.photo_url ? (
              <Image source={{ uri: med.photo_url }} className="w-24 h-24 rounded-xl mb-3" />
            ) : (
              <View className="w-24 h-24 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 items-center justify-center mb-3">
                <Text className="text-4xl">💊</Text>
              </View>
            )}
            <Text className="text-lg font-bold text-text text-center">{med.name}</Text>
            <Text className="text-md text-text-secondary text-center">{med.dosage}</Text>
          </View>

          <Text className="text-lg text-text-secondary text-center mb-4">
            {t('optionallyTakePhoto') || 'Optionally take a photo of your medication as proof'}
          </Text>

          {photoUri ? (
            <Image source={{ uri: photoUri }} className="w-full h-40 rounded-xl mb-4" />
          ) : (
            <View className="w-full h-40 rounded-xl bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4 border-2 border-dashed border-border">
              <Text className="text-3xl">📸</Text>
              <Text className="text-lg text-text-secondary mt-2">{t('noPhotoYet') || 'No photo yet'}</Text>
            </View>
          )}

          <View className="flex-row justify-center gap-3 mb-4">
            <TouchableOpacity className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg flex-1 items-center" onPress={handleCamera}>
              <Text className="text-lg text-text">📷 {t('camera') || 'Camera'}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg flex-1 items-center" onPress={handleGallery}>
              <Text className="text-lg text-text">🖼 {t('gallery') || 'Gallery'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`bg-primary_blue py-4 rounded-xl items-center mb-3 ${loading ? 'opacity-60' : ''}`}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-semibold text-base">✓ {t('markAsTaken') || 'Mark as Taken'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity className="py-3 items-center" onPress={() => { setPhotoUri(null); onClose() }}>
            <Text className="text-text-secondary font-medium">{t('cancel') || 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function EditMedModal({ visible, med, onClose, onSave }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [form, setForm] = useState({
    name: '', purpose: '', dosage: '', instructions: '',
    scheduledTime: '', daysOfWeek: [], photoUri: null,
  })
  const [saving, setSaving] = useState(false)

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
      Alert.alert(t('error') || 'Error', e.message)
    }
  }

  async function handleCamera() {
    try {
      const uri = await takeMedicationPhoto()
      if (uri) setForm(f => ({ ...f, photoUri: uri }))
    } catch (e) {
      Alert.alert(t('error') || 'Error', e.message)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert(t('required') || 'Required', t('pleaseEnterName') || 'Please enter the medication name.')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      Alert.alert(t('error') || 'Error', e.message)
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
        <View className="bg-surface rounded-t-3xl p-5 max-h-[90%]">
          <View className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full self-center mb-4" />
          <Text className="text-xl font-bold text-text mb-4">{t('editMedication') || 'Edit Medication'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-lg font-semibold text-text mb-2">{t('medicationPhoto') || 'Medication Photo'}</Text>
            <View className="items-center mb-4">
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} className="w-32 h-32 rounded-xl" />
              ) : (
                <View className="w-32 h-32 rounded-xl bg-gray-100 dark:bg-gray-800 justify-center items-center border-2 border-dashed border-border">
                  <Text className="text-4xl">💊</Text>
                  <Text className="text-xs text-text-secondary mt-2">{t('tapToAddPhoto') || 'Tap to add a photo'}</Text>
                </View>
              )}
              <View className="flex-row mt-3 gap-2">
                <TouchableOpacity className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg" onPress={handleCamera}>
                  <Text className="text-md text-text">📷 {t('camera') || 'Camera'}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg" onPress={handlePickPhoto}>
                  <Text className="text-md text-text">🖼 {t('gallery') || 'Gallery'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-lg font-semibold text-text mb-2">{t('medicationName') || 'Medication Name'} *</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('egAspirin') || 'e.g. Aspirin'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('purpose') || 'Purpose'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('egBloodThinner') || 'e.g. Blood thinner'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.purpose}
              onChangeText={v => setForm(f => ({ ...f, purpose: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('dosage') || 'Dosage'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('eg100mg') || 'e.g. 100mg'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.dosage}
              onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('instructions') || 'Instructions'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text h-20"
              placeholder={t('egAfterMeals') || 'e.g. Take after meals'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              multiline
              value={form.instructions}
              onChangeText={v => setForm(f => ({ ...f, instructions: v }))}
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('scheduledTime') || 'Scheduled Time (HH:MM)'}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 mb-3 text-base bg-gray-50 dark:bg-gray-800 text-text"
              placeholder={t('eg0800') || 'e.g. 08:00'}
              placeholderTextColor={isDark ? '#94a3b8' : '#666666'}
              value={form.scheduledTime}
              onChangeText={v => setForm(f => ({ ...f, scheduledTime: v }))}
              keyboardType="numbers-and-punctuation"
            />

            <Text className="text-lg font-semibold text-text mb-2">{t('daysOfWeek') || 'Days of Week'}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  className={`px-4 py-2 rounded-full border ${form.daysOfWeek.includes(day) ? 'bg-primary_blue border-primary' : 'bg-surface border-border'}`}
                  onPress={() => toggleDay(day)}
                >
                  <Text className={`text-lg font-medium ${form.daysOfWeek.includes(day) ? 'text-white' : 'text-text'}`}>
                    {DAY_LABELS[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className={`bg-primary_blue py-4 rounded-xl items-center mb-3 ${saving ? 'opacity-60' : ''}`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-semibold text-base">{t('saveChanges') || 'Save Changes'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity className="py-3 items-center" onPress={onClose}>
              <Text className="text-text-secondary font-medium">{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function MedicationsScreen() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [userId, setUserId] = useState(null)
  const [tab, setTab] = useState('today')
  const [todayMeds, setTodayMeds] = useState([])
  const [allMeds, setAllMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    getCurrentUser().then(u => u && setUserId(u.user_id)).catch(console.error)
  }, [])

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
      Alert.alert(t('error') || 'Error', t('couldNotLoadMeds') || 'Could not load medications.')
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
      t('removeMedication') || 'Remove Medication',
      `${t('removeConfirm') || 'Remove'} "${med.name}" ${t('fromYourList') || 'from your list'}?`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('remove') || 'Remove', style: 'destructive',
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

  const takenCount = todayMeds.filter(m => m.status === 'taken').length
  const totalToday = todayMeds.length

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="flex-row items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <View>
          <Text className="text-xl font-bold text-text">{t('medications') || 'Medications'}</Text>
            <Text className={`text-md mt-1 ${isDark ? 'text-white/80' : 'text-text-secondary'}`}>
            {totalToday > 0
              ? `${takenCount} ${t('of') || 'of'} ${totalToday} ${t('takenToday') || 'taken today'}`
              : t('noMedsScheduled') || 'No medications scheduled today'}
          </Text>
        </View>
        <TouchableOpacity 
          className="bg-primary_blue px-4 py-2 rounded" 
          onPress={() => setShowAdd(true)}
        >
          <Text className="text-white font-semibold text-lg">+ {t('add') || 'Add'}</Text>
        </TouchableOpacity>
      </View>

      {totalToday > 0 && (
        <View className="px-4 py-3 bg-surface">
          <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <View 
              className="h-full bg-primary rounded-full" 
              style={{ width: `${(takenCount / totalToday) * 100}%` }} 
            />
          </View>
        </View>
      )}

            <View className="flex-row bg-surface border-b border-border">
        <TouchableOpacity
          className={`flex-1 py-3 items-center border-b-2 ${tab === 'today' ? 'border-primary' : 'border-transparent'}`}
          onPress={() => setTab('today')}
        >
          <Text className={`text-md font-medium ${tab === 'today' ? (isDark ? 'text-white' : 'text-primary') : isDark ? 'text-white/60' : 'text-text-secondary'}`}>
            {t('today') || 'Today'} {totalToday > 0 ? `(${totalToday})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 items-center border-b-2 ${tab === 'all' ? 'border-primary' : 'border-transparent'}`}
          onPress={() => setTab('all')}
        >
          <Text className={`text-md font-medium ${tab === 'all' ? (isDark ? 'text-white' : 'text-primary') : isDark ? 'text-white/60' : 'text-text-secondary'}`}>
            {t('allMedications') || 'All Medications'} {allMeds.length > 0 ? `(${allMeds.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5B8CFF" />
          <Text className="mt-3 text-text-secondary text-base">{t('loadingMeds') || 'Loading medications…'}</Text>
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
                <Text className="text-lg font-semibold text-text mb-2">{t('noMedsToday') || 'No medications today'}</Text>
                <Text className="text-md text-text-secondary text-center">{t('noMedsTodayDesc') || 'You have no medications scheduled for today.'}</Text>
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
                <Text className="text-lg font-semibold text-text mb-2">{t('noMedsAddedYet') || 'No medications added yet'}</Text>
                <Text className="text-md text-text-secondary text-center mb-6">{t('tapToAddFirst') || 'Tap "+ Add" to add your first medication.'}</Text>
                <TouchableOpacity 
                  className="bg-primary_blue px-6 py-3 rounded-full" 
                  onPress={() => setShowAdd(true)}
                >
                  <Text className="text-white font-semibold">+ {t('addMedication') || 'Add Medication'}</Text>
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