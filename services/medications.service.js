import { supabase } from '../lib/supabase'
import * as ImagePicker from 'expo-image-picker'

// ─── Get Today's Medications ──────────────────────────────────────────────────
export async function getTodayMedications(userId) {
  const today = new Date()
  // DB enum uses uppercase: MON, TUE, WED, THU, FRI, SAT, SUN
  const dayEnums = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const todayEnum = dayEnums[today.getDay()]

  const { data: medications, error } = await supabase
    .from('medications')
    .select(`
      medication_id,
      name,
      dosage,
      instructions,
      purpose,
      photo_url,
      medication_schedules (
        schedule_id,
        scheduled_time,
        medication_schedule_days (
          day_of_week
        ),
        medication_logs (
          log_id,
          status,
          confirmed_at,
          photo_url,
          due_at
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayMeds = []
  medications?.forEach((med) => {
    med.medication_schedules?.forEach((schedule) => {
      const isToday = schedule.medication_schedule_days?.some(
        (d) => d.day_of_week === todayEnum
      )
      if (!isToday) return

      // Find today's log for this schedule (if any)
      const todayLog = schedule.medication_logs?.find((log) => {
        const logDate = new Date(log.due_at)
        return logDate >= todayStart && logDate <= todayEnd
      })

      todayMeds.push({
        medication_id: med.medication_id,
        name: med.name,
        dosage: med.dosage,
        instructions: med.instructions,
        purpose: med.purpose,
        photo_url: med.photo_url || null,
        schedule_id: schedule.schedule_id,
        scheduled_time: schedule.scheduled_time,
        log: todayLog || null,
        status: todayLog?.status || 'pending',
      })
    })
  })

  // Sort by scheduled_time
  todayMeds.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))

  return todayMeds
}

// ─── Get All Medications for User ────────────────────────────────────────────
export async function getAllMedications(userId) {
  const { data, error } = await supabase
    .from('medications')
    .select(`
      *,
      medication_schedules (
        schedule_id,
        scheduled_time,
        start_date,
        end_date,
        medication_schedule_days (
          day_id,
          day_of_week
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// ─── Add New Medication with Schedule ────────────────────────────────────────
export async function addMedication(userId, medicationData) {
  // medicationData: { name, purpose, dosage, instructions, scheduledTime, daysOfWeek: ['MON','WED',...], photoUri? }

  let photo_url = null

  // Upload photo if provided — failure is non-blocking, medication saves anyway
  if (medicationData.photoUri) {
    try {
      photo_url = await uploadMedicationPhoto(medicationData.photoUri, userId)
    } catch (e) {
      console.warn('Photo upload failed, saving without photo:', e.message)
    }
  }

  // 1. Insert medication
  const { data: med, error: medError } = await supabase
    .from('medications')
    .insert({
      user_id: userId,
      name: medicationData.name,
      purpose: medicationData.purpose || null,
      dosage: medicationData.dosage || null,
      instructions: medicationData.instructions || null,
      photo_url,
      is_active: true,
    })
    .select()
    .single()

  if (medError) throw medError

  // 2. Insert schedule if time + days provided
  if (medicationData.scheduledTime && medicationData.daysOfWeek?.length > 0) {
    const { data: schedule, error: schedError } = await supabase
      .from('medication_schedules')
      .insert({
        medication_id: med.medication_id,
        scheduled_time: medicationData.scheduledTime, // 'HH:MM:SS'
        start_date: new Date().toISOString().split('T')[0],
        reminder_offset_min: medicationData.reminderOffsetMin || 0,
      })
      .select()
      .single()

    if (schedError) throw schedError

    // 3. Insert days
    const dayRows = medicationData.daysOfWeek.map((day) => ({
      schedule_id: schedule.schedule_id,
      day_of_week: day,
    }))

    const { error: daysError } = await supabase
      .from('medication_schedule_days')
      .insert(dayRows)

    if (daysError) throw daysError
  }

  return med
}

// ─── Edit Medication ──────────────────────────────────────────────────────────
export async function editMedication(medicationId, userId, medicationData) {
  // medicationData: { name, purpose, dosage, instructions, scheduledTime, daysOfWeek, photoUri? }

  let photo_url = undefined // undefined = don't change it

  if (medicationData.photoUri && medicationData.photoUri.startsWith('file')) {
    // New local photo selected — upload it
    try {
      photo_url = await uploadMedicationPhoto(medicationData.photoUri, userId)
    } catch (e) {
      console.warn('Photo upload failed, keeping existing photo:', e.message)
    }
  }

  // Build update payload
  const updatePayload = {
    name: medicationData.name,
    purpose: medicationData.purpose || null,
    dosage: medicationData.dosage || null,
    instructions: medicationData.instructions || null,
  }
  if (photo_url !== undefined) updatePayload.photo_url = photo_url

  const { error: medError } = await supabase
    .from('medications')
    .update(updatePayload)
    .eq('medication_id', medicationId)

  if (medError) throw medError

  // Replace schedules: delete existing, re-insert if provided
  if (medicationData.scheduledTime && medicationData.daysOfWeek?.length > 0) {
    // Get existing schedule IDs
    const { data: existingSchedules } = await supabase
      .from('medication_schedules')
      .select('schedule_id')
      .eq('medication_id', medicationId)

    if (existingSchedules?.length) {
      const ids = existingSchedules.map(s => s.schedule_id)
      // Days cascade-delete with schedule, so just delete schedules
      await supabase.from('medication_schedules').delete().in('schedule_id', ids)
    }

    // Insert new schedule
    const { data: schedule, error: schedError } = await supabase
      .from('medication_schedules')
      .insert({
        medication_id: medicationId,
        scheduled_time: medicationData.scheduledTime,
        start_date: new Date().toISOString().split('T')[0],
        reminder_offset_min: medicationData.reminderOffsetMin || 0,
      })
      .select()
      .single()

    if (schedError) throw schedError

    const dayRows = medicationData.daysOfWeek.map((day) => ({
      schedule_id: schedule.schedule_id,
      day_of_week: day,
    }))

    const { error: daysError } = await supabase
      .from('medication_schedule_days')
      .insert(dayRows)

    if (daysError) throw daysError
  }
}

// ─── Remove (soft-delete) Medication ─────────────────────────────────────────
export async function removeMedication(medicationId) {
  const { error } = await supabase
    .from('medications')
    .update({ is_active: false })
    .eq('medication_id', medicationId)

  if (error) throw error
}

// ─── Mark Medication as Taken (with optional photo) ──────────────────────────
export async function markMedicationTaken(scheduleId, photoUri = null) {
  let photo_url = null

  if (photoUri) {
    // Upload confirmation photo
    const fileName = `confirmations/${scheduleId}_${Date.now()}.jpg`
    const response = await fetch(photoUri)
    const blob = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('medication-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('medication-photos')
        .getPublicUrl(fileName)
      photo_url = urlData.publicUrl
    }
  }

  const { error } = await supabase.from('medication_logs').insert({
    schedule_id: scheduleId,
    due_at: new Date().toISOString(),
    status: 'taken',
    confirmed_at: new Date().toISOString(),
    confirmation_method: photoUri ? 'photo' : 'manual',
    photo_url,
  })

  if (error) throw error
}

// ─── Upload Medication Reference Photo ───────────────────────────────────────
export async function uploadMedicationPhoto(localUri, userId) {
  const fileName = `medications/${userId}_${Date.now()}.jpg`

  const response = await fetch(localUri)
  const blob = await response.blob()

  const { error } = await supabase.storage
    .from('medication-photos')
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })

  if (error) {
    // Bucket may not exist yet — caller handles gracefully
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  const { data } = supabase.storage
    .from('medication-photos')
    .getPublicUrl(fileName)

  return data.publicUrl
}

// ─── Pick Image from Library ──────────────────────────────────────────────────
export async function pickMedicationImage() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') throw new Error('Gallery permission denied')

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })

  if (result.canceled) return null
  return result.assets[0].uri
}

// ─── Take Photo with Camera ───────────────────────────────────────────────────
export async function takeMedicationPhoto() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') throw new Error('Camera permission denied')

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })

  if (result.canceled) return null
  return result.assets[0].uri
}