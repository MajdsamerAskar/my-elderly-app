import { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AppButton from '../../components/ui/AppButton'
import AppInput from '../../components/ui/AppInput'
import { getCurrentUser } from '../../services/auth.service'
import { getFamilyMembers, saveFamilyMembers } from '../../services/elderlyLocal.service'
import { uniTheme } from '../../constants/uniTheme'

function newMemberId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function MentalActivityScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [members, setMembers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [description, setDescription] = useState('')

  const loadMembers = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user?.user_id) return
    setUserId(user.user_id)
    const list = await getFamilyMembers(user.user_id)
    setMembers(list)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadMembers()
    }, [loadMembers])
  )

  const closeModal = () => {
    setModalOpen(false)
    setName('')
    setAge('')
    setDescription('')
  }

  const handleAdd = async () => {
    const trimmedName = name.trim()
    const ageNum = parseInt(age, 10)
    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter a name for this family member.')
      return
    }
    if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      Alert.alert('Invalid age', 'Please enter a valid age.')
      return
    }
    if (!userId) return
    const next = [
      ...members,
      {
        id: newMemberId(),
        name: trimmedName,
        age: ageNum,
        description: description.trim() || undefined,
      },
    ]
    setMembers(next)
    await saveFamilyMembers(userId, next)
    closeModal()
  }

  const handleRemove = item => {
    Alert.alert(
      'Remove member',
      `Remove ${item.name} from your family list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return
            const next = members.filter(m => m.id !== item.id)
            setMembers(next)
            await saveFamilyMembers(userId, next)
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-uni-canvas" edges={['top']}>
      <View className="border-b border-uni-border bg-uni-surface px-4 py-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-uni-primary">
          Mental activity
        </Text>
        <Text className="text-lg font-bold text-uni-ink">Family tree</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-28">
        <View className="mb-3 rounded-2xl border border-uni-border bg-uni-surface p-4">
          <Text className="text-[15px] leading-6 text-uni-muted">
            Keep people you care about here. Add names and ages, and jot a short note if you like.
            When you are ready, try a short quiz to stay sharp.
          </Text>
        </View>

        {members.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-uni-border bg-uni-surface py-10">
            <Text className="text-4xl">🌳</Text>
            <Text className="mt-3 text-center text-[15px] text-uni-muted">
              No family members yet. Tap “Add member” to build your tree.
            </Text>
          </View>
        ) : (
          <View className="border-l-4 border-uni-primary pl-3">
            {members.map((m, idx) => (
              <View key={m.id} className="mb-3">
                <View className="absolute -left-[7px] top-5 h-3 w-3 rounded-full bg-uni-primary" />
                <View className="rounded-2xl border border-uni-border bg-uni-surface p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-lg font-bold text-uni-ink">{m.name}</Text>
                      <Text className="mt-0.5 text-sm text-uni-muted">Age {m.age}</Text>
                      {m.description ? (
                        <Text className="mt-2 text-[14px] leading-5 text-uni-muted">{m.description}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemove(m)}
                      className="rounded-lg bg-uni-danger/10 px-2 py-1"
                    >
                      <Text className="text-xs font-bold text-uni-danger-ring">Remove</Text>
                    </TouchableOpacity>
                  </View>
                  {idx < members.length - 1 ? (
                    <View className="mt-3 h-px bg-uni-border" />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          className="mt-4 flex-row items-center justify-center rounded-2xl border-2 border-dashed border-uni-primary bg-uni-primary/5 py-4"
        >
          <Ionicons name="person-add-outline" size={22} color={uniTheme.primary} />
          <Text className="ml-2 text-base font-bold text-uni-primary">Add family member</Text>
        </TouchableOpacity>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-uni-border bg-uni-surface px-4 pb-6 pt-3">
        <AppButton title="Take a 5-question quiz" onPress={() => router.push('/(elderly)/quiz')} />
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-uni-surface px-4 pb-8 pt-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-uni-ink">Add member</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={26} color={uniTheme.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <AppInput label="Name" value={name} onChangeText={setName} placeholder="e.g. Sarah" />
              <AppInput
                label="Age"
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 72"
                keyboardType="number-pad"
              />
              <AppInput
                label="Description (optional)"
                value={description}
                onChangeText={setDescription}
                placeholder="How you know them, a memory, or a note"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                inputClassName="min-h-[88px] py-3"
              />
              <View className="mt-6 flex-row gap-3">
                <AppButton title="Cancel" variant="outline" onPress={closeModal} className="flex-1" />
                <AppButton title="Save" onPress={handleAdd} className="flex-1" />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}
