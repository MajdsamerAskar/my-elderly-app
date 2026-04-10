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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={n => n.notification_id}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.is_read && styles.unread]}
            onPress={() => markRead(item.notification_id)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.title}</Text>
              {!item.is_read && <View style={styles.dot} />}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.sent_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  empty: { textAlign: 'center', marginTop: 60, color: '#999' },
  card: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 14 },
  unread: { borderLeftWidth: 3, borderLeftColor: '#0070f3' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: '#111' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0070f3' },
  body: { fontSize: 14, color: '#555', marginTop: 4 },
  time: { fontSize: 12, color: '#aaa', marginTop: 6 },
})