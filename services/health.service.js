import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Resolve the target elderly user_id.
 * - If the caller IS the elderly user  → use their own uid.
 * - If the caller is a caregiver        → pass elderlyUserId explicitly.
 */
function resolveUserId(elderlyUserId) {
  if (elderlyUserId) return elderlyUserId;
  const { data: { user } } = supabase.auth.getUser(); // sync snapshot
  return user?.id ?? null;
}

/**
 * Verify a caregiver has an active link with can_view_biometrics = true.
 * Returns true if the current user IS the elderly user (no check needed).
 */
async function assertBiometricAccess(elderlyUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  if (user.id === elderlyUserId) return; // own data, always allowed

  const { data, error } = await supabase
    .from('caregiver_elderly_links')
    .select('link_id')
    .eq('caregiver_user_id', user.id)
    .eq('elderly_user_id', elderlyUserId)
    .eq('status', 'active')
    .eq('can_view_biometrics', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Access denied: no active biometric permission for this user');
}


// ─────────────────────────────────────────────
// 1. BIOMETRIC READINGS  (heart_rate | spo2)
// ─────────────────────────────────────────────

/**
 * Log a new biometric reading (elderly user logs their own).
 * @param {'heart_rate'|'spo2'} metricType
 * @param {number} value
 * @param {string} [source]  e.g. 'manual', 'smartwatch'
 */
export async function logBiometricReading(metricType, value, source = 'manual') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('biometric_readings')
    .insert({
      user_id: user.id,
      metric_type: metricType,
      value,
      source,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch biometric readings for an elderly user.
 * Caregiver must have can_view_biometrics = true.
 * @param {string} elderlyUserId
 * @param {'heart_rate'|'spo2'|null} metricType  pass null for both
 * @param {number} limit
 */
export async function getBiometricReadings(elderlyUserId, metricType = null, limit = 50) {
  await assertBiometricAccess(elderlyUserId);

  let query = supabase
    .from('biometric_readings')
    .select('*')
    .eq('user_id', elderlyUserId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (metricType) query = query.eq('metric_type', metricType);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Latest single reading of each metric type for a quick dashboard card.
 */
export async function getLatestBiometrics(elderlyUserId) {
  await assertBiometricAccess(elderlyUserId);

  const [heartRate, spo2] = await Promise.all([
    supabase
      .from('biometric_readings')
      .select('*')
      .eq('user_id', elderlyUserId)
      .eq('metric_type', 'heart_rate')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('biometric_readings')
      .select('*')
      .eq('user_id', elderlyUserId)
      .eq('metric_type', 'spo2')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (heartRate.error) throw heartRate.error;
  if (spo2.error) throw spo2.error;

  return {
    heart_rate: heartRate.data,
    spo2: spo2.data,
  };
}


// ─────────────────────────────────────────────
// 2. SLEEP SESSIONS
// ─────────────────────────────────────────────

/**
 * Start a new sleep session (records sleep_start, leaves sleep_end null).
 */
export async function startSleepSession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sleep_sessions')
    .insert({
      user_id: user.id,
      sleep_start: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * End an open sleep session.
 * @param {string} sessionId
 * @param {number|null} qualityScore  1–5 or null
 * @param {number} interruptions
 */
export async function endSleepSession(sessionId, qualityScore = null, interruptions = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sleep_sessions')
    .update({
      sleep_end: new Date().toISOString(),
      quality_score: qualityScore,
      interruptions,
    })
    .eq('session_id', sessionId)
    .eq('user_id', user.id)   // safety: only own session
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Log a complete sleep session in one call (when tracked externally).
 */
export async function logSleepSession({ sleepStart, sleepEnd, qualityScore = null, interruptions = 0 }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sleep_sessions')
    .insert({
      user_id: user.id,
      sleep_start: sleepStart,
      sleep_end: sleepEnd,
      quality_score: qualityScore,
      interruptions,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch sleep sessions. Duration is computed client-side from sleep_start / sleep_end.
 * @param {string} elderlyUserId
 * @param {number} limit
 */
export async function getSleepSessions(elderlyUserId, limit = 30) {
  await assertBiometricAccess(elderlyUserId);

  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('*')
    .eq('user_id', elderlyUserId)
    .order('sleep_start', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Attach computed duration_minutes (avoids storing derived data per 3NF schema)
  return data.map(s => ({
    ...s,
    duration_minutes: s.sleep_end
      ? Math.round((new Date(s.sleep_end) - new Date(s.sleep_start)) / 60000)
      : null,
  }));
}


// ─────────────────────────────────────────────
// 3. ACTIVITY LOGS
// ─────────────────────────────────────────────

/**
 * Fetch the library of available physical activities.
 */
export async function getPhysicalActivities() {
  const { data, error } = await supabase
    .from('physical_activities')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}

/**
 * Start an activity session.
 * @param {string|null} activityId  null for a free-form/custom activity
 */
export async function startActivityLog(activityId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      activity_id: activityId,
      started_at: new Date().toISOString(),
      completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete an activity log.
 * @param {string} logId
 * @param {string|null} notes
 */
export async function completeActivityLog(logId, notes = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const endedAt = new Date().toISOString();

  // Fetch started_at to compute duration
  const { data: existing, error: fetchErr } = await supabase
    .from('activity_logs')
    .select('started_at')
    .eq('log_id', logId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr) throw fetchErr;

  const durationMinutes = Math.round(
    (new Date(endedAt) - new Date(existing.started_at)) / 60000
  );

  const { data, error } = await supabase
    .from('activity_logs')
    .update({
      ended_at: endedAt,
      duration_minutes: durationMinutes,
      completed: true,
      notes,
    })
    .eq('log_id', logId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Log a completed activity in one call.
 */
export async function logActivity({ activityId = null, startedAt, endedAt, notes = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const durationMinutes = endedAt
    ? Math.round((new Date(endedAt) - new Date(startedAt)) / 60000)
    : null;

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      activity_id: activityId,
      started_at: startedAt,
      ended_at: endedAt,
      duration_minutes: durationMinutes,
      completed: !!endedAt,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch activity logs for an elderly user (caregiver-accessible).
 */
export async function getActivityLogs(elderlyUserId, limit = 30) {
  await assertBiometricAccess(elderlyUserId);

  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      physical_activities (name, difficulty, duration_minutes)
    `)
    .eq('user_id', elderlyUserId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}


// ─────────────────────────────────────────────
// 4. WELLNESS CHECK-INS
// ─────────────────────────────────────────────

/**
 * Submit a daily wellness check-in.
 * Enforces one check-in per day via upsert on (user_id, checkin_date).
 * @param {1|2|3|4|5} moodScore
 * @param {string|null} notes
 */
export async function submitWellnessCheckin(moodScore, notes = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (moodScore < 1 || moodScore > 5) throw new Error('mood_score must be between 1 and 5');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if one already exists today
  const { data: existing } = await supabase
    .from('wellness_checkins')
    .select('checkin_id')
    .eq('user_id', user.id)
    .eq('checkin_date', today)
    .maybeSingle();

  if (existing) {
    // Update today's check-in
    const { data, error } = await supabase
      .from('wellness_checkins')
      .update({ mood_score: moodScore, notes })
      .eq('checkin_id', existing.checkin_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('wellness_checkins')
    .insert({
      user_id: user.id,
      mood_score: moodScore,
      notes,
      checkin_date: today,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get today's check-in for the current elderly user (to prefill the form).
 */
export async function getTodayCheckin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('wellness_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('checkin_date', today)
    .maybeSingle();

  if (error) throw error;
  return data; // null if not yet submitted today
}

/**
 * Fetch wellness check-in history.
 * Caregiver-accessible via biometric permission.
 * @param {string} elderlyUserId
 * @param {number} limit
 */
export async function getWellnessCheckins(elderlyUserId, limit = 30) {
  await assertBiometricAccess(elderlyUserId);

  const { data, error } = await supabase
    .from('wellness_checkins')
    .select('*')
    .eq('user_id', elderlyUserId)
    .order('checkin_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Fetch a weekly mood summary (avg score per day) for charting.
 * @param {string} elderlyUserId
 */
export async function getWeeklyMoodSummary(elderlyUserId) {
  await assertBiometricAccess(elderlyUserId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fromDate = sevenDaysAgo.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('wellness_checkins')
    .select('checkin_date, mood_score')
    .eq('user_id', elderlyUserId)
    .gte('checkin_date', fromDate)
    .order('checkin_date', { ascending: true });

  if (error) throw error;
  return data;
}