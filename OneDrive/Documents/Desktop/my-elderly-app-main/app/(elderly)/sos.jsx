import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AppInput from '../../components/ui/AppInput'
import AppButton from '../../components/ui/AppButton'
import { getCurrentUser } from '../../services/auth.service'
import { getEmergencyContactLocal, saveEmergencyContactLocal } from '../../services/elderlyLocal.service'
import { getCaregiverPhone, triggerSOS } from '../../services/sos.service'
import { uniTheme } from '../../constants/uniTheme'

export default function ElderlySosScreen() {
  const [user, setUser] = useState(null)
  const [caregiver, setCaregiver] = useState(null)
  const [localName, setLocalName] = useState('')
  const [localPhone, setLocalPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [sosLoading, setSosLoading] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [editingContact, setEditingContact] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const current = await getCurrentUser()
      setUser(current)
      if (current?.user_id) {
        const cg = await getCaregiverPhone(current.user_id)
        setCaregiver(cg?.phone_number ? cg : null)
        const local = await getEmergencyContactLocal(current.user_id)
        setLocalName(local.name)
        setLocalPhone(local.phone)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'This will start a call to your caregiver or emergency services. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call now',
          style: 'destructive',
          onPress: confirmSOS,
        },
      ]
    )
  }

  const confirmSOS = async () => {
    if (!user?.user_id) return
    setSosLoading(true)
    try {
      const result = await triggerSOS(user.user_id)
      if (result.type === 'caregiver') {
        Alert.alert('Calling caregiver', `Dialing ${result.calledName}…`)
      } else if (result.type === 'local_contact') {
        Alert.alert('Calling your contact', `Dialing ${result.calledName}…`)
      } else {
        Alert.alert('Calling 911', 'Connecting to emergency services…')
      }
    } catch (error) {
      Alert.alert('SOS error', 'Could not start the call. Please dial manually.')
    } finally {
      setSosLoading(false)
    }
  }

  const saveLocalContact = async () => {
    if (!user?.user_id) return
    setSavingContact(true)
    try {
      await saveEmergencyContactLocal(user.user_id, {
        name: localName.trim(),
        phone: localPhone.trim(),
      })
      Alert.alert('Saved', 'Your emergency contact card was updated on this device.')
    } catch (e) {
      Alert.alert('Save failed', 'Try again in a moment.')
    } finally {
      setSavingContact(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-uni-canvas">
        <ActivityIndicator size="large" color={uniTheme.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-uni-canvas" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View className="border-b border-uni-border bg-uni-surface px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-uni-danger-ring">
            Emergency
          </Text>
          <Text className="text-lg font-bold text-uni-ink">SOS</Text>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-6"
          contentContainerClassName="pb-10 items-center"
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            className={`h-[180px] w-[180px] items-center justify-center rounded-full border-[6px] border-uni-danger-ring bg-uni-danger ${sosLoading ? 'opacity-70' : ''}`}
            onPress={handleSOS}
            disabled={sosLoading}
            activeOpacity={0.8}
          >
            {sosLoading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Text className="mb-1 text-5xl">🆘</Text>
                <Text className="text-3xl font-black tracking-[4px] text-white">SOS</Text>
                <Text className="mt-0.5 text-[11px] text-white/90">Press for emergency</Text>
              </>
            )}
          </TouchableOpacity>
          <Text className="mt-4 max-w-[320px] text-center text-[14px] text-uni-muted">
            Use only for real emergencies. The app calls your linked caregiver first, then your
            saved contact if you added one, otherwise it dials 911.
          </Text>

          <View className="mt-10 w-full max-w-[400px]">
  <Text className="mb-2 text-center text-[15px] font-bold text-uni-ink">
    Emergency contact
  </Text>

  {caregiver ? (
    // ── Tier 1: linked caregiver ──────────────────────────────
    <View className="rounded-2xl border border-uni-border bg-uni-surface p-5">
      <View className="flex-row items-center">
        <View className="rounded-full bg-uni-primary/10 p-3">
          <Ionicons name="person-circle-outline" size={28} color={uniTheme.primary} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-uni-muted-light">
            Linked caregiver
          </Text>
          <Text className="mt-1 text-xl font-bold text-uni-ink">{caregiver.first_name}</Text>
          <Text className="mt-2 text-lg text-uni-primary">{caregiver.phone_number}</Text>
        </View>
      </View>
      <Text className="mt-4 text-[13px] leading-5 text-uni-muted">
        SOS calls this number first. Ask your caregiver if anything needs updating.
      </Text>
    </View>

  ) : localName.trim() || localPhone.trim() ? (
    // ── Tier 2: local contact saved ───────────────────────────
    <View className="rounded-2xl border border-uni-border bg-uni-surface p-5">
      <View className="flex-row items-center">
        <View className="rounded-full bg-uni-primary/10 p-3">
          <Ionicons name="person-outline" size={28} color={uniTheme.primary} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-uni-muted-light">
            Your emergency contact
          </Text>
          {localName.trim() ? (
            <Text className="mt-1 text-xl font-bold text-uni-ink">{localName}</Text>
          ) : null}
          {localPhone.trim() ? (
            <Text className="mt-2 text-lg text-uni-primary">{localPhone}</Text>
          ) : null}
        </View>
        {/* Edit button */}
        <TouchableOpacity
          onPress={() => setEditingContact(true)}
          className="rounded-full bg-uni-surface p-2"
        >
          <Ionicons name="pencil-outline" size={18} color={uniTheme.primary} />
        </TouchableOpacity>
      </View>
      <Text className="mt-4 text-[13px] leading-5 text-uni-muted">
        SOS will call this contact if no caregiver is linked.
      </Text>

      {/* Inline edit form */}
      {editingContact && (
        <View className="mt-4 border-t border-uni-border pt-4">
          <AppInput
            label="Contact name"
            value={localName}
            onChangeText={setLocalName}
            placeholder="e.g. Alex (neighbor)"
          />
          <AppInput
            label="Contact phone"
            value={localPhone}
            onChangeText={setLocalPhone}
            placeholder="Include area code"
            keyboardType="phone-pad"
          />
          <View className="mt-2 flex-row gap-2">
            <AppButton
              title="Save"
              onPress={async () => {
                await saveLocalContact()
                setEditingContact(false)
              }}
              loading={savingContact}
              className="flex-1"
            />
            <TouchableOpacity
              onPress={() => setEditingContact(false)}
              className="flex-1 items-center justify-center rounded-xl border border-uni-border py-3"
            >
              <Text className="text-[15px] font-semibold text-uni-muted">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>

  ) : (
    // ── Tier 3: nothing saved — default to 911 ────────────────
    <View className="rounded-2xl border border-uni-border bg-uni-surface p-5">
      {/* 911 default notice */}
      <View className="mb-4 flex-row items-center rounded-xl bg-uni-danger/10 p-3">
        <Ionicons name="alert-circle-outline" size={22} color={uniTheme.danger} />
        <Text className="ml-2 flex-1 text-[13px] font-semibold text-uni-danger-ring">
          No contact saved — SOS will dial 911 by default
        </Text>
      </View>

      <Text className="mb-3 text-[14px] leading-5 text-uni-muted">
        Add someone you trust and SOS will call them before dialing 911.
      </Text>
      <AppInput
        label="Emergency contact name"
        value={localName}
        onChangeText={setLocalName}
        placeholder="e.g. Alex (neighbor)"
      />
      <AppInput
        label="Emergency contact phone"
        value={localPhone}
        onChangeText={setLocalPhone}
        placeholder="Include area code"
        keyboardType="phone-pad"
      />
      <AppButton
        title="Save emergency contact"
        onPress={saveLocalContact}
        loading={savingContact}
        className="mt-2"
      />
    </View>
  )}
</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
