import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import { getPendingRequests, respondToLinkRequest } from '../../services/Caregiver.service'
import { getCurrentUser } from '../../services/auth.service'

export default function PendingRequests() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
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
      Alert.alert(t('couldNotLoad') || 'Could not load requests', err.message)
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
        accept ? (t('connected') || 'Connected!') : (t('requestDeclined') || 'Request declined'),
        accept
          ? `${caregiverName} ${t('canNowMonitor') || 'can now monitor your activity.'}`
          : `${t('youDeclined') || 'You have declined the request from'} ${caregiverName}.`
      )
    } catch (err) {
      Alert.alert(t('somethingWentWrong') || 'Something went wrong', err.message)
    } finally {
      setRespondingId(null)
    }
  }

  const confirmRespond = (linkId, accept, caregiverName) => {
    Alert.alert(
      accept ? (t('acceptRequest') || 'Accept request?') : (t('declineRequest') || 'Decline request?'),
      accept
        ? `${caregiverName} ${t('willBeAbleToMonitor') || 'will be able to monitor your health and location data.'}`
        : `${t('areYouSureDecline') || 'Are you sure you want to decline'} ${caregiverName}'s ${t('request') || 'request'}?`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: accept ? (t('accept') || 'Accept') : (t('decline') || 'Decline'),
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
        className="bg-surface rounded-2xl p-4 mb-3 shadow-sm"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <View className="flex-row items-start">
          <View className="w-[50px] h-[50px] rounded-full bg-blue-100 dark:bg-blue-900/30 justify-center items-center mr-3">
            <Text className="text-[18px] font-bold text-blue-600 dark:text-blue-400">
              {getInitials(item.first_name, item.last_name)}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-[20px] font-semibold text-text mb-0.5">
              {fullName}
            </Text>
            {item.phone_number ? (
              <Text className="text-[15px] text-text-secondary mb-2">{item.phone_number}</Text>
            ) : null}
            <View className="self-start bg-blue-100 dark:bg-blue-900/30 rounded-md px-2 py-[3px]">
              <Text className="text-[15px] font-semibold text-blue-600 dark:text-blue-400">
                {t('wantsToBeCaregiver') || 'Wants to be your caregiver'}
              </Text>
            </View>
          </View>
        </View>

        {isResponding ? (
          <ActivityIndicator size="small" color="#5B8CFF" className="mt-4" />
        ) : (
          <View className="flex-row gap-[10px] mt-4">
            <TouchableOpacity
              className="flex-1 border-[1.5px] border-border rounded-xl py-3 items-center"
              onPress={() => confirmRespond(item.link_id, false, fullName)}
              activeOpacity={0.75}
            >
              <Text className="text-[15px] font-semibold text-text-secondary">{t('decline') || 'Decline'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-xl py-3 items-center"
              onPress={() => confirmRespond(item.link_id, true, fullName)}
              activeOpacity={0.75}
            >
              <Text className="text-[15px] font-semibold text-white">{t('accept') || 'Accept'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center pt-20">
      <Text className="text-[48px] mb-4">✅</Text>
      <Text className="text-[20px] font-semibold text-text mb-2">
        {t('noPendingRequests') || 'No pending requests'}
      </Text>
      <Text className="text-md text-text-secondary text-center px-10 leading-5">
        {t('caregiverRequestAppearsHere') || 'When a caregiver sends you a link request, it will appear here.'}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ActivityIndicator size="large" color="#5B8CFF" className="flex-1" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="px-5 pt-5 pb-4">
        <Text className="text-[26px] font-bold text-text mb-1">
          {t('caregiverRequests') || 'Caregiver Requests'}
        </Text>
        <Text className="text-lg text-text-secondary">
          {requests.length > 0
            ? `${t('youHave') || 'You have'} ${requests.length} ${t('pendingRequest') || 'pending request'}${requests.length > 1 ? 's' : ''}`
            : t('noNewRequests') || 'No new requests right now'}
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
            tintColor="#5B8CFF"
          />
        }
      />
    </SafeAreaView>
  )
}