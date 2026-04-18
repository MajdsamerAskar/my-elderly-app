import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import CalendarEventCard  from '../../Componet/Calendareventcard';
import CalendarEventModal from '../../Componet/Calendareventmodal';
import { getEventsForMonth } from '../../services/calendar.service';
import { supabase }           from '../../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS  = ['S','M','T','W','T','F','S'];
const TYPE_COLOR  = { medical: '#E05C5C', family: '#5B8CFF', other: '#5CB87A' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysInMonth(year, month)  { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}
function getInitials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}
function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// ─── ElderlySelector ─────────────────────────────────────────────────────────
function ElderlySelector({ list, selected, onSelect }) {
  if (!list.length) return null;
  return (
    <View style={sel.wrapper}>
      <Text style={sel.label}>Select Patient</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sel.row}
      >
        {list.map((e) => {
          const active = selected?.user_id === e.user_id;
          const age    = calcAge(e.date_of_birth);
          return (
            <TouchableOpacity
              key={e.user_id}
              style={[sel.chip, active && sel.chipActive]}
              onPress={() => onSelect(e)}
              activeOpacity={0.8}
            >
              <View style={[sel.avatar, active && sel.avatarActive]}>
                <Text style={[sel.initials, active && sel.initialsActive]}>
                  {getInitials(e.first_name, e.last_name)}
                </Text>
              </View>
              <Text style={[sel.name, active && sel.nameActive]}>{e.first_name}</Text>
              {age ? <Text style={sel.age}>{age} yrs</Text> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const sel = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9999AA',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 10,
  },
  row: { gap: 10, paddingHorizontal: 20, paddingBottom: 4 },
  chip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    minWidth: 72,
  },
  chipActive: { borderColor: '#3B5BDB', backgroundColor: '#EDF2FF' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    marginBottom: 6,
  },
  avatarActive: { backgroundColor: '#C5D3FF' },
  initials:      { fontSize: 15, fontWeight: '800', color: '#555570' },
  initialsActive:{ color: '#3B5BDB' },
  name:          { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  nameActive:    { color: '#3B5BDB' },
  age:           { fontSize: 10, color: '#9999AA', marginTop: 2 },
});

// ─── Empty state when no patients are linked ─────────────────────────────────
function NoPatients() {
  return (
    <View style={styles.noPatients}>
      <Ionicons name="people-outline" size={48} color="#D0D5E8" />
      <Text style={styles.noPatientsTitle}>No linked patients</Text>
      <Text style={styles.noPatientsText}>
        Your patients will appear here once they accept your request.
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CaregiverCalendarScreen() {
  const today = new Date();

  // ── Auth + linked patients ─────────────────────────────────
  const [currentUser,    setCurrentUser]    = useState(null);
  const [linkedPatients, setLinkedPatients] = useState([]);
  const [selectedPatient,setSelectedPatient]= useState(null);
  const [loadingPatients,setLoadingPatients]= useState(true);

  // ── Calendar state ─────────────────────────────────────────
  const [viewYear,     setViewYear]     = useState(today.getFullYear());
  const [viewMonth,    setViewMonth]    = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [events,       setEvents]       = useState([]);
  const [loadingEvents,setLoadingEvents]= useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEvent,  setActiveEvent]  = useState(null);

  // ── 1. Get current caregiver ───────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data?.user ?? null));
  }, []);

  // ── 2. Load linked elderly patients ───────────────────────
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setLoadingPatients(true);
      try {
        // Join caregiver_elderly_links → users to get patient profile
        const { data, error } = await supabase
          .from('caregiver_elderly_links')
          .select(`
            elderly_user_id,
            can_view_medications,
            can_view_biometrics,
            elderly:users!caregiver_elderly_links_elderly_user_id_fkey (
              user_id,
              first_name,
              last_name,
              date_of_birth,
              profile_photo_url
            )
          `)
          .eq('caregiver_user_id', currentUser.id)
          .eq('status', 'active');

        if (error) throw error;

        const patients = (data ?? []).map((row) => row.elderly).filter(Boolean);
        setLinkedPatients(patients);
        // auto-select first patient
        if (patients.length > 0) setSelectedPatient(patients[0]);
      } catch (e) {
        console.error('Failed to load linked patients:', e.message);
      } finally {
        setLoadingPatients(false);
      }
    })();
  }, [currentUser]);

  // ── 3. Load events when patient / month changes ────────────
  const loadEvents = useCallback(async () => {
    if (!selectedPatient) { setEvents([]); return; }
    setLoadingEvents(true);
    try {
      const data = await getEventsForMonth(selectedPatient.user_id, viewYear, viewMonth);
      setEvents(data ?? []);
    } catch (e) {
      console.error('Calendar load error:', e.message);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedPatient, viewYear, viewMonth]);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  // Reset to today's date when switching patient
  function handleSelectPatient(patient) {
    setSelectedPatient(patient);
    setSelectedDate(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  // ── Derived ────────────────────────────────────────────────
  const dayEvents = events.filter((ev) =>
    isSameDay(new Date(ev.start_datetime), selectedDate)
  );

  const dotMap = {};
  events.forEach((ev) => {
    const d   = new Date(ev.start_datetime);
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
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // ── Modal ──────────────────────────────────────────────────
  function openCreate() { setActiveEvent(null); setModalVisible(true); }
  function openEvent(ev) { setActiveEvent(ev);   setModalVisible(true); }

  // ── Calendar grid ──────────────────────────────────────────
  function renderGrid() {
    const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
    const firstWeekday = getFirstDayOfMonth(viewYear, viewMonth);
    const cells        = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push(<View key={`b${i}`} style={styles.cell} />);
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
          <Text style={[
            styles.cellText,
            isSelected && styles.cellTextSelected,
            isToday && !isSelected && styles.cellTextToday,
          ]}>
            {day}
          </Text>
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

  const selectedLabel = selectedDate.toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Calendar</Text>
          {selectedPatient && (
            <Text style={styles.screenSub}>
              {selectedPatient.first_name} {selectedPatient.last_name}
            </Text>
          )}
        </View>
        {selectedPatient && (
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Loading patients ── */}
      {loadingPatients ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="large" color="#3B5BDB" />
        </View>
      ) : linkedPatients.length === 0 ? (
        <NoPatients />
      ) : (
        <FlatList
          data={dayEvents}
          keyExtractor={(item) => item.event_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* ── Patient selector ── */}
              <View style={styles.selectorWrap}>
                <ElderlySelector
                  list={linkedPatients}
                  selected={selectedPatient}
                  onSelect={handleSelectPatient}
                />
              </View>

              {/* ── Calendar card ── */}
              <View style={styles.calendarCard}>
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

                <View style={styles.dayHeaderRow}>
                  {DAY_LABELS.map((d, i) => (
                    <Text key={i} style={styles.dayHeader}>{d}</Text>
                  ))}
                </View>

                <View style={styles.grid}>{renderGrid()}</View>
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

              {/* ── Day title ── */}
              <View style={styles.dayTitleRow}>
                <Text style={styles.dayTitle}>{selectedLabel}</Text>
                {loadingEvents && <ActivityIndicator size="small" color="#3B5BDB" />}
              </View>
            </>
          }
          renderItem={({ item }) => (
            <CalendarEventCard event={item} onPress={openEvent} />
          )}
          ListEmptyComponent={
            !loadingEvents && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={44} color="#D0D5E8" />
                <Text style={styles.emptyTitle}>No events this day</Text>
                <Text style={styles.emptySubtitle}>
                  Tap + to schedule something for{' '}
                  {selectedPatient?.first_name}
                </Text>
              </View>
            )
          }
        />
      )}

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
        elderlyUserId={selectedPatient?.user_id}
        currentUserId={currentUser?.id}
        readOnly={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CELL_SIZE = 44;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  screenTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  screenSub:   { fontSize: 13, color: '#9999AA', marginTop: 2, fontWeight: '500' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#3B5BDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  // Loading / empty
  centerLoad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPatients: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 10, marginTop: 80,
  },
  noPatientsTitle: { fontSize: 17, fontWeight: '700', color: '#AAA' },
  noPatientsText:  { fontSize: 13, color: '#C0C0C0', textAlign: 'center', lineHeight: 20 },

  // Patient selector wrapper
  selectorWrap: { marginBottom: 12 },

  // Calendar card
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginHorizontal: 16,
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
  navBtn:     { padding: 4 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: {
    flex: 1, textAlign: 'center', fontSize: 12,
    fontWeight: '700', color: '#AAA', textTransform: 'uppercase',
  },
  grid:    { gap: 2 },
  gridRow: { flexDirection: 'row' },
  cell: {
    flex: 1, height: CELL_SIZE, alignItems: 'center',
    justifyContent: 'center', borderRadius: 10, position: 'relative',
  },
  cellSelected:     { backgroundColor: '#3B5BDB' },
  cellToday:        { backgroundColor: '#EDF2FF' },
  cellText:         { fontSize: 14, fontWeight: '500', color: '#333' },
  cellTextSelected: { color: '#FFF', fontWeight: '700' },
  cellTextToday:    { color: '#3B5BDB', fontWeight: '700' },
  dotsRow: {
    position: 'absolute', bottom: 5,
    flexDirection: 'row', gap: 3,
  },
  eventDot: { width: 5, height: 5, borderRadius: 3 },

  // Legend
  legendRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 20, marginTop: 12, marginBottom: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#888', fontWeight: '500' },

  // Day section
  dayTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8,
  },
  dayTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },

  // List
  listContent: { paddingBottom: 40, paddingHorizontal: 16 },

  // Empty
  emptyState:    { alignItems: 'center', paddingTop: 36, gap: 8 },
  emptyTitle:    { fontSize: 16, fontWeight: '600', color: '#AAA' },
  emptySubtitle: { fontSize: 13, color: '#C0C0C0', textAlign: 'center' },
});