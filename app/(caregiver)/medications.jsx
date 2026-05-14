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
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
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

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABELS = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
}

function getMedicationLocale(language) {
  const candidates = language?.startsWith('ar')
    ? ['ar-IQ', 'ar']
    : language?.startsWith('ku')
      ? ['ckb-IQ', 'ku', 'ar-IQ']
      : ['en-US', 'en']

  for (const locale of candidates) {
    try {
      if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length) return locale
    } catch {}
  }

  return 'en-US'
}

function getLocalizedDayLabels(locale) {
  const monday = new Date(2024, 0, 1)
  return DAYS.reduce((labels, day, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    labels[day] = date.toLocaleDateString(locale, { weekday: 'short' })
    return labels
  }, {})
}

function formatTime(timeStr, t) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours, 10)
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? (t('pm') || 'PM') : (t('am') || 'AM')}`
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function ElderlySelector({ list, selected, onSelect }) {
  const { t } = useTranslation()

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-text-secondary tracking-widest uppercase mb-3">
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
                    className={`text-[15px] font-extrabold ${
                      active ? 'text-blue-600 dark:text-blue-300' : 'text-text-secondary'
                    }`}
                  >
                    {getInitials(elderly.first_name, elderly.last_name)}
                  </Text>
                </View>
                <Text
                  className={`text-xs font-bold ${
                    active ? 'text-blue-600 dark:text-blue-300' : 'text-text'
                  }`}
                >
                  {elderly.first_name}
                </Text>
                {age ? (
                  <Text className="text-[10px] text-text-secondary mt-0.5">
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

function MedCard({ med, onEdit, onDelete }) {
  const { t, i18n } = useTranslation()
  const dayLabels = getLocalizedDayLabels(getMedicationLocale(i18n.language))
  const [expanded, setExpanded] = useState(false)

  const days = med.medication_schedules
    ?.flatMap((schedule) => schedule.medication_schedule_days?.map((day) => dayLabels[day.day_of_week] || DAY_LABELS[day.day_of_week]) || [])
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(' · ')

  const times = med.medication_schedules
    ?.map((schedule) => formatTime(schedule.scheduled_time, t))
    .join(', ')

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl mb-3 p-4 border border-border"
      onPress={() => setExpanded((value) => !value)}
      activeOpacity={0.88}
    >
      <View className="flex-row items-center gap-3">
        {med.photo_url ? (
          <Image source={{ uri: med.photo_url }} className="w-[54px] h-[54px] rounded-lg" />
        ) : (
          <View className="w-[54px] h-[54px] rounded-lg bg-blue-50 dark:bg-blue-950/30 items-center justify-center">
            <Text className="text-[22px]">💊</Text>
          </View>
        )}

        <View className="flex-1">
          <Text className="text-[15px] font-bold text-text">{med.name}</Text>
          {med.dosage ? (
            <Text className="text-xs text-blue-600 dark:text-blue-300 font-semibold mt-0.5">
              {med.dosage}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-1.5 mt-1">
            {times ? (
              <View className="bg-blue-50 dark:bg-blue-950/30 rounded-full px-2 py-0.5">
                <Text className="text-[10px] text-blue-600 dark:text-blue-300 font-semibold">
                  ⏰ {times}
                </Text>
              </View>
            ) : null}
            {days ? (
              <View className="bg-blue-50 dark:bg-blue-950/30 rounded-full px-2 py-0.5">
                <Text className="text-[10px] text-blue-600 dark:text-blue-300 font-semibold">
                  {days}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text className="text-xs text-text-secondary pl-1.5">{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded ? (
        <View className="mt-3 pt-3 border-t border-border">
          {med.purpose ? (
            <Text className="text-[15px] text-text-secondary mb-1 leading-[18px]">
              <Text className="font-bold text-text">{t('purpose') || 'Purpose'}: </Text>
              {med.purpose}
            </Text>
          ) : null}
          {med.instructions ? (
            <Text className="text-[15px] text-text-secondary mb-1 leading-[18px]">
              <Text className="font-bold text-text">{t('instructions') || 'Instructions'}: </Text>
              {med.instructions}
            </Text>
          ) : null}

          <View className="flex-row gap-2.5 mt-3">
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-lg items-center bg-blue-50 dark:bg-blue-950/30"
              onPress={() => onEdit(med)}
            >
              <Text className="font-bold text-[15px] text-blue-600 dark:text-blue-300">
                ✏️ {t('editMedication') || 'Edit Medication'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-lg items-center bg-red-50 dark:bg-red-950/30"
              onPress={() => onDelete(med)}
            >
              <Text className="font-bold text-[15px] text-red-600 dark:text-red-300">
                🗑 {t('removeMedication') || 'Remove Medication'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

function MedFormModal({ visible, initial, onClose, onSave, title }) {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const dayLabels = getLocalizedDayLabels(getMedicationLocale(i18n.language))
  const empty = {
    name: '',
    purpose: '',
    dosage: '',
    instructions: '',
    scheduledTime: '',
    daysOfWeek: [],
    photoUri: null,
  }

  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return

    if (initial) {
      const firstSchedule = initial.medication_schedules?.[0]
      const days = initial.medication_schedules
        ?.flatMap((schedule) => schedule.medication_schedule_days?.map((day) => day.day_of_week) || [])
        .filter((value, index, array) => array.indexOf(value) === index)

      setForm({
        name: initial.name || '',
        purpose: initial.purpose || '',
        dosage: initial.dosage || '',
        instructions: initial.instructions || '',
        scheduledTime: firstSchedule?.scheduled_time?.slice(0, 5) || '',
        daysOfWeek: days || [],
        photoUri: initial.photo_url || null,
      })
    } else {
      setForm(empty)
    }
  }, [initial, visible])

  function setField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function toggleDay(day) {
    setForm((previous) => ({
      ...previous,
      daysOfWeek: previous.daysOfWeek.includes(day)
        ? previous.daysOfWeek.filter((item) => item !== day)
        : [...previous.daysOfWeek, day],
    }))
  }

  async function pickPhoto(useCamera) {
    try {
      const uri = useCamera ? await takeMedicationPhoto() : await pickMedicationImage()
      if (uri) setField('photoUri', uri)
    } catch (error) {
      Alert.alert(t('error') || 'Error', error.message)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert(
        t('required') || 'Required',
        t('pleaseEnterName') || 'Please enter the medication name.'
      )
      return
    }

    setSaving(true)

    try {
      await onSave(form)
      onClose()
    } catch (error) {
      Alert.alert(t('error') || 'Error', error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/45"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="rounded-t-3xl p-6 max-h-[92%] bg-surface">
          <View className="w-10 h-1 bg-border rounded-full self-center mb-5" />
          <Text className="text-xl font-extrabold text-text mb-5">{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-[15px] font-bold text-text mb-1.5 mt-3.5">
              {t('medicationPhoto') || 'Medication Photo'}
            </Text>
            <View className="items-center mb-2">
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} className="w-[110px] h-[110px] rounded-[14px]" />
              ) : (
                <View className="w-[110px] h-[110px] rounded-[14px] bg-blue-50 dark:bg-blue-950/30 items-center justify-center">
                  <Text className="text-[36px]">💊</Text>
                  <Text className="text-[11px] text-text-secondary mt-1">
                    {t('tapToAddPhoto') || 'Tap to add a photo'}
                  </Text>
                </View>
              )}

              <View className="flex-row gap-2.5 mt-2.5">
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-lg items-center border bg-background border-border"
                  onPress={() => pickPhoto(true)}
                >
                  <Text className="text-[15px] font-semibold text-text">
                    📷 {t('camera') || 'Camera'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-lg items-center border bg-background border-border"
                  onPress={() => pickPhoto(false)}
                >
                  <Text className="text-[15px] font-semibold text-text">
                    🖼 {t('gallery') || 'Gallery'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-[15px] font-bold text-text mb-1.5 mt-3.5">
              {t('medicationName') || 'Medication Name'} *
            </Text>
            <TextInput
              className="border rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-background border-border"
              placeholder={t('egAspirin') || 'e.g. Aspirin'}
              placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
              value={form.name}
              onChangeText={(value) => setField('name', value)}
            />

            <Text className="text-[15px] font-bold text-text mb-1.5 mt-3.5">
              {t('purpose') || 'Purpose'}
            </Text>
            <TextInput
              className="border rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-background border-border"
              placeholder={t('egBloodThinner') || 'e.g. Blood thinner'}
              placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
              value={form.purpose}
              onChangeText={(value) => setField('purpose', value)}
            />

            <Text className="text-[15px] font-bold text-text mb-1.5 mt-3.5">
              {t('dosage') || 'Dosage'}
            </Text>
            <TextInput
              className="border rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-background border-border"
              placeholder={t('eg100mg') || 'e.g. 100mg'}
              placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
              value={form.dosage}
              onChangeText={(value) => setField('dosage', value)}
            />

            <Text className="text-[15px] font-bold text-text mb-1.5 mt-3.5">
              {t('instructions') || 'Instructions'}
            </Text>
            <TextInput
              className="border rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-background h-[70px] border-border"
              placeholder={t('egAfterMeals') || 'e.g. Take with food'}
              placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
              multiline
              value={form.instructions}
              onChangeText={(value) => setField('instructions', value)}
            />

            <Text className="text-[15px] font-bold text-text mb-1.5 mt-3.5">
              {t('scheduledTime') || 'Scheduled Time (HH:MM)'}
            </Text>
            <TextInput
              className="border rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-background border-border"
              placeholder={t('eg0800') || 'e.g. 08:00'}
              placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
              value={form.scheduledTime}
              onChangeText={(value) => setField('scheduledTime', value)}
              keyboardType="numbers-and-punctuation"
            />

            <Text className="text-[15px] font-bold text-text mb-1.5 mt-3.5">
              {t('daysOfWeek') || 'Days of Week'}
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {DAYS.map((day) => {
                const active = form.daysOfWeek.includes(day)

                return (
                  <TouchableOpacity
                    key={day}
                    className={`px-3 py-1.5 rounded-full border ${
                      active
                        ? 'bg-primary_blue border-primary_blue'
                        : 'bg-background border-border'
                    }`}
                    onPress={() => toggleDay(day)}
                  >
                    <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-text-secondary'}`}>
                      {dayLabels[day] || DAY_LABELS[day]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              className={`mt-5 rounded-xl py-3.5 items-center ${saving ? 'opacity-60' : ''} bg-primary_blue`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-extrabold text-base">
                  {initial ? (t('saveChanges') || 'Save Changes') : (t('saveMedication') || 'Save Medication')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity className="mt-2.5 py-3 items-center" onPress={onClose}>
              <Text className="text-text-secondary font-semibold text-sm">
                {t('cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function CaregiverMedicationsScreen() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [elderlyList, setElderlyList] = useState([])
  const [selected, setSelected] = useState(null)
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMeds, setLoadingMeds] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser()
        if (!user) return

        const linked = await getLinkedElderly(user.user_id)
        setElderlyList(linked)
        if (linked.length > 0) setSelected(linked[0])
      } catch {
        Alert.alert(
          t('error') || 'Error',
          t('couldNotLoadPatients') || 'Could not load patients.'
        )
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [t])

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
    } catch {
      Alert.alert(
        t('error') || 'Error',
        t('couldNotLoadMeds') || 'Could not load medications.'
      )
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
      t('removeMedication') || 'Remove Medication',
      t('removeMedicationFromPatient', {
        medication: med.name,
        name: selected?.first_name,
        defaultValue: `Remove "${med.name}" from ${selected?.first_name}'s list?`,
      }),
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('remove') || 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeMedication(med.medication_id)
            await loadMeds(selected.user_id)
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#5B8CFF" />
          <Text className="mt-3 text-text-secondary">
            {t('loadingPatients') || 'Loading patients...'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="flex-row justify-between items-center px-4 pt-4 pb-3 bg-surface border-b border-border">
        <View className="flex-1 pr-3">
          <Text className="text-[28px] font-extrabold text-text">
            {t('medications') || 'Medications'}
          </Text>
          <Text className="text-[15px] text-text-secondary mt-0.5">
            {t('managePatientMedications') || "Manage your patients' medications"}
          </Text>
        </View>
        {selected ? (
          <TouchableOpacity
            className="bg-primary_blue rounded-full px-4 py-2"
            onPress={() => setShowAdd(true)}
          >
            <Text className="text-white font-bold text-sm">
              + {t('add') || 'Add'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {elderlyList.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-5xl mb-4">👥</Text>
          <Text className="text-[17px] font-bold text-text mb-2">
            {t('noLinkedPatients') || 'No linked patients'}
          </Text>
          <Text className="text-sm text-text-secondary text-center leading-5">
            {t('linkPatientFirst') || 'Link an elderly patient to your account first.'}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal={false}
            showsVerticalScrollIndicator={false}
            contentContainerClassName="px-4 pt-4 pb-10"
          >
            <ElderlySelector
              list={elderlyList}
              selected={selected}
              onSelect={(elderly) => {
                setSelected(elderly)
                loadMeds(elderly.user_id)
              }}
            />

            {selected ? (
              <View className="flex-row items-center mt-2 mb-3">
                <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                <Text className="text-[15px] font-semibold text-text-secondary">
                  {selected.first_name} {selected.last_name} · {meds.length}{' '}
                  {meds.length === 1
                    ? (t('medicationSingular') || 'medication')
                    : (t('medicationsLower') || 'medications')}
                </Text>
              </View>
            ) : null}

            {loadingMeds ? (
              <View className="items-center justify-center p-8">
                <ActivityIndicator size="large" color="#5B8CFF" />
              </View>
            ) : meds.length === 0 ? (
              <View className="items-center justify-center p-8 mt-8">
                <Text className="text-[44px] mb-3">💊</Text>
                <Text className="text-[17px] font-bold text-text mb-2">
                  {t('noMedicationsYet') || 'No medications yet'}
                </Text>
                <Text className="text-sm text-text-secondary text-center leading-5">
                  {t('tapAddMedicationForPatient', {
                    name: selected?.first_name,
                    defaultValue: `Tap "+ Add" to add a medication for ${selected?.first_name}.`,
                  })}
                </Text>
                <TouchableOpacity
                  className="mt-5 rounded-xl py-3.5 items-center px-7 bg-primary_blue"
                  onPress={() => setShowAdd(true)}
                >
                  <Text className="text-white font-extrabold text-base">
                    + {t('addMedication') || 'Add Medication'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              meds.map((med) => (
                <MedCard
                  key={med.medication_id}
                  med={med}
                  onEdit={(value) => setEditTarget(value)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </ScrollView>
        </>
      )}

      <MedFormModal
        visible={showAdd}
        initial={null}
        title={t('addMedicationForPatient', {
          name: selected?.first_name || (t('patient') || 'Patient'),
          defaultValue: `Add for ${selected?.first_name ?? 'Patient'}`,
        })}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
      />
      <MedFormModal
        visible={!!editTarget}
        initial={editTarget}
        title={t('editMedication') || 'Edit Medication'}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
      />
    </SafeAreaView>
  )
}
