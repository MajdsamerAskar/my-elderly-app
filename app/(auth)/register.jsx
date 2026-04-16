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
} from 'react-native'
import { useRouter } from 'expo-router'
import { registerUser } from '../../services/auth.service'

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

  <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]" >
    First Name *
  </Text>
  <TextInput
    className="border border-[#E0E0E0] bg-white text-[#1A1A2E] rounded-xl px-4 py-3.5 text-md"
    
    placeholder="Enter first name"
    placeholderTextColor="#999"
    value={data.firstName}
    onChangeText={(v) => onChange('firstName', v)}
  />

  <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]" >
    Middle Name
  </Text>
  <TextInput
    className="border border-[#E0E0E0] bg-white text-[#1A1A2E] rounded-xl px-4 py-3.5 text-md"
    placeholder="Enter middle name (optional)"
    placeholderTextColor="#999"
    value={data.middleName}
    onChangeText={(v) => onChange('middleName', v)}
  />

  <Text className="text-[17px] font-semibold mb-2 mt-4 text-[#1A1A2E]" >
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
  <TextInput
    className="border border-[#E0E0E0] bg-white text-[#1A1A2E] rounded-xl px-4 py-3.5 text-md"
    placeholder="Enter date of birth"
    placeholderTextColor="#999"
    value={data.dob}
    onChangeText={(v) => onChange('dob', v)}
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

  {/* Elderly Option */}
  <TouchableOpacity
    className={`flex-row items-center border-2 rounded-2xl p-5 mt-4 ${data.role === 'elderly' ? 'bg-[#F0FAF5]' : 'bg-white'} ${data.role === 'elderly' ? 'border-[#007AFF]' : 'border-[#E0E0E0]'}`}
    onPress={() => onChange('role', 'elderly')}
  >
    <Text className="text-4xl mr-4">👴</Text>
    <View className="flex-1">
      <Text 
        className={`text-lg font-bold ${data.role === 'elderly' ? 'text-[#007AFF]' : 'text-[#1A1A2E]'}`}
      >
        I'm Elderly
      </Text>
      <Text 
        className={`text-[13px] mt-0.5 ${data.role === 'elderly' ? 'opacity-80' : ''} ${data.role === 'elderly' ? 'text-[#007AFF]' : 'text-[#666]'}`}
      >
        I need support and care
      </Text>
    </View>
    {data.role === 'elderly' && (
      <Text className="text-xl font-bold text-[#007AFF]">✓</Text>
    )}
  </TouchableOpacity>

  {/* Caregiver Option */}
  <TouchableOpacity
    className={`flex-row items-center border-2 rounded-2xl p-5 mt-4
       ${data.role === 'caregiver' ? 'bg-[#F0FAF5]' : 'bg-white'} ${data.role === 'caregiver' ? 'border-[#007AFF]' :
         'border-[#E0E0E0]'}`}
    onPress={() => onChange('role', 'caregiver')}
  >
    <Text className="text-4xl mr-4">👨‍⚕️</Text>
    <View className="flex-1">
      <Text 
        className={`text-lg font-bold ${data.role === 'caregiver' ? 'text-[#007AFF]' : 'text-[#1A1A2E]'}`}
      >
        I'm a Caregiver
      </Text>
      <Text 
        className={`text-[17px] mt-0.5 ${data.role === 'caregiver' ? 'opacity-80' : ''} ${data.role === 'caregiver' ? 'text-[#007AFF]' : 'text-[#666]'}`}
      >
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
  <Text className="text-[30px] font-bold mb-1.5 text-[#1A1A2E]" >
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
    dob: '',
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

    {/* Step Indicator */}
    <StepIndicator currentStep={step} totalSteps={3} />

    {/* Steps */}
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

    {/* Login Link */}
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