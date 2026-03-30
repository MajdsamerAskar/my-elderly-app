import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i + 1 === currentStep && styles.stepDotActive,
            i + 1 < currentStep && styles.stepDotDone,
          ]}
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
      <Text style={styles.stepTitle}>Personal Info</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

      <Text style={styles.label}>First Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter first name"
        placeholderTextColor="#999"
        value={data.firstName}
        onChangeText={(v) => onChange('firstName', v)}
      />

      <Text style={styles.label}>Middle Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter middle name (optional)"
        placeholderTextColor="#999"
        value={data.middleName}
        onChangeText={(v) => onChange('middleName', v)}
      />

      <Text style={styles.label}>Last Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter last name"
        placeholderTextColor="#999"
        value={data.lastName}
        onChangeText={(v) => onChange('lastName', v)}
      />

      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter phone number"
        placeholderTextColor="#999"
        value={data.phone}
        onChangeText={(v) => onChange('phone', v)}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Date of Birth *</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
        value={data.dob}
        onChangeText={(v) => onChange('dob', v)}
      />

      <TouchableOpacity style={styles.button} onPress={validate}>
        <Text style={styles.buttonText}>Next →</Text>
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
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>Who Are You?</Text>
      <Text style={styles.stepSubtitle}>Select your role in the app</Text>

      {/* Elderly Option */}
      <TouchableOpacity
        style={[
          styles.roleCard,
          data.role === 'elderly' && styles.roleCardSelected,
        ]}
        onPress={() => onChange('role', 'elderly')}
      >
        <Text style={styles.roleEmoji}>👴</Text>
        <View style={styles.roleTextContainer}>
          <Text style={[
            styles.roleTitle,
            data.role === 'elderly' && styles.roleTextSelected
          ]}>
            I'm Elderly
          </Text>
          <Text style={[
            styles.roleDesc,
            data.role === 'elderly' && styles.roleDescSelected
          ]}>
            I need support and care
          </Text>
        </View>
        {data.role === 'elderly' && (
          <Text style={styles.roleCheck}>✓</Text>
        )}
      </TouchableOpacity>

      {/* Caregiver Option */}
      <TouchableOpacity
        style={[
          styles.roleCard,
          data.role === 'caregiver' && styles.roleCardSelected,
        ]}
        onPress={() => onChange('role', 'caregiver')}
      >
        <Text style={styles.roleEmoji}>👨‍⚕️</Text>
        <View style={styles.roleTextContainer}>
          <Text style={[
            styles.roleTitle,
            data.role === 'caregiver' && styles.roleTextSelected
          ]}>
            I'm a Caregiver
          </Text>
          <Text style={[
            styles.roleDesc,
            data.role === 'caregiver' && styles.roleDescSelected
          ]}>
            I look after someone
          </Text>
        </View>
        {data.role === 'caregiver' && (
          <Text style={styles.roleCheck}>✓</Text>
        )}
      </TouchableOpacity>

      <View style={styles.rowButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={validate}>
          <Text style={styles.buttonText}>Next →</Text>
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
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Almost Done!</Text>
      <Text style={styles.stepSubtitle}>Set up your login credentials</Text>

      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#999"
        value={data.email}
        onChangeText={(v) => onChange('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password *</Text>
      <TextInput
        style={styles.input}
        placeholder="Create a password"
        placeholderTextColor="#999"
        value={data.password}
        onChangeText={(v) => onChange('password', v)}
        secureTextEntry
      />

      <Text style={styles.label}>Confirm Password *</Text>
      <TextInput
        style={styles.input}
        placeholder="Repeat your password"
        placeholderTextColor="#999"
        value={data.confirmPassword}
        onChangeText={(v) => onChange('confirmPassword', v)}
        secureTextEntry
      />

      <View style={styles.rowButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { flex: 1 }, loading && styles.buttonDisabled]}
          onPress={validate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

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
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        )}

      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2D6A4F',
  background: '#F8F9FA',
  text: '#1A1A2E',
  subtle: '#666',
  border: '#E0E0E0',
  white: '#fff',
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 36,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  stepDotDone: {
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.subtle,
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  backButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 28,
    marginRight: 12,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FAF5',
  },
  roleEmoji: {
    fontSize: 36,
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  roleTextSelected: {
    color: COLORS.primary,
  },
  roleDesc: {
    fontSize: 13,
    color: COLORS.subtle,
    marginTop: 2,
  },
  roleDescSelected: {
    color: COLORS.primary,
    opacity: 0.8,
  },
  roleCheck: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: '700',
  },
  loginText: {
    textAlign: 'center',
    color: COLORS.subtle,
    fontSize: 15,
    marginTop: 20,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
})