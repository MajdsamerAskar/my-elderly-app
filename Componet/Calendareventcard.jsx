import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_CONFIG = {
  medical: {
    color: '#E05C5C',
    bg: '#FDF0F0',
    icon: 'medical',
    label: 'Medical',
  },
  family: {
    color: '#5B8CFF',
    bg: '#EEF3FF',
    icon: 'people',
    label: 'Family',
  },
  other: {
    color: '#5CB87A',
    bg: '#EFF8F2',
    icon: 'calendar',
    label: 'Event',
  },
};

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * CalendarEventCard
 *
 * Props:
 *   event       — calendar_events row (with optional created_by_user join)
 *   onPress     — (event) => void
 *   compact     — boolean, renders a smaller version for day lists
 */
export default function CalendarEventCard({ event, onPress, compact = false }) {
  const cfg = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.other;
  const time = formatTime(event.start_datetime);

  if (compact) {
    return (
     <TouchableOpacity
  className="flex-row items-center bg-white rounded-lg border-l-[3px] py-[7px] px-[10px] mb-[6px] gap-2"
  style={{ borderLeftColor: cfg.color }}
  onPress={() => onPress?.(event)}
  activeOpacity={0.75}
>
  <View 
    className="w-2 h-2 rounded-full" 
    style={{ backgroundColor: cfg.color }} 
  />
  <View className="flex-1 flex-row justify-between items-center">
    <Text className="text-lg font-medium text-[#1A1A2E] flex-1" numberOfLines={1}>
      {event.title}
    </Text>
    {time ? <Text className="text-md text-[#888] ml-1">{time}</Text> : null}
  </View>
</TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
  className="flex-row items-center bg-white rounded-2xl p-4 mb-3 overflow-visible gap-3"
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
  {/* Left border indicator */}
  <View 
    className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
    style={{ backgroundColor: cfg.color }} 
  />

  {/* Icon badge */}
  <View 
    className="rounded-xl items-center justify-center ml-2"
    style={{ width: 44, height: 44, backgroundColor: cfg.bg }}
  >
    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
  </View>

  {/* Content */}
  <View className="flex-1 gap-[3px]">
    <Text className="font-bold text-gray-400 uppercase text-md tracking-[0.8px]">
      {cfg.label}
    </Text>
    <Text className="font-semibold text-gray-900 text-lg" numberOfLines={2}>
      {event.title}
    </Text>

    <View className="flex-row flex-wrap mt-0.5 gap-2">
      {time ? (
        <View className="flex-row items-center gap-[6px]">
          <Ionicons name="time-outline" size={15} color="#888" />
          <Text className="text-gray-500 text-md">{time}</Text>
        </View>
      ) : null}

      {event.location ? (
        <View className="flex-row items-center flex-1 min-w-0 gap-[6px]">
          <Ionicons name="location-outline" size={15} color="#888" />
          <Text className="text-gray-500 text-md" numberOfLines={1} ellipsizeMode="tail">
            {event.location}
          </Text>
        </View>
      ) : null}
    </View>
  </View>

  <Ionicons name="chevron-forward" size={18} color="#CCC" />
</TouchableOpacity>
  );
}

