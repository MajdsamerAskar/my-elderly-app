import { supabase } from '../lib/supabase'

// ─── Get Linked Elderly People ────────────────────────────────────────────────
export async function getLinkedElderly(caregiverUserId) {
  const { data, error } = await supabase
    .from('caregiver_elderly_links')
    .select(`
      elderly_user_id,
      status,
      can_view_location,
      can_view_biometrics,
      can_view_medications,
      users!caregiver_elderly_links_elderly_user_id_fkey (
        user_id,
        first_name,
        last_name,
        phone_number,
        date_of_birth
      )
    `)
    .eq('caregiver_user_id', caregiverUserId)
    .eq('status', 'active')

  if (error) throw error

  return data?.map((link) => ({
    ...link.users,
    can_view_location: link.can_view_location,
    can_view_biometrics: link.can_view_biometrics,
    can_view_medications: link.can_view_medications,
  })) || []
}

// ─── Get Today's SOS History ──────────────────────────────────────────────────
export async function getSOSHistory(caregiverUserId) {
  // Get all elderly linked to this caregiver
  const { data: links, error: linkError } = await supabase
    .from('caregiver_elderly_links')
    .select('elderly_user_id')
    .eq('caregiver_user_id', caregiverUserId)
    .eq('status', 'active')

  if (linkError || !links?.length) return []

  const elderlyIds = links.map((l) => l.elderly_user_id)

  // Get today's SOS events for all linked elderly
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('sos_events')
    .select(`
      sos_id,
      trigger_type,
      triggered_at,
      resolved_at,
      users!sos_events_user_id_fkey (
        first_name,
        last_name,
        phone_number
      )
    `)
    .in('user_id', elderlyIds)
    .gte('triggered_at', today.toISOString())
    .order('triggered_at', { ascending: false })

  if (error) throw error

  return data?.map((sos) => ({
    ...sos,
    ...sos.users,
  })) || []
}

// ─── Get Pending Medications ──────────────────────────────────────────────────
export async function getPendingMedications(caregiverUserId) {
  const { data: links, error: linkError } = await supabase
    .from('caregiver_elderly_links')
    .select('elderly_user_id')
    .eq('caregiver_user_id', caregiverUserId)
    .eq('status', 'active')

  if (linkError || !links?.length) return []

  const elderlyIds = links.map((l) => l.elderly_user_id)

  const today = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayName = dayNames[today.getDay()]

  const { data, error } = await supabase
    .from('medications')
    .select(`
      medication_id,
      name,
      dosage,
      users!medications_user_id_fkey (
        first_name,
        last_name
      ),
      medication_schedules (
        schedule_id,
        scheduled_time,
        medication_schedule_days (
          day_of_week
        )
      )
    `)
    .in('user_id', elderlyIds)
    .eq('is_active', true)

  if (error) throw error

  const pending = []
  data?.forEach((med) => {
    med.medication_schedules?.forEach((schedule) => {
      const isToday = schedule.medication_schedule_days?.some(
        (d) => d.day_of_week === todayName
      )
      if (isToday) {
        pending.push({
          medication_id: med.medication_id,
          name: med.name,
          dosage: med.dosage,
          scheduled_time: schedule.scheduled_time,
          first_name: med.users?.first_name,
          last_name: med.users?.last_name,
        })
      }
    })
  })

  return pending
}
export async function searchElderly(query) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, first_name, last_name, phone_number')
    .eq('role', 'elderly')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
    .limit(10)

  if (error) throw error
  return data || []
}

// ─── Send Link Request ────────────────────────────────────────────────────────
export async function sendLinkRequest(caregiverUserId, elderlyUserId) {
  // Check if a link already exists
  const { data: existing } = await supabase
    .from('caregiver_elderly_links')
    .select('status')
    .eq('caregiver_user_id', caregiverUserId)
    .eq('elderly_user_id', elderlyUserId)
    .single()

  if (existing) {
    if (existing.status === 'active') throw new Error('Already linked')
    if (existing.status === 'pending') throw new Error('Request already sent')
  }

  const { error } = await supabase
    .from('caregiver_elderly_links')
    .insert({
      caregiver_user_id: caregiverUserId,
      elderly_user_id: elderlyUserId,
      status: 'pending',
    })

  if (error) throw error
}

// ─── Get Pending Requests (for elderly) ──────────────────────────────────────
export async function getPendingRequests(elderlyUserId) {
  const { data, error } = await supabase
    .from('caregiver_elderly_links')
    .select(`
      link_id,
      users!caregiver_elderly_links_caregiver_user_id_fkey (
        user_id,
        first_name,
        last_name,
        phone_number
      )
    `)
    .eq('elderly_user_id', elderlyUserId)
    .eq('status', 'pending')

  if (error) throw error
  return data?.map(d => ({ link_id: d.link_id, ...d.users })) || []
}

// ─── Accept or Decline Link Request ──────────────────────────────────────────
export async function respondToLinkRequest(linkId, accept) {
  const { error } = await supabase
    .from('caregiver_elderly_links')
    .update({
      status: accept ? 'active' : 'declined',
      can_view_location: accept,
      can_view_biometrics: accept,
      can_view_medications: accept,
      authorized_at: accept ? new Date().toISOString() : null,
      revoked_at: accept ? null : new Date().toISOString(),
    })
    .eq('link_id', linkId)

  if (error) throw error
}