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
      <View
  className="bg-white rounded-2xl p-4 mb-3"
  style={{
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  }}
>
  <View className="flex-row items-start">
    {/* Avatar */}
    <View className="w-[50px] h-[50px] rounded-full bg-[#E1F4FF] justify-center items-center mr-3">
      <Text className="text-[18px] font-bold text-[##4F8EF7]">
        {getInitials(item.first_name, item.last_name)}
      </Text>
    </View>

    {/* Card Info */}
    <View className="flex-1">
      <Text className="text-[20px] font-semibold text-[#1A1A2E] mb-0.5">
        {fullName}
      </Text>
      {item.phone_number ? (
        <Text className="text-[15px] text-[#999] mb-2">{item.phone_number}</Text>
      ) : null}
      <View className="self-start bg-[#E1F4FF] rounded-md px-2 py-[3px]">
        <Text className="text-[15px] font-semibold text-[##4F8EF7]">
          Wants to be your caregiver
        </Text>
      </View>
    </View>
  </View>

  {isResponding ? (
    <ActivityIndicator size="small" color="#4F8EF7" className="mt-4" />
  ) : (
    <View className="flex-row gap-[10px] mt-4">
      <TouchableOpacity
        className="flex-1 border-[1.5px] border-[#E5E7EB] rounded-xl py-3 items-center"
        onPress={() => confirmRespond(item.link_id, false, fullName)}
        activeOpacity={0.75}
      >
        <Text className="text-[15px] font-semibold text-[#6B7280]">Decline</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="flex-1 bg-[#4F8EF7] rounded-xl py-3 items-center"
        onPress={() => confirmRespond(item.link_id, true, fullName)}
        activeOpacity={0.75}
      >
        <Text className="text-[15px] font-semibold text-white">Accept</Text>
      </TouchableOpacity>
    </View>
  )}
</View>
    )
  }

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center pt-20">
  <Text className="text-[48px] mb-4">✅</Text>
  <Text className="text-[20px] font-semibold text-[#1A1A2E] mb-2">
    No pending requests
  </Text>
  <Text className="text-md text-[#aaa] text-center px-10 leading-5">
    When a caregiver sends you a link request, it will appear here.
  </Text>
</View>
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F8FA]">
  <ActivityIndicator size="large" color="#4F8EF7" className="flex-1" />
</SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
  <StatusBar barStyle="dark-content" />

  <View className="px-5 pt-5 pb-4">
    <Text className="text-[26px] font-bold text-[#1A1A2E] mb-1">
      Caregiver Requests
    </Text>
    <Text className="text-lg text-[#888]">
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
      { paddingHorizontal: 20, paddingBottom: 32 },
      requests.length === 0 && { flex: 1 },
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
