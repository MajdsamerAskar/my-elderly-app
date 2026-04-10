import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native'
import { getPendingRequests, respondToLinkRequest } from '../../services/Caregiver.service'
import { getCurrentUser } from '../../services/auth.service'

export default function PendingRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [respondingId, setRespondingId] = useState(null)

  const loadRequests = useCallback(async () => {
    try {
      const me = await getCurrentUser()
      const data = await getPendingRequests(me.user_id)
      setRequests(data)
    } catch (err) {
      Alert.alert('Could not load requests', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const onRefresh = () => {
    setRefreshing(true)
    loadRequests()
  }

  const handleRespond = async (linkId, accept, caregiverName) => {
  setRespondingId(linkId)
  try {
    await respondToLinkRequest(linkId, accept, null)
    setRequests((prev) => prev.filter((r) => r.link_id !== linkId))
    Alert.alert(
      accept ? 'Connected!' : 'Request declined',
      accept
        ? `${caregiverName} can now monitor your activity.`
        : `You have declined the request from ${caregiverName}.`
    )
  } catch (err) {
    Alert.alert('Something went wrong', err.message)
  } finally {
    setRespondingId(null)
  }
}

  const confirmRespond = (linkId, accept, caregiverName) => {
    Alert.alert(
      accept ? 'Accept request?' : 'Decline request?',
      accept
        ? `${caregiverName} will be able to monitor your health and location data.`
        : `Are you sure you want to decline ${caregiverName}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: accept ? 'Accept' : 'Decline',
          style: accept ? 'default' : 'destructive',
          onPress: () => handleRespond(linkId, accept, caregiverName),
        },
      ]
    )
  }

  const getInitials = (first, last) =>
    `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()

  const renderItem = ({ item }) => {
    const isResponding = respondingId === item.link_id
    const fullName = `${item.first_name} ${item.last_name}`

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(item.first_name, item.last_name)}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{fullName}</Text>
            {item.phone_number ? (
              <Text style={styles.cardSub}>{item.phone_number}</Text>
            ) : null}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Wants to be your caregiver</Text>
            </View>
          </View>
        </View>

        {isResponding ? (
          <ActivityIndicator size="small" color="#4F8EF7" style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => confirmRespond(item.link_id, false, fullName)}
              activeOpacity={0.75}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => confirmRespond(item.link_id, true, fullName)}
              activeOpacity={0.75}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>No pending requests</Text>
      <Text style={styles.emptySub}>
        When a caregiver sends you a link request, it will appear here.
      </Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#4F8EF7" style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Caregiver Requests</Text>
        <Text style={styles.headerSub}>
          {requests.length > 0
            ? `You have ${requests.length} pending request${requests.length > 1 ? 's' : ''}`
            : 'No new requests right now'}
        </Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.link_id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.list,
          requests.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F8EF7"
          />
        }
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
    paddingBottom: 16,
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9800',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  declineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#4F8EF7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
})