import { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import CalendarEventCard from '../../Componet/Calendareventcard'
import CalendarEventModal from '../../Componet/Calendareventmodal'
import { getEventsForMonth } from '../../services/calendar.service'
import { getCurrentUser } from '../../services/auth.service'
import { getLinkedElderly } from '../../services/Caregiver.service'
import { supabase } from '../../lib/supabase'

const TYPE_COLOR = { medical: '#E05C5C', family: '#5B8CFF', other: '#5CB87A' }

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getInitials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

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

function getWeekdayLabels(locale) {
  const sunday = new Date(2024, 0, 7)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + index)
    return date.toLocaleDateString(locale, { weekday: 'narrow' })
  })
}

function getEventTypeLabel(type, t) {
  if (type === 'medical') return t('calendarTypeMedical') || 'Medical'
  if (type === 'family') return t('calendarTypeFamily') || 'Family'
  return t('calendarTypeOther') || 'Other'
}

function ElderlySelector({ list, selected, onSelect }) {
  const { t } = useTranslation()

  if (!list.length) return null

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">
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
                    className={`text-base font-bold ${
                      active ? 'text-blue-600 dark:text-blue-300' : 'text-text-secondary'
                    }`}
                  >
                    {getInitials(elderly.first_name, elderly.last_name)}
                  </Text>
                </View>
                <Text
                  className={`text-sm font-bold ${
                    active ? 'text-blue-600 dark:text-blue-300' : 'text-text'
                  }`}
                >
                  {elderly.first_name}
                </Text>
                {age ? (
                  <Text className="text-xs text-text-secondary mt-0.5">
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

function NoPatients() {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Ionicons
        name="people-outline"
        size={48}
        color={isDark ? '#475569' : '#D0D5E8'}
      />
      <Text className="text-lg font-semibold text-text mt-4 mb-1">
        {t('noLinkedPatients') || 'No linked patients'}
      </Text>
      <Text className="text-text-secondary text-center">
        {t('patientsAppearAfterAccept') || 'Your patients will appear here once they accept your request.'}
      </Text>
    </View>
  )
}

export default function CaregiverCalendarScreen() {
  const today = new Date()
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const locale = getCalendarLocale(i18n.language)
  const dayLabels = getWeekdayLabels(locale)

  const [currentUser, setCurrentUser] = useState(null)
  const [linkedPatients, setLinkedPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [activeEvent, setActiveEvent] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)

        const linked = await getLinkedElderly(user.user_id)
        let patients = linked

        if (linked.length && !linked[0].date_of_birth) {
          const ids = linked.map((patient) => patient.user_id)
          const { data } = await supabase
            .from('users')
            .select('user_id, first_name, last_name, date_of_birth, profile_photo_url')
            .in('user_id', ids)

          if (data) patients = data
        }

        setLinkedPatients(patients)
        if (patients.length) setSelectedPatient(patients[0])
      } finally {
        setLoadingPatients(false)
      }
    })()
  }, [])

  const loadEvents = useCallback(async () => {
    if (!selectedPatient) {
      setEvents([])
      return
    }

    setLoadingEvents(true)
    try {
      const data = await getEventsForMonth(selectedPatient.user_id, viewYear, viewMonth)
      setEvents(data ?? [])
    } catch (error) {
      console.error('Calendar load error:', error.message)
    } finally {
      setLoadingEvents(false)
    }
  }, [selectedPatient, viewYear, viewMonth])

  useFocusEffect(useCallback(() => {
    loadEvents()
  }, [loadEvents]))

  function handleSelectPatient(patient) {
    setSelectedPatient(patient)
    setSelectedDate(today)
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const dayEvents = events.filter((event) =>
    isSameDay(new Date(event.start_datetime), selectedDate)
  )

  const dotMap = {}
  events.forEach((event) => {
    const date = new Date(event.start_datetime)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (!dotMap[key]) dotMap[key] = []
    const color = TYPE_COLOR[event.event_type] ?? TYPE_COLOR.other
    if (!dotMap[key].includes(color)) dotMap[key].push(color)
  })

  function dotsFor(year, month, day) {
    return dotMap[`${year}-${month}-${day}`] ?? []
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((year) => year - 1)
      setViewMonth(11)
      return
    }
    setViewMonth((month) => month - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((year) => year + 1)
      setViewMonth(0)
      return
    }
    setViewMonth((month) => month + 1)
  }

  function openCreate() {
    setActiveEvent(null)
    setModalVisible(true)
  }

  function openEvent(event) {
    setActiveEvent(event)
    setModalVisible(true)
  }

  function renderGrid() {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstWeekday = getFirstDayOfMonth(viewYear, viewMonth)
    const cells = []

    for (let index = 0; index < firstWeekday; index++) {
      cells.push(<View key={`blank-${index}`} className="w-[14.28%] aspect-square" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(viewYear, viewMonth, day)
      const currentDay = isSameDay(cellDate, today)
      const selected = isSameDay(cellDate, selectedDate)
      const dots = dotsFor(viewYear, viewMonth, day)

      cells.push(
        <TouchableOpacity
          key={day}
          className={`w-[14.28%] aspect-square items-center justify-center rounded-lg ${
            selected
              ? 'bg-blue-500'
              : currentDay
                ? 'bg-blue-100 dark:bg-blue-950/40'
                : 'bg-transparent'
          }`}
          onPress={() => setSelectedDate(cellDate)}
        >
          <Text
            className={`text-base font-medium ${
              selected
                ? 'text-white'
                : currentDay
                  ? 'text-blue-600 dark:text-blue-300'
                  : 'text-text'
            }`}
          >
            {day}
          </Text>
          {dots.length > 0 ? (
            <View className="flex-row mt-1 gap-0.5">
              {dots.slice(0, 3).map((color, index) => (
                <View key={index} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </View>
          ) : null}
        </TouchableOpacity>
      )
    }

    const rows = []
    for (let index = 0; index < cells.length; index += 7) {
      rows.push(
        <View key={index} className="flex-row w-full">
          {cells.slice(index, index + 7)}
        </View>
      )
    }

    return rows
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  const selectedLabel = selectedDate.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#1A1A2E' : '#F5F5F5'}
      />

      <View className="flex-row items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <View>
          <Text className="text-xl font-bold text-text">
            {t('calendarTab') || t('calendar') || 'Calendar'}
          </Text>
          {selectedPatient ? (
            <Text className="text-sm text-text-secondary mt-1">
              {selectedPatient.first_name} {selectedPatient.last_name}
            </Text>
          ) : null}
        </View>
        {selectedPatient ? (
          <TouchableOpacity
            className="bg-blue-500 w-9 h-9 rounded-full items-center justify-center"
            onPress={openCreate}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loadingPatients ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B8CFF" />
          <Text className="text-text-secondary mt-4">
            {t('loadingPatients') || 'Loading patients...'}
          </Text>
        </View>
      ) : linkedPatients.length === 0 ? (
        <NoPatients />
      ) : (
        <FlatList
          data={dayEvents}
          keyExtractor={(item) => item.event_id}
          contentContainerClassName="p-4 pb-20"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <ElderlySelector
                list={linkedPatients}
                selected={selectedPatient}
                onSelect={handleSelectPatient}
              />

              <View className="bg-surface rounded-2xl p-4 mb-4 border border-border shadow-sm">
                <View className="flex-row items-center justify-between mb-4">
                  <TouchableOpacity onPress={prevMonth} className="p-2">
                    <Ionicons name="chevron-back" size={20} color={isDark ? '#CBD5E1' : '#444444'} />
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-text">{monthLabel}</Text>
                  <TouchableOpacity onPress={nextMonth} className="p-2">
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#CBD5E1' : '#444444'} />
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between mb-2">
                  {dayLabels.map((label, index) => (
                    <Text key={index} className="flex-1 text-center text-md font-semibold text-text-secondary">
                      {label}
                    </Text>
                  ))}
                </View>

                <View className="flex-row flex-wrap">
                  {renderGrid()}
                </View>
              </View>

              <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
                {Object.entries(TYPE_COLOR).map(([type, color]) => (
                  <View key={type} className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
                    <Text className="text-md text-text-secondary">
                      {getEventTypeLabel(type, t)}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-text">{selectedLabel}</Text>
                {loadingEvents ? <ActivityIndicator size="small" color="#5B8CFF" /> : null}
              </View>
            </>
          }
          renderItem={({ item }) => (
            <CalendarEventCard event={item} onPress={openEvent} />
          )}
          ListEmptyComponent={
            !loadingEvents ? (
              <View className="items-center justify-center py-12">
                <Ionicons
                  name="calendar-outline"
                  size={44}
                  color={isDark ? '#475569' : '#D0D5E8'}
                />
                <Text className="text-lg font-semibold text-text mt-4 mb-1">
                  {t('noEventsForThisDay') || 'No events for this day'}
                </Text>
                <Text className="text-md text-text-secondary text-center">
                  {t('tapPlusToAddEventForPatient', {
                    name: selectedPatient?.first_name,
                    defaultValue: `Tap the + button to add something for ${selectedPatient?.first_name ?? t('patient') ?? 'this patient'}`,
                  })}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <CalendarEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={(saved) => {
          setModalVisible(false)
          loadEvents()
          if (saved?.start_datetime) {
            setSelectedDate(new Date(saved.start_datetime))
          }
        }}
        onDeleted={() => {
          setModalVisible(false)
          loadEvents()
        }}
        event={activeEvent}
        selectedDate={selectedDate}
        elderlyUserId={selectedPatient?.user_id}
        currentUserId={currentUser?.user_id}
        readOnly={false}
      />
    </SafeAreaView>
  )
}
