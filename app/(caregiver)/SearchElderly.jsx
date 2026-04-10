import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { searchElderly, sendLinkRequest , getLinkedElderly } from '../../services/Caregiver.service'
import { getCurrentUser } from '../../services/auth.service'

export default function SearchElderly() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sentIds, setSentIds] = useState([])
  const [sendingId, setSendingId] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [linkedIds, setLinkedIds] = useState([])

  const handleSearch = useCallback(async (text) => {
    setQuery(text)
    if (text.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }
    setSearching(true)
try {
    const me = await getCurrentUser()
    const [data, links] = await Promise.all([
      searchElderly(text.trim()),
      getLinkedElderly(me.user_id),
    ])
    setResults(data)
    setLinkedIds(links.map((l) => l.user_id))
    setHasSearched(true)
  } catch (err) {
    Alert.alert('Search failed', err.message)
  } finally {
    setSearching(false)
  }
}, [])

  const handleSendRequest = async (elderly) => {
    setSendingId(elderly.user_id)
    try {
      const me = await getCurrentUser()
      await sendLinkRequest(me.user_id, elderly.user_id)
      setSentIds((prev) => [...prev, elderly.user_id])
      Alert.alert(
        'Request sent',
        `A link request was sent to ${elderly.first_name}. They will need to accept it in their app.`
      )
    } catch (err) {
      Alert.alert('Could not send request', err.message)
    } finally {
      setSendingId(null)
    }
  }

  const getInitials = (first, last) =>
    `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()

  const renderItem = ({ item }) => {
    const isSent = sentIds.includes(item.user_id)
    const isSending = sendingId === item.user_id
    const isLinked = linkedIds.includes(item.user_id)

    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(item.first_name, item.last_name)}
          </Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>
            {item.first_name} {item.last_name}
          </Text>
          {item.phone_number ? (
            <Text style={styles.cardSub}>{item.phone_number}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.requestBtn,(isSent || isLinked) && styles.requestBtnSent,
            isSending && styles.requestBtnLoading,
            isLinked && styles.requestBtnLinked,
          ]}
          onPress={() => handleSendRequest(item)}
          disabled={isSent || isSending || isLinked}
          activeOpacity={0.75}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.requestBtnText,  (isSent || isLinked) && styles.requestBtnTextSent]}>
               {isLinked ? 'Already linked' : isSent ? 'Sent' : 'Connect'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  const renderEmpty = () => {
    if (!hasSearched) return null
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptySub}>
          Try searching by first name, last name, or phone number.
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Elderly</Text>
        <Text style={styles.headerSub}>
          Search by name or phone number to send a link request
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Name or phone number..."
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="words"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searching && (
            <ActivityIndicator size="small" color="#4F8EF7" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.user_id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.list,
          results.length === 0 && styles.listEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: '#888',
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: '#999',
  },
  requestBtn: {
    backgroundColor: '#4F8EF7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  requestBtnSent: {
    backgroundColor: '#E8F5E9',
  },
  requestBtnLoading: {
    backgroundColor: '#7AABF9',
  },
  requestBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  requestBtnTextSent: {
    color: '#4CAF50',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  requestBtnLinked: {
  backgroundColor: '#F0FDF4',
  borderWidth: 1,
  borderColor: '#86EFAC',
},
})