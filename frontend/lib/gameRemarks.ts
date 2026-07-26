export function getRemark(percentage: number): { text: string; emoji: string } {
  if (percentage >= 90) return { emoji: '🏆', text: "Outstanding! You're a true Cyber Guardian." };
  if (percentage >= 75) return { emoji: '🎯', text: 'Great job! Your awareness game is strong.' };
  if (percentage >= 50) return { emoji: '👍', text: "Good effort — a bit more practice and you'll master this." };
  if (percentage >= 25) return { emoji: '⚠️', text: 'Getting there. Review the tips below and try again.' };
  return { emoji: '🚨', text: 'Stay alert — cyber threats are tricky. Give it another shot!' };
}