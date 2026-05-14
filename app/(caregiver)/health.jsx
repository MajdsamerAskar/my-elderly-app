import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../ThemeContext'
import { getCurrentUser } from '../../services/auth.service'
import { getLinkedElderly } from '../../services/Caregiver.service'
import { supabase } from '../../lib/supabase'
import {
  CaregiverBiometricsSection,
  CaregiverSleepSection,
  CaregiverActivitySection,
  CaregiverWellnessSection,
} from '../../Componet/caregiverHealth/HealthSections'
import { HealthModal } from '../../Componet/health/HealthModals'

function getInitials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function calcAge(dob) {
  if (!dob) return null
  return Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
}

function ElderlySelector({ list, selected, onSelect }) {
  const { t } = useTranslation()

  if (!list.length) return null

  return (
    <View className="mb-5">
      <Text className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">
        {t('selectPatient') || 'Select patient'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3 pb-1">
          {list.map((elderly) => {
            const active = selected?.user_id === elderly.user_id
            const age = calcAge(elderly.date_of_birth)

            return (
              <TouchableOpacity
                key={elderly.user_id}
                className={`items-center py-2.5 px-3.5 rounded-2xl border min-w-[72px] ${
                  active
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-border bg-surface'
                }`}
                onPress={() => onSelect(elderly)}
                activeOpacity={0.8}
              >
                <View
                  className={`w-11 h-11 rounded-full items-center justify-center mb-1.5 ${
                    active
                      ? 'bg-blue-100 dark:bg-blue-900/50'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      active ? 'text-blue-600 dark:text-blue-300' : 'text-text-secondary'
                    }`}
                  >
                    {getInitials(elderly.first_name, elderly.last_name)}
                  </Text>
                </View>

                <Text
                  className={`text-sm font-bold ${
                    active ? 'text-blue-600 dark:text-blue-300' : 'text-text'
                  }`}
                >
                  {elderly.first_name}
                </Text>

                {age ? (
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {t('yearsShort', { count: age, defaultValue: `${age} yrs` })}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

export default function CaregiverHealthPage() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [patientsError, setPatientsError] = useState(null)
  const [modalConfig, setModalConfig] = useState(null)

  const openModal = (config) => setModalConfig(config)
  const closeModal = () => setModalConfig(null)

  useEffect(() => {
    ;(async () => {
      try {
        const user = await getCurrentUser()
        const linked = await getLinkedElderly(user.user_id)

        let enriched = linked
        if (linked.length && !linked[0].date_of_birth) {
          const ids = linked.map((patient) => patient.user_id)
          const { data } = await supabase
            .from('users')
            .select('user_id, first_name, last_name, date_of_birth')
            .in('user_id', ids)

          if (data) enriched = data
        }

        setPatients(enriched)
        if (enriched.length) setSelectedPatient(enriched[0])
      } catch (error) {
        setPatientsError(error.message ?? (t('couldNotLoadPatients') || 'Could not load patients'))
      } finally {
        setLoadingPatients(false)
      }
    })()
  }, [t])

  if (loadingPatients) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-text-secondary mt-4">
          {t('loadingPatients') || 'Loading patients...'}
        </Text>
      </View>
    )
  }

  if (patientsError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text className="text-xl text-text text-center">{patientsError}</Text>
      </View>
    )
  }

  if (!patients.length) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text className="text-2xl font-medium text-text text-center mb-2">
          {t('noLinkedPatients') || 'No linked patients'}
        </Text>
        <Text className="text-lg text-text-secondary text-center">
          {t('sendRequestToGetStarted') || 'Send a request to an elderly user to get started.'}
        </Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pt-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-medium text-text mb-1">
          {t('healthOverview') || 'Health overview'}
        </Text>
        <Text className="text-lg text-text-secondary mb-5">
          {t('tapSectionToViewHistory') || 'Tap any section to view history'}
        </Text>

        <ElderlySelector
          list={patients}
          selected={selectedPatient}
          onSelect={setSelectedPatient}
        />

        {selectedPatient ? (
          <Text className="text-xl font-medium text-text mb-5">
            {selectedPatient.first_name} {selectedPatient.last_name}
          </Text>
        ) : null}

        {selectedPatient ? (
          <View key={selectedPatient.user_id}>
            <CaregiverBiometricsSection elderlyUserId={selectedPatient.user_id} onAdd={openModal} />
            <CaregiverSleepSection elderlyUserId={selectedPatient.user_id} onAdd={openModal} />
            <CaregiverActivitySection elderlyUserId={selectedPatient.user_id} onAdd={openModal} />
            <CaregiverWellnessSection elderlyUserId={selectedPatient.user_id} onAdd={openModal} />
          </View>
        ) : null}

        <HealthModal
          visible={!!modalConfig}
          config={modalConfig}
          onClose={closeModal}
        />
      </ScrollView>
    </>
  )
}
