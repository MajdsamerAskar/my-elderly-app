import AsyncStorage from '@react-native-async-storage/async-storage'

const physicalKey = userId => `elderly_physical_${userId}`
const familyKey = userId => `elderly_family_${userId}`
const healthKey = userId => `elderly_health_${userId}`
const emergencyKey = userId => `elderly_emergency_contact_${userId}`
const settingsKey = userId => `elderly_profile_settings_${userId}`

const defaultPhysical = () => ({
  steps: 3842,
  caloriesBurned: 286,
})

export async function getPhysicalMetrics(userId) {
  if (!userId) return defaultPhysical()
  try {
    const raw = await AsyncStorage.getItem(physicalKey(userId))
    if (!raw) return defaultPhysical()
    const parsed = JSON.parse(raw)
    return {
      steps: typeof parsed.steps === 'number' ? parsed.steps : defaultPhysical().steps,
      caloriesBurned:
        typeof parsed.caloriesBurned === 'number'
          ? parsed.caloriesBurned
          : defaultPhysical().caloriesBurned,
    }
  } catch {
    return defaultPhysical()
  }
}

export async function savePhysicalMetrics(userId, payload) {
  if (!userId) return
  await AsyncStorage.setItem(physicalKey(userId), JSON.stringify(payload))
}

export async function getFamilyMembers(userId) {
  if (!userId) return []
  try {
    const raw = await AsyncStorage.getItem(familyKey(userId))
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export async function saveFamilyMembers(userId, members) {
  if (!userId) return
  await AsyncStorage.setItem(familyKey(userId), JSON.stringify(members))
}

const defaultHealth = () => ({
  bloodPressure: '',
  heartRate: '',
  mood: '',
  sleepHours: '',
  bloodSugar: '',
  weight: '',
  allergies: '',
  medicationsNotes: '',
  otherNotes: '',
})

export async function getHealthRecord(userId) {
  if (!userId) return defaultHealth()
  try {
    const raw = await AsyncStorage.getItem(healthKey(userId))
    if (!raw) return defaultHealth()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultHealth()
    return { ...defaultHealth(), ...parsed }
  } catch {
    return defaultHealth()
  }
}

export async function saveHealthRecord(userId, record) {
  if (!userId) return
  await AsyncStorage.setItem(healthKey(userId), JSON.stringify(record))
}

export async function getEmergencyContactLocal(userId) {
  if (!userId) return { name: '', phone: '' }
  try {
    const raw = await AsyncStorage.getItem(emergencyKey(userId))
    if (!raw) return { name: '', phone: '' }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      phone: typeof parsed?.phone === 'string' ? parsed.phone : '',
    }
  } catch {
    return { name: '', phone: '' }
  }
}

export async function saveEmergencyContactLocal(userId, contact) {
  if (!userId) return
  const payload = {
    name: typeof contact?.name === 'string' ? contact.name : '',
    phone: typeof contact?.phone === 'string' ? contact.phone : '',
  }
  await AsyncStorage.setItem(emergencyKey(userId), JSON.stringify(payload))
}

const defaultSettings = () => ({
  confirmActions: true,
  reminderHints: true,
})

export async function getProfileSettings(userId) {
  if (!userId) return defaultSettings()
  try {
    const raw = await AsyncStorage.getItem(settingsKey(userId))
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultSettings()
    return { ...defaultSettings(), ...parsed }
  } catch {
    return defaultSettings()
  }
}

export async function saveProfileSettings(userId, settings) {
  if (!userId) return
  await AsyncStorage.setItem(settingsKey(userId), JSON.stringify(settings))
}
