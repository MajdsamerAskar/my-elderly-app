import { KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Auth shell: top brand band + rounded sheet (common mobile pattern in course Figma files).
 */
export default function AuthContainer({ children, heroSubtitle }) {
  return (
    <View className="flex-1 bg-uni-primary">
      <SafeAreaView edges={['top']} className="bg-uni-primary">
        <View className="px-7 pb-5 pt-1">
          <Text className="text-[11px] font-semibold uppercase tracking-[2.5px] text-white/70">
            Uni Final Project
          </Text>
          <Text className="mt-1.5 text-[26px] font-bold leading-8 text-white">My Elderly App</Text>
          {heroSubtitle ? (
            <Text className="mt-2 max-w-[320px] text-[15px] leading-5 text-white/90">{heroSubtitle}</Text>
          ) : null}
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        className="flex-1 rounded-t-uni-sheet bg-uni-canvas"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-7 pt-7">{children}</View>
      </KeyboardAvoidingView>
    </View>
  )
}
