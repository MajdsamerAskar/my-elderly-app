import { supabase } from '../lib/supabase'

// ─── Get Today's Medications ──────────────────────────────────────────────────
export async function getTodayMedications(userId) {
  const today = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayName = dayNames[today.getDay()]

  // Get all active medications for this user
  const { data: medications, error } = await supabase
    .from('medications')
    .select(`
      medication_id,
      name,
      dosage,
      instructions,
      medication_schedules (
        schedule_id,
        scheduled_time,
        medication_schedule_days (
          day_of_week
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error

  // Filter medications scheduled for today
  const todayMeds = []
  medications?.forEach((med) => {
    med.medication_schedules?.forEach((schedule) => {
      const isToday = schedule.medication_schedule_days?.some(
        (d) => d.day_of_week === todayName
      )
      if (isToday) {
        todayMeds.push({
          medication_id: med.medication_id,
          name: med.name,
          dosage: med.dosage,
          instructions: med.instructions,
          schedule_id: schedule.schedule_id,
          scheduled_time: schedule.scheduled_time,
        })
      }
    })
  })

  return todayMeds
}

// ─── Mark Medication as Taken ─────────────────────────────────────────────────
export async function markMedicationTaken(scheduleId) {
  const { error } = await supabase.from('medication_logs').insert({
    schedule_id: scheduleId,
    due_at: new Date().toISOString(),
    status: 'taken',
    confirmed_at: new Date().toISOString(),
    confirmation_method: 'manual',
  })

  if (error) throw error
}

// ─── Get All Medications for User ────────────────────────────────────────────
export async function getAllMedications(userId) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ─── Add New Medication ───────────────────────────────────────────────────────
export async function addMedication(userId, medicationData) {
  const { data, error } = await supabase.from('medications').insert({
    user_id: userId,
    name: medicationData.name,
    purpose: medicationData.purpose,
    dosage: medicationData.dosage,
    instructions: medicationData.instructions,
    is_active: true,
  }).select().single()

  if (error) throw error
  return data
}