import { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
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

export default function ElderlyCalendarScreen() {
  const today = new Date()
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const locale = getCalendarLocale(i18n.language)
  const dayLabels = getWeekdayLabels(locale)

  const [currentUser, setCurrentUser] = useState(null)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [activeEvent, setActiveEvent] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user ?? null)
    })
  }, [])

  const loadEvents = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const data = await getEventsForMonth(currentUser.id, viewYear, viewMonth)
      setEvents(data ?? [])
    } catch (e) {
      console.error('Calendar load error:', e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser, viewYear, viewMonth])

  useFocusEffect(useCallback(() => {
    loadEvents()
  }, [loadEvents]))

  const dayEvents = events.filter((ev) =>
    isSameDay(new Date(ev.start_datetime), selectedDate)
  )

  const dotMap = {}
  events.forEach((ev) => {
    const d = new Date(ev.start_datetime)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!dotMap[key]) dotMap[key] = []
    const color = TYPE_COLOR[ev.event_type] ?? TYPE_COLOR.other
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

    for (let i = 0; i < firstWeekday; i++) {
      cells.push(<View key={`blank-${i}`} className="w-[14.28%] aspect-square" />)
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
          {dots.length > 0 && (
            <View className="flex-row mt-1 gap-0.5">
              {dots.slice(0, 3).map((color, index) => (
                <View key={index} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </View>
          )}
        </TouchableOpacity>
      )
    }

    const rows = []
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(
        <View key={i} className="flex-row w-full">
          {cells.slice(i, i + 7)}
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
        <Text className="text-xl font-bold text-text">{t('myCalendar') || 'My Calendar'}</Text>
        <TouchableOpacity
          className="bg-blue-500 w-9 h-9 rounded-full items-center justify-center"
          onPress={openCreate}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dayEvents}
        keyExtractor={(item) => item.event_id}
        contentContainerClassName="p-4 pb-20"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
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
              {loading && <ActivityIndicator size="small" color="#5B8CFF" />}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <CalendarEventCard event={item} onPress={openEvent} />
        )}
        ListEmptyComponent={
          !loading && (
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
                {t('tapPlusToAddEvent') || 'Tap the + button to add something'}
              </Text>
            </View>
          )
        }
      />

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
        elderlyUserId={currentUser?.id}
        currentUserId={currentUser?.id}
      />
    </SafeAreaView>
  )
}
