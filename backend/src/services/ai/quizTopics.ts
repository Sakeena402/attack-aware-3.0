export const QUIZ_TOPICS = [
  'Phishing Fundamentals',
  'Social Engineering Defense',
  'Secure Password Practices',
  'Safe Browsing Habits',
  'Data Privacy & Handling',
  'Physical Security Awareness',
  'Remote Work Security',
  'Insider Threat Awareness',
] as const;

export type QuizTopic = (typeof QUIZ_TOPICS)[number];

export function getNextQuizTopic(currentTopic?: QuizTopic | string): QuizTopic {
  if (!currentTopic) {
    return QUIZ_TOPICS[0];
  }

  const index = QUIZ_TOPICS.indexOf(currentTopic as QuizTopic);
  if (index === -1) {
    return QUIZ_TOPICS[0];
  }

  const nextIndex = (index + 1) % QUIZ_TOPICS.length;
  return QUIZ_TOPICS[nextIndex];
}
