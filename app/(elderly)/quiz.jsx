import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppButton from '../../components/ui/AppButton'
import { pickRandomQuestions } from '../../constants/quizData'

export default function QuizScreen() {
  const router = useRouter()
  const [session, setSession] = useState(0)
  const questions = useMemo(() => pickRandomQuestions(5), [session])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState({})
  const [finished, setFinished] = useState(false)

  const current = questions[index]
  const total = questions.length

  const score = useMemo(() => {
    let s = 0
    questions.forEach((q, i) => {
      if (selected[i] === q.correctIndex) s += 1
    })
    return s
  }, [questions, selected])

  const choose = optionIdx => {
    if (finished) return
    setSelected(prev => ({ ...prev, [index]: optionIdx }))
  }

  const goNext = () => {
    if (index < total - 1) setIndex(index + 1)
    else setFinished(true)
  }

  const restart = () => {
    setSession(s => s + 1)
    setIndex(0)
    setSelected({})
    setFinished(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-uni-canvas" edges={['top']}>
      <View className="border-b border-uni-border bg-uni-surface px-4 py-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-uni-primary">Mental activity</Text>
        <Text className="text-lg font-bold text-uni-ink">Quick quiz</Text>
      </View>

      {!finished ? (
        <ScrollView className="flex-1 px-4 pt-5" contentContainerClassName="pb-8">
          <Text className="mb-4 text-sm font-semibold text-uni-muted">
            Question {index + 1} of {total}
          </Text>
          <View className="rounded-2xl border border-uni-border bg-uni-surface p-5">
            <Text className="text-[18px] font-semibold leading-7 text-uni-ink">{current?.question}</Text>
          </View>
          <View className="mt-4">
            {current?.options.map((opt, optIdx) => {
              const isChosen = selected[index] === optIdx
              return (
                <TouchableOpacity
                  key={optIdx}
                  onPress={() => choose(optIdx)}
                  className={`mb-3 rounded-2xl border px-4 py-4 ${
                    isChosen ? 'border-uni-primary bg-uni-primary/10' : 'border-uni-border bg-uni-surface'
                  }`}
                  activeOpacity={0.85}
                >
                  <Text className="text-[16px] text-uni-ink">{opt}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <AppButton
            title={index < total - 1 ? 'Next question' : 'See results'}
            onPress={goNext}
            disabled={selected[index] === undefined}
          />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl">🎉</Text>
          <Text className="mt-4 text-center text-2xl font-bold text-uni-ink">Nice work</Text>
          <Text className="mt-2 text-center text-[16px] text-uni-muted">
            You answered {score} out of {total} correctly.
          </Text>
          <View className="mt-8 w-full gap-3">
            <AppButton title="Try another quiz" onPress={restart} />
            <AppButton
              title="Back to family tree"
              variant="outline"
              onPress={() => router.push('/(elderly)/mental')}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
