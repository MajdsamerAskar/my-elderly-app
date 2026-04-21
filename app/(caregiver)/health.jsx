import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { getCurrentUser } from '../../services/auth.service'
import { getLinkedElderly } from '../../services/Caregiver.service'
import { supabase } from '../../lib/supabase'

// Adjust this path if necessary based on your folder structure
import {
  CaregiverBiometricsSection,
  CaregiverSleepSection,
  CaregiverActivitySection,
  CaregiverWellnessSection,
} from '../../Componet/caregiverHealth/HealthSections'

import { HealthModal } from '../../Componet/health/HealthModals'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getInitials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function calcAge(dob) {
  if (!dob) return null
  return Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
}

// ─────────────────────────────────────────────
// ELDERLY SELECTOR
// ─────────────────────────────────────────────

function ElderlySelector({ list, selected, onSelect }) {
  if (!list.length) return null

  return (
    <View className="mb-5">
      <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Select patient
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3 pb-1">
          {list.map(e => {
            const active = selected?.user_id === e.user_id
            const age    = calcAge(e.date_of_birth)

            return (
              <TouchableOpacity
                key={e.user_id}
                className={`items-center py-2.5 px-3.5 rounded-2xl border-2 min-w-[72px] ${
                  active
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
                onPress={() => onSelect(e)}
                activeOpacity={0.8}
              >
                <View
                  className={`w-11 h-11 rounded-full items-center justify-center mb-1.5 ${
                    active ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      active ? 'text-blue-500' : 'text-gray-500'
                    }`}
                  >
                    {getInitials(e.first_name, e.last_name)}
                  </Text>
                </View>

                <Text
                  className={`text-sm font-bold ${
                    active ? 'text-blue-500' : 'text-gray-900'
                  }`}
                >
                  {e.first_name}
                </Text>

                {age
                  ? <Text className="text-xs text-gray-400 mt-0.5">{age} yrs</Text>
                  : null
                }
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function CaregiverHealthPage() {
  const [patients,         setPatients]         = useState([])
  const [selectedPatient,  setSelectedPatient]  = useState(null)
  const [loadingPatients,  setLoadingPatients]  = useState(true)
  const [patientsError,    setPatientsError]    = useState(null)
  const [modalConfig,      setModalConfig]      = useState(null);

  const openModal = (config) => setModalConfig(config);
  const closeModal = () => setModalConfig(null);

  // ── Load caregiver's linked patients once on mount ────────
  useEffect(() => {
    ;(async () => {
      try {
        const user    = await getCurrentUser()
        const linked  = await getLinkedElderly(user.user_id)

        // Enrich with date_of_birth if getLinkedElderly returns partial objects
        let enriched = linked
        if (linked.length && !linked[0].date_of_birth) {
          const ids = linked.map(p => p.user_id)
          const { data } = await supabase
            .from('users')
            .select('user_id, first_name, last_name, date_of_birth')
            .in('user_id', ids)
          if (data) enriched = data
        }

        setPatients(enriched)
        if (enriched.length) setSelectedPatient(enriched[0])
      } catch (e) {
        setPatientsError(e.message ?? 'Could not load patients')
      } finally {
        setLoadingPatients(false)
      }
    })()
  }, [])

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  if (loadingPatients) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (patientsError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-xl text-gray-500 text-center">{patientsError}</Text>
      </View>
    )
  }

  if (!patients.length) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-medium text-gray-900 text-center mb-2">
          No linked patients
        </Text>
        <Text className="text-lg text-gray-400 text-center">
          Send a request to an elderly user to get started.
        </Text>
      </View>
    )
  }

  // ─────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="px-4 pt-6 pb-10"
      showsVerticalScrollIndicator={false}
    >
      {/* Page title */}
      <Text className="text-3xl font-medium text-gray-900 mb-1">
        Health Overview
      </Text>
      <Text className="text-lg text-gray-400 mb-5">
        Tap any section to view history
      </Text>

      {/* Patient picker */}
      <ElderlySelector
        list={patients}
        selected={selectedPatient}
        onSelect={setSelectedPatient}
      />

      {/* Selected patient name */}
      {selectedPatient && (
        <Text className="text-xl font-medium text-gray-900 mb-5">
          {selectedPatient.first_name} {selectedPatient.last_name}
        </Text>
      )}

      {/* Sections are given 'onAdd={openModal}' 
        so the child component can trigger the parent's modal logic.
      */}
      {selectedPatient && (
        <View key={selectedPatient.user_id}>
          <CaregiverBiometricsSection 
            elderlyUserId={selectedPatient.user_id} 
            onAdd={openModal} 
          />
          <CaregiverSleepSection      
            elderlyUserId={selectedPatient.user_id} 
            onAdd={openModal} 
          />
          <CaregiverActivitySection   
            elderlyUserId={selectedPatient.user_id} 
            onAdd={openModal} 
          />
          <CaregiverWellnessSection   
            elderlyUserId={selectedPatient.user_id} 
            onAdd={openModal} 
          />
        </View>
      )}

      {/* Modal is rendered here in the main page where its config state lives */}
      <HealthModal
        visible={!!modalConfig}
        config={modalConfig}
        onClose={closeModal}
      />
    </ScrollView>
  )
}