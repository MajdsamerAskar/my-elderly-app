import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Linking,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../ThemeContext'
import { createEvent, updateEvent, deleteEvent } from '../services/calendar.service'

const EVENT_TYPES = [
  { value: 'medical', labelKey: 'calendarTypeMedical', fallback: 'Medical', icon: 'medical', color: '#E05C5C' },
  { value: 'family', labelKey: 'calendarTypeFamily', fallback: 'Family', icon: 'people', color: '#5B8CFF' },
  { value: 'other', labelKey: 'calendarTypeOther', fallback: 'Other', icon: 'calendar', color: '#5CB87A' },
]

function getCalendarLocale(language) {
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

function formatReminderShort(value, t) {
  const minutes = parseInt(value, 10)
  if (minutes >= 60) return `${minutes / 60}${t('calendarHourShort') || 'h'}`
  return `${minutes}${t('calendarMinuteShort') || 'm'}`
}

function formatReminderLong(value, t) {
  if (!value) return t('noReminder') || 'No reminder'

  const minutes = parseInt(value, 10)
  if (minutes >= 60) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? (t('hour') || 'hour') : (t('hours') || 'hours')} ${t('before') || 'before'}`
  }

  return `${minutes} ${minutes === 1 ? (t('minute') || 'minute') : (t('minutes') || 'minutes')} ${t('before') || 'before'}`
}

function openDirections(locationText, t) {
  if (!locationText?.trim()) return

  const encoded = encodeURIComponent(locationText.trim())
  const url = Platform.select({
    ios: `maps://maps.apple.com/?daddr=${encoded}`,
    android: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
  })
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`

  Linking.canOpenURL(url)
    .then((supported) => Linking.openURL(supported ? url : fallback))
    .catch(() =>
      Alert.alert(
        t('mapsUnavailable') || 'Maps unavailable',
        t('couldNotOpenMapsApp') || 'Could not open the maps app on this device.'
      )
    )
}

export default function CalendarEventModal({
  visible,
  onClose,
  onSaved,
  onDeleted,
  event = null,
  selectedDate,
  elderlyUserId,
  currentUserId,
  readOnly = false,
}) {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const locale = getCalendarLocale(i18n.language)
  const placeholderTextColor = isDark ? '#94a3b8' : '#9ca3af'
  const isEdit = !!event

  const [isEditing, setIsEditing] = useState(!isEdit)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState('other')
  const [startDate, setStartDate] = useState(selectedDate ?? new Date())
  const [reminderMinutes, setReminderMinutes] = useState('30')

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '')
      setDescription(event.description ?? '')
      setLocation(event.location ?? '')
      setEventType(event.event_type ?? 'other')
      setStartDate(event.start_datetime ? new Date(event.start_datetime) : new Date())
      setReminderMinutes(event.reminder_minutes != null ? String(event.reminder_minutes) : '30')
      setIsEditing(false)
    } else {
      setTitle('')
      setDescription('')
      setLocation('')
      setEventType('other')
      setStartDate(selectedDate ?? new Date())
      setReminderMinutes('30')
      setIsEditing(true)
    }
    setError(null)
    setShowDatePicker(false)
    setShowTimePicker(false)
  }, [event, visible, selectedDate])

  async function handleSave() {
    if (!title.trim()) {
      setError(t('pleaseEnterEventTitle') || 'Please enter a title.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        eventType,
        startDatetime: startDate.toISOString(),
        reminderMinutes: reminderMinutes ? parseInt(reminderMinutes, 10) : null,
      }

      let saved
      if (isEdit) {
        saved = await updateEvent(event.event_id, {
          title: payload.title,
          description: payload.description,
          location: payload.location,
          event_type: payload.eventType,
          start_datetime: payload.startDatetime,
          reminder_minutes: payload.reminderMinutes,
        })
      } else {
        saved = await createEvent({
          createdBy: currentUserId,
          elderlyUserId,
          ...payload,
        })
      }

      onSaved?.(saved)
      onClose()
    } catch (e) {
      setError(e.message ?? (t('somethingWentWrong') || 'Something went wrong.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteEvent(event.event_id)
      onDeleted?.(event.event_id)
      onClose()
    } catch (e) {
      setError(e.message ?? (t('couldNotDeleteEvent') || 'Could not delete event.'))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) =>
    date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  const formatTime = (date) =>
    date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-surface rounded-t-3xl max-h-[85%]">
          <View className={`w-12 h-1 rounded-full self-center mt-3 mb-2 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text className="text-lg font-bold text-text">
              {isEditing
                ? (isEdit ? (t('editEvent') || 'Edit Event') : (t('newEvent') || 'New Event'))
                : (t('eventDetails') || 'Event Details')}
            </Text>
            <View className="flex-row">
              {isEdit && !readOnly && !isEditing && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  className="w-10 h-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 mr-2"
                >
                  <Ionicons name="pencil" size={20} color="#5B8CFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView className="px-4 py-4" showsVerticalScrollIndicator={false}>
            {isEditing && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {EVENT_TYPES.map((item) => {
                  const active = eventType === item.value
                  return (
                    <TouchableOpacity
                      key={item.value}
                      className={`flex-row items-center px-4 py-2 rounded-full border ${
                        active ? 'border-transparent' : 'border-border bg-surface'
                      }`}
                      style={active ? { backgroundColor: item.color, borderColor: item.color } : {}}
                      onPress={() => setEventType(item.value)}
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={active ? '#FFF' : item.color}
                      />
                      <Text
                        className={`ml-2 text-lg font-medium ${active ? 'text-white' : ''}`}
                        style={active ? {} : { color: item.color }}
                      >
                        {t(item.labelKey) || item.fallback}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            <Field label={t('title') || 'Title'} required>
              {isEditing ? (
                <TextInput
                  className="border border-border rounded-lg px-4 py-3 text-base bg-background text-text"
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('egDoctorAppointment') || 'e.g. Doctor Appointment'}
                  placeholderTextColor={placeholderTextColor}
                  maxLength={255}
                />
              ) : (
                <Text className="text-base text-text">{title}</Text>
              )}
            </Field>

            <Field label={t('date') || 'Date'}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    className="flex-row items-center border border-border rounded-lg px-4 py-3 mb-2 bg-background"
                    onPress={() => setShowDatePicker((prev) => !prev)}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#5B8CFF" />
                    <Text className="ml-2 text-base text-text">{formatDate(startDate)}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(_, date) => {
                        setShowDatePicker(false)
                        if (date) {
                          setStartDate((prev) => {
                            const next = new Date(date)
                            next.setHours(prev.getHours(), prev.getMinutes())
                            return next
                          })
                        }
                      }}
                    />
                  )}
                </>
              ) : (
                <Text className="text-base text-text">{formatDate(startDate)}</Text>
              )}
            </Field>

            <Field label={t('time') || 'Time'}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    className="flex-row items-center border border-border rounded-lg px-4 py-3 mb-2 bg-background"
                    onPress={() => setShowTimePicker((prev) => !prev)}
                  >
                    <Ionicons name="time-outline" size={16} color="#5B8CFF" />
                    <Text className="ml-2 text-base text-text">{formatTime(startDate)}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="time"
                      display="default"
                      onChange={(_, date) => {
                        setShowTimePicker(false)
                        if (date) {
                          setStartDate((prev) => {
                            const next = new Date(prev)
                            next.setHours(date.getHours(), date.getMinutes())
                            return next
                          })
                        }
                      }}
                    />
                  )}
                </>
              ) : (
                <Text className="text-base text-text">{formatTime(startDate)}</Text>
              )}
            </Field>

            <Field label={t('location') || 'Location'}>
              {isEditing ? (
                <>
                  <TextInput
                    className="border border-border rounded-lg px-4 py-3 text-base bg-background text-text"
                    value={location}
                    onChangeText={setLocation}
                    placeholder={t('egCityHospitalAddress') || 'e.g. City Hospital, 45 Main St'}
                    placeholderTextColor={placeholderTextColor}
                    maxLength={255}
                    returnKeyType="done"
                  />
                  <Text className="text-md text-text-secondary mt-1">
                    {t('enterAddressToEnableDirections') || 'Enter an address or place name to enable directions'}
                  </Text>
                </>
              ) : location ? (
                <View className="bg-background rounded-lg p-3 border border-border">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="location" size={16} color="#5B8CFF" />
                    <Text className="ml-2 text-base text-text flex-1">{location}</Text>
                  </View>

                  <TouchableOpacity
                    className="flex-row items-center justify-center bg-blue-500 py-3 rounded-lg"
                    onPress={() => openDirections(location, t)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={16} color="#FFF" />
                    <Text className="ml-2 text-white font-semibold">
                      {t('getDirections') || 'Get Directions'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text className="text-base text-text-secondary italic">
                  {t('noLocationSet') || 'No location set'}
                </Text>
              )}
            </Field>

            <Field label={t('notes') || 'Notes'}>
              {isEditing ? (
                <TextInput
                  className="border border-border rounded-lg px-4 py-3 text-base bg-background text-text h-24"
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('anyAdditionalDetails') || 'Any additional details...'}
                  placeholderTextColor={placeholderTextColor}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text className={`text-base ${!description ? 'text-text-secondary italic' : 'text-text'}`}>
                  {description || (t('noNotes') || 'No notes')}
                </Text>
              )}
            </Field>

            <Field label={t('reminder') || 'Reminder'}>
              {isEditing ? (
                <View className="flex-row gap-2">
                  {['15', '30', '60', '120'].map((minutes) => {
                    const active = reminderMinutes === minutes
                    return (
                      <TouchableOpacity
                        key={minutes}
                        className={`flex-1 py-3 rounded-lg border items-center ${
                          active ? 'bg-blue-500 border-blue-500' : 'bg-surface border-border'
                        }`}
                        onPress={() => setReminderMinutes(minutes)}
                      >
                        <Text className={`text-lg font-medium ${active ? 'text-white' : 'text-text-secondary'}`}>
                          {formatReminderShort(minutes, t)}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ) : (
                <Text className="text-base text-text">
                  {formatReminderLong(reminderMinutes, t)}
                </Text>
              )}
            </Field>

            {error && (
              <View className="flex-row items-center bg-red-50 dark:bg-red-950/30 rounded-lg p-3 mb-4 border border-red-100 dark:border-red-900">
                <Ionicons name="alert-circle" size={16} color="#E05C5C" />
                <Text className="ml-2 text-lg text-red-600 dark:text-red-300 flex-1">{error}</Text>
              </View>
            )}

            {isEditing && (
              <>
                <TouchableOpacity
                  className={`bg-blue-500 py-4 rounded-xl items-center mb-3 ${loading ? 'opacity-60' : ''}`}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      {isEdit ? (t('saveChanges') || 'Save Changes') : (t('addEvent') || 'Add Event')}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="py-4 items-center justify-center rounded-full bg-background"
                >
                  <Text className="text-text-secondary font-semibold">
                    {t('cancel') || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isEdit && isEditing && !readOnly && (
              <TouchableOpacity
                className="flex-row items-center justify-center py-3"
                onPress={handleDelete}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={16} color="#E05C5C" />
                <Text className="ml-2 text-red-500 dark:text-red-300 font-semibold">
                  {t('deleteEvent') || 'Delete Event'}
                </Text>
              </TouchableOpacity>
            )}

            <View className="h-8" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function Field({ label, required, children }) {
  return (
    <View className="mb-4">
      <Text className="text-lg font-semibold text-text mb-2">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      {children}
    </View>
  )
}
