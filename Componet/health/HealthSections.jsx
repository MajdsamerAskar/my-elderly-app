import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import {
  getLatestBiometrics,
  getSleepSessions,
  getActivityLogs,
  getTodayCheckin,
} from "../../services/health.service";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function isToday(isoString) {
  if (!isoString) return false;
  const today = new Date().toISOString().split("T")[0];
  return isoString.startsWith(today);
}

export function isLastNight(isoString) {
  if (!isoString) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];
  return isoString.startsWith(yesterdayStr) || isoString.startsWith(todayStr);
}

export function formatTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(minutes) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hours`;
  return `${h} hours ${m} minutes`;
}

export function scaleTo10(value) {
  return value * 2;
}

export const QUALITY_LABELS = { 1: "Poor", 2: "Okay", 3: "Good", 4: "Great", 5: "Excellent" };

export const MOOD_LABELS_5 = {
  1: "Very low",
  2: "Low", 
  3: "Okay",
  4: "Good",
  5: "Very good",
};

// ─────────────────────────────────────────────
// SHARED PRIMITIVES (All text +2px)
// ─────────────────────────────────────────────

export function Section({ children }) {
  return (
    <View className="mb-6 rounded-2xl border border-gray-200 overflow-hidden bg-white">
      {children}
    </View>
  );
}

export function SectionHeader({ title, buttonLabel, onPress }) {
  // Always blue outline variant - hardcoded
  return (
    <View className="flex-row items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
      <Text className="text-2xl font-medium text-gray-900">{title}</Text>
      {buttonLabel && (
        <TouchableOpacity 
          className="px-4 py-2.5 rounded-xl border border-blue-600 bg-white" 
          onPress={onPress} 
          activeOpacity={0.7}
        >
          <Text className="text-lg font-semibold text-blue-600">{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Divider() {
  return <View className="h-px bg-gray-200 my-4" />;
}

export function DataRow({ label, value, unit }) {
  return (
    <View className="flex-row items-baseline justify-between mt-4">
      <Text className="text-lg text-gray-500 flex-1 pr-4">{label}</Text>
      <Text className="text-2xl font-medium text-gray-900">
        {value}
        {unit ? <Text className="text-lg font-normal text-gray-500"> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function RecordedAt({ isoString, label = "Recorded today at" }) {
  return (
    <Text className="text-[16px] text-gray-400 mt-2 mb-2 pt-4 border-t border-gray-200">
      {label} {formatTime(isoString)}
    </Text>
  );
}

export function Pill({ label }) {
  return (
    <View className="self-start px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200">
      <Text className="text-lg font-medium text-blue-500">{label}</Text>
    </View>
  );
}

export function EmptyState({ message, sub, buttonLabel, onPress }) {
  return (
    <View className="items-center px-6 py-10 gap-3">
      <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-1">
        <Text className="text-2xl text-gray-300">—</Text>
      </View>
      <Text className="text-2xl text-gray-500 text-center">{message}</Text>
      <Text className="text-lg text-gray-400 text-center">{sub}</Text>
      <TouchableOpacity
        className="mt-3 w-full bg-blue-500 rounded-xl py-5 items-center"
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text className="text-xl font-medium text-white">{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SectionLoader() {
  return (
    <View className="py-12 items-center justify-center">
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

export function SectionError({ message, onRetry }) {
  return (
    <View className="px-5 py-8 items-center gap-3">
      <Text className="text-lg text-gray-500 text-center">{message}</Text>
      <TouchableOpacity
        className="px-6 py-3 rounded-xl border-2 border-blue-500 bg-white"
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <Text className="text-lg font-semibold text-blue-600">Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// SECTIONS (All text +2px, always blue outline buttons)
// ─────────────────────────────────────────────

export function BiometricsSection({ userId, onLog }) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setData(undefined);
    try {
      const latest = await getLatestBiometrics(userId);
      const filtered = {
        heart_rate: isToday(latest.heart_rate?.recorded_at) ? latest.heart_rate : null,
        spo2: isToday(latest.spo2?.recorded_at) ? latest.spo2 : null,
      };
      setData(filtered);
    } catch (e) {
      setError(e.message ?? "Could not load biometrics");
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const hasReading = !!(data?.heart_rate || data?.spo2);

  const handleOpen = () => {
    onLog({
      type: "biometrics",
      mode: hasReading ? "edit" : "create",
      userId,   
      initialData: data,
      onSaved: load,
    });
  };

  return (
    <Section>
      <SectionHeader
        title="Biometrics"
        buttonLabel={hasReading ? "Update readings" : "Log readings"}
        onPress={handleOpen}
      />

      {data === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {data !== undefined && !error && !hasReading && (
        <EmptyState
          message="No readings recorded today"
          sub="Tap below to enter your readings"
          buttonLabel="Log readings"
          onPress={handleOpen}
        />
      )}

      {data !== undefined && !error && hasReading && (
        <View className="px-5 py-5">
          {data.heart_rate && (
            <>
              <DataRow label="Heart rate (beats per minute)" value={data.heart_rate.value} unit="bpm" />
              <Divider />
            </>
          )}
          {data.spo2 && <DataRow label="Blood oxygen (percentage)" value={data.spo2.value} unit="%" />}
          <RecordedAt isoString={data.heart_rate?.recorded_at ?? data.spo2?.recorded_at} />
        </View>
      )}
    </Section>
  );
}

export function SleepSection({ userId, onLog }) {
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setSession(undefined);
    try {
      const sessions = await getSleepSessions(userId, 1);
      const latest = sessions[0] ?? null;
      setSession(latest && isLastNight(latest.sleep_start) ? latest : null);
    } catch (e) {
      setError(e.message ?? "Could not load sleep data");
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const hasSession = !!session;

  const handleOpen = () => {
    onLog({
      type: "sleep",
      mode: hasSession ? "edit" : "create",
      userId,
      initialData: session,
      onSaved: load,
    });
  };

  return (
    <Section>
      <SectionHeader
        title="Sleep"
        buttonLabel={hasSession ? "Update sleep" : "Log sleep"}
        onPress={handleOpen}
      />

      {session === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {session === null && !error && (
        <EmptyState
          message="No sleep recorded yet"
          sub="Tap below to log last night's sleep"
          buttonLabel="Log sleep"
          onPress={handleOpen}
        />
      )}

      {session && !error && (
        <View className="px-5 py-5">
          <DataRow label="Duration" value={formatDuration(session.duration_minutes)} />
          {session.quality_score != null && (
            <>
              <Divider />
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-lg text-gray-500">Quality Rating</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-bold text-blue-500">{scaleTo10(session.quality_score)}/10</Text>
                  <Pill label={QUALITY_LABELS[session.quality_score]} />
                </View>
              </View>
            </>
          )}
          <Divider />
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-gray-500">Bedtime</Text>
            <Text className="text-lg font-medium text-gray-900">{formatTime(session.sleep_start)}</Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-lg text-gray-500">Wake time</Text>
            <Text className="text-lg font-medium text-gray-900">{formatTime(session.sleep_end)}</Text>
          </View>
          <RecordedAt isoString={session.sleep_start} label="Logged" />
        </View>
      )}
    </Section>
  );
}

export function ActivitySection({ userId, onLog }) {
  const [log, setLog] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setLog(undefined);
    try {
      const logs = await getActivityLogs(userId, 1);
      const latest = logs[0] ?? null;
      setLog(latest && isToday(latest.started_at) ? latest : null);
    } catch (e) {
      setError(e.message ?? "Could not load activity data");
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const hasLog = !!log;
  const activityName = log?.physical_activities?.name ?? log?.notes ?? "Activity";

  const handleOpen = () => {
    onLog({
      type: "activity",
      mode: hasLog ? "edit" : "create",
      userId,
      initialData: log,
      onSaved: load,
    });
  };

  return (
    <Section>
      <SectionHeader
        title="Activity"
        buttonLabel={hasLog ? "Update activity" : "Log activity"}
        onPress={handleOpen}
      />

      {log === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {log === null && !error && (
        <EmptyState
          message="No activity logged yet today"
          sub="Tap below to record what you have done"
          buttonLabel="Log today's activity"
          onPress={handleOpen}
        />
      )}

      {log && !error && (
        <View className="px-5 py-5">
          <DataRow label="Activity" value={activityName} />
          <Divider />
          <DataRow label="Duration" value={formatDuration(log.duration_minutes)} />
          <RecordedAt isoString={log.started_at} />
        </View>
      )}
    </Section>
  );
}

export function WellnessSection({ userId, onLog }) {
  const [checkin, setCheckin] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setCheckin(undefined);
    try {
      const today = await getTodayCheckin();
      setCheckin(today);
    } catch (e) {
      setError(e.message ?? "Could not load check-in");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasCheckin = !!checkin;

  const handleOpen = () => {
    onLog({
      type: "wellness",
      mode: hasCheckin ? "edit" : "create",
      userId,
      initialData: checkin,
      onSaved: load,
    });
  };

  return (
    <Section>
      <SectionHeader
        title="How are you feeling?"
        buttonLabel={hasCheckin ? "Update check-in" : "Check in now"}
        onPress={handleOpen}
      />

      {checkin === undefined && <SectionLoader />}
      {error && <SectionError message={error} onRetry={load} />}

      {checkin === null && !error && (
        <EmptyState
          message="No check-in yet today"
          sub="Let us know how you are doing"
          buttonLabel="Check in now"
          onPress={handleOpen}
        />
      )}

      {checkin && !error && (
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 items-center justify-center">
              <Text className="text-3xl">
                {checkin.mood_score >= 4 ? "🙂" : checkin.mood_score === 3 ? "😐" : "😔"}
              </Text>
            </View>
            <View className="flex-1 ml-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-medium text-gray-900">{scaleTo10(checkin.mood_score)}/10</Text>
                <Text className="text-lg text-gray-500">{MOOD_LABELS_5[checkin.mood_score]}</Text>
              </View>
              <Text className="text-lg text-gray-500 mt-1">
                {checkin.mood_score >= 4 ? "Feeling great today" :
                 checkin.mood_score === 3 ? "Getting through it" : "Not feeling great"}
              </Text>
            </View>
          </View>
          {checkin.notes && (
            <>
              <Divider />
              <Text className="text-lg text-gray-500 leading-relaxed">{checkin.notes}</Text>
            </>
          )}
          <RecordedAt className="my-4" isoString={checkin.checkin_date + "T00:00:00"} label="Checked in today at" />
        </View>
      )}
    </Section>
  );
}