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
      cells.push(<View key={`blank-${i}`} className="w-[14.28%] aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate   = new Date(viewYear, viewMonth, day);
      const isToday    = isSameDay(cellDate, today);
      const isSelected = isSameDay(cellDate, selectedDate);
      const dots       = dotsFor(viewYear, viewMonth, day);

      cells.push(
        <TouchableOpacity
  key={day}
  className={`w-[14.28%] aspect-square items-center justify-center rounded-lg ${isSelected ? 'bg-blue-500' : isToday ? 'bg-blue-100' : 'bg-transparent'}`}
  onPress={() => setSelectedDate(cellDate)}
>
  <Text
    className={`text-base font-medium ${isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-700'}`}
  >
    {day}
  </Text>
  {/* event dots */}
  {dots.length > 0 && (
    <View className="flex-row mt-1 gap-0.5">
      {dots.slice(0, 3).map((c, i) => (
        <View key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
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
        <View key={i} className="flex-row w-full">
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
    <SafeAreaView className="flex-1 bg-[#F5F6FA]">
  <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />

  {/* ── Top bar ── */}
  <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
    <Text className="text-xl font-bold text-gray-900">My Calendar</Text>
    <TouchableOpacity className="bg-blue-500 w-9 h-9 rounded-full items-center justify-center" onPress={openCreate}>
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
        {/* ── Month navigator + grid ── */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          {/* Month header */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={prevMonth} className="p-2">
              <Ionicons name="chevron-back" size={20} color="#444" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} className="p-2">
              <Ionicons name="chevron-forward" size={20} color="#444" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View className="flex-row justify-between mb-2">
            {DAY_LABELS.map((d, i) => (
              <Text key={i} className="flex-1 text-center text-md font-semibold text-gray-500">{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View className="flex-row flex-wrap">
            {renderGrid()}
          </View>
        </View>

        {/* ── Legend ── */}
        <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <View key={type} className="flex-row items-center">
              <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
              <Text className="text-md text-gray-600">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Selected day title ── */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">{selectedLabel}</Text>
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
          <Ionicons name="calendar-outline" size={44} color="#D0D5E8" />
          <Text className="text-lg font-semibold text-gray-900 mt-4 mb-1">No events today</Text>
          <Text className="text-md text-gray-500 text-center">
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


