import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { logoutUser } from '../../services/auth.service'

export default function CaregiverProfile() {
  const router = useRouter()

  async function handleLogout() {
    await logoutUser()
    router.replace('/')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <TouchableOpacity style={styles.btn} onPress={handleLogout}>
        <Text style={styles.btnText}>Log Out</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 20 }}>This is a placeholder screen</Text>
      <TouchableOpacity onPress={() => router.push('/(caregiver)/SearchElderly')}>
        <Text>Find Elderly</Text>
      </TouchableOpacity>
    </View>
    
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FA' },
  title:     { fontSize: 22, fontWeight: '700', marginBottom: 32, color: '#1A1A2E' },
  btn:       { backgroundColor: '#E63946', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
})

