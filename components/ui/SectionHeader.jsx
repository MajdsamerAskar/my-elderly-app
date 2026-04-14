import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { uniTheme } from '../../constants/uniTheme'

export default function SectionHeader({ icon, iconColor = uniTheme.primary, title, badgeCount }) {
  return (
    <View className="mb-3 flex-row items-center">
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text className="ml-2 flex-1 text-[17px] font-bold text-uni-ink">{title}</Text>
      {badgeCount > 0 ? (
        <View className="rounded-full bg-uni-danger px-2 py-0.5">
          <Text className="text-xs font-bold text-white">{badgeCount}</Text>
        </View>
      ) : null}
    </View>
  )
}
