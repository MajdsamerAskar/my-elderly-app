import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'

export async function updateMyLocation(userId) {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') throw new Error('Location permission denied')

  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })

  const { error } = await supabase.from('gps_locations').insert({
    user_id: userId,
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy_meters: loc.coords.accuracy,
    altitude_meters: loc.coords.altitude,
    recorded_at: new Date().toISOString(),
  })

  if (error) throw error
  return loc.coords
}

export async function getLatestElderlyLocation(elderlyId) {
  const { data, error } = await supabase
    .from('gps_locations')
    .select('latitude, longitude, recorded_at')
    .eq('user_id', elderlyId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data
}