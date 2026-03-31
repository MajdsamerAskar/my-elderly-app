import { supabase } from '../lib/supabase'
import { Linking } from 'react-native'

// ─── Get Caregiver Phone Number ───────────────────────────────────────────────
export async function getCaregiverPhone(elderlyUserId) {
  // Get the linked caregiver for this elderly person
  const { data: link, error: linkError } = await supabase
    .from('caregiver_elderly_links')
    .select('caregiver_user_id')
    .eq('elderly_user_id', elderlyUserId)
    .eq('status', 'active')
    .single()

  if (linkError || !link) return null

  // Get caregiver phone number from users table
  const { data: caregiver, error: caregiverError } = await supabase
    .from('users')
    .select('phone_number, first_name')
    .eq('user_id', link.caregiver_user_id)
    .single()

  if (caregiverError || !caregiver) return null

  return caregiver
}

// ─── Log SOS Event ────────────────────────────────────────────────────────────
export async function logSOSEvent(elderlyUserId) {
  const { data, error } = await supabase.from('sos_events').insert({
    user_id: elderlyUserId,
    trigger_type: 'manual',
    triggered_at: new Date().toISOString(),
    server_received_at: new Date().toISOString(),
  }).select().single()

  if (error) throw error
  return data
}

// ─── Trigger Full SOS ─────────────────────────────────────────────────────────
export async function triggerSOS(elderlyUserId) {
  // 1. Log SOS event first
  await logSOSEvent(elderlyUserId)

  // 2. Try to get caregiver
  const caregiver = await getCaregiverPhone(elderlyUserId)

  if (caregiver && caregiver.phone_number) {
    // Call caregiver
    await Linking.openURL(`telprompt:${caregiver.phone_number}`)
    return {
      calledNumber: caregiver.phone_number,
      calledName: caregiver.first_name,
      type: 'caregiver',
    }
  } else {
    // No caregiver linked — call 911
    await Linking.openURL(`telprompt:911`)
    return {
      calledNumber: '911',
      calledName: 'Emergency Services',
      type: 'emergency',
    }
  }
}