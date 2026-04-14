import { Text, TouchableOpacity } from 'react-native'

export default function MetricCard({ emoji, label, value, hint = 'Tap to log', onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mb-2 w-[48%] items-center rounded-uni-card border border-uni-border bg-uni-surface p-4"
    >
      <Text className="mb-2 text-[28px]">{emoji}</Text>
      <Text className="text-center text-xs text-uni-muted">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-uni-ink">{value}</Text>
      <Text className="mt-1 text-[11px] text-uni-primary">{hint}</Text>
    </TouchableOpacity>
  )
}
