import type { QuestionModel } from '../../hooks/use-elicitation-questions';

export function selectedAnswers(model: QuestionModel): string[] {
  if (Array.isArray(model.value)) return model.value;
  return typeof model.value === 'string' ? [model.value] : [];
}

export function choiceValue(
  model: QuestionModel,
  choice: string,
  checked: boolean,
): string | string[] {
  if (!model.question.multiple) return choice;
  const values = selectedAnswers(model).filter((answer) => answer !== choice);
  return checked ? [...values, choice] : values;
}

export function customAnswer(model: QuestionModel): string {
  return selectedAnswers(model).find((answer) => !offered(model, answer)) ?? '';
}

export function customValue(
  model: QuestionModel,
  text: string,
): string | string[] {
  if (!model.question.multiple) return text;
  const choices = selectedAnswers(model).filter((answer) =>
    offered(model, answer),
  );
  return text.trim() ? [...choices, text] : choices;
}

const offered = (model: QuestionModel, answer: string): boolean =>
  model.question.options.some((option) => option.const === answer);
