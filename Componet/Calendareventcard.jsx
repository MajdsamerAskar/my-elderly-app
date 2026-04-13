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
        style={[styles.compact, { borderLeftColor: cfg.color }]}
        onPress={() => onPress?.(event)}
        activeOpacity={0.75}
      >
        <View style={[styles.dot, { backgroundColor: cfg.color }]} />
        <View style={styles.compactBody}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {event.title}
          </Text>
          {time ? <Text style={styles.compactTime}>{time}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.color }]}
      onPress={() => onPress?.(event)}
      activeOpacity={0.75}
    >
      {/* Icon badge */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.eventType}>{cfg.label.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.meta}>
          {time ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color="#888" />
              <Text style={styles.metaText}>{time}</Text>
            </View>
          ) : null}

          {event.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#888" />
              <Text style={styles.metaText} numberOfLines={1}>
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

const styles = StyleSheet.create({
  // ── Full card ──────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  eventType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAA',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
  },

  // ── Compact (dot + title) ─────────────────────────────────
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 6,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactBody: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A2E',
    flex: 1,
  },
  compactTime: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
});