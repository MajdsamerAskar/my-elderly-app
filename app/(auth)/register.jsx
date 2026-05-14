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
  StatusBar,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import { registerUser } from '../../services/auth.service'

function formatDate(date) {
  if (!date) return ''
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function toISODate(date) {
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

function DOBPicker({ value, onChange }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [tempDate, setTempDate] = useState(value ?? new Date(1960, 0, 1))

  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() - 18)

  function openAndroid() {
    setShowAndroid(true)
  }

  function onAndroidChange(event, selected) {
    setShowAndroid(false)
    if (event.type === 'set' && selected) {
      onChange(selected)
    }
  }

  function openIOS() {
    setTempDate(value ?? new Date(1960, 0, 1))
    setShowIOSModal(true)
  }

  function confirmIOS() {
    onChange(tempDate)
    setShowIOSModal(false)
  }

  function cancelIOS() {
    setShowIOSModal(false)
  }

  return (
    <>
      <TouchableOpacity
        className="border border-border bg-surface rounded-xl px-4 py-3.5 flex-row items-center justify-between"
        onPress={Platform.OS === 'ios' ? openIOS : openAndroid}
        activeOpacity={0.7}
      >
        <Text className={`text-md ${value ? 'text-text' : 'text-text-secondary'}`}>
          {value ? formatDate(value) : (t('selectDateOfBirth') || 'Select date of birth')}
        </Text>
        <Text className="text-lg text-text-secondary">
          {t('date') || 'Date'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && showAndroid ? (
        <DateTimePicker
          value={value ?? new Date(1960, 0, 1)}
          mode="date"
          display="default"
          maximumDate={maxDate}
          minimumDate={new Date(1900, 0, 1)}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
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
          <View className="bg-surface rounded-t-3xl px-5 pb-8 pt-4">
            <View className="w-10 h-1 rounded-full bg-border self-center mb-4" />

            <Text className="text-[18px] font-bold text-text text-center mb-2">
              {t('dateOfBirth') || 'Date of Birth'}
            </Text>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              maximumDate={maxDate}
              minimumDate={new Date(1900, 0, 1)}
              onChange={(_, selected) => selected && setTempDate(selected)}
              style={{ height: 180 }}
              textColor={isDark ? '#F8FAFC' : '#1A1A2E'}
            />

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 border border-border rounded-xl py-3.5 items-center"
                onPress={cancelIOS}
              >
                <Text className="text-text font-semibold text-[16px]">
                  {t('cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary_blue rounded-xl py-3.5 items-center"
                onPress={confirmIOS}
              >
                <Text className="text-white font-bold text-[16px]">
                  {t('confirm') || 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  )
}

function StepIndicator({ currentStep, totalSteps }) {
  return (
    <View className="flex-row justify-center gap-2 mb-9">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          className={`h-2.5 rounded-full ${
            index + 1 === currentStep ? 'w-6' : 'w-2.5'
          } ${
            index + 1 < currentStep ? 'opacity-40' : ''
          } ${
            index + 1 <= currentStep ? 'bg-primary_blue' : 'bg-border'
          }`}
        />
      ))}
    </View>
  )
}

function StepPersonalInfo({ data, onChange, onNext }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  function validate() {
    if (!data.firstName || !data.lastName || !data.phone || !data.dob) {
      Alert.alert(
        t('missingInfo') || 'Missing Info',
        t('fillRequiredFields') || 'Please fill in all required fields'
      )
      return
    }
    onNext()
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <Text className="text-[30px] font-bold mb-1.5 text-text">
        {t('personalInfo') || 'Personal Info'}
      </Text>
      <Text className="text-[17px] mb-7 text-text-secondary">
        {t('tellUsAboutYourself') || 'Tell us about yourself'}
      </Text>

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-text">
        {t('firstName') || 'First Name'} *
      </Text>
      <TextInput
        className="border border-border bg-surface text-text rounded-xl px-4 py-3.5 text-md"
        placeholder={t('enterFirstName') || 'Enter first name'}
        placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
        value={data.firstName}
        onChangeText={(value) => onChange('firstName', value)}
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-text">
        {t('middleName') || 'Middle Name'}
      </Text>
      <TextInput
        className="border border-border bg-surface text-text rounded-xl px-4 py-3.5 text-md"
        placeholder={t('enterMiddleNameOptional') || 'Enter middle name (optional)'}
        placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
        value={data.middleName}
        onChangeText={(value) => onChange('middleName', value)}
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-text">
        {t('lastName') || 'Last Name'} *
      </Text>
      <TextInput
        className="border border-border bg-surface text-text rounded-xl px-4 py-3.5 text-md"
        placeholder={t('enterLastName') || 'Enter last name'}
        placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
        value={data.lastName}
        onChangeText={(value) => onChange('lastName', value)}
      />

      <Text className="text-[15px] font-semibold mb-2 mt-4 text-text">
        {t('phoneNumber') || 'Phone Number'} *
      </Text>
      <TextInput
        className="border border-border bg-surface text-text rounded-xl px-4 py-3.5 text-md"
        placeholder={t('enterPhoneNumber') || 'Enter phone number'}
        placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
        value={data.phone}
        onChangeText={(value) => onChange('phone', value)}
        keyboardType="phone-pad"
      />

      <Text className="text-[15px] font-semibold mb-2 mt-4 text-text">
        {t('dateOfBirth') || 'Date of Birth'} *
      </Text>
      <DOBPicker
        value={data.dobDate}
        onChange={(date) => {
          onChange('dobDate', date)
          onChange('dob', toISODate(date))
        }}
      />

      <TouchableOpacity
        className="bg-primary_blue rounded-xl py-4 items-center mt-7"
        onPress={validate}
      >
        <Text className="text-white text-[20px] font-bold">
          {t('next') || 'Next'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function RoleCard({ selected, title, description, onPress }) {
  return (
    <TouchableOpacity
      className={`border-2 rounded-2xl p-5 mt-4 ${
        selected
          ? 'bg-blue-50 dark:bg-blue-950/20 border-primary_blue'
          : 'bg-surface border-border'
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className={`text-lg font-bold ${selected ? 'text-blue-600 dark:text-blue-300' : 'text-text'}`}>
            {title}
          </Text>
          <Text className={`text-[13px] mt-0.5 ${selected ? 'text-blue-600 dark:text-blue-300 opacity-80' : 'text-text-secondary'}`}>
            {description}
          </Text>
        </View>
        {selected ? (
          <Text className="text-xl font-bold text-blue-600 dark:text-blue-300">✓</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

function StepRoleSelection({ data, onChange, onNext, onBack }) {
  const { t } = useTranslation()

  function validate() {
    if (!data.role) {
      Alert.alert(
        t('selectRole') || 'Select Role',
        t('pleaseSelectWhoYouAre') || 'Please select who you are'
      )
      return
    }
    onNext()
  }

  return (
    <View className="flex-1">
      <Text className="text-[30px] font-bold mb-1.5 text-text">
        {t('whoAreYou') || 'Who Are You?'}
      </Text>
      <Text className="text-[17px] mb-7 text-text-secondary">
        {t('selectYourRole') || 'Select your role in the app'}
      </Text>

      <RoleCard
        selected={data.role === 'elderly'}
        title={t('iAmElderly') || "I'm Elderly"}
        description={t('iNeedSupportAndCare') || 'I need support and care'}
        onPress={() => onChange('role', 'elderly')}
      />

      <RoleCard
        selected={data.role === 'caregiver'}
        title={t('iAmCaregiver') || "I'm a Caregiver"}
        description={t('iLookAfterSomeone') || 'I look after someone'}
        onPress={() => onChange('role', 'caregiver')}
      />

      <View className="flex-row items-center mt-7">
        <TouchableOpacity
          className="border rounded-xl py-4 px-5 items-center mr-3 border-border"
          onPress={onBack}
        >
          <Text className="text-md font-semibold text-text">
            {t('back') || 'Back'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded-xl py-4 items-center bg-primary_blue"
          onPress={validate}
        >
          <Text className="text-white text-[17px] font-bold">
            {t('next') || 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function StepSecurity({ data, onChange, onSubmit, onBack, loading }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  function validate() {
    if (!data.email || !data.password || !data.confirmPassword) {
      Alert.alert(
        t('missingInfo') || 'Missing Info',
        t('fillAllFields') || 'Please fill in all fields'
      )
      return
    }
    if (data.password !== data.confirmPassword) {
      Alert.alert(
        t('passwordMismatch') || 'Password Mismatch',
        t('passwordsDoNotMatch') || 'Passwords do not match'
      )
      return
    }
    if (data.password.length < 6) {
      Alert.alert(
        t('weakPassword') || 'Weak Password',
        t('passwordMinSix') || 'Password must be at least 6 characters'
      )
      return
    }
    onSubmit()
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <Text className="text-[30px] font-bold mb-1.5 text-text">
        {t('almostDone') || 'Almost Done!'}
      </Text>
      <Text className="text-[17px] mb-7 text-text-secondary">
        {t('setLoginCredentials') || 'Set up your login credentials'}
      </Text>

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-text">
        {t('email') || 'Email'} *
      </Text>
      <TextInput
        className="border rounded-xl px-4 py-3.5 text-md bg-surface border-border text-text"
        placeholder={t('enterYourEmail') || 'Enter your email'}
        placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
        value={data.email}
        onChangeText={(value) => onChange('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-text">
        {t('password') || 'Password'} *
      </Text>
      <TextInput
        className="border rounded-xl px-4 py-3.5 text-md bg-surface border-border text-text"
        placeholder={t('createPassword') || 'Create a password'}
        placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
        value={data.password}
        onChangeText={(value) => onChange('password', value)}
        secureTextEntry
      />

      <Text className="text-[17px] font-semibold mb-2 mt-4 text-text">
        {t('confirmPassword') || 'Confirm Password'} *
      </Text>
      <TextInput
        className="border rounded-xl px-4 py-3.5 text-md bg-surface border-border text-text"
        placeholder={t('repeatPassword') || 'Repeat your password'}
        placeholderTextColor={isDark ? '#94A3B8' : '#999999'}
        value={data.confirmPassword}
        onChangeText={(value) => onChange('confirmPassword', value)}
        secureTextEntry
      />

      <View className="flex-row items-center mt-7">
        <TouchableOpacity
          className="border rounded-xl py-4 px-5 items-center mr-3 border-border"
          onPress={onBack}
        >
          <Text className="text-md font-semibold text-text">
            {t('back') || 'Back'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`bg-primary_blue flex-1 rounded-xl py-4 items-center ${loading ? 'opacity-60' : ''}`}
          onPress={validate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-[17px] font-bold">
              {t('createAccount') || 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

export default function RegisterScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    dobDate: null,
    dob: '',
    role: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  function handleChange(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await registerUser(formData)
      Alert.alert(
        t('accountCreated') || 'Account Created!',
        t('welcomeYouCanLogin') || 'Welcome! You can now log in.',
        [{ text: t('goToLogin') || 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
      )
    } catch (error) {
      Alert.alert(
        t('registrationFailed') || 'Registration Failed',
        error.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="flex-1 px-7 pt-[60px] pb-6">
        <StepIndicator currentStep={step} totalSteps={3} />

        {step === 1 ? (
          <StepPersonalInfo
            data={formData}
            onChange={handleChange}
            onNext={() => setStep(2)}
          />
        ) : null}

        {step === 2 ? (
          <StepRoleSelection
            data={formData}
            onChange={handleChange}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        ) : null}

        {step === 3 ? (
          <StepSecurity
            data={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            loading={loading}
          />
        ) : null}

        {step === 1 ? (
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-center text-[15px] mt-5 text-text-secondary">
              {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
              <Text className="font-bold text-blue-600 dark:text-blue-300">
                {t('signIn') || 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  )
}
