import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createEvent, updateEvent, deleteEvent } from '../services/calendar.service';

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'medical', label: 'Medical', icon: 'medical',  color: '#E05C5C' },
  { value: 'family',  label: 'Family',  icon: 'people',   color: '#5B8CFF' },
  { value: 'other',   label: 'Other',   icon: 'calendar', color: '#5CB87A' },
];

// ─── Open native maps with directions ────────────────────────────────────────
function openDirections(locationText) {
  if (!locationText?.trim()) return;
  const encoded = encodeURIComponent(locationText.trim());

  // Apple Maps on iOS, Google Maps on Android
  const url = Platform.select({
    ios:     `maps://maps.apple.com/?daddr=${encoded}`,
    android: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
  });
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  Linking.canOpenURL(url)
    .then((supported) => Linking.openURL(supported ? url : fallback))
    .catch(() =>
      Alert.alert('Maps unavailable', 'Could not open the maps app on this device.')
    );
}

/**
 * CalendarEventModal
 *
 * Props:
 *   visible         — boolean
 *   onClose         — () => void
 *   onSaved         — (event) => void   called after create/update
 *   onDeleted       — (eventId) => void called after delete
 *   event           — existing event to view/edit, or null to create new
 *   selectedDate    — Date, pre-fills the date when creating
 *   elderlyUserId   — uuid of the elderly user
 *   currentUserId   — uuid of whoever is creating (elderly or caregiver)
 *   readOnly        — if true hides edit/delete buttons
 */
export default function CalendarEventModal({
  visible,
  onClose,
  onSaved,
  onDeleted,
  event = null,
  selectedDate,
  elderlyUserId,
  currentUserId,
  readOnly = false,
}) {
  const isEdit = !!event;
  const [isEditing, setIsEditing] = useState(!isEdit);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  // ── Form state ──────────────────────────────────────────────
  const [title,           setTitle]           = useState('');
  const [description,     setDescription]     = useState('');
  const [location,        setLocation]        = useState('');
  const [eventType,       setEventType]       = useState('other');
  const [startDate,       setStartDate]       = useState(selectedDate ?? new Date());
  const [reminderMinutes, setReminderMinutes] = useState('30');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Populate form when event changes ───────────────────────
  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '');
      setDescription(event.description ?? '');
      setLocation(event.location ?? '');
      setEventType(event.event_type ?? 'other');
      setStartDate(event.start_datetime ? new Date(event.start_datetime) : new Date());
      setReminderMinutes(event.reminder_minutes != null ? String(event.reminder_minutes) : '30');
      setIsEditing(false);
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setEventType('other');
      setStartDate(selectedDate ?? new Date());
      setReminderMinutes('30');
      setIsEditing(true);
    }
    setError(null);
  }, [event, visible]);

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) { setError('Please enter a title.'); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title:           title.trim(),
        description:     description.trim() || null,
        location:        location.trim() || null,
        eventType,
        startDatetime:   startDate.toISOString(),
        reminderMinutes: reminderMinutes ? parseInt(reminderMinutes, 10) : null,
      };

      let saved;
      if (isEdit) {
        saved = await updateEvent(event.event_id, {
          title:            payload.title,
          description:      payload.description,
          location:         payload.location,
          event_type:       payload.eventType,
          start_datetime:   payload.startDatetime,
          reminder_minutes: payload.reminderMinutes,
        });
      } else {
        saved = await createEvent({
          createdBy:     currentUserId,
          elderlyUserId,
          ...payload,
        });
      }
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete() {
    setLoading(true);
    try {
      await deleteEvent(event.event_id);
      onDeleted?.(event.event_id);
      onClose();
    } catch (e) {
      setError(e.message ?? 'Could not delete event.');
    } finally {
      setLoading(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  const formatDate = (d) =>
    d.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  const formatTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ─────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? (isEdit ? 'Edit Event' : 'New Event') : 'Event Details'}
            </Text>
            <View style={styles.headerActions}>
              {isEdit && !readOnly && !isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconBtn}>
                  <Ionicons name="pencil" size={20} color="#5B8CFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

            {/* Event type selector */}
            {isEditing && (
              <View style={styles.typeRow}>
                {EVENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeBtn,
                      eventType === t.value && { backgroundColor: t.color, borderColor: t.color },
                    ]}
                    onPress={() => setEventType(t.value)}
                  >
                    <Ionicons
                      name={t.icon}
                      size={16}
                      color={eventType === t.value ? '#FFF' : t.color}
                    />
                    <Text
                      style={[
                        styles.typeBtnText,
                        { color: eventType === t.value ? '#FFF' : t.color },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Title */}
            <Field label="Title" required>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Doctor Appointment"
                  placeholderTextColor="#BBB"
                  maxLength={255}
                />
              ) : (
                <Text style={styles.valueText}>{title}</Text>
              )}
            </Field>

            {/* Date */}
            <Field label="Date">
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#5B8CFF" />
                    <Text style={styles.dateBtnText}>{formatDate(startDate)}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(_, d) => {
                        setShowDatePicker(false);
                        if (d) setStartDate(prev => {
                          const next = new Date(d);
                          next.setHours(prev.getHours(), prev.getMinutes());
                          return next;
                        });
                      }}
                    />
                  )}
                </>
              ) : (
                <Text style={styles.valueText}>{formatDate(startDate)}</Text>
              )}
            </Field>

            {/* Time */}
            <Field label="Time">
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={16} color="#5B8CFF" />
                    <Text style={styles.dateBtnText}>{formatTime(startDate)}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="time"
                      display="default"
                      onChange={(_, d) => {
                        setShowTimePicker(false);
                        if (d) setStartDate(prev => {
                          const next = new Date(prev);
                          next.setHours(d.getHours(), d.getMinutes());
                          return next;
                        });
                      }}
                    />
                  )}
                </>
              ) : (
                <Text style={styles.valueText}>{formatTime(startDate)}</Text>
              )}
            </Field>

            {/* ── Location ── */}
            <Field label="Location">
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. City Hospital, 45 Main St"
                    placeholderTextColor="#BBB"
                    maxLength={255}
                    returnKeyType="done"
                  />
                  <Text style={styles.locationHint}>
                    Enter an address or place name to enable directions
                  </Text>
                </>
              ) : location ? (
                <View style={styles.locationView}>
                  <View style={styles.locationTextRow}>
                    <Ionicons name="location" size={16} color="#5B8CFF" />
                    <Text style={styles.locationText}>{location}</Text>
                  </View>

                  {/* Get Directions button */}
                  <TouchableOpacity
                    style={styles.directionsBtn}
                    onPress={() => openDirections(location)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={16} color="#FFF" />
                    <Text style={styles.directionsBtnText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.emptyText}>No location set</Text>
              )}
            </Field>

            {/* Description */}
            <Field label="Notes">
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Any additional details…"
                  placeholderTextColor="#BBB"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={[styles.valueText, !description && styles.emptyText]}>
                  {description || 'No notes'}
                </Text>
              )}
            </Field>

            {/* Reminder */}
            <Field label="Reminder">
              {isEditing ? (
                <View style={styles.reminderRow}>
                  {['15', '30', '60', '120'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.reminderBtn,
                        reminderMinutes === m && styles.reminderBtnActive,
                      ]}
                      onPress={() => setReminderMinutes(m)}
                    >
                      <Text
                        style={[
                          styles.reminderBtnText,
                          reminderMinutes === m && styles.reminderBtnTextActive,
                        ]}
                      >
                        {parseInt(m) >= 60 ? `${parseInt(m) / 60}h` : `${m}m`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.valueText}>
                  {reminderMinutes
                    ? parseInt(reminderMinutes) >= 60
                      ? `${parseInt(reminderMinutes) / 60} hour${parseInt(reminderMinutes) / 60 > 1 ? 's' : ''} before`
                      : `${reminderMinutes} minutes before`
                    : 'No reminder'}
                </Text>
              )}
            </Field>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#E05C5C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Actions */}
            {isEditing && (
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {isEdit ? 'Save Changes' : 'Add Event'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {isEdit && isEditing && !readOnly && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={16} color="#E05C5C" />
                <Text style={styles.deleteBtnText}>Delete Event</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Helper label wrapper ──────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={{ color: '#E05C5C' }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Type selector
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Fields
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F7F7FB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  inputMulti: {
    height: 80,
    textAlignVertical: 'top',
  },
  valueText: {
    fontSize: 15,
    color: '#1A1A2E',
    paddingVertical: 2,
  },
  emptyText: {
    color: '#BBB',
    fontStyle: 'italic',
    fontSize: 15,
  },

  // Location hint (edit mode)
  locationHint: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 5,
    marginLeft: 2,
  },

  // Location view (read mode)
  locationView: {
    gap: 10,
  },
  locationTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    color: '#1A1A2E',
    flex: 1,
    lineHeight: 20,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#5B8CFF',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    shadowColor: '#5B8CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  directionsBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Date/time buttons
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F4FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  dateBtnText: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '500',
  },

  // Reminder pills
  reminderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  reminderBtnActive: {
    backgroundColor: '#5B8CFF',
    borderColor: '#5B8CFF',
  },
  reminderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  reminderBtnTextActive: {
    color: '#FFF',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF0F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#E05C5C',
    fontSize: 13,
    flex: 1,
  },

  // Save / Delete
  saveBtn: {
    backgroundColor: '#5B8CFF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteBtnText: {
    color: '#E05C5C',
    fontSize: 15,
    fontWeight: '600',
  },
});