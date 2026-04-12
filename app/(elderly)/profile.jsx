import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { logoutUser } from '../../services/auth.service'

export default function ElderlyProfile() {
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F3EE' },
  title:     { fontSize: 22, fontWeight: '700', marginBottom: 32, color: '#1A1A2E' },
  btn:       { backgroundColor: '#E63946', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
})