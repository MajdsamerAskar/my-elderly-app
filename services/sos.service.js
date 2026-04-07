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
 
  // We don't await this because a failed log shouldn't stop an emergency call.
  logSOSEvent(elderlyUserId).catch(err => console.error("SOS Log failed:", err));
  let caregiver = null;
  // 2. Safely try to get the caregiver
  try {
    caregiver = await getCaregiverPhone(elderlyUserId);
  } catch (error) {
    // If the database or network fails, we catch the error, 
    // leave caregiver as null, and let the code fall back to 911.
    console.error("Failed to fetch caregiver, defaulting to 911:", error);
  }

  // Use standard 'tel:' so it works on both iOS and Android
  const callPrefix = 'tel:';

  if (caregiver && caregiver.phone_number) {
    try {
      await Linking.openURL(`${callPrefix}${caregiver.phone_number}`);
      return {
        calledNumber: caregiver.phone_number,
        calledName: caregiver.first_name,
        type: 'caregiver',
      };
    } catch (error) {
      console.error("Failed to open dialer for caregiver", error);
    
    }
  } 
  
 
  try {
    await Linking.openURL(`${callPrefix}911`);
    return {
      calledNumber: '911',
      calledName: 'Emergency Services',
      type: 'emergency',
    };
  } catch (error) {
    console.error("CRITICAL: Failed to open dialer for 911", error);
    
    return null; 
  }
}