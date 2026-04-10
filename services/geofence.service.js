import { supabase } from '../lib/supabase'

// Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function saveGeoFence({ userId, name, latitude, longitude, radiusMeters }) {
  // Deactivate old fences for this user first
  await supabase.from('geo_fences').update({ is_active: false }).eq('user_id', userId)

  const { data, error } = await supabase
    .from('geo_fences')
    .insert({
      user_id: userId,
      name,
      center_latitude: latitude,
      center_longitude: longitude,
      radius_meters: radiusMeters,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getActiveFence(elderlyUserId) {
  const { data, error } = await supabase
    .from('geo_fences')
    .select('*')
    .eq('user_id', elderlyUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function checkBreachAndNotify({ elderlyUserId, caregiverId, latitude, longitude }) {
  const fence = await getActiveFence(elderlyUserId)
  if (!fence) return

  const distance = getDistanceMeters(
    fence.center_latitude,
    fence.center_longitude,
    latitude,
    longitude
  )

  const isOutside = distance > fence.radius_meters
  if (!isOutside) return

  // Check if we already fired an alert in last 5 minutes (avoid spam)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('geo_fence_alerts')
    .select('alert_id')
    .eq('fence_id', fence.fence_id)
    .gte('alerted_at', fiveMinAgo)
    .limit(1)

  if (recent && recent.length > 0) return

  // Insert breach alert
  await supabase.from('geo_fence_alerts').insert({
    fence_id: fence.fence_id,
    breach_type: 'exit',
    latitude,
    longitude,
  })

  // Notify caregiver
  await supabase.from('notifications').insert({
    recipient_id: caregiverId,
    type: 'geo_fence_breach',
    title: 'Geo-fence Alert',
    body: `Your elderly patient has left the safe zone "${fence.name}".`,
    reference_id: fence.fence_id,
    reference_table: 'geo_fences',
  })
}