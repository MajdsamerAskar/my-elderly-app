import { View, Text } from "react-native";

export default function MedicationCard({
  name,
  purpose,
  frequency,
  nextTime,
}) {
  return (
    <View className="bg-white p-4 rounded-2xl shadow-sm">
      <Text className="text-lg font-semibold">{name}</Text>
      
      <Text className="text-gray-500 mt-1">
        Purpose: {purpose}
      </Text>

      <Text className="text-gray-500">
        Frequency: {frequency}
      </Text>

      <Text className="text-blue-600 mt-2 font-medium">
        Next: {nextTime}
      </Text>
    </View>
  );
}