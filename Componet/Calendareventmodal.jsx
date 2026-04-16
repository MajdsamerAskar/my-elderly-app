import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
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
    className="flex-1 justify-end bg-black/50"
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

    <View className="bg-white rounded-t-3xl max-h-[85%]">
      {/* Handle */}
      <View className="w-12 h-1 bg-gray-300 rounded-full self-center mt-3 mb-2" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">
          {isEditing ? (isEdit ? 'Edit Event' : 'New Event') : 'Event Details'}
        </Text>
        <View className="flex-row">
          {isEdit && !readOnly && !isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} className="w-10 h-10 items-center justify-center rounded-full bg-blue-50 mr-2">
              <Ionicons name="pencil" size={20} color="#5B8CFF" />
            </TouchableOpacity>
          )}
          
        </View>
      </View>

      <ScrollView className="px-4 py-4" showsVerticalScrollIndicator={false}>

        {/* Event type selector */}
        {isEditing && (
          <View className="flex-row flex-wrap gap-2 mb-4">
            {EVENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                className={`flex-row items-center px-4 py-2 rounded-full border ${eventType === t.value ? 'border-transparent' : 'border-gray-300'}`}
                style={eventType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}
                onPress={() => setEventType(t.value)}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={eventType === t.value ? '#FFF' : t.color}
                />
                <Text
                  className={`ml-2 text-lg font-medium ${eventType === t.value ? 'text-white' : ''}`}
                  style={eventType === t.value ? {} : { color: t.color }}
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
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50 text-gray-900"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Doctor Appointment"
              placeholderTextColor="#BBB"
              maxLength={255}
            />
          ) : (
            <Text className="text-base text-gray-900">{title}</Text>
          )}
        </Field>

        {/* Date */}
        <Field label="Date">
          {isEditing ? (
            <>
              <TouchableOpacity
                className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 mb-2 bg-gray-50"
                onPress={() => setShowDatePicker((prev) => !prev)}
              >
                <Ionicons name="calendar-outline" size={16} color="#5B8CFF" />
                <Text className="ml-2 text-base text-gray-900">{formatDate(startDate)}</Text>
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
            <Text className="text-base text-gray-900">{formatDate(startDate)}</Text>
          )}
        </Field>

        {/* Time */}
        <Field label="Time">
          {isEditing ? (
            <>
              <TouchableOpacity
                className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 mb-2 bg-gray-50"
                onPress={() => setShowTimePicker((prev) => !prev)}
              >
                <Ionicons name="time-outline" size={16} color="#5B8CFF" />
                <Text className="ml-2 text-base text-gray-900">{formatTime(startDate)}</Text>
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
            <Text className="text-base text-gray-900">{formatTime(startDate)}</Text>
          )}
        </Field>

        {/* ── Location ── */}
        <Field label="Location">
          {isEditing ? (
            <>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50 text-gray-900"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. City Hospital, 45 Main St"
                placeholderTextColor="#BBB"
                maxLength={255}
                returnKeyType="done"
              />
              <Text className="text-md text-gray-500 mt-1">
                Enter an address or place name to enable directions
              </Text>
            </>
          ) : location ? (
            <View className="bg-gray-50 rounded-lg p-3">
              <View className="flex-row items-center mb-3">
                <Ionicons name="location" size={16} color="#5B8CFF" />
                <Text className="ml-2 text-base text-gray-900 flex-1">{location}</Text>
              </View>

              {/* Get Directions button */}
              <TouchableOpacity
                className="flex-row items-center justify-center bg-blue-500 py-3 rounded-lg"
                onPress={() => openDirections(location)}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={16} color="#FFF" />
                <Text className="ml-2 text-white font-semibold">Get Directions</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-base text-gray-400 italic">No location set</Text>
          )}
        </Field>

        {/* Description */}
        <Field label="Notes">
          {isEditing ? (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50 text-gray-900 h-24"
              value={description}
              onChangeText={setDescription}
              placeholder="Any additional details…"
              placeholderTextColor="#BBB"
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text className={`text-base ${!description ? 'text-gray-400 italic' : 'text-gray-900'}`}>
              {description || 'No notes'}
            </Text>
          )}
        </Field>

        {/* Reminder */}
        <Field label="Reminder">
          {isEditing ? (
            <View className="flex-row gap-2">
              {['15', '30', '60', '120'].map((m) => (
                <TouchableOpacity
                  key={m}
                  className={`flex-1 py-3 rounded-lg border items-center ${reminderMinutes === m ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}
                  onPress={() => setReminderMinutes(m)}
                >
                  <Text
                    className={`text-lg font-medium ${reminderMinutes === m ? 'text-white' : 'text-gray-700'}`}
                  >
                    {parseInt(m) >= 60 ? `${parseInt(m) / 60}h` : `${m}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text className="text-base text-gray-900">
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
          <View className="flex-row items-center bg-red-50 rounded-lg p-3 mb-4">
            <Ionicons name="alert-circle" size={16} color="#E05C5C" />
            <Text className="ml-2 text-lg text-red-600 flex-1">{error}</Text>
          </View>
        )}

        {/* Actions */}
        {isEditing && (
          <>
          <TouchableOpacity
            className={`bg-blue-500 py-4 rounded-xl items-center mb-3 ${loading ? 'opacity-60' : ''}`}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {isEdit ? 'Save Changes' : 'Add Event'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className=" py-4 items-center justify-center rounded-full bg-gray-100">
            <Text className="text-gray-700 font-semibold">Cancel</Text>
          </TouchableOpacity></>
        )}

        {isEdit && isEditing && !readOnly && (
          <TouchableOpacity
            className="flex-row items-center justify-center py-3"
            onPress={handleDelete}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={16} color="#E05C5C" />
            <Text className="ml-2 text-red-500 font-semibold">Delete Event</Text>
          </TouchableOpacity>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>
  );
}

// ── Helper label wrapper ──────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <View className="mb-4">
  <Text className="text-lg font-semibold text-gray-700 mb-2">
    {label}
    {required && <Text className="text-red-500"> *</Text>}
  </Text>
  {children}
</View>
  );
}