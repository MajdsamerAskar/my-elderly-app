import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  logBiometricReading,
  logSleepSession,
  logActivity,
  submitWellnessCheckin,
} from "../../services/health.service";
import { formatDuration } from './HealthSections';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function toISODateTime(date, timeString) {
  if (!date || !timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function getTimeFromISO(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toTimeString().slice(0, 5); // "HH:MM"
}

function calculateDurationMinutes(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  return Math.round((new Date(endISO) - new Date(startISO)) / (1000 * 60));
}

function scaleTo5(value) {
  return Math.ceil(value / 2);
}

// Build a Date object from a "HH:MM" string (today's date, time only matters)
function timeStringToDate(timeString) {
  if (!timeString) return new Date();
  const [hours, minutes] = timeString.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dateToTimeString(date) {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

function formatDisplayTime(timeString) {
  if (!timeString) return '—';
  const [h, m] = timeString.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

// ─────────────────────────────────────────────
// TIME PICKER COMPONENT
// ─────────────────────────────────────────────

function TimePicker({ label, value, onChange }) {
  // value: "HH:MM" string
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [tempDate, setTempDate] = useState(timeStringToDate(value));

  const onAndroidChange = (event, selected) => {
    setShowAndroid(false);
    if (event.type === 'set' && selected) {
      onChange(dateToTimeString(selected));
    }
  };

  const openIOS = () => {
    setTempDate(timeStringToDate(value));
    setShowIOSModal(true);
  };

  const confirmIOS = () => {
    onChange(dateToTimeString(tempDate));
    setShowIOSModal(false);
  };

  return (
    <>
      <TouchableOpacity
        className="border border-gray-300 rounded-xl p-4 flex-row items-center justify-between bg-white"
        onPress={Platform.OS === 'ios' ? openIOS : () => setShowAndroid(true)}
        activeOpacity={0.7}
      >
        <Text className="text-lg font-medium text-gray-900">
          {value ? formatDisplayTime(value) : '—'}
        </Text>
        <Text className="text-lg">🕐</Text>
      </TouchableOpacity>

      {/* Android native time dialog */}
      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={onAndroidChange}
        />
      )}

      {/* iOS bottom-sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showIOSModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIOSModal(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/40"
            activeOpacity={1}
            onPress={() => setShowIOSModal(false)}
          />
          <View className="bg-white rounded-t-3xl px-5 pb-8 pt-4">
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-4" />
            <Text className="text-[18px] font-bold text-gray-900 text-center mb-2">
              {label}
            </Text>
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="spinner"
              is24Hour={false}
              onChange={(_, selected) => selected && setTempDate(selected)}
              style={{ height: 180 }}
              textColor="#111827"
            />
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 border border-gray-200 rounded-xl py-3.5 items-center"
                onPress={() => setShowIOSModal(false)}
              >
                <Text className="text-gray-700 font-semibold text-[16px]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-500 rounded-xl py-3.5 items-center"
                onPress={confirmIOS}
              >
                <Text className="text-white font-bold text-[16px]">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// MODAL FORMS
// ─────────────────────────────────────────────

function BiometricsForm({ mode, initialData, onClose, onSaved }) {
  const [source, setSource] = useState(initialData?.heart_rate?.source || initialData?.spo2?.source || 'manual');
  const [heartRate, setHeartRate] = useState(initialData?.heart_rate?.value?.toString() || '');
  const [spo2, setSpo2] = useState(initialData?.spo2?.value?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!heartRate || !spo2) {
      Alert.alert("Error", "Please enter both heart rate and blood oxygen");
      return;
    }
    const hr = parseInt(heartRate);
    const sp = parseInt(spo2);
    if (hr < 30 || hr > 250) {
      Alert.alert("Error", "Please enter a valid heart rate (30-250 bpm)");
      return;
    }
    if (sp < 50 || sp > 100) {
      Alert.alert("Error", "Please enter a valid SpO2 percentage (50-100%)");
      return;
    }
    setLoading(true);
    try {
      await Promise.all([
        logBiometricReading('heart_rate', hr, source),
        logBiometricReading('spo2', sp, source)
      ]);
      onSaved?.();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save biometrics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        {mode === "edit" ? "Update Biometrics" : "Log Biometrics"}
      </Text>
      <Text className="text-[18px] text-gray-500 mb-6">Record your vital signs</Text>

      <Text className="text-md font-medium text-gray-700 mb-3">Source</Text>
      <View className="flex-row gap-3 mb-6">
        {['watch', 'manual'].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSource(s)}
            className={`flex-1 py-4 rounded-xl border-2 items-center ${
              source === s ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <Text className={`font-medium text-md ${source === s ? 'text-blue-600' : 'text-gray-600'}`}>
              {s === 'watch' ? '⌚ Watch' : '✋ Manual'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-md font-medium text-gray-700 mb-2">Heart Rate (beats per minute)</Text>
      <TextInput
        className="border border-gray-300 rounded-xl p-4 text-[18px] mb-5"
        placeholder="e.g., 72"
        keyboardType="number-pad"
        value={heartRate}
        onChangeText={setHeartRate}
        maxLength={3}
      />

      <Text className="text-md font-medium text-gray-700 mb-2">Blood Oxygen (%)</Text>
      <TextInput
        className="border border-gray-300 rounded-xl p-4 text-[18px] mb-8"
        placeholder="e.g., 98"
        keyboardType="number-pad"
        value={spo2}
        onChangeText={setSpo2}
        maxLength={3}
      />

      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity
          className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
          onPress={onClose}
          disabled={loading}
        >
          <Text className="text-base font-medium text-gray-700">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-xl py-4 items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-base font-medium text-white">Save</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SleepForm({ mode, initialData, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [bedTime, setBedTime] = useState(
    initialData ? getTimeFromISO(initialData.sleep_start) : '22:00'
  );
  const [wakeTime, setWakeTime] = useState(
    initialData ? getTimeFromISO(initialData.sleep_end) : '07:00'
  );
  const [date, setDate] = useState(
    initialData ? initialData.sleep_start.split('T')[0] : yesterday
  );
  const [rating, setRating] = useState(
    initialData?.quality_score ? (initialData.quality_score * 2).toString() : '7'
  );
  const [loading, setLoading] = useState(false);

  const getDurationPreview = () => {
    if (!bedTime || !wakeTime) return null;
    const bedISO = toISODateTime(date, bedTime);
    let wakeISO = toISODateTime(date, wakeTime);
    if (new Date(wakeISO) <= new Date(bedISO)) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      wakeISO = toISODateTime(nextDay.toISOString().split('T')[0], wakeTime);
    }
    return calculateDurationMinutes(bedISO, wakeISO);
  };

  const handleSave = async () => {
    if (!bedTime || !wakeTime || !rating) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 10) {
      Alert.alert("Error", "Rating must be between 1 and 10");
      return;
    }

    let sleepStart = toISODateTime(date, bedTime);
    let sleepEnd = toISODateTime(date, wakeTime);
    if (new Date(sleepEnd) <= new Date(sleepStart)) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      sleepEnd = toISODateTime(nextDay.toISOString().split('T')[0], wakeTime);
    }

    const durationMinutes = calculateDurationMinutes(sleepStart, sleepEnd);
    if (durationMinutes < 30 || durationMinutes > 960) {
      Alert.alert("Error", "Sleep duration seems unusual. Please check your times.");
      return;
    }

    setLoading(true);
    try {
      await logSleepSession({
        sleepStart,
        sleepEnd,
        qualityScore: scaleTo5(ratingNum),
        interruptions: 0,
      });
      onSaved?.();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save sleep session");
    } finally {
      setLoading(false);
    }
  };

  const durationMins = getDurationPreview();
  const ratings = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        {mode === "edit" ? "Update Sleep" : "Log Sleep"}
      </Text>
      <Text className="text-base text-gray-500 mb-6">How did you sleep?</Text>

      {/* Night selector */}
      <Text className="text-md font-medium text-gray-700 mb-2">Night of</Text>
      <View className="flex-row gap-3 mb-6">
        {[
          { label: 'Last Night', value: yesterday },
          { label: 'Tonight (nap)', value: today },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setDate(opt.value)}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${
              date === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <Text className={date === opt.value ? 'text-blue-600 font-medium' : 'text-gray-600'}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Time pickers ── */}
      <View className="flex-row gap-4 mb-2">
        <View className="flex-1">
          <Text className="text-md font-medium text-gray-700 mb-2">Bedtime</Text>
          <TimePicker label="Bedtime" value={bedTime} onChange={setBedTime} />
        </View>
        <View className="flex-1">
          <Text className="text-md font-medium text-gray-700 mb-2">Wake Time</Text>
          <TimePicker label="Wake Time" value={wakeTime} onChange={setWakeTime} />
        </View>
      </View>

      {/* Duration preview */}
      {durationMins != null && durationMins > 0 && (
        <View className="bg-gray-50 rounded-xl p-4 mb-6 mt-3">
          <Text className="text-center text-gray-600 text-base">
            Duration:{' '}
            <Text className="font-bold text-gray-900">{formatDuration(durationMins)}</Text>
          </Text>
        </View>
      )}

      {/* Quality rating */}
      <Text className="text-md font-medium text-gray-700 mb-3">Sleep Quality (1-10)</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {ratings.map((num) => (
          <TouchableOpacity
            key={num}
            onPress={() => setRating(num.toString())}
            className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
              rating === num.toString()
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-200 bg-white'
            }`}
          >
            <Text className={`text-md ${rating === num.toString() ? 'text-white font-bold' : 'text-gray-700'}`}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity
          className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
          onPress={onClose}
          disabled={loading}
        >
          <Text className="text-base font-medium text-gray-700">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-xl py-4 items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text className="text-base font-medium text-white">Save</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ActivityForm({ mode, initialData, onClose, onSaved }) {
  const [activityName, setActivityName] = useState('');
  const [duration, setDuration] = useState(initialData?.duration_minutes?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!activityName.trim() || !duration) {
      Alert.alert("Error", "Please enter activity name and duration");
      return;
    }
    const durationNum = parseInt(duration);
    if (durationNum < 1 || durationNum > 480) {
      Alert.alert("Error", "Duration must be between 1 and 480 minutes");
      return;
    }
    setLoading(true);
    try {
      const endedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - durationNum * 60000).toISOString();
      await logActivity({ activityId: null, startedAt, endedAt, notes: activityName.trim() });
      onSaved?.();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save activity");
    } finally {
      setLoading(false);
    }
  };

  const quickDurations = [15, 30, 45, 60, 90, 120];

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        {mode === "edit" ? "Update Activity" : "Log Activity"}
      </Text>
      <Text className="text-base text-gray-500 mb-6">What did you do today?</Text>

      <Text className="text-md font-medium text-gray-700 mb-2">Activity Name</Text>
      <TextInput
        className="border border-gray-300 rounded-xl p-4 text-[18px] mb-5"
        placeholder="e.g., Walking, Swimming, Yoga"
        value={activityName}
        onChangeText={setActivityName}
        maxLength={50}
      />

      <Text className="text-md font-medium text-gray-700 mb-3">Duration (minutes)</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {quickDurations.map((mins) => (
          <TouchableOpacity
            key={mins}
            onPress={() => setDuration(mins.toString())}
            className={`px-4 py-2 rounded-full border-2 ${
              duration === mins.toString() ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <Text className={duration === mins.toString() ? 'text-blue-600 font-medium' : 'text-gray-600'}>
              {mins}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        className="border border-gray-300 rounded-xl p-4 text-lg mb-8"
        placeholder="Or enter custom duration"
        keyboardType="number-pad"
        value={duration}
        onChangeText={setDuration}
        maxLength={3}
      />

      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity className="flex-1 bg-gray-100 rounded-xl py-4 items-center" onPress={onClose} disabled={loading}>
          <Text className="text-base font-medium text-gray-700">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-xl py-4 items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-base font-medium text-white">Save</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function WellnessForm({ mode, initialData, onClose, onSaved }) {
  const [rating, setRating] = useState(
    initialData?.mood_score ? (initialData.mood_score * 2).toString() : '5'
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!rating) { Alert.alert("Error", "Please select a rating"); return; }
    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 10) { Alert.alert("Error", "Rating must be between 1 and 10"); return; }
    setLoading(true);
    try {
      await submitWellnessCheckin(scaleTo5(ratingNum), notes.trim() || null);
      onSaved?.();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save check-in");
    } finally {
      setLoading(false);
    }
  };

  const ratings = Array.from({ length: 10 }, (_, i) => i + 1);
  const getEmoji = (s) => s >= 9 ? '😄' : s >= 7 ? '🙂' : s >= 5 ? '😐' : s >= 3 ? '😕' : '😔';
  const getLabel = (s) => s >= 9 ? 'Excellent' : s >= 7 ? 'Good' : s >= 5 ? 'Okay' : s >= 3 ? 'Not great' : 'Struggling';

  return (
    <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        {mode === "edit" ? "Update Check-in" : "Daily Check-in"}
      </Text>
      <Text className="text-base text-gray-500 mb-6">How are you feeling today?</Text>

      <Text className="text-md font-medium text-gray-700 mb-3">Mood Rating (1-10)</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {ratings.map((num) => (
          <TouchableOpacity
            key={num}
            onPress={() => setRating(num.toString())}
            className={`w-12 h-12 rounded-full items-center justify-center border-2 ${
              rating === num.toString() ? 'border-blue-500 bg-blue-500' : 'border-gray-200 bg-white'
            }`}
          >
            <Text className={rating === num.toString() ? 'text-white font-bold' : 'text-gray-700'}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {rating && (
        <View className="bg-blue-50 rounded-xl p-4 mb-6 items-center">
          <Text className="text-4xl mb-1">{getEmoji(parseInt(rating))}</Text>
          <Text className="text-lg font-bold text-blue-600">{rating}/10</Text>
          <Text className="text-md text-blue-500">{getLabel(parseInt(rating))}</Text>
        </View>
      )}

      <Text className="text-md font-medium text-gray-700 mb-2">Notes (optional)</Text>
      <TextInput
        className="border border-gray-300 rounded-xl p-4 text-[18px] mb-8"
        placeholder="How are you feeling? Anything on your mind?"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        maxLength={200}
      />

      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity className="flex-1 bg-gray-100 rounded-xl py-4 items-center" onPress={onClose} disabled={loading}>
          <Text className="text-base font-medium text-gray-700">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-xl py-4 items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-base font-medium text-white">Save Check-in</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// MODAL CONTAINER
// ─────────────────────────────────────────────

export function HealthModal({ visible, config, onClose }) {
  if (!config) return null;
  const { type, mode, initialData, onSaved } = config;
  const MODALS = { biometrics: BiometricsForm, sleep: SleepForm, activity: ActivityForm, wellness: WellnessForm };
  const ActiveComponent = MODALS[type];
  if (!ActiveComponent) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center my-3" />
          <ActiveComponent
            mode={mode}
            initialData={initialData}
            onClose={onClose}
            onSaved={() => { onSaved?.(); onClose(); }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}