import { useState } from 'react';
import type { ElicitationFormProps } from '../components/elicitation-form/elicitation-form-props';
import type { ElicitationQuestion } from '../components/elicitation-form/elicitation-questions';
import type { ElicitationValues } from '../components/elicitation-form/elicitation-schema';

type QuestionFields = {
  props: ElicitationFormProps;
  question: ElicitationQuestion;
  index: number;
  count: number;
  last: boolean;
  inactive: boolean;
  value: ElicitationValues[string] | undefined;
};
export type QuestionModel = QuestionFields & {
  canAdvance: boolean;
  change: (value: string | string[]) => void;
  advance: () => void;
  skip: () => void;
  navigate: (index: number) => void;
};
type Answers = {
  values: ElicitationValues;
  setValues: (values: ElicitationValues) => void;
};
type Page = { index: number; count: number; setIndex: (index: number) => void };

export function useElicitationQuestions(
  props: ElicitationFormProps,
  questions: ElicitationQuestion[],
): QuestionModel {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<ElicitationValues>(
    props.initialValues ?? {},
  );
  return questionModel(
    questionFields(props, questions, { index, values }),
    { values, setValues },
    { index, setIndex, count: questions.length },
  );
}

function questionFields(
  props: ElicitationFormProps,
  questions: ElicitationQuestion[],
  state: { index: number; values: ElicitationValues },
): QuestionFields {
  const question = currentQuestion(questions, state.index);
  return {
    props,
    question,
    ...questionPosition(state.index, questions.length),
    inactive: props.state.kind !== 'open',
    value: state.values[question.name],
  };
}

function questionModel(
  fields: QuestionFields,
  answers: Answers,
  page: Page,
): QuestionModel {
  return {
    ...fields,
    canAdvance: hasAnswer(fields),
    change: (value): void => change(fields, answers, value),
    advance: (): void => advance(fields, answers.values, page),
    skip: (): void => skip(fields, answers, page),
    navigate: (index): void => navigate(fields, page, index),
  };
}

function advance(
  fields: QuestionFields,
  values: ElicitationValues,
  page: Page,
): void {
  if (fields.inactive || !hasAnswer(fields)) return;
  completePage(fields, values, page);
}

function skip(fields: QuestionFields, answers: Answers, page: Page): void {
  if (fields.inactive) return;
  const remaining = Object.fromEntries(
    Object.entries(answers.values).filter(
      ([key]) => key !== fields.question.name,
    ),
  );
  answers.setValues(remaining);
  completePage(fields, remaining, page);
}

function change(
  fields: QuestionFields,
  answers: Answers,
  value: string | string[],
): void {
  if (!fields.inactive)
    answers.setValues({ ...answers.values, [fields.question.name]: value });
}
function navigate(fields: QuestionFields, page: Page, index: number): void {
  if (!fields.inactive)
    page.setIndex(Math.max(0, Math.min(page.count - 1, index)));
}

function currentQuestion(
  questions: ElicitationQuestion[],
  index: number,
): ElicitationQuestion {
  const question = questions[index];
  if (!question) throw new Error('Question flow needs a question.');
  return question;
}

function questionPosition(
  index: number,
  count: number,
): Pick<QuestionFields, 'index' | 'count' | 'last'> {
  return { index, count, last: index === count - 1 };
}

function completePage(
  fields: QuestionFields,
  values: ElicitationValues,
  page: Page,
): void {
  if (fields.last) fields.props.onAnswer({ action: 'accept', content: values });
  else page.setIndex(page.index + 1);
}
function hasAnswer(fields: QuestionFields): boolean {
  if (Array.isArray(fields.value)) return fields.value.length > 0;
  if (typeof fields.value !== 'string') return false;
  return hasTextAnswer(fields.question, fields.value);
}
function hasTextAnswer(question: ElicitationQuestion, value: string): boolean {
  return (
    !!value.trim() || question.options.some((option) => option.const === value)
  );
}
