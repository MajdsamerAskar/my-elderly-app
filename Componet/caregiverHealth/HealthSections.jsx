import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  getLatestBiometrics,
  getBiometricReadings,
  getSleepSessions,
  getActivityLogs,
  getWellnessCheckins,
} from '../../services/health.service'
import {
  Section,
  SectionHeader,
  Divider,
  DataRow,
  RecordedAt,
  Pill,
  SectionLoader,
  SectionError,
  formatDuration,
  formatTime,
  scaleTo10,
} from '../health/HealthSections'

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

function getHealthLocale(language) {
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

function getQualityLabel(t, score) {
  return t(QUALITY_LABEL_KEYS[score]) || ''
}

function getMoodLabel(t, score) {
  return t(MOOD_LABEL_KEYS[score]) || ''
}

function getMoodSummary(t, score) {
  if (score >= 4) return t('feelingGreatToday') || 'Feeling great today'
  if (score === 3) return t('gettingThroughIt') || 'Getting through it'
  return t('notFeelingGreat') || 'Not feeling great'
}

function formatHistoryTimestamp(isoString, locale, t) {
  if (!isoString) return '—'

  const date = new Date(isoString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return `${t('today') || 'Today'} ${formatTime(isoString)}`
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `${t('yesterday') || 'Yesterday'} ${formatTime(isoString)}`
  }

  return `${date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} · ${formatTime(isoString)}`
}

function formatCheckinDate(dateString, locale, t) {
  if (!dateString) return '—'

  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return t('today') || 'Today'
  if (date.toDateString() === yesterday.toDateString()) return t('yesterday') || 'Yesterday'

  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortDate(isoString, locale, t) {
  if (!isoString) return '—'

  const date = new Date(isoString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return t('today') || 'Today'
  if (date.toDateString() === yesterday.toDateString()) return t('yesterday') || 'Yesterday'

  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function HistoryToggle({ expanded, onPress, loading }) {
  const { t } = useTranslation()

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between px-5 py-4 border-t border-border"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text className="text-lg font-medium text-blue-600">
        {expanded
          ? (t('hideHistory') || 'Hide history')
          : (t('showLast7Entries') || 'Show last 7 entries')}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : (
        <Text className="text-lg text-blue-500">{expanded ? '▲' : '▼'}</Text>
      )}
    </TouchableOpacity>
  )
}

function HistoryContainer({ children }) {
  return (
    <View className="bg-background border-t border-border px-5">
      {children}
    </View>
  )
}

function HistoryEntry({ left, right, sub, isLast }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        !isLast ? 'border-b border-border' : ''
      }`}
    >
      <View className="flex-1 pr-4">
        <Text className="text-lg font-medium text-text">{left}</Text>
        {sub ? (
          <Text className="text-base text-text-secondary mt-0.5" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Text className="text-base text-text-secondary text-right">{right}</Text>
    </View>
  )
}

function NoData({ message }) {
  return (
    <View className="px-5 py-8 items-center">
      <Text className="text-lg text-text-secondary text-center">{message}</Text>
    </View>
  )
}

function NoHistory() {
  const { t } = useTranslation()

  return (
    <View className="py-6 items-center">
      <Text className="text-lg text-text-secondary">
        {t('noHistoryAvailable') || 'No history available'}
      </Text>
    </View>
  )
}

export function CaregiverBiometricsSection({ elderlyUserId }) {
  const { t, i18n } = useTranslation()
  const locale = getHealthLocale(i18n.language)
  const [latest, setLatest] = useState(undefined)
  const [history, setHistory] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)

    try {
      const data = await getLatestBiometrics(elderlyUserId)
      setLatest(data)
    } catch (loadError) {
      setError(loadError.message ?? (t('couldNotLoadBiometrics') || 'Could not load biometrics'))
    }
  }, [elderlyUserId, t])

  useEffect(() => {
    historyFetchedRef.current = false
    setHistory([])
    setExpanded(false)
    loadLatest()
  }, [loadLatest])

  const loadHistory = useCallback(async () => {
    if (historyFetchedRef.current) return

    setHistoryLoading(true)

    try {
      const [hrData, spo2Data] = await Promise.all([
        getBiometricReadings(elderlyUserId, 'heart_rate', 7),
        getBiometricReadings(elderlyUserId, 'spo2', 7),
      ])

      const merged = [...hrData, ...spo2Data]
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
        .slice(0, 7)

      setHistory(merged)
      historyFetchedRef.current = true
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [elderlyUserId])

  function handleToggle() {
    if (!expanded) loadHistory()
    setExpanded((value) => !value)
  }

  const hasData = !!(latest?.heart_rate || latest?.spo2)

  return (
    <Section>
      <SectionHeader title={t('healthBiometricsTitle') || 'Biometrics'} />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest !== undefined && !error && !hasData ? (
        <NoData message={t('noReadingsRecordedYet') || 'No readings recorded yet'} />
      ) : null}

      {latest !== undefined && !error && hasData ? (
        <View className="px-5 py-5">
          {latest.heart_rate ? (
            <>
              <DataRow
                label={t('heartRateBpm') || 'Heart rate (beats per minute)'}
                value={latest.heart_rate.value}
                unit="bpm"
              />
              <Divider />
            </>
          ) : null}
          {latest.spo2 ? (
            <DataRow
              label={t('bloodOxygenPercent') || 'Blood oxygen (percentage)'}
              value={latest.spo2.value}
              unit="%"
            />
          ) : null}
          <RecordedAt
            isoString={latest.heart_rate?.recorded_at ?? latest.spo2?.recorded_at}
            label={t('lastRecordedAt') || 'Last recorded at'}
          />
        </View>
      ) : null}

      {!error && latest !== undefined ? (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded ? (
            <HistoryContainer>
              {history.length === 0 ? (
                <NoHistory />
              ) : (
                history.map((reading, index) => (
                  <HistoryEntry
                    key={reading.reading_id}
                    left={reading.metric_type === 'heart_rate' ? `${reading.value} bpm` : `${reading.value}%`}
                    sub={reading.metric_type === 'heart_rate'
                      ? (t('heartRate') || 'Heart rate')
                      : (t('bloodOxygen') || 'Blood oxygen')}
                    right={formatHistoryTimestamp(reading.recorded_at, locale, t)}
                    isLast={index === history.length - 1}
                  />
                ))
              )}
            </HistoryContainer>
          ) : null}
        </>
      ) : null}
    </Section>
  )
}

export function CaregiverSleepSection({ elderlyUserId }) {
  const { t, i18n } = useTranslation()
  const locale = getHealthLocale(i18n.language)
  const [latest, setLatest] = useState(undefined)
  const [history, setHistory] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)

    try {
      const sessions = await getSleepSessions(elderlyUserId, 1)
      setLatest(sessions[0] ?? null)
    } catch (loadError) {
      setError(loadError.message ?? (t('couldNotLoadSleepData') || 'Could not load sleep data'))
    }
  }, [elderlyUserId, t])

  useEffect(() => {
    historyFetchedRef.current = false
    setHistory([])
    setExpanded(false)
    loadLatest()
  }, [loadLatest])

  const loadHistory = useCallback(async () => {
    if (historyFetchedRef.current) return

    setHistoryLoading(true)
    try {
      const sessions = await getSleepSessions(elderlyUserId, 7)
      setHistory(sessions)
      historyFetchedRef.current = true
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [elderlyUserId])

  function handleToggle() {
    if (!expanded) loadHistory()
    setExpanded((value) => !value)
  }

  return (
    <Section>
      <SectionHeader title={t('sleep') || 'Sleep'} />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest === null && !error ? (
        <NoData message={t('noSleepSessionsRecordedYet') || 'No sleep sessions recorded yet'} />
      ) : null}

      {latest && !error ? (
        <View className="px-5 py-5">
          <DataRow label={t('duration') || 'Duration'} value={formatDuration(latest.duration_minutes, t)} />
          {latest.quality_score != null ? (
            <>
              <Divider />
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-lg text-text-secondary">
                  {t('sleepQualityLabel') || t('sleepQuality') || 'Quality rating'}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-bold text-blue-500">
                    {scaleTo10(latest.quality_score)}/10
                  </Text>
                  <Pill label={getQualityLabel(t, latest.quality_score)} />
                </View>
              </View>
            </>
          ) : null}
          <Divider />
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-text-secondary">{t('bedtime') || 'Bedtime'}</Text>
            <Text className="text-lg font-medium text-text">
              {formatTime(latest.sleep_start)}
            </Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-text-secondary">{t('wakeTime') || 'Wake time'}</Text>
            <Text className="text-lg font-medium text-text">
              {formatTime(latest.sleep_end)}
            </Text>
          </View>
          <RecordedAt isoString={latest.sleep_start} label={t('lastRecorded') || 'Last recorded'} />
        </View>
      ) : null}

      {!error && latest !== undefined ? (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded ? (
            <HistoryContainer>
              {history.length === 0 ? (
                <NoHistory />
              ) : (
                history.map((session, index) => (
                  <HistoryEntry
                    key={session.session_id}
                    left={formatDuration(session.duration_minutes, t)}
                    sub={session.quality_score != null
                      ? `${t('sleepQuality') || 'Sleep quality'}: ${scaleTo10(session.quality_score)}/10 · ${getQualityLabel(t, session.quality_score)}`
                      : undefined}
                    right={formatShortDate(session.sleep_start, locale, t)}
                    isLast={index === history.length - 1}
                  />
                ))
              )}
            </HistoryContainer>
          ) : null}
        </>
      ) : null}
    </Section>
  )
}

export function CaregiverActivitySection({ elderlyUserId }) {
  const { t, i18n } = useTranslation()
  const locale = getHealthLocale(i18n.language)
  const [latest, setLatest] = useState(undefined)
  const [history, setHistory] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)

    try {
      const logs = await getActivityLogs(elderlyUserId, 1)
      setLatest(logs[0] ?? null)
    } catch (loadError) {
      setError(loadError.message ?? (t('couldNotLoadActivityData') || 'Could not load activity data'))
    }
  }, [elderlyUserId, t])

  useEffect(() => {
    historyFetchedRef.current = false
    setHistory([])
    setExpanded(false)
    loadLatest()
  }, [loadLatest])

  const loadHistory = useCallback(async () => {
    if (historyFetchedRef.current) return

    setHistoryLoading(true)
    try {
      const logs = await getActivityLogs(elderlyUserId, 7)
      setHistory(logs)
      historyFetchedRef.current = true
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [elderlyUserId])

  function handleToggle() {
    if (!expanded) loadHistory()
    setExpanded((value) => !value)
  }

  const activityName =
    latest?.physical_activities?.name ?? latest?.notes ?? (t('activity') || 'Activity')

  return (
    <Section>
      <SectionHeader title={t('activity') || 'Activity'} />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest === null && !error ? (
        <NoData message={t('noActivitiesRecordedYet') || 'No activities recorded yet'} />
      ) : null}

      {latest && !error ? (
        <View className="px-5 py-5">
          <DataRow label={t('activity') || 'Activity'} value={activityName} />
          <Divider />
          <DataRow label={t('duration') || 'Duration'} value={formatDuration(latest.duration_minutes, t)} />
          {latest.physical_activities?.difficulty ? (
            <>
              <Divider />
              <View className="flex-row items-center justify-between">
                <Text className="text-lg text-text-secondary">
                  {t('difficulty') || 'Difficulty'}
                </Text>
                <Pill label={latest.physical_activities.difficulty} />
              </View>
            </>
          ) : null}
          <RecordedAt isoString={latest.started_at} label={t('lastRecordedAt') || 'Last recorded at'} />
        </View>
      ) : null}

      {!error && latest !== undefined ? (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded ? (
            <HistoryContainer>
              {history.length === 0 ? (
                <NoHistory />
              ) : (
                history.map((log, index) => (
                  <HistoryEntry
                    key={log.log_id}
                    left={log.physical_activities?.name ?? log.notes ?? (t('activity') || 'Activity')}
                    sub={formatDuration(log.duration_minutes, t)}
                    right={formatShortDate(log.started_at, locale, t)}
                    isLast={index === history.length - 1}
                  />
                ))
              )}
            </HistoryContainer>
          ) : null}
        </>
      ) : null}
    </Section>
  )
}

export function CaregiverWellnessSection({ elderlyUserId }) {
  const { t, i18n } = useTranslation()
  const locale = getHealthLocale(i18n.language)
  const [latest, setLatest] = useState(undefined)
  const [history, setHistory] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)

    try {
      const checkins = await getWellnessCheckins(elderlyUserId, 1)
      setLatest(checkins[0] ?? null)
    } catch (loadError) {
      setError(loadError.message ?? (t('couldNotLoadCheckIn') || 'Could not load check-in'))
    }
  }, [elderlyUserId, t])

  useEffect(() => {
    historyFetchedRef.current = false
    setHistory([])
    setExpanded(false)
    loadLatest()
  }, [loadLatest])

  const loadHistory = useCallback(async () => {
    if (historyFetchedRef.current) return

    setHistoryLoading(true)
    try {
      const checkins = await getWellnessCheckins(elderlyUserId, 7)
      setHistory(checkins)
      historyFetchedRef.current = true
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [elderlyUserId])

  function handleToggle() {
    if (!expanded) loadHistory()
    setExpanded((value) => !value)
  }

  return (
    <Section>
      <SectionHeader title={t('howAreTheyFeeling') || 'How are they feeling?'} />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest === null && !error ? (
        <NoData message={t('noCheckinsRecordedYet') || 'No check-ins recorded yet'} />
      ) : null}

      {latest && !error ? (
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 items-center justify-center">
              <Text className="text-3xl">
                {latest.mood_score >= 4 ? '🙂' : latest.mood_score === 3 ? '😐' : '😔'}
              </Text>
            </View>
            <View className="flex-1 ml-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-medium text-text">
                  {scaleTo10(latest.mood_score)}/10
                </Text>
                <Text className="text-lg text-text-secondary">
                  {getMoodLabel(t, latest.mood_score)}
                </Text>
              </View>
              <Text className="text-lg text-text-secondary mt-1">
                {getMoodSummary(t, latest.mood_score)}
              </Text>
            </View>
          </View>
          {latest.notes ? (
            <>
              <Divider />
              <Text className="text-lg text-text-secondary leading-relaxed">
                {latest.notes}
              </Text>
            </>
          ) : null}
          <RecordedAt
            isoString={`${latest.checkin_date}T00:00:00`}
            label={t('lastCheckedIn') || 'Last checked in'}
          />
        </View>
      ) : null}

      {!error && latest !== undefined ? (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded ? (
            <HistoryContainer>
              {history.length === 0 ? (
                <NoHistory />
              ) : (
                history.map((checkin, index) => (
                  <HistoryEntry
                    key={checkin.checkin_id}
                    left={`${scaleTo10(checkin.mood_score)}/10 · ${getMoodLabel(t, checkin.mood_score)}`}
                    sub={checkin.notes ?? undefined}
                    right={formatCheckinDate(checkin.checkin_date, locale, t)}
                    isLast={index === history.length - 1}
                  />
                ))
              )}
            </HistoryContainer>
          ) : null}
        </>
      ) : null}
    </Section>
  )
}
