import { useState, useEffect } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { getCurrentUser } from '../../services/auth.service'
import { supabase } from '../../lib/supabase'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.user_id)
      .order('sent_at', { ascending: false })
      .limit(50)

    if (!error) setNotifications(data)
    setLoading(false)
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('notification_id', id)
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n))
  }

  useEffect(() => { fetchNotifications() }, [])

  if (loading) return <ActivityIndicator className="flex-1" />

  return (
    <View className="flex-1 bg-[#f5f5f5]">
  <FlatList
    data={notifications}
    keyExtractor={n => n.notification_id}
    ListEmptyComponent={<Text className="text-center mt-[60px] text-gray-400">No notifications yet.</Text>}
    renderItem={({ item }) => (
      <TouchableOpacity
        className={`bg-white mx-4 mt-3 rounded-xl p-3.5 ${!item.is_read ? 'border-l-[3px]' : ''} ${!item.is_read ? 'border-l-[#0070f3]' : ''}`}
        onPress={() => markRead(item.notification_id)}
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-[15px] font-semibold text-gray-900">{item.title}</Text>
          {!item.is_read && <View className="w-2 h-2 rounded-full bg-[#0070f3]" />}
        </View>
        <Text className="text-sm text-gray-600 mt-1">{item.body}</Text>
        <Text className="text-xs text-gray-400 mt-1.5">{new Date(item.sent_at).toLocaleString()}</Text>
      </TouchableOpacity>
    )}
  />
</View>
  )
}