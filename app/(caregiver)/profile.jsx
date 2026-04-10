import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router'

export default function PlaceholderScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>This is a placeholder screen</Text>
      <TouchableOpacity onPress={() => router.push('/(caregiver)/SearchElderly')}>
        <Text>Find Elderly</Text>
      </TouchableOpacity>
    </View>
  );
}