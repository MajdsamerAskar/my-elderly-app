import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'

export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  className = '',
  textClassName = '',
}) {
  const isDisabled = disabled || loading
  const variantClass =
    variant === 'outline'
      ? 'border border-uni-border bg-uni-surface'
      : 'bg-uni-primary'

  const textVariantClass = variant === 'outline' ? 'text-uni-ink' : 'text-white'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`items-center justify-center rounded-xl px-4 py-4 ${variantClass} ${isDisabled ? 'opacity-60' : ''} ${className}`}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#1A1A2E' : '#FFFFFF'} />
      ) : (
        <Text className={`text-base font-bold ${textVariantClass} ${textClassName}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}
