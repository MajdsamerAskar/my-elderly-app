import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { registerUser } from '../../services/auth.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(date) {
  if (!date) return ''
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

function toISODate(date) {
  // Returns YYYY-MM-DD for the backend
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

// ─── DOB Picker ───────────────────────────────────────────────────────────────
function DOBPicker({ value, onChange }) {
  // value is a Date object or null
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [tempDate, setTempDate] = useState(value ?? new Date(1960, 0, 1))

  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() - 18) // must be at least 18

  // Android: native dialog
  const openAndroid = () => setShowAndroid(true)

  const onAndroidChange = (event, selected) => {
    setShowAndroid(false)
    if (event.type === 'set' && selected) {
      onChange(selected)
    }
  }

  // iOS: modal with inline spinner
  const openIOS = () => {
    setTempDate(value ?? new Date(1960, 0, 1))
    setShowIOSModal(true)
  }

  const confirmIOS = () => {
    onChange(tempDate)
    setShowIOSModal(false)
  }

  const cancelIOS = () => setShowIOSModal(false)

  return (
    <>
      <TouchableOpacity
        className="border border-[#E0E0E0] bg-white rounded-xl px-4 py-3.5 flex-row items-center justify-between"
        onPress={Platform.OS === 'ios' ? openIOS : openAndroid}
        activeOpacity={0.7}
      >
        <Text className={`text-md ${value ? 'text-[#1A1A2E]' : 'text-[#999]'}`}>
          {value ? formatDate(value) : 'Select date of birth'}
        </Text>
        <Text className="text-lg">📅</Text>
      </TouchableOpacity>

      {/* Android native dialog */}
      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={value ?? new Date(1960, 0, 1)}
          mode="date"
          display="default"
          maximumDate={maxDate}
          minimumDate={new Date(1900, 0, 1)}
          onChange={onAndroidChange}
        />
      )}

      {/* iOS bottom-sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showIOSModal}
          transparent
          animationType="slide"
          onRequestClose={cancelIOS}
        >
          <TouchableOpacity
            className="flex-1 bg-black/40"
            activeOpacity={1}
            onPress={cancelIOS}
          />
          <View className="bg-white rounded-t-3xl px-5 pb-8 pt-4">
            {/* Handle bar */}
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0] self-center mb-4" />

            <Text className="text-[18px] font-bold text-[#1A1A2E] text-center mb-2">
              Date of Birth
            </Text>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              maximumDate={maxDate}
              minimumDate={new Date(1900, 0, 1)}
              onChange={(_, selected) => selected && setTempDate(selected)}
              style={{ height: 180 }}
              textColor="#1A1A2E"
            />

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 border border-[#E0E0E0] rounded-xl py-3.5 items-center"
                onPress={cancelIOS}
              >
                <Text className="text-[#1A1A2E] font-semibold text-[16px]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#007AFF] rounded-xl py-3.5 items-center"
                onPress={confirmIOS}
              >
                <Text className="text-white font-bold text-[16px]">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <View className="flex-row justify-center gap-2 mb-9">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          className={`h-2.5 rounded-full ${i + 1 === currentStep ? 'w-6' : 'w-2.5'} ${i + 1 < currentStep ? 'opacity-40' : ''} ${i + 1 <= currentStep ? 'bg-[#007AFF]' : 'bg-[#E0E0E0]'}`}
        />
      ))}
    </View>
  )
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────
function StepPersonalInfo({ data, onChange, onNext }) {
  const validate = () => {
    if (!data.firstName || !data.lastName || !data.phone || !data.dob) {
      Alert.alert('Missing Info', 'Please fill in all required fields')
      return
    }
    onNext()
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <Text className="text-[30px] font-bold mb-1.5 text-[#1A1A2E]">
        Personal Info
      </Text>
      <Text className="text-[17px] mb-7 text-[#666]">
        Tell us about yourself
      </Text>

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        First Name *
      </Text>
      <TextInput
        className="border border-[#E0E0E0] bg-white text-[#1A1A2E] rounded-xl px-4 py-3.5 text-md"
        placeholder="Enter first name"
        placeholderTextColor="#999"
        value={data.firstName}
        onChangeText={(v) => onChange('firstName', v)}
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        Middle Name
      </Text>
      <TextInput
        className="border border-[#E0E0E0] bg-white text-[#1A1A2E] rounded-xl px-4 py-3.5 text-md"
        placeholder="Enter middle name (optional)"
        placeholderTextColor="#999"
        value={data.middleName}
        onChangeText={(v) => onChange('middleName', v)}
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        Last Name *
      </Text>
      <TextInput
        className="border border-[#E0E0E0] bg-white text-[#1A1A2E] rounded-xl px-4 py-3.5 text-md"
        placeholder="Enter last name"
        placeholderTextColor="#999"
        value={data.lastName}
        onChangeText={(v) => onChange('lastName', v)}
      />

      <Text className="text-[15px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        Phone Number *
      </Text>
      <TextInput
        className="border border-[#E0E0E0] bg-white text-[#1A1A2E] rounded-xl px-4 py-3.5 text-md"
        placeholder="Enter phone number"
        placeholderTextColor="#999"
        value={data.phone}
        onChangeText={(v) => onChange('phone', v)}
        keyboardType="phone-pad"
      />

      <Text className="text-[15px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        Date of Birth *
      </Text>
      {/* DOBPicker stores a Date object in formData.dobDate,
          and the ISO string for the backend in formData.dob */}
      <DOBPicker
        value={data.dobDate}
        onChange={(date) => {
          onChange('dobDate', date)
          onChange('dob', toISODate(date))
        }}
      />

      <TouchableOpacity
        className="bg-[#007AFF] rounded-xl py-4 items-center mt-7"
        onPress={validate}
      >
        <Text className="text-white text-[20px] font-bold">Next →</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ─── Step 2: Role Selection ───────────────────────────────────────────────────
function StepRoleSelection({ data, onChange, onNext, onBack }) {
  const validate = () => {
    if (!data.role) {
      Alert.alert('Select Role', 'Please select who you are')
      return
    }
    onNext()
  }

  return (
    <View className="flex-1">
      <Text className="text-[30px] font-bold mb-1.5 text-[#1A1A2E]">
        Who Are You?
      </Text>
      <Text className="text-[17px] mb-7 text-[#666]">
        Select your role in the app
      </Text>

      <TouchableOpacity
        className={`flex-row items-center border-2 rounded-2xl p-5 mt-4 ${data.role === 'elderly' ? 'bg-[#F0FAF5] border-[#007AFF]' : 'bg-white border-[#E0E0E0]'}`}
        onPress={() => onChange('role', 'elderly')}
      >
        <Text className="text-4xl mr-4">👴</Text>
        <View className="flex-1">
          <Text className={`text-lg font-bold ${data.role === 'elderly' ? 'text-[#007AFF]' : 'text-[#1A1A2E]'}`}>
            I'm Elderly
          </Text>
          <Text className={`text-[13px] mt-0.5 ${data.role === 'elderly' ? 'text-[#007AFF] opacity-80' : 'text-[#666]'}`}>
            I need support and care
          </Text>
        </View>
        {data.role === 'elderly' && (
          <Text className="text-xl font-bold text-[#007AFF]">✓</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-row items-center border-2 rounded-2xl p-5 mt-4 ${data.role === 'caregiver' ? 'bg-[#F0FAF5] border-[#007AFF]' : 'bg-white border-[#E0E0E0]'}`}
        onPress={() => onChange('role', 'caregiver')}
      >
        <Text className="text-4xl mr-4">👨‍⚕️</Text>
        <View className="flex-1">
          <Text className={`text-lg font-bold ${data.role === 'caregiver' ? 'text-[#007AFF]' : 'text-[#1A1A2E]'}`}>
            I'm a Caregiver
          </Text>
          <Text className={`text-[17px] mt-0.5 ${data.role === 'caregiver' ? 'text-[#007AFF] opacity-80' : 'text-[#666]'}`}>
            I look after someone
          </Text>
        </View>
        {data.role === 'caregiver' && (
          <Text className="text-xl font-bold text-[#007AFF]">✓</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row items-center mt-7">
        <TouchableOpacity
          className="border rounded-xl py-4 px-5 items-center mr-3 border-[#E0E0E0]"
          onPress={onBack}
        >
          <Text className="text-md font-semibold text-[#1A1A2E]">← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded-xl py-4 items-center bg-[#007AFF]"
          onPress={validate}
        >
          <Text className="text-white text-[17px] font-bold">Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Step 3: Security ─────────────────────────────────────────────────────────
function StepSecurity({ data, onChange, onSubmit, onBack, loading }) {
  const validate = () => {
    if (!data.email || !data.password || !data.confirmPassword) {
      Alert.alert('Missing Info', 'Please fill in all fields')
      return
    }
    if (data.password !== data.confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match')
      return
    }
    if (data.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters')
      return
    }
    onSubmit()
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <Text className="text-[30px] font-bold mb-1.5 text-[#1A1A2E]">
        Almost Done!
      </Text>
      <Text className="text-[17px] mb-7 text-[#666]">
        Set up your login credentials
      </Text>

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        Email *
      </Text>
      <TextInput
        className="border rounded-xl px-4 py-3.5 text-md bg-[#F0FAF5] border-[#E0E0E0] text-[#1A1A2E]"
        placeholder="Enter your email"
        placeholderTextColor="#999"
        value={data.email}
        onChangeText={(v) => onChange('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        Password *
      </Text>
      <TextInput
        className="border rounded-xl px-4 py-3.5 text-md bg-[#F0FAF5] border-[#E0E0E0] text-[#1A1A2E]"
        placeholder="Create a password"
        placeholderTextColor="#999"
        value={data.password}
        onChangeText={(v) => onChange('password', v)}
        secureTextEntry
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]">
        Confirm Password *
      </Text>
      <TextInput
        className="border rounded-xl px-4 py-3.5 text-md bg-[#F0FAF5] border-[#E0E0E0] text-[#1A1A2E]"
        placeholder="Repeat your password"
        placeholderTextColor="#999"
        value={data.confirmPassword}
        onChangeText={(v) => onChange('confirmPassword', v)}
        secureTextEntry
      />

      <View className="flex-row items-center mt-7">
        <TouchableOpacity
          className="border rounded-xl py-4 px-5 items-center mr-3 border-[#E0E0E0]"
          onPress={onBack}
        >
          <Text className="text-md font-semibold text-[#1A1A2E]">← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`bg-[#007AFF] flex-1 rounded-xl py-4 items-center ${loading ? 'opacity-60' : ''}`}
          onPress={validate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-[17px] font-bold">Create Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// ─── Main Register Screen ─────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    dobDate: null,   // Date object — used by picker
    dob: '',         // ISO string YYYY-MM-DD — sent to backend
    role: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await registerUser(formData)
      Alert.alert(
        'Account Created! 🎉',
        'Welcome! You can now log in.',
        [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
      )
    } catch (error) {
      Alert.alert('Registration Failed', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F9FA]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-7 pt-[60px] pb-6">
        <StepIndicator currentStep={step} totalSteps={3} />

        {step === 1 && (
          <StepPersonalInfo
            data={formData}
            onChange={handleChange}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepRoleSelection
            data={formData}
            onChange={handleChange}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepSecurity
            data={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            loading={loading}
          />
        )}

        {step === 1 && (
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-center text-[15px] mt-5 text-[#666]">
              Already have an account?{' '}
              <Text className="font-bold text-[#007AFF]">Sign In</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}