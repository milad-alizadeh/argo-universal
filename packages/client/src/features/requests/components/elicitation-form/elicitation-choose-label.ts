import type { ElicitationQuestion } from './elicitation-questions';

// The hint that heads a question's choices.
export const chooseLabel = (question: ElicitationQuestion): string =>
  question.multiple ? 'Choose one or more' : 'Choose one';
