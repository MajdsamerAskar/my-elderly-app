import { Text, TextInput, View } from 'react-native'

export default function AppInput({ label, className = '', inputClassName = '', ...props }) {
  return (
    <View className={`mt-4 ${className}`}>
      {label ? <Text className="mb-2 text-[15px] font-semibold text-uni-ink">{label}</Text> : null}
      <TextInput
        className={`rounded-xl border border-uni-border bg-uni-surface px-4 py-3.5 text-base text-uni-ink ${inputClassName}`}
        placeholderTextColor="#999"
        {...props}
      />
    </View>
  )
}
