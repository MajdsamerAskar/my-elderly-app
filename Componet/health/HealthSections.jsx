import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  getLatestBiometrics,
  getSleepSessions,
  getActivityLogs,
  getTodayCheckin,
} from '../../services/health.service'

export function isToday(isoString) {
  if (!isoString) return false
  const today = new Date().toISOString().split('T')[0]
  return isoString.startsWith(today)
}

export function isLastNight(isoString) {
  if (!isoString) return false
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]
  return isoString.startsWith(yesterdayStr) || isoString.startsWith(todayStr)
}

export function formatTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(minutes, t) {
  if (minutes == null) return '—'

  const hourLabel = t?.('hour') || 'hour'
  const hoursLabel = t?.('hours') || 'hours'
  const minuteLabel = t?.('minute') || 'minute'
  const minutesLabel = t?.('minutes') || 'minutes'

  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  if (h === 0) return `${m} ${m === 1 ? minuteLabel : minutesLabel}`
  if (m === 0) return `${h} ${h === 1 ? hourLabel : hoursLabel}`
  return `${h} ${h === 1 ? hourLabel : hoursLabel} ${m} ${m === 1 ? minuteLabel : minutesLabel}`
}

export function scaleTo10(value) {
  return value * 2
}

export const QUALITY_LABELS = {
  1: 'Poor',
  2: 'Okay',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
}

export const MOOD_LABELS_5 = {
  1: 'Very low',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Very good',
}

const QUALITY_LABEL_KEYS = {
  1: 'healthQualityPoor',
  2: 'healthQualityOkay',
  3: 'healthQualityGood',
  4: 'healthQualityGreat',
  5: 'healthQualityExcellent',
}

const MOOD_LABEL_KEYS = {
  1: 'healthMoodVeryLow',
  2: 'healthMoodLow',
  3: 'healthMoodOkay',
  4: 'healthMoodGood',
  5: 'healthMoodVeryGood',
}

function getQualityLabel(t, score) {
  return t(QUALITY_LABEL_KEYS[score]) || QUALITY_LABELS[score] || ''
}

function getMoodLabel(t, score) {
  return t(MOOD_LABEL_KEYS[score]) || MOOD_LABELS_5[score] || ''
}

function getMoodSummary(t, score) {
  if (score >= 4) return t('feelingGreatToday') || 'Feeling great today'
  if (score === 3) return t('gettingThroughIt') || 'Getting through it'
  return t('notFeelingGreat') || 'Not feeling great'
}

export function Section({ children }) {
  return (
    <View className="mb-6 rounded-2xl border border-border overflow-hidden bg-surface">
      {children}
    </View>
  )
}

export function SectionHeader({ title, buttonLabel, onPress }) {
  return (
    <View className="flex-row items-center justify-between px-5 py-4 bg-background border-b border-border">
      <Text className="text-2xl font-medium text-text">{title}</Text>
      {buttonLabel && (
        <TouchableOpacity
          className="px-4 py-2.5 rounded-xl border border-blue-600 bg-surface"
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text className="text-lg font-semibold text-blue-600">{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export function Divider() {
  return <View className="h-px bg-border my-4" />
}

export function DataRow({ label, value, unit }) {
  return (
    <View className="flex-row items-baseline justify-between mt-4">
      <Text className="text-lg text-text-secondary flex-1 pr-4">{label}</Text>
      <Text className="text-2xl font-medium text-text">
        {value}
        {unit ? <Text className="text-lg font-normal text-text-secondary"> {unit}</Text> : null}
      </Text>
    </View>
  )
}

export function RecordedAt({ isoString, label, className = '' }) {
  const { t } = useTranslation()
  const resolvedLabel = label ?? (t('recordedTodayAt') || 'Recorded today at')

  return (
    <Text className={`text-[16px] text-text-secondary mt-2 mb-2 pt-4 border-t border-border ${className}`.trim()}>
      {resolvedLabel} {formatTime(isoString)}
    </Text>
  )
}

export function Pill({ label }) {
  return (
    <View className="self-start px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
      <Text className="text-lg font-medium text-blue-600 dark:text-blue-300">{label}</Text>
    </View>
  )
}

export function EmptyState({ message, sub, buttonLabel, onPress }) {
  return (
    <View className="items-center px-6 py-10 gap-3">
      <View className="w-14 h-14 rounded-full bg-background items-center justify-center mb-1">
        <Text className="text-2xl text-text-secondary">—</Text>
      </View>
      <Text className="text-2xl text-text-secondary text-center">{message}</Text>
      <Text className="text-lg text-text-secondary text-center">{sub}</Text>
      <TouchableOpacity
        className="mt-3 w-full bg-blue-500 rounded-xl py-5 items-center"
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text className="text-xl font-medium text-white">{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function SectionLoader() {
  return (
    <View className="py-12 items-center justify-center">
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  )
}

export function SectionError({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <View className="px-5 py-8 items-center gap-3">
      <Text className="text-lg text-text-secondary text-center">{message}</Text>
      <TouchableOpacity
        className="px-6 py-3 rounded-xl border-2 border-blue-500 bg-surface"
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <Text className="text-lg font-semibold text-blue-600">
          {t('tryAgain') || 'Try again'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export function BiometricsSection({ userId, onLog }) {
  const { t } = useTranslation()
  const [data, setData] = useState(undefined)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setData(undefined)
    try {
      const latest = await getLatestBiometrics(userId)
      const filtered = {
        heart_rate: isToday(latest.heart_rate?.recorded_at) ? latest.heart_rate : null,
        spo2: isToday(latest.spo2?.recorded_at) ? latest.spo2 : null,
      }
      setData(filtered)
    } catch (e) {
      setError(e.message ?? (t('couldNotLoadBiometrics') || 'Could not load biometrics'))
    }
  }, [t, userId])

  useEffect(() => {
    load()
  }, [load])

  const hasReading = !!(data?.heart_rate || data?.spo2)

  const handleOpen = () => {
    onLog({
      type: 'biometrics',
      mode: hasReading ? 'edit' : 'create',
      userId,
      initialData: data,
      onSaved: load,
    })
  }

  return (
    <Section>
      <SectionHeader
        title={t('healthBiometricsTitle') || 'Biometrics'}
        buttonLabel={hasReading ? (t('updateReadings') || 'Update readings') : (t('logReadings') || 'Log readings')}
        onPress={handleOpen}
      />

      {data === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {data !== undefined && !error && !hasReading && (
        <EmptyState
          message={t('noReadingsRecordedToday') || 'No readings recorded today'}
          sub={t('tapBelowToEnterYourReadings') || 'Tap below to enter your readings'}
          buttonLabel={t('logReadings') || 'Log readings'}
          onPress={handleOpen}
        />
      )}

      {data !== undefined && !error && hasReading && (
        <View className="px-5 py-5">
          {data.heart_rate && (
            <>
              <DataRow
                label={t('heartRateBpm') || 'Heart rate (beats per minute)'}
                value={data.heart_rate.value}
                unit="bpm"
              />
              <Divider />
            </>
          )}
          {data.spo2 && (
            <DataRow
              label={t('bloodOxygenPercent') || 'Blood oxygen (percentage)'}
              value={data.spo2.value}
              unit="%"
            />
          )}
          <RecordedAt isoString={data.heart_rate?.recorded_at ?? data.spo2?.recorded_at} />
        </View>
      )}
    </Section>
  )
}

export function SleepSection({ userId, onLog }) {
  const { t } = useTranslation()
  const [session, setSession] = useState(undefined)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setSession(undefined)
    try {
      const sessions = await getSleepSessions(userId, 1)
      const latest = sessions[0] ?? null
      setSession(latest && isLastNight(latest.sleep_start) ? latest : null)
    } catch (e) {
      setError(e.message ?? (t('couldNotLoadSleepData') || 'Could not load sleep data'))
    }
  }, [t, userId])

  useEffect(() => {
    load()
  }, [load])

  const hasSession = !!session

  const handleOpen = () => {
    onLog({
      type: 'sleep',
      mode: hasSession ? 'edit' : 'create',
      userId,
      initialData: session,
      onSaved: load,
    })
  }

  return (
    <Section>
      <SectionHeader
        title={t('sleep') || 'Sleep'}
        buttonLabel={hasSession ? (t('updateSleep') || 'Update sleep') : (t('logSleep') || 'Log sleep')}
        onPress={handleOpen}
      />

      {session === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {session === null && !error && (
        <EmptyState
          message={t('noSleepRecordedYet') || 'No sleep recorded yet'}
          sub={t('tapBelowToLogLastNightsSleep') || "Tap below to log last night's sleep"}
          buttonLabel={t('logSleep') || 'Log sleep'}
          onPress={handleOpen}
        />
      )}

      {session && !error && (
        <View className="px-5 py-5">
          <DataRow label={t('duration') || 'Duration'} value={formatDuration(session.duration_minutes, t)} />
          {session.quality_score != null && (
            <>
              <Divider />
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-lg text-text-secondary">
                  {t('sleepQuality') || 'Sleep quality'}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-bold text-blue-500">{scaleTo10(session.quality_score)}/10</Text>
                  <Pill label={getQualityLabel(t, session.quality_score)} />
                </View>
              </View>
            </>
          )}
          <Divider />
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-text-secondary">{t('bedtime') || 'Bedtime'}</Text>
            <Text className="text-lg font-medium text-text">{formatTime(session.sleep_start)}</Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-text-secondary">{t('wakeTime') || 'Wake time'}</Text>
            <Text className="text-lg font-medium text-text">{formatTime(session.sleep_end)}</Text>
          </View>
          <RecordedAt isoString={session.sleep_start} label={t('logged') || 'Logged'} />
        </View>
      )}
    </Section>
  )
}

export function ActivitySection({ userId, onLog }) {
  const { t } = useTranslation()
  const [log, setLog] = useState(undefined)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setLog(undefined)
    try {
      const logs = await getActivityLogs(userId, 1)
      const latest = logs[0] ?? null
      setLog(latest && isToday(latest.started_at) ? latest : null)
    } catch (e) {
      setError(e.message ?? (t('couldNotLoadActivityData') || 'Could not load activity data'))
    }
  }, [t, userId])

  useEffect(() => {
    load()
  }, [load])

  const hasLog = !!log
  const activityName = log?.physical_activities?.name ?? log?.notes ?? (t('activity') || 'Activity')

  const handleOpen = () => {
    onLog({
      type: 'activity',
      mode: hasLog ? 'edit' : 'create',
      userId,
      initialData: log,
      onSaved: load,
    })
  }

  return (
    <Section>
      <SectionHeader
        title={t('activity') || 'Activity'}
        buttonLabel={hasLog ? (t('updateActivity') || 'Update activity') : (t('logActivity') || 'Log activity')}
        onPress={handleOpen}
      />

      {log === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {log === null && !error && (
        <EmptyState
          message={t('noActivityLoggedYetToday') || 'No activity logged yet today'}
          sub={t('tapBelowToRecordWhatYouHaveDone') || 'Tap below to record what you have done'}
          buttonLabel={t('logTodaysActivity') || "Log today's activity"}
          onPress={handleOpen}
        />
      )}

      {log && !error && (
        <View className="px-5 py-5">
          <DataRow label={t('activity') || 'Activity'} value={activityName} />
          <Divider />
          <DataRow label={t('duration') || 'Duration'} value={formatDuration(log.duration_minutes, t)} />
          <RecordedAt isoString={log.started_at} />
        </View>
      )}
    </Section>
  )
}

export function WellnessSection({ userId, onLog }) {
  const { t } = useTranslation()
  const [checkin, setCheckin] = useState(undefined)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setCheckin(undefined)
    try {
      const today = await getTodayCheckin()
      setCheckin(today)
    } catch (e) {
      setError(e.message ?? (t('couldNotLoadCheckIn') || 'Could not load check-in'))
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const hasCheckin = !!checkin

  const handleOpen = () => {
    onLog({
      type: 'wellness',
      mode: hasCheckin ? 'edit' : 'create',
      userId,
      initialData: checkin,
      onSaved: load,
    })
  }

  return (
    <Section>
      <SectionHeader
        title={t('howAreYouFeeling') || 'How are you feeling?'}
        buttonLabel={hasCheckin ? (t('updateCheckIn') || 'Update check-in') : (t('checkInNow') || 'Check in now')}
        onPress={handleOpen}
      />

      {checkin === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {checkin === null && !error && (
        <EmptyState
          message={t('noCheckInYetToday') || 'No check-in yet today'}
          sub={t('letUsKnowHowYouAreDoing') || 'Let us know how you are doing'}
          buttonLabel={t('checkInNow') || 'Check in now'}
          onPress={handleOpen}
        />
      )}

      {checkin && !error && (
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 items-center justify-center">
              <Text className="text-3xl">
                {checkin.mood_score >= 4 ? '🙂' : checkin.mood_score === 3 ? '😐' : '😔'}
              </Text>
            </View>
            <View className="flex-1 ml-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-medium text-text">{scaleTo10(checkin.mood_score)}/10</Text>
                <Text className="text-lg text-text-secondary">{getMoodLabel(t, checkin.mood_score)}</Text>
              </View>
              <Text className="text-lg text-text-secondary mt-1">
                {getMoodSummary(t, checkin.mood_score)}
              </Text>
            </View>
          </View>
          {checkin.notes && (
            <>
              <Divider />
              <Text className="text-lg text-text-secondary leading-relaxed">{checkin.notes}</Text>
            </>
          )}
          <RecordedAt
            className="my-4"
            isoString={checkin.checkin_date + 'T00:00:00'}
            label={t('checkedInTodayAt') || 'Checked in today at'}
          />
        </View>
      )}
    </Section>
  )
}
