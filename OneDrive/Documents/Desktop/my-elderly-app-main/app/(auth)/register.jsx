import { useState } from 'react'
import {
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { registerUser } from '../../services/auth.service'
import AuthContainer from '../../components/ui/AuthContainer'
import AppButton from '../../components/ui/AppButton'
import AppInput from '../../components/ui/AppInput'

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <View className="mb-9 flex-row justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          className={`h-2.5 rounded-full ${
            i + 1 === currentStep
              ? 'w-6 bg-uni-primary'
              : i + 1 < currentStep
                ? 'w-2.5 bg-uni-primary/40'
                : 'w-2.5 bg-uni-border'
          }`}
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
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text className="mb-1 text-[28px] font-bold text-uni-ink">Personal Info</Text>
      <Text className="mb-7 text-[15px] text-uni-muted">Tell us about yourself</Text>

      <AppInput
        label="First Name *"
        placeholder="Enter first name"
        value={data.firstName}
        onChangeText={(v) => onChange('firstName', v)}
        className="mt-0"
      />

      <AppInput
        label="Middle Name"
        placeholder="Enter middle name (optional)"
        value={data.middleName}
        onChangeText={(v) => onChange('middleName', v)}
      />

      <AppInput
        label="Last Name *"
        placeholder="Enter last name"
        value={data.lastName}
        onChangeText={(v) => onChange('lastName', v)}
      />

      <AppInput
        label="Phone Number *"
        placeholder="Enter phone number"
        value={data.phone}
        onChangeText={(v) => onChange('phone', v)}
        keyboardType="phone-pad"
      />

      <AppInput
        label="Date of Birth *"
        placeholder="YYYY-MM-DD"
        value={data.dob}
        onChangeText={(v) => onChange('dob', v)}
      />

      <AppButton title="Next →" onPress={validate} className="mt-7" />
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
      <Text className="mb-1 text-[28px] font-bold text-uni-ink">Who Are You?</Text>
      <Text className="mb-7 text-[15px] text-uni-muted">Select your role in the app</Text>

      {/* Elderly Option */}
      <TouchableOpacity
        className={`mt-4 flex-row items-center rounded-2xl border-2 p-5 ${
          data.role === 'elderly'
            ? 'border-uni-primary bg-uni-primary-soft'
            : 'border-uni-border bg-uni-surface'
        }`}
        onPress={() => onChange('role', 'elderly')}
      >
        <Text className="mr-4 text-4xl">👴</Text>
        <View className="flex-1">
          <Text className={`text-lg font-bold ${data.role === 'elderly' ? 'text-uni-primary' : 'text-uni-ink'}`}>
            I'm Elderly
          </Text>
          <Text className={`mt-0.5 text-[13px] ${data.role === 'elderly' ? 'text-uni-primary/80' : 'text-uni-muted'}`}>
            I need support and care
          </Text>
        </View>
        {data.role === 'elderly' && (
          <Text className="text-xl font-bold text-uni-primary">✓</Text>
        )}
      </TouchableOpacity>

      {/* Caregiver Option */}
      <TouchableOpacity
        className={`mt-4 flex-row items-center rounded-2xl border-2 p-5 ${
          data.role === 'caregiver'
            ? 'border-uni-primary bg-uni-primary-soft'
            : 'border-uni-border bg-uni-surface'
        }`}
        onPress={() => onChange('role', 'caregiver')}
      >
        <Text className="mr-4 text-4xl">👨‍⚕️</Text>
        <View className="flex-1">
          <Text className={`text-lg font-bold ${data.role === 'caregiver' ? 'text-uni-primary' : 'text-uni-ink'}`}>
            I'm a Caregiver
          </Text>
          <Text className={`mt-0.5 text-[13px] ${data.role === 'caregiver' ? 'text-uni-primary/80' : 'text-uni-muted'}`}>
            I look after someone
          </Text>
        </View>
        {data.role === 'caregiver' && (
          <Text className="text-xl font-bold text-uni-primary">✓</Text>
        )}
      </TouchableOpacity>

      <View className="mt-7 flex-row items-center">
        <AppButton title="← Back" variant="outline" onPress={onBack} className="mr-3" />
        <AppButton title="Next →" onPress={validate} className="flex-1" />
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
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text className="mb-1 text-[28px] font-bold text-uni-ink">Almost Done!</Text>
      <Text className="mb-7 text-[15px] text-uni-muted">Set up your login credentials</Text>

      <AppInput
        label="Email *"
        placeholder="Enter your email"
        value={data.email}
        onChangeText={(v) => onChange('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        className="mt-0"
      />

      <AppInput
        label="Password *"
        placeholder="Create a password"
        value={data.password}
        onChangeText={(v) => onChange('password', v)}
        secureTextEntry
      />

      <AppInput
        label="Confirm Password *"
        placeholder="Repeat your password"
        value={data.confirmPassword}
        onChangeText={(v) => onChange('confirmPassword', v)}
        secureTextEntry
      />

      <View className="mt-7 flex-row items-center">
        <AppButton title="← Back" variant="outline" onPress={onBack} className="mr-3" />
        <AppButton
          title="Create Account"
          onPress={validate}
          loading={loading}
          className="flex-1"
        />
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
    <AuthContainer heroSubtitle="Create your profile in three quick steps.">
      <View className="flex-1 pb-6 pt-2">
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
            <Text className="mt-5 text-center text-[15px] text-uni-muted">
              Already have an account?{' '}
              <Text className="font-bold text-uni-primary">Sign In</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </AuthContainer>
  )
}