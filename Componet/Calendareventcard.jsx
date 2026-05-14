import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../ThemeContext'

const EVENT_CONFIG = {
  medical: {
    color: '#E05C5C',
    bg: '#FDF0F0',
    bgDark: '#4A1F28',
    icon: 'medical',
    labelKey: 'calendarTypeMedical',
    fallback: 'Medical',
  },
  family: {
    color: '#5B8CFF',
    bg: '#EEF3FF',
    bgDark: '#1E315C',
    icon: 'people',
    labelKey: 'calendarTypeFamily',
    fallback: 'Family',
  },
  other: {
    color: '#5CB87A',
    bg: '#EFF8F2',
    bgDark: '#1C3D2B',
    icon: 'calendar',
    labelKey: 'calendarTypeOther',
    fallback: 'Other',
  },
}

function getCalendarLocale(language) {
  if (language?.startsWith('ar')) return 'ar-IQ'
  if (language?.startsWith('ku')) return 'ckb-IQ'
  return 'en-US'
}

function formatTime(isoString, locale) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export default function CalendarEventCard({ event, onPress, compact = false }) {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const cfg = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.other
  const locale = getCalendarLocale(i18n.language)
  const time = formatTime(event.start_datetime, locale)
  const typeLabel = t(cfg.labelKey) || cfg.fallback

  if (compact) {
    return (
      <TouchableOpacity
        className="flex-row items-center bg-surface rounded-lg border border-border border-l-[3px] py-[7px] px-[10px] mb-[6px] gap-2"
        style={{ borderLeftColor: cfg.color }}
        onPress={() => onPress?.(event)}
        activeOpacity={0.75}
      >
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
        <View className="flex-1 flex-row justify-between items-center">
          <Text className="text-lg font-medium text-text flex-1" numberOfLines={1}>
            {event.title}
          </Text>
          {time ? <Text className="text-md text-text-secondary ml-1">{time}</Text> : null}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface rounded-2xl p-4 mb-3 overflow-visible gap-3 border border-border"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
      onPress={() => onPress?.(event)}
      activeOpacity={0.75}
    >
      <View
        className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
        style={{ backgroundColor: cfg.color }}
      />

      <View
        className="rounded-xl items-center justify-center ml-2"
        style={{
          width: 44,
          height: 44,
          backgroundColor: isDark ? cfg.bgDark : cfg.bg,
        }}
      >
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </View>

      <View className="flex-1 gap-[3px]">
        <Text className="font-bold uppercase text-md tracking-[0.8px]" style={{ color: cfg.color }}>
          {typeLabel}
        </Text>
        <Text className="font-semibold text-text text-lg" numberOfLines={2}>
          {event.title}
        </Text>

        <View className="flex-row flex-wrap mt-0.5 gap-2">
          {time ? (
            <View className="flex-row items-center gap-[6px]">
              <Ionicons name="time-outline" size={15} color={isDark ? '#94a3b8' : '#888888'} />
              <Text className="text-text-secondary text-md">{time}</Text>
            </View>
          ) : null}

          {event.location ? (
            <View className="flex-row items-center flex-1 min-w-0 gap-[6px]">
              <Ionicons name="location-outline" size={15} color={isDark ? '#94a3b8' : '#888888'} />
              <Text className="text-text-secondary text-md" numberOfLines={1} ellipsizeMode="tail">
                {event.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={isDark ? '#94a3b8' : '#CCCCCC'} />
    </TouchableOpacity>
  )
}
