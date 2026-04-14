import { useState, useCallback } from 'react'
import {
  View,
  Text,
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
import {
  getHealthRecord,
  saveHealthRecord,
  getPhysicalMetrics,
  savePhysicalMetrics,
} from '../../services/elderlyLocal.service'
import { uniTheme } from '../../constants/uniTheme'
import SectionHeader from '../../components/ui/SectionHeader'

export default function HealthScreen() {
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [steps, setSteps] = useState('')
  const [calories, setCalories] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [mood, setMood] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [bloodSugar, setBloodSugar] = useState('')
  const [weight, setWeight] = useState('')
  const [allergies, setAllergies] = useState('')
  const [medicationsNotes, setMedicationsNotes] = useState('')
  const [otherNotes, setOtherNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      if (!user?.user_id) return
      setUserId(user.user_id)
      const health = await getHealthRecord(user.user_id)
      setBloodPressure(health.bloodPressure ?? '')
      setHeartRate(health.heartRate ?? '')
      setMood(health.mood ?? '')
      setSleepHours(health.sleepHours ?? '')
      setBloodSugar(health.bloodSugar ?? '')
      setWeight(health.weight ?? '')
      setAllergies(health.allergies ?? '')
      setMedicationsNotes(health.medicationsNotes ?? '')
      setOtherNotes(health.otherNotes ?? '')
      const physical = await getPhysicalMetrics(user.user_id)
      setSteps(String(physical.steps ?? ''))
      setCalories(String(physical.caloriesBurned ?? ''))
    } catch (e) {
      console.error(e)
      Alert.alert('Could not load', 'Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const handleSave = async () => {
    if (!userId) return
    const stepsNum = parseInt(steps.replace(/,/g, ''), 10)
    const calNum = parseInt(calories.replace(/,/g, ''), 10)
    if (steps !== '' && (Number.isNaN(stepsNum) || stepsNum < 0)) {
      Alert.alert('Steps', 'Enter a valid step count or leave it blank.')
      return
    }
    if (calories !== '' && (Number.isNaN(calNum) || calNum < 0)) {
      Alert.alert('Calories', 'Enter a valid number or leave it blank.')
      return
    }
    setSaving(true)
    try {
      await saveHealthRecord(userId, {
        bloodPressure: bloodPressure.trim(),
        heartRate: heartRate.trim(),
        mood: mood.trim(),
        sleepHours: sleepHours.trim(),
        bloodSugar: bloodSugar.trim(),
        weight: weight.trim(),
        allergies: allergies.trim(),
        medicationsNotes: medicationsNotes.trim(),
        otherNotes: otherNotes.trim(),
      })
      if (steps !== '' || calories !== '') {
        const physical = await getPhysicalMetrics(userId)
        await savePhysicalMetrics(userId, {
          steps: steps !== '' ? stepsNum : physical.steps,
          caloriesBurned: calories !== '' ? calNum : physical.caloriesBurned,
        })
      }
      Alert.alert('Saved', 'Your health notes were updated on this device.')
    } catch (e) {
      console.error(e)
      Alert.alert('Save failed', 'Could not save. Please try again.')
    } finally {
      setSaving(false)
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
          <Text className="text-xs font-semibold uppercase tracking-wide text-uni-primary">Health</Text>
          <Text className="text-lg font-bold text-uni-ink">Your records</Text>
          <Text className="mt-1 text-[14px] leading-5 text-uni-muted">
            Everything here stays on your phone so you can keep it accurate at your own pace.
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerClassName="pb-28"
          keyboardShouldPersistTaps="handled"
        >
          <SectionHeader icon="pulse-outline" title="Activity (optional)" />
          <View className="rounded-2xl border border-uni-border bg-uni-surface p-4">
            <AppInput
              label="Steps today"
              value={steps}
              onChangeText={setSteps}
              placeholder="e.g. 4200"
              keyboardType="number-pad"
              className="mt-0"
            />
            <AppInput
              label="Calories burned (kcal)"
              value={calories}
              onChangeText={setCalories}
              placeholder="e.g. 210"
              keyboardType="number-pad"
            />
          </View>

          <View className="mt-6">
            <SectionHeader icon="heart-outline" title="Vitals & how you feel" />
          </View>
          <View className="rounded-2xl border border-uni-border bg-uni-surface p-4">
            <AppInput
              label="Blood pressure"
              value={bloodPressure}
              onChangeText={setBloodPressure}
              placeholder="e.g. 122 / 78"
              className="mt-0"
            />
            <AppInput
              label="Heart rate (bpm)"
              value={heartRate}
              onChangeText={setHeartRate}
              placeholder="Optional"
              keyboardType="number-pad"
            />
            <AppInput
              label="Mood today"
              value={mood}
              onChangeText={setMood}
              placeholder="e.g. Calm, tired, cheerful"
            />
            <AppInput
              label="Sleep last night (hours)"
              value={sleepHours}
              onChangeText={setSleepHours}
              placeholder="e.g. 7.5"
              keyboardType="decimal-pad"
            />
            <AppInput
              label="Blood sugar"
              value={bloodSugar}
              onChangeText={setBloodSugar}
              placeholder="Use the units your doctor prefers"
            />
            <AppInput
              label="Weight"
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 165 lb"
            />
          </View>

          <View className="mt-6">
            <SectionHeader icon="medical-outline" title="Care reminders" />
          </View>
          <View className="rounded-2xl border border-uni-border bg-uni-surface p-4">
            <AppInput
              label="Allergies"
              value={allergies}
              onChangeText={setAllergies}
              placeholder="List anything caregivers should know"
              className="mt-0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              inputClassName="min-h-[88px] py-3"
            />
            <AppInput
              label="Medications & doses"
              value={medicationsNotes}
              onChangeText={setMedicationsNotes}
              placeholder="What you take and when — for your own reference"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputClassName="min-h-[100px] py-3"
            />
            <AppInput
              label="Other notes"
              value={otherNotes}
              onChangeText={setOtherNotes}
              placeholder="Appointments, questions for the doctor, etc."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              inputClassName="min-h-[88px] py-3"
            />
          </View>

          <View className="mt-4 flex-row items-start rounded-xl bg-uni-primary/10 px-3 py-3">
            <Ionicons name="information-circle-outline" size={22} color={uniTheme.primary} />
            <Text className="ml-2 flex-1 text-[13px] leading-5 text-uni-muted">
              This screen does not replace medical advice. Share updates with your clinician when you
              can.
            </Text>
          </View>
        </ScrollView>

        <View className="border-t border-uni-border bg-uni-surface px-4 pb-4 pt-3">
          <AppButton title="Save health data" onPress={handleSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
