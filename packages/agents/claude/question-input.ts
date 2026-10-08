import type { AskUserQuestionInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import {
  arrayOf,
  hasFields,
  isBoolean,
  isString,
  optional,
  recordOf,
} from '../src/payload-shape.ts';
const maximumQuestions = 4;
const minimumOptions = 2;
const maximumOptions = 4;
type Question = AskUserQuestionInput['questions'][number];
const isQuestionOption = (
  value: unknown,
): value is Question['options'][number] =>
  hasFields(value, {
    label: isString,
    description: isString,
    preview: optional(isString),
  });
const isQuestion = (value: unknown): value is Question =>
  hasFields(value, {
    question: isString,
    header: isString,
    multiSelect: isBoolean,
    options: (options): boolean =>
      arrayOf(isQuestionOption)(options) &&
      options.length >= minimumOptions &&
      options.length <= maximumOptions,
  });
type Annotation = NonNullable<AskUserQuestionInput['annotations']>[string];
const isAnnotation = (value: unknown): value is Annotation =>
  hasFields(value, { preview: optional(isString), notes: optional(isString) });
const questionInputFields = {
  questions: (questions: unknown): boolean =>
    arrayOf(isQuestion)(questions) &&
    questions.length >= 1 &&
    questions.length <= maximumQuestions,
  answers: optional(recordOf(isString)),
  annotations: optional(recordOf(isAnnotation)),
  metadata: optional((metadata): boolean =>
    hasFields(metadata, { source: optional(isString) }),
  ),
};
export const isAskUserQuestionInput = (
  value: unknown,
): value is AskUserQuestionInput => hasFields(value, questionInputFields);
