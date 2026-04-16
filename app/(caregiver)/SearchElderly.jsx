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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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
      <View 
  className="flex-row items-center bg-white rounded-[14px] p-3.5 mb-2.5"
  style={{
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  }}
>
  <View className="w-[46px] h-[46px] rounded-full bg-[#E8F0FE] justify-center items-center mr-3">
    <Text className="text-base font-bold text-[#4F8EF7]">
      {getInitials(item.first_name, item.last_name)}
    </Text>
  </View>

  <View className="flex-1">
    <Text className="text-base font-semibold text-[#1A1A2E] mb-0.5">
      {item.first_name} {item.last_name}
    </Text>
    {item.phone_number ? (
      <Text className="text-[13px] text-gray-400">{item.phone_number}</Text>
    ) : null}
  </View>

  <TouchableOpacity
    className={`rounded-lg py-2 px-4 min-w-[80px] items-center ${isSending ? 'bg-[#7AABF9]' : isLinked ? 'bg-[#F0FDF4] border border-[#86EFAC]' : isSent ? 'bg-[#E8F5E9]' : 'bg-[#4F8EF7]'}`}
    onPress={() => handleSendRequest(item)}
    disabled={isSent || isSending || isLinked}
    activeOpacity={0.75}
  >
    {isSending ? (
      <ActivityIndicator size="small" color="#fff" />
    ) : (
      <Text className={`text-sm font-semibold ${isLinked || isSent ? 'text-[#4CAF50]' : 'text-white'}`}>
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
      <View className="flex-1 justify-center items-center pt-[60px]">
  <Text className="text-[40px] mb-3">🔍</Text>
  <Text className="text-lg font-semibold text-[#1A1A2E] mb-1.5">No results found</Text>
  <Text className="text-sm text-gray-400 text-center px-10">
    Try searching by first name, last name, or phone number.
  </Text>
</View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
  <StatusBar barStyle="dark-content" />

  <View className="px-5 pt-5 pb-3">
    <TouchableOpacity 
        className="flex-row items-center mb-2"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="#4F8EF7" />
        <Text className="ml-1 text-[#4F8EF7] font-semibold text-sm">Back</Text>
      </TouchableOpacity>
      
    <Text className="text-[26px] font-bold text-[#1A1A2E] mb-1">Find Elderly</Text>
    <Text className="text-sm text-gray-400">
      Search by name or phone number to send a link request
    </Text>
  </View>

  <View className="px-5 pb-4">
    <View 
      className="flex-row items-center bg-white rounded-[14px] px-3.5 py-3"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Text className="text-base mr-2">🔎</Text>
      <TextInput
        className="flex-1 text-md text-[#1A1A2E]"
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
        <ActivityIndicator size="small" color="#4F8EF7" className="ml-2" />
      )}
    </View>
  </View>

  <FlatList
    data={results}
    keyExtractor={(item) => item.user_id}
    renderItem={renderItem}
    ListEmptyComponent={renderEmpty}
    contentContainerStyle={[
      { paddingHorizontal: 20, paddingBottom: 32 },
      results.length === 0 && { flex: 1 },
    ]}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  />
</SafeAreaView>
  )
}