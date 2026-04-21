import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
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
  QUALITY_LABELS,
  MOOD_LABELS_5,
} from '../health/HealthSections'

// ─────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────

function formatHistoryTimestamp(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  const today     = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString())
    return `Today ${formatTime(isoString)}`
  if (d.toDateString() === yesterday.toDateString())
    return `Yesterday ${formatTime(isoString)}`
  return (
    d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' · ' +
    formatTime(isoString)
  )
}

// Parses YYYY-MM-DD without UTC timezone shift
function formatCheckinDate(dateString) {
  if (!dateString) return '—'
  const [year, month, day] = dateString.split('-').map(Number)
  const d         = new Date(year, month - 1, day)
  const today     = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString())     return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatShortDate(isoString) {
  if (!isoString) return '—'
  const d         = new Date(isoString)
  const today     = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString())     return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─────────────────────────────────────────────
// SHARED PRIMITIVES (All text +2px)
// ─────────────────────────────────────────────

function HistoryToggle({ expanded, onPress, loading }) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between px-5 py-4 border-t border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text className="text-lg font-medium text-blue-600">
        {expanded ? 'Hide history' : 'Show last 7 entries'}
      </Text>
      {loading
        ? <ActivityIndicator size="small" color="#2563eb" />
        : <Text className="text-lg text-blue-500">{expanded ? '▲' : '▼'}</Text>
      }
    </TouchableOpacity>
  )
}

function HistoryContainer({ children }) {
  return (
    <View className="bg-gray-50 border-t border-gray-100 px-5">
      {children}
    </View>
  )
}

function HistoryEntry({ left, right, sub, isLast }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        !isLast ? 'border-b border-gray-200' : ''
      }`}
    >
      <View className="flex-1 pr-4">
        <Text className="text-lg font-medium text-gray-900">{left}</Text>
        {sub
          ? <Text className="text-lg text-gray-400 mt-0.5" numberOfLines={1}>{sub}</Text>
          : null
        }
      </View>
      <Text className="text-lg text-gray-400 text-right">{right}</Text>
    </View>
  )
}

function NoData({ message }) {
  return (
    <View className="px-5 py-8 items-center">
      <Text className="text-lg text-gray-400 text-center">{message}</Text>
    </View>
  )
}

function NoHistory() {
  return (
    <View className="py-6 items-center">
      <Text className="text-lg text-gray-400">No history available</Text>
    </View>
  )
}

// ─────────────────────────────────────────────
// BIOMETRICS
// ─────────────────────────────────────────────
// Latest:  getLatestBiometrics(elderlyUserId)
// History: getBiometricReadings(elderlyUserId, 'heart_rate'|'spo2', 7) — merged & sorted
// ─────────────────────────────────────────────

export function CaregiverBiometricsSection({ elderlyUserId }) {
  const [latest,         setLatest]         = useState(undefined)
  const [history,        setHistory]        = useState([])
  const [expanded,       setExpanded]       = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error,          setError]          = useState(null)

  // Ref prevents the loadHistory useCallback from listing `history`
  // as a dep, which would recreate the fn on every fetch and cause loops
  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)
    try {
      const data = await getLatestBiometrics(elderlyUserId)
      setLatest(data)
    } catch (e) {
      setError(e.message ?? 'Could not load biometrics')
    }
  }, [elderlyUserId])

  // Reset everything when the selected patient changes
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

  const handleToggle = () => {
    if (!expanded) loadHistory()
    setExpanded(v => !v)
  }

  const hasData = !!(latest?.heart_rate || latest?.spo2)

  return (
    <Section>
      <SectionHeader title="Biometrics" />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest !== undefined && !error && !hasData && (
        <NoData message="No readings recorded yet" />
      )}

      {latest !== undefined && !error && hasData && (
        <View className="px-5 py-5">
          {latest.heart_rate && (
            <>
              <DataRow
                label="Heart rate (beats per minute)"
                value={latest.heart_rate.value}
                unit="bpm"
              />
              <Divider />
            </>
          )}
          {latest.spo2 && (
            <DataRow
              label="Blood oxygen (percentage)"
              value={latest.spo2.value}
              unit="%"
            />
          )}
          <RecordedAt
            isoString={latest.heart_rate?.recorded_at ?? latest.spo2?.recorded_at}
            label="Last recorded at"
          />
        </View>
      )}

      {!error && latest !== undefined && (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded && (
            <HistoryContainer>
              {history.length === 0
                ? <NoHistory />
                : history.map((r, i) => (
                    <HistoryEntry
                      key={r.reading_id}
                      left={r.metric_type === 'heart_rate' ? `${r.value} bpm` : `${r.value}%`}
                      sub={r.metric_type === 'heart_rate' ? 'Heart rate' : 'Blood oxygen'}
                      right={formatHistoryTimestamp(r.recorded_at)}
                      isLast={i === history.length - 1}
                    />
                  ))
              }
            </HistoryContainer>
          )}
        </>
      )}
    </Section>
  )
}

// ─────────────────────────────────────────────
// SLEEP
// ─────────────────────────────────────────────
// Latest:  getSleepSessions(elderlyUserId, 1)[0]
// History: getSleepSessions(elderlyUserId, 7)
// duration_minutes is computed client-side by the service
// ─────────────────────────────────────────────

export function CaregiverSleepSection({ elderlyUserId }) {
  const [latest,         setLatest]         = useState(undefined)
  const [history,        setHistory]        = useState([])
  const [expanded,       setExpanded]       = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error,          setError]          = useState(null)

  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)
    try {
      const sessions = await getSleepSessions(elderlyUserId, 1)
      setLatest(sessions[0] ?? null)
    } catch (e) {
      setError(e.message ?? 'Could not load sleep data')
    }
  }, [elderlyUserId])

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

  const handleToggle = () => {
    if (!expanded) loadHistory()
    setExpanded(v => !v)
  }

  return (
    <Section>
      <SectionHeader title="Sleep" />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest === null && !error && (
        <NoData message="No sleep sessions recorded yet" />
      )}

      {latest && !error && (
        <View className="px-5 py-5">
          <DataRow label="Duration" value={formatDuration(latest.duration_minutes)} />
          {latest.quality_score != null && (
            <>
              <Divider />
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-lg text-gray-500">Quality rating</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-bold text-blue-500">
                    {scaleTo10(latest.quality_score)}/10
                  </Text>
                  <Pill label={QUALITY_LABELS[latest.quality_score]} />
                </View>
              </View>
            </>
          )}
          <Divider />
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-gray-500">Bedtime</Text>
            <Text className="text-lg font-medium text-gray-900">
              {formatTime(latest.sleep_start)}
            </Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-gray-500">Wake time</Text>
            <Text className="text-lg font-medium text-gray-900">
              {formatTime(latest.sleep_end)}
            </Text>
          </View>
          <RecordedAt isoString={latest.sleep_start} label="Last recorded" />
        </View>
      )}

      {!error && latest !== undefined && (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded && (
            <HistoryContainer>
              {history.length === 0
                ? <NoHistory />
                : history.map((s, i) => (
                    <HistoryEntry
                      key={s.session_id}
                      left={formatDuration(s.duration_minutes)}
                      sub={
                        s.quality_score != null
                          ? `Quality: ${scaleTo10(s.quality_score)}/10 · ${QUALITY_LABELS[s.quality_score]}`
                          : undefined
                      }
                      right={formatShortDate(s.sleep_start)}
                      isLast={i === history.length - 1}
                    />
                  ))
              }
            </HistoryContainer>
          )}
        </>
      )}
    </Section>
  )
}

// ─────────────────────────────────────────────
// ACTIVITY
// ─────────────────────────────────────────────
// Latest:  getActivityLogs(elderlyUserId, 1)[0]
// History: getActivityLogs(elderlyUserId, 7)
// Joined with physical_activities { name, difficulty }
// ─────────────────────────────────────────────

export function CaregiverActivitySection({ elderlyUserId }) {
  const [latest,         setLatest]         = useState(undefined)
  const [history,        setHistory]        = useState([])
  const [expanded,       setExpanded]       = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error,          setError]          = useState(null)

  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)
    try {
      const logs = await getActivityLogs(elderlyUserId, 1)
      setLatest(logs[0] ?? null)
    } catch (e) {
      setError(e.message ?? 'Could not load activity data')
    }
  }, [elderlyUserId])

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

  const handleToggle = () => {
    if (!expanded) loadHistory()
    setExpanded(v => !v)
  }

  const activityName =
    latest?.physical_activities?.name ?? latest?.notes ?? 'Activity'

  return (
    <Section>
      <SectionHeader title="Activity" />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest === null && !error && (
        <NoData message="No activities recorded yet" />
      )}

      {latest && !error && (
        <View className="px-5 py-5">
          <DataRow label="Activity" value={activityName} />
          <Divider />
          <DataRow label="Duration" value={formatDuration(latest.duration_minutes)} />
          {latest.physical_activities?.difficulty && (
            <>
              <Divider />
              <View className="flex-row items-center justify-between">
                <Text className="text-lg text-gray-500">Difficulty</Text>
                <Pill label={latest.physical_activities.difficulty} />
              </View>
            </>
          )}
          <RecordedAt isoString={latest.started_at} label="Last recorded at" />
        </View>
      )}

      {!error && latest !== undefined && (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded && (
            <HistoryContainer>
              {history.length === 0
                ? <NoHistory />
                : history.map((l, i) => (
                    <HistoryEntry
                      key={l.log_id}
                      left={l.physical_activities?.name ?? l.notes ?? 'Activity'}
                      sub={formatDuration(l.duration_minutes)}
                      right={formatShortDate(l.started_at)}
                      isLast={i === history.length - 1}
                    />
                  ))
              }
            </HistoryContainer>
          )}
        </>
      )}
    </Section>
  )
}

// ─────────────────────────────────────────────
// WELLNESS
// ─────────────────────────────────────────────
// Latest:  getWellnessCheckins(elderlyUserId, 1)[0]
// History: getWellnessCheckins(elderlyUserId, 7)
// getTodayCheckin() is scoped to self — not usable here
// ─────────────────────────────────────────────

export function CaregiverWellnessSection({ elderlyUserId }) {
  const [latest,         setLatest]         = useState(undefined)
  const [history,        setHistory]        = useState([])
  const [expanded,       setExpanded]       = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error,          setError]          = useState(null)

  const historyFetchedRef = useRef(false)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLatest(undefined)
    try {
      const checkins = await getWellnessCheckins(elderlyUserId, 1)
      setLatest(checkins[0] ?? null)
    } catch (e) {
      setError(e.message ?? 'Could not load wellness data')
    }
  }, [elderlyUserId])

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

  const handleToggle = () => {
    if (!expanded) loadHistory()
    setExpanded(v => !v)
  }

  return (
    <Section>
      <SectionHeader title="How are they feeling?" />

      {latest === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={loadLatest} />}

      {latest === null && !error && (
        <NoData message="No check-ins recorded yet" />
      )}

      {latest && !error && (
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 items-center justify-center">
              <Text className="text-3xl">
                {latest.mood_score >= 4 ? '🙂' : latest.mood_score === 3 ? '😐' : '😔'}
              </Text>
            </View>
            <View className="flex-1 ml-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-medium text-gray-900">
                  {scaleTo10(latest.mood_score)}/10
                </Text>
                <Text className="text-lg text-gray-500">
                  {MOOD_LABELS_5[latest.mood_score]}
                </Text>
              </View>
              <Text className="text-lg text-gray-500 mt-1">
                {latest.mood_score >= 4
                  ? 'Feeling great'
                  : latest.mood_score === 3
                  ? 'Getting through it'
                  : 'Not feeling great'}
              </Text>
            </View>
          </View>
          {latest.notes && (
            <>
              <Divider />
              <Text className="text-lg text-gray-500 leading-relaxed">
                {latest.notes}
              </Text>
            </>
          )}
          <RecordedAt
            isoString={latest.checkin_date + 'T00:00:00'}
            label="Last checked in"
          />
        </View>
      )}

      {!error && latest !== undefined && (
        <>
          <HistoryToggle
            expanded={expanded}
            onPress={handleToggle}
            loading={historyLoading}
          />
          {expanded && (
            <HistoryContainer>
              {history.length === 0
                ? <NoHistory />
                : history.map((c, i) => (
                    <HistoryEntry
                      key={c.checkin_id}
                      left={`${scaleTo10(c.mood_score)}/10 · ${MOOD_LABELS_5[c.mood_score]}`}
                      sub={c.notes ?? undefined}
                      right={formatCheckinDate(c.checkin_date)}
                      isLast={i === history.length - 1}
                    />
                  ))
              }
            </HistoryContainer>
          )}
        </>
      )}
    </Section>
  )
}