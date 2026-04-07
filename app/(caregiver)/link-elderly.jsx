import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator, Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { searchElderly, sendLinkRequest } from '../../services/Caregiver.service'
import { getCurrentUser } from '../../services/auth.service'

const COLORS = {
  primary: '#2D6A4F',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  subtle: '#666666',
  border: '#E0E0E0',
  success: '#52B788',
}

export default function LinkElderly() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [sentIds, setSentIds] = useState([]) // track sent requests

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchElderly(query.trim())
      setResults(data)
    } catch {
      Alert.alert('Error', 'Could not search. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendRequest = async (elderlyUserId) => {
    try {
      const user = await getCurrentUser()
      await sendLinkRequest(user.user_id, elderlyUserId)
      setSentIds(prev => [...prev, elderlyUserId])
      Alert.alert('✅ Request Sent', 'The elderly person will be notified.')
    } catch (error) {
      Alert.alert('Error', error.message)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Elderly Patient</Text>
        <Text style={styles.subtitle}>Search by name or phone number</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Name or phone number..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.user_id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {query ? 'No results found' : 'Search for a patient to get started'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.first_name?.[0]}{item.last_name?.[0]}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
                <Text style={styles.phone}>{item.phone_number}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.requestBtn,
                  sentIds.includes(item.user_id) && styles.requestBtnSent
                ]}
                onPress={() => handleSendRequest(item.user_id)}
                disabled={sentIds.includes(item.user_id)}
              >
                <Text style={styles.requestBtnText}>
                  {sentIds.includes(item.user_id) ? '✓ Sent' : 'Link'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.subtle,
    marginTop: 40,
    fontSize: 15,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  phone: { fontSize: 13, color: COLORS.subtle, marginTop: 2 },
  requestBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  requestBtnSent: { backgroundColor: COLORS.success },
  requestBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
})