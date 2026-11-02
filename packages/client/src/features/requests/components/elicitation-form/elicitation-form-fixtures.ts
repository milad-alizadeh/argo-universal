import {
  nextWorkRequest,
  nextWorkValues,
  questionsRequest,
} from '../../../../../mocks/elicitation-questions';
import {
  configurationRequest,
  configurationValues,
  elicitationRequest,
  emptyAnswersRequest,
  functionNameRequest,
  refactorRequest,
} from '../request.mocks';
import type { ElicitationFormProps } from './elicitation-form';

// A story supplies onAnswer; a fixture is the request, the answers so far and how it stands.
type ElicitationFixture = Omit<ElicitationFormProps, 'onAnswer'>;

const open = { state: { kind: 'open' } } as const;

// One choice to make: the question is the request's own message.
export const singleChoiceElicitation = {
  ...open,
  request: refactorRequest,
} satisfies ElicitationFixture;

// A multi-select, with two options already chosen.
export const multipleChoiceElicitation = {
  ...open,
  request: nextWorkRequest,
  initialValues: nextWorkValues,
} satisfies ElicitationFixture;

// Several choices: each is headed by its own title, and the pager says which one this is.
export const severalQuestionsElicitation = {
  ...open,
  request: questionsRequest,
} satisfies ElicitationFixture;

// Anything that is not choices alone is one page of fields, headed by the message.
export const textFieldElicitation = {
  ...open,
  request: functionNameRequest,
} satisfies ElicitationFixture;

// A form of fields, with what has been typed so far for the validation to read.
export const formFieldsElicitation = {
  ...open,
  request: configurationRequest,
  initialValues: configurationValues,
} satisfies ElicitationFixture;

// A form whose fields include a choice: its options show in place.
export const choiceFieldsElicitation = {
  ...open,
  request: emptyAnswersRequest,
} satisfies ElicitationFixture;

// The recorded Elicitation, its answer on its way to the Agent.
export const submittingElicitation = {
  request: elicitationRequest,
  state: { kind: 'submitting' },
} satisfies ElicitationFixture;

// Answered on another device: the card says why, and nothing can be answered again.
export const answeredElicitation = {
  request: elicitationRequest,
  state: { kind: 'answered', reason: 'Already answered on another device' },
} satisfies ElicitationFixture;
