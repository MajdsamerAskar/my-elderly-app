import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  I18nManager,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import { getCurrentUser, logoutUser } from '../../services/auth.service'
import { Ionicons } from '@expo/vector-icons'

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ku', label: 'کوردی' },
]

function getProfileLocale(language) {
  const candidates = language?.startsWith('ar')
    ? ['ar-IQ', 'ar']
    : language?.startsWith('ku')
      ? ['ckb-IQ', 'ku', 'ar-IQ']
      : ['en-US', 'en']

  for (const locale of candidates) {
    try {
      if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length) return locale
    } catch {}
  }

  return 'en-US'
}

function getDisplayName(user, fallback) {
  const parts = [user?.first_name, user?.middle_name, user?.last_name].filter(Boolean)
  return parts.join(' ') || fallback
}

function getInitials(user) {
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('')
  return initials.toUpperCase() || 'U'
}

function formatDateValue(value, locale) {
  if (!value) return null
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMemberSince(value, locale) {
  if (!value) return null
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
  })
}

function getLanguageLabel(language) {
  const normalized = language?.split('-')[0]
  return LANGUAGE_OPTIONS.find((option) => option.code === normalized)?.label ?? LANGUAGE_OPTIONS[0].label
}

function ScreenHeader({ title, onBack, iconColor }) {
  return (
    <View className="bg-surface px-4 py-4 flex-row items-center border-b border-border">
      <TouchableOpacity onPress={onBack} className="mr-3">
        <Ionicons name="arrow-back" size={24} color={iconColor} />
      </TouchableOpacity>
      <Text className="text-lg font-bold text-text">{title}</Text>
    </View>
  )
}

function InfoRow({ label, value, isLast }) {
  return (
    <View className={`flex-row justify-between py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <Text className="text-text-secondary text-base">{label}</Text>
      <Text className="text-text text-base font-medium flex-1 text-right ml-4">{value}</Text>
    </View>
  )
}

function LoadingState({ label }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator size="large" color="#5B8CFF" />
      <Text className="text-text-secondary mt-4 text-center">{label}</Text>
    </View>
  )
}

function ErrorState({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-text text-lg font-semibold text-center mb-2">{message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        className="mt-2 bg-primary_blue rounded-xl px-5 py-3 items-center"
      >
        <Text className="text-white font-semibold">{t('tryAgain') || 'Try again'}</Text>
      </TouchableOpacity>
    </View>
  )
}

function AccountDetailsScreen({ onBack, user, loading, error, onRetry, locale, iconColor }) {
  const { t } = useTranslation()
  const fallbackText = t('notAvailable') || 'Not available'
  const displayName = getDisplayName(user, t('unknownUser') || 'Unknown user')

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScreenHeader title={t('accountDetails')} onBack={onBack} iconColor={iconColor} />
        <LoadingState label={t('loadingProfile') || 'Loading profile...'} />
      </SafeAreaView>
    )
  }

  if (error && !user) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScreenHeader title={t('accountDetails')} onBack={onBack} iconColor={iconColor} />
        <ErrorState message={t('couldNotLoadProfile') || 'Could not load profile.'} onRetry={onRetry} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title={t('accountDetails')} onBack={onBack} iconColor={iconColor} />

      <ScrollView className="px-4 pt-4">
        <View className="bg-surface rounded-2xl p-5 mb-4 shadow-sm">
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-primary_blue items-center justify-center mb-3">
              <Text className="text-white text-2xl font-bold">{getInitials(user)}</Text>
            </View>
            <Text className="text-xl font-bold text-text">{displayName}</Text>
            <Text className="text-text-secondary">{user?.email || fallbackText}</Text>
          </View>

          <InfoRow label={t('fullName')} value={displayName} />
          <InfoRow label={t('email')} value={user?.email || fallbackText} />
          <InfoRow label={t('phone')} value={user?.phone_number || fallbackText} />
          <InfoRow
            label={t('dateOfBirth')}
            value={formatDateValue(user?.date_of_birth, locale) || fallbackText}
          />
          <InfoRow
            label={t('memberSince')}
            value={formatMemberSince(user?.created_at, locale) || fallbackText}
            isLast
          />
        </View>

        {error ? (
          <Text className="text-text-secondary text-center mb-4">
            {t('couldNotLoadProfile') || 'Could not load profile.'}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function LanguageScreen({ selectedCode, onSelect, onBack, iconColor }) {
  const { t } = useTranslation()

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title={t('language')} onBack={onBack} iconColor={iconColor} />

      <View className="px-4 pt-4">
        <View className="bg-surface rounded-2xl overflow-hidden shadow-sm">
          {LANGUAGE_OPTIONS.map((language, index) => (
            <TouchableOpacity
              key={language.code}
              onPress={() => onSelect(language.code)}
              className={`flex-row items-center justify-between px-5 py-4 ${
                index !== LANGUAGE_OPTIONS.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <Text className={`text-base ${selectedCode === language.code ? 'font-bold text-text' : 'text-text'}`}>
                {language.label}
              </Text>
              {selectedCode === language.code ? (
                <Ionicons name="checkmark" size={22} color="#E63946" />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

function ColorModeScreen({ selected, onSelect, onBack, iconColor, secondaryIconColor }) {
  const { t } = useTranslation()
  const modes = [
    { key: 'light', label: t('lightMode'), icon: 'sunny-outline' },
    { key: 'dark', label: t('darkMode'), icon: 'moon-outline' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title={t('colorMode')} onBack={onBack} iconColor={iconColor} />

      <View className="px-4 pt-4">
        <View className="bg-surface rounded-2xl overflow-hidden shadow-sm">
          {modes.map((mode, index) => (
            <TouchableOpacity
              key={mode.key}
              onPress={() => onSelect(mode.key)}
              className={`flex-row items-center justify-between px-5 py-4 ${
                index !== modes.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <View className="flex-row items-center">
                <Ionicons name={mode.icon} size={22} color={secondaryIconColor} style={{ marginRight: 12 }} />
                <Text className={`text-base ${selected === mode.key ? 'font-bold text-text' : 'text-text'}`}>
                  {mode.label}
                </Text>
              </View>
              {selected === mode.key ? (
                <Ionicons name="checkmark" size={22} color="#E63946" />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

function LogoutConfirmModal({ visible, onConfirm, onCancel }) {
  const { t } = useTranslation()

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View className="flex-1 bg-black/40 justify-center items-center px-6">
        <View className="bg-surface rounded-2xl w-full max-w-sm p-6">
          <View className="items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-3">
              <Ionicons name="log-out-outline" size={24} color="#E63946" />
            </View>
            <Text className="text-lg font-bold text-text">{t('logOut')}?</Text>
          </View>

          <Text className="text-text-secondary text-center mb-6">
            {t('confirmLogout')}
          </Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl py-3 items-center"
            >
              <Text className="text-text font-semibold">{t('cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="flex-1 bg-primary_red rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">{t('logOut')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function MenuItem({
  icon,
  label,
  value,
  onPress,
  isLast,
  isDanger,
  iconColor,
  chevronColor,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-5 py-4 ${!isLast ? 'border-b border-border' : ''}`}
    >
      <Ionicons
        name={icon}
        size={22}
        color={isDanger ? '#E63946' : iconColor}
        style={{ marginRight: 12 }}
      />
      <Text className={`flex-1 text-base ${isDanger ? 'text-[#E63946]' : 'text-text'}`}>
        {label}
      </Text>
      {value ? (
        <Text className="text-text-secondary mr-2">{value}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={chevronColor} />
    </TouchableOpacity>
  )
}

export default function CaregiverProfile() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const { toggleTheme, isDark } = useTheme()
  const locale = getProfileLocale(i18n.language)
  const selectedLanguageCode = i18n.language?.split('-')[0] || 'en'
  const selectedLanguageLabel = getLanguageLabel(i18n.language)
  const colorMode = isDark ? 'dark' : 'light'
  const headerIconColor = isDark ? '#F5F5F5' : '#1A1A2E'
  const secondaryIconColor = isDark ? '#F5F5F5' : '#6B7280'

  const [currentScreen, setCurrentScreen] = useState('main')
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoadingProfile(true)
    setProfileError(null)
    try {
      const user = await getCurrentUser()
      setProfile(user)
    } catch (error) {
      setProfileError(error.message || (t('couldNotLoadProfile') || 'Could not load profile.'))
    } finally {
      setLoadingProfile(false)
    }
  }

  async function handleLogout() {
    await logoutUser()
    setShowLogoutModal(false)
    router.replace('/')
  }

  async function handleLanguageChange(code) {
    await i18n.changeLanguage(code)

    const isRTL = ['ar', 'ku'].includes(code)
    if (isRTL !== I18nManager.isRTL) {
      I18nManager.forceRTL(isRTL)
    }
  }

  async function handleColorModeChange(mode) {
    await toggleTheme(mode)
  }

  const displayName = getDisplayName(profile, t('unknownUser') || 'Unknown user')
  const fallbackText = t('notAvailable') || 'Not available'

  if (currentScreen === 'account') {
    return (
      <AccountDetailsScreen
        onBack={() => setCurrentScreen('main')}
        user={profile}
        loading={loadingProfile}
        error={profileError}
        onRetry={loadProfile}
        locale={locale}
        iconColor={headerIconColor}
      />
    )
  }

  if (currentScreen === 'language') {
    return (
      <LanguageScreen
        selectedCode={selectedLanguageCode}
        onSelect={handleLanguageChange}
        onBack={() => setCurrentScreen('main')}
        iconColor={headerIconColor}
      />
    )
  }

  if (currentScreen === 'color') {
    return (
      <ColorModeScreen
        selected={colorMode}
        onSelect={handleColorModeChange}
        onBack={() => setCurrentScreen('main')}
        iconColor={headerIconColor}
        secondaryIconColor={secondaryIconColor}
      />
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1">
        <View className="items-center pt-8 pb-6 px-4">
          <View className="w-24 h-24 rounded-full bg-primary_blue items-center justify-center mb-3 shadow-sm">
            {loadingProfile ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-[28px] font-bold">{getInitials(profile)}</Text>
            )}
          </View>
          <Text className="text-xl font-bold text-text text-center">
            {loadingProfile ? (t('loadingProfile') || 'Loading profile...') : displayName}
          </Text>
          <Text className="text-text-secondary text-sm mt-1 text-center">
            {profile?.email || (!loadingProfile ? fallbackText : '')}
          </Text>
        </View>

        {profileError ? (
          <View className="px-4 mb-4">
            <View className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-2xl px-4 py-3">
              <Text className="text-red-600 dark:text-red-300 text-center">
                {t('couldNotLoadProfile') || 'Could not load profile.'}
              </Text>
              <TouchableOpacity onPress={loadProfile} className="mt-3 items-center">
                <Text className="text-blue-600 dark:text-blue-300 font-semibold">
                  {t('tryAgain') || 'Try again'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View className="px-4">
          <View className="bg-surface rounded-2xl overflow-hidden shadow-sm">
            <MenuItem
              icon="person-outline"
              label={t('viewAccountDetails')}
              onPress={() => setCurrentScreen('account')}
              iconColor={secondaryIconColor}
              chevronColor={secondaryIconColor}
            />
            <MenuItem
              icon="search-outline"
              label={t('searchElderly') || 'Find Elderly'}
              onPress={() => router.push('/(caregiver)/SearchElderly')}
              iconColor={secondaryIconColor}
              chevronColor={secondaryIconColor}
            />
            <MenuItem
              icon="language-outline"
              label={t('language')}
              value={selectedLanguageLabel}
              onPress={() => setCurrentScreen('language')}
              iconColor={secondaryIconColor}
              chevronColor={secondaryIconColor}
            />
            <MenuItem
              icon="color-palette-outline"
              label={t('colorMode')}
              value={colorMode === 'light' ? t('lightMode') : t('darkMode')}
              onPress={() => setCurrentScreen('color')}
              iconColor={secondaryIconColor}
              chevronColor={secondaryIconColor}
            />
            <MenuItem
              icon="log-out-outline"
              label={t('logOut')}
              isLast
              isDanger
              onPress={() => setShowLogoutModal(true)}
              iconColor={secondaryIconColor}
              chevronColor={secondaryIconColor}
            />
          </View>
        </View>
      </ScrollView>

      <LogoutConfirmModal
        visible={showLogoutModal}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  )
}
