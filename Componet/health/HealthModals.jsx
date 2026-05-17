import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import {
  logBiometricReading,
  logSleepSession,
  logActivity,
  submitWellnessCheckin,
} from '../../services/health.service'
import { formatDuration } from './HealthSections'

function toISODateTime(date, timeString) {
  if (!date || !timeString) return null
  const [hours, minutes] = timeString.split(':').map(Number)
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function getTimeFromISO(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toTimeString().slice(0, 5)
}

function calculateDurationMinutes(startISO, endISO) {
  if (!startISO || !endISO) return 0
  return Math.round((new Date(endISO) - new Date(startISO)) / (1000 * 60))
}

function scaleTo5(value) {
  return Math.ceil(value / 2)
}

function timeStringToDate(timeString) {
  if (!timeString) return new Date()
  const [hours, minutes] = timeString.split(':').map(Number)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

function dateToTimeString(date) {
  return date.toTimeString().slice(0, 5)
}

function formatDisplayTime(timeString, t) {
  if (!timeString) return '—'
  const [h, m] = timeString.split(':').map(Number)
  const period = h >= 12 ? (t('pm') || 'PM') : (t('am') || 'AM')
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function FormSectionLabel({ children }) {
  return <Text className="text-md font-medium text-text mb-2">{children}</Text>
}

function ActionButtons({ loading, onClose, onSubmit, submitLabel }) {
  const { t } = useTranslation()

  return (
    <View className="flex-row gap-3 mb-6">
      <TouchableOpacity
        className="flex-1 bg-background rounded-xl py-4 items-center"
        onPress={onClose}
        disabled={loading}
      >
        <Text className="text-base font-medium text-text-secondary">
          {t('cancel') || 'Cancel'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`flex-1 rounded-xl py-4 items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-base font-medium text-white">{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

function TimePicker({ label, value, onChange }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [tempDate, setTempDate] = useState(timeStringToDate(value))

  const onAndroidChange = (event, selected) => {
    setShowAndroid(false)
    if (event.type === 'set' && selected) {
      onChange(dateToTimeString(selected))
    }
  }

  const openIOS = () => {
    setTempDate(timeStringToDate(value))
    setShowIOSModal(true)
  }

  const confirmIOS = () => {
    onChange(dateToTimeString(tempDate))
    setShowIOSModal(false)
  }

  return (
    <>
      <TouchableOpacity
        className="border border-border rounded-xl p-4 flex-row items-center justify-between bg-surface"
        onPress={Platform.OS === 'ios' ? openIOS : () => setShowAndroid(true)}
        activeOpacity={0.7}
      >
        <Text className="text-lg font-medium text-text">
          {value ? formatDisplayTime(value, t) : '—'}
        </Text>
        <Text className="text-lg text-text-secondary">🕐</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={onAndroidChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showIOSModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIOSModal(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/40"
            activeOpacity={1}
            onPress={() => setShowIOSModal(false)}
          />
          <View className="bg-surface rounded-t-3xl px-5 pb-8 pt-4">
            <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 self-center mb-4" />
            <Text className="text-[18px] font-bold text-text text-center mb-2">
              {label}
            </Text>
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="spinner"
              is24Hour={false}
              onChange={(_, selected) => selected && setTempDate(selected)}
              style={{ height: 180 }}
              textColor={isDark ? '#F5F5F5' : '#111827'}
            />
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 border border-border rounded-xl py-3.5 items-center"
                onPress={() => setShowIOSModal(false)}
              >
                <Text className="text-text-secondary font-semibold text-[16px]">
                  {t('cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-500 rounded-xl py-3.5 items-center"
                onPress={confirmIOS}
              >
                <Text className="text-white font-bold text-[16px]">
                  {t('confirm') || 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  )
}

function BiometricsForm({ mode, initialData, onClose, onSaved }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const errorTitle = t('error') || 'Error'
  const placeholderColor = isDark ? '#94a3b8' : '#6b7280'
  const [source, setSource] = useState(initialData?.heart_rate?.source || initialData?.spo2?.source || 'manual')
  const [heartRate, setHeartRate] = useState(initialData?.heart_rate?.value?.toString() || '')
  const [spo2, setSpo2] = useState(initialData?.spo2?.value?.toString() || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!heartRate || !spo2) {
      Alert.alert(errorTitle, t('pleaseEnterBothHeartRateAndBloodOxygen') || 'Please enter both heart rate and blood oxygen')
      return
    }

    const hr = parseInt(heartRate, 10)
    const sp = parseInt(spo2, 10)

    if (hr < 30 || hr > 250) {
      Alert.alert(errorTitle, t('pleaseEnterValidHeartRate') || 'Please enter a valid heart rate (30-250 bpm)')
      return
    }

    if (sp < 50 || sp > 100) {
      Alert.alert(errorTitle, t('pleaseEnterValidSpO2') || 'Please enter a valid SpO2 percentage (50-100%)')
      return
    }

    setLoading(true)
    try {
      await Promise.all([
        logBiometricReading('heart_rate', hr, source),
        logBiometricReading('spo2', sp, source),
      ])
      onSaved?.()
    } catch (e) {
      Alert.alert(errorTitle, e.message || (t('failedToSaveBiometrics') || 'Failed to save biometrics'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-text mb-2">
        {mode === 'edit' ? (t('updateBiometrics') || 'Update Biometrics') : (t('logBiometrics') || 'Log Biometrics')}
      </Text>
      <Text className="text-[18px] text-text-secondary mb-6">
        {t('recordYourVitalSigns') || 'Record your vital signs'}
      </Text>

      <FormSectionLabel>{t('source') || 'Source'}</FormSectionLabel>
      <View className="flex-row gap-3 mb-6">
        {['watch', 'manual'].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setSource(item)}
            className={`flex-1 py-4 rounded-xl border-2 items-center ${
              source === item
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-700'
                : 'border-border bg-surface'
            }`}
          >
            <Text className={`font-medium text-md ${
              source === item ? 'text-blue-600 dark:text-blue-300' : 'text-text-secondary'
            }`}>
              {item === 'watch'
                ? `⌚ ${t('watch') || 'Watch'}`
                : `✋ ${t('manual') || 'Manual'}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FormSectionLabel>{t('heartRateBpm') || 'Heart rate (beats per minute)'}</FormSectionLabel>
      <TextInput
        className="border border-border rounded-xl p-4 text-[18px] mb-5 bg-background text-text"
        placeholder={t('eg72') || 'e.g., 72'}
        placeholderTextColor={placeholderColor}
        keyboardType="number-pad"
        value={heartRate}
        onChangeText={setHeartRate}
        maxLength={3}
      />

      <FormSectionLabel>{t('bloodOxygenPercent') || 'Blood Oxygen (%)'}</FormSectionLabel>
      <TextInput
        className="border border-border rounded-xl p-4 text-[18px] mb-8 bg-background text-text"
        placeholder={t('eg98') || 'e.g., 98'}
        placeholderTextColor={placeholderColor}
        keyboardType="number-pad"
        value={spo2}
        onChangeText={setSpo2}
        maxLength={3}
      />

      <ActionButtons
        loading={loading}
        onClose={onClose}
        onSubmit={handleSave}
        submitLabel={t('save') || 'Save'}
      />
    </ScrollView>
  )
}

function SleepForm({ mode, initialData, onClose, onSaved }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const errorTitle = t('error') || 'Error'

  const [bedTime, setBedTime] = useState(
    initialData ? getTimeFromISO(initialData.sleep_start) : '22:00'
  )
  const [wakeTime, setWakeTime] = useState(
    initialData ? getTimeFromISO(initialData.sleep_end) : '07:00'
  )
  const [date, setDate] = useState(
    initialData ? initialData.sleep_start.split('T')[0] : yesterday
  )
  const [rating, setRating] = useState(
    initialData?.quality_score ? (initialData.quality_score * 2).toString() : '7'
  )
  const [loading, setLoading] = useState(false)

  const getDurationPreview = () => {
    if (!bedTime || !wakeTime) return null
    const bedISO = toISODateTime(date, bedTime)
    let wakeISO = toISODateTime(date, wakeTime)

    if (new Date(wakeISO) <= new Date(bedISO)) {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      wakeISO = toISODateTime(nextDay.toISOString().split('T')[0], wakeTime)
    }

    return calculateDurationMinutes(bedISO, wakeISO)
  }

  const handleSave = async () => {
    if (!bedTime || !wakeTime || !rating) {
      Alert.alert(errorTitle, t('pleaseFillInAllFields') || 'Please fill in all fields')
      return
    }

    const ratingNum = parseInt(rating, 10)
    if (ratingNum < 1 || ratingNum > 10) {
      Alert.alert(errorTitle, t('ratingMustBeBetween1And10') || 'Rating must be between 1 and 10')
      return
    }

    let sleepStart = toISODateTime(date, bedTime)
    let sleepEnd = toISODateTime(date, wakeTime)

    if (new Date(sleepEnd) <= new Date(sleepStart)) {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      sleepEnd = toISODateTime(nextDay.toISOString().split('T')[0], wakeTime)
    }

    const durationMinutes = calculateDurationMinutes(sleepStart, sleepEnd)
    if (durationMinutes < 30 || durationMinutes > 960) {
      Alert.alert(errorTitle, t('sleepDurationSeemsUnusual') || 'Sleep duration seems unusual. Please check your times.')
      return
    }

    setLoading(true)
    try {
      await logSleepSession({
        sleepStart,
        sleepEnd,
        qualityScore: scaleTo5(ratingNum),
        interruptions: 0,
      })
      onSaved?.()
    } catch (e) {
      Alert.alert(errorTitle, e.message || (t('failedToSaveSleepSession') || 'Failed to save sleep session'))
    } finally {
      setLoading(false)
    }
  }

  const durationMins = getDurationPreview()
  const ratings = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-text mb-2">
        {mode === 'edit' ? (t('updateSleep') || 'Update Sleep') : (t('logSleep') || 'Log Sleep')}
      </Text>
      <Text className="text-base text-text-secondary mb-6">
        {t('howDidYouSleep') || 'How did you sleep?'}
      </Text>

      <FormSectionLabel>{t('nightOf') || 'Night of'}</FormSectionLabel>
      <View className="flex-row gap-3 mb-6">
        {[
          { label: t('lastNight') || 'Last Night', value: yesterday },
          { label: t('tonightNap') || 'Tonight (nap)', value: today },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setDate(option.value)}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${
              date === option.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-700'
                : 'border-border bg-surface'
            }`}
          >
            <Text className={date === option.value ? 'text-blue-600 dark:text-blue-300 font-medium' : 'text-text-secondary'}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="flex-row gap-4 mb-2">
        <View className="flex-1">
          <FormSectionLabel>{t('bedtime') || 'Bedtime'}</FormSectionLabel>
          <TimePicker label={t('bedtime') || 'Bedtime'} value={bedTime} onChange={setBedTime} />
        </View>
        <View className="flex-1">
          <FormSectionLabel>{t('wakeTime') || 'Wake Time'}</FormSectionLabel>
          <TimePicker label={t('wakeTime') || 'Wake Time'} value={wakeTime} onChange={setWakeTime} />
        </View>
      </View>

      {durationMins != null && durationMins > 0 && (
        <View className="bg-background rounded-xl p-4 mb-6 mt-3">
          <Text className="text-center text-text-secondary text-base">
            {t('duration') || 'Duration'}:{' '}
            <Text className="font-bold text-text">{formatDuration(durationMins, t)}</Text>
          </Text>
        </View>
      )}

      <FormSectionLabel>{t('sleepQualityScale') || 'Sleep Quality (1-10)'}</FormSectionLabel>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {ratings.map((num) => (
          <TouchableOpacity
            key={num}
            onPress={() => setRating(num.toString())}
            className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
              rating === num.toString()
                ? 'border-blue-500 bg-blue-500'
                : 'border-border bg-surface'
            }`}
          >
            <Text className={`text-md ${
              rating === num.toString() ? 'text-white font-bold' : 'text-text-secondary'
            }`}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ActionButtons
        loading={loading}
        onClose={onClose}
        onSubmit={handleSave}
        submitLabel={t('save') || 'Save'}
      />
    </ScrollView>
  )
}

function ActivityForm({ mode, initialData, onClose, onSaved }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const errorTitle = t('error') || 'Error'
  const placeholderColor = isDark ? '#94a3b8' : '#6b7280'
  const [activityName, setActivityName] = useState(initialData?.physical_activities?.name || initialData?.notes || '')
  const [duration, setDuration] = useState(initialData?.duration_minutes?.toString() || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!activityName.trim() || !duration) {
      Alert.alert(errorTitle, t('pleaseEnterActivityNameAndDuration') || 'Please enter activity name and duration')
      return
    }

    const durationNum = parseInt(duration, 10)
    if (durationNum < 1 || durationNum > 480) {
      Alert.alert(errorTitle, t('durationMustBeBetween1And480Minutes') || 'Duration must be between 1 and 480 minutes')
      return
    }

    setLoading(true)
    try {
      const endedAt = new Date().toISOString()
      const startedAt = new Date(Date.now() - durationNum * 60000).toISOString()
      await logActivity({ activityId: null, startedAt, endedAt, notes: activityName.trim() })
      onSaved?.()
    } catch (e) {
      Alert.alert(errorTitle, e.message || (t('failedToSaveActivity') || 'Failed to save activity'))
    } finally {
      setLoading(false)
    }
  }

  const quickDurations = [15, 30, 45, 60, 90, 120]

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-text mb-2">
        {mode === 'edit' ? (t('updateActivity') || 'Update Activity') : (t('logActivity') || 'Log Activity')}
      </Text>
      <Text className="text-base text-text-secondary mb-6">
        {t('whatDidYouDoToday') || 'What did you do today?'}
      </Text>

      <FormSectionLabel>{t('activityName') || 'Activity Name'}</FormSectionLabel>
      <TextInput
        className="border border-border rounded-xl p-4 text-[18px] mb-5 bg-background text-text"
        placeholder={t('egWalkingSwimmingYoga') || 'e.g., Walking, Swimming, Yoga'}
        placeholderTextColor={placeholderColor}
        value={activityName}
        onChangeText={setActivityName}
        maxLength={50}
      />

      <FormSectionLabel>{t('durationMinutes') || 'Duration (minutes)'}</FormSectionLabel>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {quickDurations.map((mins) => (
          <TouchableOpacity
            key={mins}
            onPress={() => setDuration(mins.toString())}
            className={`px-4 py-2 rounded-full border-2 ${
              duration === mins.toString()
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-700'
                : 'border-border bg-surface'
            }`}
          >
            <Text className={duration === mins.toString() ? 'text-blue-600 dark:text-blue-300 font-medium' : 'text-text-secondary'}>
              {mins}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        className="border border-border rounded-xl p-4 text-lg mb-8 bg-background text-text"
        placeholder={t('orEnterCustomDuration') || 'Or enter custom duration'}
        placeholderTextColor={placeholderColor}
        keyboardType="number-pad"
        value={duration}
        onChangeText={setDuration}
        maxLength={3}
      />

      <ActionButtons
        loading={loading}
        onClose={onClose}
        onSubmit={handleSave}
        submitLabel={t('save') || 'Save'}
      />
    </ScrollView>
  )
}

function getWellnessEmoji(score) {
  if (score >= 9) return '😄'
  if (score >= 7) return '🙂'
  if (score >= 5) return '😐'
  if (score >= 3) return '😕'
  return '😔'
}

function getWellnessLabel(t, score) {
  if (score >= 9) return t('healthFeelingExcellent') || 'Excellent'
  if (score >= 7) return t('healthFeelingGood') || 'Good'
  if (score >= 5) return t('healthFeelingOkay') || 'Okay'
  if (score >= 3) return t('healthFeelingNotGreat') || 'Not great'
  return t('healthFeelingStruggling') || 'Struggling'
}

function WellnessForm({ mode, initialData, onClose, onSaved }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const errorTitle = t('error') || 'Error'
  const placeholderColor = isDark ? '#94a3b8' : '#6b7280'
  const [rating, setRating] = useState(
    initialData?.mood_score ? (initialData.mood_score * 2).toString() : '5'
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!rating) {
      Alert.alert(errorTitle, t('pleaseSelectRating') || 'Please select a rating')
      return
    }

    const ratingNum = parseInt(rating, 10)
    if (ratingNum < 1 || ratingNum > 10) {
      Alert.alert(errorTitle, t('ratingMustBeBetween1And10') || 'Rating must be between 1 and 10')
      return
    }

    setLoading(true)
    try {
      await submitWellnessCheckin(scaleTo5(ratingNum), notes.trim() || null)
      onSaved?.()
    } catch (e) {
      Alert.alert(errorTitle, e.message || (t('failedToSaveCheckIn') || 'Failed to save check-in'))
    } finally {
      setLoading(false)
    }
  }

  const ratings = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-text mb-2">
        {mode === 'edit' ? (t('updateCheckIn') || 'Update Check-in') : (t('dailyCheckIn') || 'Daily Check-in')}
      </Text>
      <Text className="text-base text-text-secondary mb-6">
        {t('howAreYouFeelingToday') || 'How are you feeling today?'}
      </Text>

      <FormSectionLabel>{t('moodRatingScale') || 'Mood Rating (1-10)'}</FormSectionLabel>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {ratings.map((num) => (
          <TouchableOpacity
            key={num}
            onPress={() => setRating(num.toString())}
            className={`w-12 h-12 rounded-full items-center justify-center border-2 ${
              rating === num.toString() ? 'border-blue-500 bg-blue-500' : 'border-border bg-surface'
            }`}
          >
            <Text className={rating === num.toString() ? 'text-white font-bold' : 'text-text-secondary'}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {rating && (
        <View className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-4 mb-6 items-center border border-blue-100 dark:border-blue-900">
          <Text className="text-4xl mb-1">{getWellnessEmoji(parseInt(rating, 10))}</Text>
          <Text className="text-lg font-bold text-blue-600 dark:text-blue-300">{rating}/10</Text>
          <Text className="text-md text-blue-500 dark:text-blue-300">
            {getWellnessLabel(t, parseInt(rating, 10))}
          </Text>
        </View>
      )}

      <FormSectionLabel>{t('notesOptional') || 'Notes (optional)'}</FormSectionLabel>
      <TextInput
        className="border border-border rounded-xl p-4 text-[18px] mb-8 bg-background text-text"
        placeholder={t('howAreYouFeelingAnythingOnYourMind') || 'How are you feeling? Anything on your mind?'}
        placeholderTextColor={placeholderColor}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        maxLength={200}
      />

      <ActionButtons
        loading={loading}
        onClose={onClose}
        onSubmit={handleSave}
        submitLabel={t('saveCheckIn') || 'Save Check-in'}
      />
    </ScrollView>
  )
}

export function HealthModal({ visible, config, onClose }) {
  const { isDark } = useTheme()

  if (!config) return null

  const { type, mode, initialData, onSaved } = config
  const modals = {
    biometrics: BiometricsForm,
    sleep: SleepForm,
    activity: ActivityForm,
    wellness: WellnessForm,
  }
  const ActiveComponent = modals[type]

  if (!ActiveComponent) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="bg-surface rounded-t-3xl max-h-[90%]">
          <View className={`w-12 h-1 rounded-full self-center my-3 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          <ActiveComponent
            mode={mode}
            initialData={initialData}
            onClose={onClose}
            onSaved={() => {
              onSaved?.()
              onClose()
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
