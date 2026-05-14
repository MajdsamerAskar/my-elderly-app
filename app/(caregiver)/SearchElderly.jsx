import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { searchElderly, sendLinkRequest, getLinkedElderly } from '../../services/Caregiver.service'
import { getCurrentUser } from '../../services/auth.service'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'

export default function SearchElderly() {
  const { t } = useTranslation()
  const { isDark } = useTheme()

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

      setResults(data ?? [])
      setLinkedIds((links ?? []).map((link) => link.user_id))
      setHasSearched(true)
    } catch (error) {
      Alert.alert(
        t('searchFailed') || 'Search failed',
        error.message
      )
    } finally {
      setSearching(false)
    }
  }, [t])

  async function handleSendRequest(elderly) {
    setSendingId(elderly.user_id)

    try {
      const me = await getCurrentUser()
      await sendLinkRequest(me.user_id, elderly.user_id)
      setSentIds((prev) => [...prev, elderly.user_id])
      Alert.alert(
        t('requestSent') || 'Request sent',
        t('caregiverLinkRequestSent', {
          name: elderly.first_name,
          defaultValue: `A link request was sent to ${elderly.first_name}. They will need to accept it in their app.`,
        })
      )
    } catch (error) {
      Alert.alert(
        t('couldNotSendRequest') || 'Could not send request',
        error.message
      )
    } finally {
      setSendingId(null)
    }
  }

  function getInitials(first, last) {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  }

  function renderItem({ item }) {
    const isSent = sentIds.includes(item.user_id)
    const isSending = sendingId === item.user_id
    const isLinked = linkedIds.includes(item.user_id)

    return (
      <View className="flex-row items-center bg-surface rounded-2xl p-4 mb-3 border border-border">
        <View className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/40 justify-center items-center mr-3">
          <Text className="text-base font-bold text-blue-600 dark:text-blue-300">
            {getInitials(item.first_name, item.last_name)}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-text mb-0.5">
            {item.first_name} {item.last_name}
          </Text>
          {item.phone_number ? (
            <Text className="text-sm text-text-secondary">{item.phone_number}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          className={`rounded-xl py-2.5 px-4 min-w-[96px] items-center ${
            isSending
              ? 'bg-blue-300'
              : isLinked
                ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900'
                : isSent
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-primary_blue'
          }`}
          onPress={() => handleSendRequest(item)}
          disabled={isSent || isSending || isLinked}
          activeOpacity={0.8}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className={`text-sm font-semibold ${
              isLinked || isSent
                ? 'text-green-700 dark:text-green-300'
                : 'text-white'
            }`}>
              {isLinked
                ? (t('alreadyLinked') || 'Already linked')
                : isSent
                  ? (t('sent') || 'Sent')
                  : (t('connect') || 'Connect')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  function renderEmpty() {
    if (!hasSearched) return null

    return (
      <View className="flex-1 justify-center items-center pt-16">
        <Ionicons
          name="search-outline"
          size={42}
          color={isDark ? '#475569' : '#CBD5E1'}
        />
        <Text className="text-lg font-semibold text-text mt-4 mb-1.5">
          {t('noResultsFound') || 'No results found'}
        </Text>
        <Text className="text-sm text-text-secondary text-center px-10">
          {t('searchByNameOrPhone') || 'Try searching by first name, last name, or phone number.'}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="px-4 pt-4 pb-3 bg-surface border-b border-border">
        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isDark ? '#93C5FD' : '#2563EB'}
          />
          <Text className="ml-1 text-blue-600 dark:text-blue-300 font-semibold text-sm">
            {t('back') || 'Back'}
          </Text>
        </TouchableOpacity>

        <Text className="text-[26px] font-bold text-text mb-1">
          {t('searchElderly') || 'Find Elderly'}
        </Text>
        <Text className="text-sm text-text-secondary">
          {t('searchElderlySubtitle') || 'Search by name or phone number to send a link request'}
        </Text>
      </View>

      <View className="px-4 py-4">
        <View className="flex-row items-center bg-surface rounded-2xl px-3.5 py-3 border border-border">
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? '#94A3B8' : '#64748B'}
          />
          <TextInput
            className="flex-1 text-base text-text ml-2"
            placeholder={t('searchNameOrPhonePlaceholder') || 'Name or phone number...'}
            placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="words"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.user_id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          { paddingHorizontal: 16, paddingBottom: 32 },
          results.length === 0 ? { flexGrow: 1 } : null,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
