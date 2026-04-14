/** Pool of quiz items; five are picked at random per session. */
export const QUIZ_POOL = [
  {
    question: 'Which food is often recommended for brain health?',
    options: ['Oily fish', 'Sugary soda', 'White bread', 'Candy'],
    correctIndex: 0,
  },
  {
    question: 'A short daily walk can help with:',
    options: ['Mood and circulation', 'Only hair growth', 'Screen brightness', 'Wi‑Fi speed'],
    correctIndex: 0,
  },
  {
    question: 'Staying socially connected may:',
    options: ['Support memory and mood', 'Replace sleep', 'Remove medications', 'Guarantee no stress'],
    correctIndex: 0,
  },
  {
    question: 'Which habit supports good sleep?',
    options: ['Regular bedtime', 'Late caffeine', 'Bright screens in bed', 'Skipping breakfast always'],
    correctIndex: 0,
  },
  {
    question: 'Hydration is important because it helps:',
    options: ['Energy and focus', 'Phone battery', 'Furniture polish', 'Car tires'],
    correctIndex: 0,
  },
  {
    question: 'Gentle stretching can improve:',
    options: ['Flexibility and comfort', 'TV channels', 'Password strength', 'Weather'],
    correctIndex: 0,
  },
  {
    question: 'If you feel confused or unwell, a good first step is often:',
    options: ['Tell someone you trust', 'Ignore it completely', 'Turn off all lights', 'Skip meals'],
    correctIndex: 0,
  },
  {
    question: 'Reading or puzzles can be good for:',
    options: ['Keeping the mind active', 'Washing dishes', 'Fuel economy', 'Laundry cycles'],
    correctIndex: 0,
  },
  {
    question: 'Deep breathing for one minute may:',
    options: ['Lower stress in the moment', 'Cook dinner', 'Fix appliances', 'Sort mail'],
    correctIndex: 0,
  },
  {
    question: 'Fruits and vegetables are helpful because they provide:',
    options: ['Vitamins and fiber', 'Only sugar spikes', 'Engine oil', 'Plastic'],
    correctIndex: 0,
  },
  {
    question: 'A balanced day often includes:',
    options: ['Movement, rest, and connection', 'Only screen time', 'Skipping water', 'No meals'],
    correctIndex: 0,
  },
  {
    question: 'Music you enjoy can:',
    options: ['Lift your mood', 'Replace prescriptions', 'Charge devices', 'Drive the car'],
    correctIndex: 0,
  },
]

export function pickRandomQuestions(count = 5) {
  const copy = [...QUIZ_POOL]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(count, copy.length))
}
