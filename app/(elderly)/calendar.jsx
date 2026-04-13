import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import CalendarEventCard   from '../../Componet/Calendareventcard';
import CalendarEventModal  from '../../Componet/Calendareventmodal';
import { getEventsForMonth } from '../../services/calendar.service';
import { supabase }          from '../../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['S','M','T','W','T','F','S'];

// Colour used for event-dot marks on the mini-calendar
const TYPE_COLOR = { medical: '#E05C5C', family: '#5B8CFF', other: '#5CB87A' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ElderlyCalendarScreen() {
  const today = new Date();

  // ── State ──────────────────────────────────────────────────
  const [currentUser,   setCurrentUser]   = useState(null);
  const [viewYear,      setViewYear]      = useState(today.getFullYear());
  const [viewMonth,     setViewMonth]     = useState(today.getMonth());
  const [selectedDate,  setSelectedDate]  = useState(today);
  const [events,        setEvents]        = useState([]);   // all events for the month
  const [loading,       setLoading]       = useState(false);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [activeEvent,   setActiveEvent]   = useState(null); // null = create new

  // ── Auth ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user ?? null);
    });
  }, []);

  // ── Load events whenever month/user changes ────────────────
  const loadEvents = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getEventsForMonth(currentUser.id, viewYear, viewMonth);
      setEvents(data ?? []);
    } catch (e) {
      console.error('Calendar load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, viewYear, viewMonth]);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  // ── Derived: events on selected day ───────────────────────
  const dayEvents = events.filter((ev) =>
    isSameDay(new Date(ev.start_datetime), selectedDate)
  );

  // ── Derived: dot map for calendar grid ─────────────────────
  // { "YYYY-MM-DD": [color, ...] }
  const dotMap = {};
  events.forEach((ev) => {
    const d = new Date(ev.start_datetime);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dotMap[key]) dotMap[key] = [];
    const color = TYPE_COLOR[ev.event_type] ?? TYPE_COLOR.other;
    if (!dotMap[key].includes(color)) dotMap[key].push(color);
  });
  function dotsFor(year, month, day) {
    return dotMap[`${year}-${month}-${day}`] ?? [];
  }

  // ── Month navigation ───────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else                 { setViewMonth(m => m - 1); }
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else                  { setViewMonth(m => m + 1); }
  }

  // ── Modal helpers ──────────────────────────────────────────
  function openCreate() {
    setActiveEvent(null);
    setModalVisible(true);
  }
  function openEvent(ev) {
    setActiveEvent(ev);
    setModalVisible(true);
  }

  // ── Calendar grid ──────────────────────────────────────────
  function renderGrid() {
    const daysInMonth   = getDaysInMonth(viewYear, viewMonth);
    const firstWeekday  = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = [];

    // blank leading cells
    for (let i = 0; i < firstWeekday; i++) {
      cells.push(<View key={`blank-${i}`} style={styles.cell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate   = new Date(viewYear, viewMonth, day);
      const isToday    = isSameDay(cellDate, today);
      const isSelected = isSameDay(cellDate, selectedDate);
      const dots       = dotsFor(viewYear, viewMonth, day);

      cells.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.cell,
            isSelected && styles.cellSelected,
            isToday && !isSelected && styles.cellToday,
          ]}
          onPress={() => setSelectedDate(cellDate)}
        >
          <Text
            style={[
              styles.cellText,
              isSelected && styles.cellTextSelected,
              isToday && !isSelected && styles.cellTextToday,
            ]}
          >
            {day}
          </Text>
          {/* event dots */}
          {dots.length > 0 && (
            <View style={styles.dotsRow}>
              {dots.slice(0, 3).map((c, i) => (
                <View key={i} style={[styles.eventDot, { backgroundColor: c }]} />
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // group into rows of 7
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(
        <View key={i} style={styles.gridRow}>
          {cells.slice(i, i + 7)}
        </View>
      );
    }
    return rows;
  }

  // ── Formatted selected-date label ─────────────────────────
  const selectedLabel = selectedDate.toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>My Calendar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dayEvents}
        keyExtractor={(item) => item.event_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Month navigator + grid ── */}
            <View style={styles.calendarCard}>
              {/* Month header */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color="#444" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#444" />
                </TouchableOpacity>
              </View>

              {/* Day-of-week headers */}
              <View style={styles.dayHeaderRow}>
                {DAY_LABELS.map((d, i) => (
                  <Text key={i} style={styles.dayHeader}>{d}</Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.grid}>
                {renderGrid()}
              </View>
            </View>

            {/* ── Legend ── */}
            <View style={styles.legendRow}>
              {Object.entries(TYPE_COLOR).map(([type, color]) => (
                <View key={type} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Selected day title ── */}
            <View style={styles.dayTitleRow}>
              <Text style={styles.dayTitle}>{selectedLabel}</Text>
              {loading && <ActivityIndicator size="small" color="#5B8CFF" />}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <CalendarEventCard event={item} onPress={openEvent} />
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={44} color="#D0D5E8" />
              <Text style={styles.emptyTitle}>No events today</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add something
              </Text>
            </View>
          )
        }
      />

      {/* ── Modal ── */}
      <CalendarEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={(saved) => {
          setModalVisible(false);
          loadEvents();
          // if saved event falls on selected date, keep it selected
          if (saved?.start_datetime) {
            setSelectedDate(new Date(saved.start_datetime));
          }
        }}
        onDeleted={() => {
          setModalVisible(false);
          loadEvents();
        }}
        event={activeEvent}
        selectedDate={selectedDate}
        elderlyUserId={currentUser?.id}
        currentUserId={currentUser?.id}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CELL_SIZE = 44;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5B8CFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B8CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  // Calendar card
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#AAA',
    textTransform: 'uppercase',
  },
  grid: {
    gap: 2,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  cellSelected: {
    backgroundColor: '#5B8CFF',
  },
  cellToday: {
    backgroundColor: '#EEF3FF',
  },
  cellText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cellTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  cellTextToday: {
    color: '#5B8CFF',
    fontWeight: '700',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    gap: 3,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },

  // Day section
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },

  // List
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 36,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#AAA',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#C0C0C0',
  },
});