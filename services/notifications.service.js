import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// ─── Configure how notifications appear when app is in foreground ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ─── Request permissions ──────────────────────────────────────────────────────
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()

  if (existingStatus === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()

  if (status !== 'granted') {
    console.warn('Notification permission denied')
    return false
  }

  // Android requires a channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B6CA8',
      sound: true,
    })

    await Notifications.setNotificationChannelAsync('medications', {
      name: 'Medications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#E05C5C',
      sound: true,
    })
  }

  return true
}

// ─── Parse a time string like "2:00 PM" into today's Date ────────────────────
function parseTimeToDate(timeStr, dayOffset = 0) {
  if (!timeStr) return null

  const now = new Date()

  // Handle "today" / "tomorrow" suffixes e.g. "2:00 PM today"
  let cleanTime = timeStr.toLowerCase()
  if (cleanTime.includes('tomorrow')) dayOffset += 1
  cleanTime = cleanTime.replace('today', '').replace('tomorrow', '').trim()

  // Match "2:00 PM" or "14:00"
  const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})$/)

  let hours, minutes

  if (match12) {
    hours   = parseInt(match12[1], 10)
    minutes = parseInt(match12[2], 10)
    const period = match12[3].toLowerCase()
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
  } else if (match24) {
    hours   = parseInt(match24[1], 10)
    minutes = parseInt(match24[2], 10)
  } else {
    return null
  }

  const date = new Date(now)
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hours, minutes, 0, 0)

  return date
}

// ─── MEDICATION NOTIFICATIONS ─────────────────────────────────────────────────

/**
 * Schedule a notification for a medication dose.
 * Returns the notification identifier (store this to cancel later).
 *
 * @param {object} med   - { id, name, purpose, frequency, nextDose }
 * @returns {string|null} notificationId
 */
export async function scheduleMedicationReminder(med) {
  const hasPermission = await requestNotificationPermissions()
  if (!hasPermission) return null

  // Cancel any existing notification for this medication first
  await cancelMedicationReminder(med.id)

  const fireDate = parseTimeToDate(med.nextDose)
  if (!fireDate || fireDate <= new Date()) {
    console.warn(`Could not schedule notification for ${med.name} — time is in the past or invalid.`)
    return null
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 Time to take ${med.name}`,
      body: `${med.purpose} · ${med.frequency}`,
      data: { type: 'medication', medicationId: med.id },
      sound: true,
      // Android channel
      ...(Platform.OS === 'android' && { channelId: 'medications' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    },
  })

  console.log(`Scheduled medication reminder for ${med.name} at ${fireDate.toLocaleTimeString()} → id: ${notificationId}`)
  return notificationId
}

/**
 * Schedule a repeating daily notification for a medication.
 * Useful for "Once daily", "Twice daily" etc.
 *
 * @param {object} med   - medication object
 * @param {number} hour  - 24h hour
 * @param {number} minute
 * @returns {string|null} notificationId
 */
export async function scheduleDailyMedicationReminder(med, hour, minute) {
  const hasPermission = await requestNotificationPermissions()
  if (!hasPermission) return null

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 Time to take ${med.name}`,
      body: `${med.purpose}`,
      data: { type: 'medication', medicationId: med.id },
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'medications' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  })

  return notificationId
}

/**
 * Cancel a scheduled medication reminder by medication id.
 * Relies on the notification data.medicationId field.
 */
export async function cancelMedicationReminder(medicationId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel  = scheduled.filter(
    n => n.content.data?.type === 'medication' && n.content.data?.medicationId === medicationId
  )
  await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)))
}

// ─── EVENT NOTIFICATIONS ──────────────────────────────────────────────────────

/**
 * Schedule a reminder for an event — fires 1 hour before and 15 minutes before.
 *
 * @param {object} event  - { id, title, type, location, dayIndex, time }
 * @param {Date[]} weekDates - array of 7 Date objects for the current week
 * @returns {string[]} notificationIds
 */
export async function scheduleEventReminder(event, weekDates) {
  const hasPermission = await requestNotificationPermissions()
  if (!hasPermission) return []

  // Cancel existing reminders for this event
  await cancelEventReminder(event.id)

  const eventDate = weekDates[event.dayIndex]
  if (!eventDate) return []

  // Build the full datetime
  const baseDate = parseTimeToDate(event.time)
  if (!baseDate) return []

  // Apply the correct calendar date (keep the time, change the date)
  const eventDateTime = new Date(eventDate)
  eventDateTime.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0)

  if (eventDateTime <= new Date()) return []

  const ids = []
  const body = event.location
    ? `${event.type} · ${event.location}`
    : event.type

  // 1-hour warning
  const oneHourBefore = new Date(eventDateTime.getTime() - 60 * 60 * 1000)
  if (oneHourBefore > new Date()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📅 ${event.title} in 1 hour`,
        body,
        data: { type: 'event', eventId: event.id, warning: '1h' },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: oneHourBefore,
      },
    })
    ids.push(id)
  }

  // 15-minute warning
  const fifteenMinBefore = new Date(eventDateTime.getTime() - 15 * 60 * 1000)
  if (fifteenMinBefore > new Date()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${event.title} starts in 15 min`,
        body,
        data: { type: 'event', eventId: event.id, warning: '15m' },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fifteenMinBefore,
      },
    })
    ids.push(id)
  }

  console.log(`Scheduled ${ids.length} reminder(s) for event "${event.title}"`)
  return ids
}

/**
 * Cancel all scheduled notifications for a given event id.
 */
export async function cancelEventReminder(eventId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel  = scheduled.filter(
    n => n.content.data?.type === 'event' && n.content.data?.eventId === eventId
  )
  await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)))
}

// ─── Cancel ALL reminders ─────────────────────────────────────────────────────
export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// ─── List all scheduled (useful for debugging) ────────────────────────────────
export async function listScheduledNotifications() {
  const all = await Notifications.getAllScheduledNotificationsAsync()
  console.log('Scheduled notifications:', JSON.stringify(all, null, 2))
  return all
}