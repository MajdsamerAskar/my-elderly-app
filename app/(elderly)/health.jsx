import { useEffect, useState } from 'react'
import { View, ScrollView, ActivityIndicator, StatusBar } from 'react-native'
import { useTheme } from '../../ThemeContext'
import { getCurrentUser } from '../../services/auth.service'
import {
  BiometricsSection,
  SleepSection,
  ActivitySection,
  WellnessSection,
} from '../../Componet/health/HealthSections';
import { HealthModal } from '../../Componet/health/HealthModals';

export default function HealthSection() {
  const { isDark } = useTheme()
  const [userId, setUserId] = useState(null)
  const [modalConfig, setModalConfig] = useState(null)

  const openModal = (config) => setModalConfig(config)
  const closeModal = () => setModalConfig(null)

  useEffect(() => {
    getCurrentUser().then(u => u && setUserId(u.user_id)).catch(console.error)
  }, [])

  if (!userId) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#3b82f6" />
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
        <BiometricsSection userId={userId} onLog={openModal} />
        <SleepSection userId={userId} onLog={openModal} />
        <ActivitySection userId={userId} onLog={openModal} />
        <WellnessSection userId={userId} onLog={openModal} />
        <HealthModal
          visible={!!modalConfig}
          config={modalConfig}
          onClose={closeModal}
        />
      </ScrollView>
    </>
  )
}
