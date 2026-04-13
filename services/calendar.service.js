import { supabase } from '../lib/supabase';

// ─── Fetch events for an elderly user within a month ─────────────────────────
export async function getEventsForMonth(elderlyUserId, year, month) {
  const start = new Date(year, month, 1).toISOString();
  const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      event_id,
      title,
      description,
      location,
      event_type,
      start_datetime,
      end_datetime,
      reminder_minutes,
      created_by,
      created_by_user:users!calendar_events_created_by_fkey (
        first_name,
        last_name,
        role
      )
    `)
    .eq('elderly_user_id', elderlyUserId)
    .gte('start_datetime', start)
    .lte('start_datetime', end)
    .order('start_datetime', { ascending: true });

  if (error) throw error;
  return data;
}

// ─── Fetch a single event by ID ───────────────────────────────────────────────
export async function getEventById(eventId) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      created_by_user:users!calendar_events_created_by_fkey (
        first_name,
        last_name,
        role
      )
    `)
    .eq('event_id', eventId)
    .single();

  if (error) throw error;
  return data;
}

// ─── Create a new event ───────────────────────────────────────────────────────
export async function createEvent({
  createdBy,
  elderlyUserId,
  title,
  description = null,
  location = null,
  eventType = 'other',
  startDatetime,
  endDatetime = null,
  reminderMinutes = null,
}) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      created_by: createdBy,
      elderly_user_id: elderlyUserId,
      title,
      description,
      location,
      event_type: eventType,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      reminder_minutes: reminderMinutes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Update an existing event ─────────────────────────────────────────────────
export async function updateEvent(eventId, updates) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('event_id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Delete an event ──────────────────────────────────────────────────────────
export async function deleteEvent(eventId) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
  return true;
}

// ─── Get upcoming events for the next N days (home screen widget) ─────────────
export async function getUpcomingEvents(elderlyUserId, days = 7) {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + days * 86400000).toISOString();

  const { data, error } = await supabase
    .from('calendar_events')
    .select('event_id, title, event_type, start_datetime, location')
    .eq('elderly_user_id', elderlyUserId)
    .gte('start_datetime', now)
    .lte('start_datetime', future)
    .order('start_datetime', { ascending: true })
    .limit(5);

  if (error) throw error;
  return data;
}