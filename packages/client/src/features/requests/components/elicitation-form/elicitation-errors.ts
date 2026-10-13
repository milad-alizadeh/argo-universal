import type { ElicitationPropertySchema } from '@repo/contracts';
import type { ErrorObject } from 'ajv';
import {
  elicitationChoices,
  numericProperty,
  type NumericProperty,
} from './elicitation-property';

type ErrorRule = (
  error: ErrorObject,
  property: ElicitationPropertySchema,
) => string | undefined;

const requestedFormat = 'Use the requested format.';
const formatMessages: Readonly<Record<string, string>> = {
  email: 'Enter an email address.',
  uri: 'Enter a complete URL.',
  date: 'Enter a valid date.',
  'date-time': 'Enter a valid date and time.',
};
const keywordMessages: Readonly<
  Record<string, (error: ErrorObject) => string>
> = {
  format: (error) =>
    formatMessages[String(error.params.format)] ?? requestedFormat,
  pattern: () => requestedFormat,
};
const numberNouns = { integer: 'a whole number', number: 'a number' } as const;

// The first rule that knows the error words it.
const errorRules: readonly ErrorRule[] = [
  (error) =>
    error.keyword === 'required' ? 'This field is required.' : undefined,
  numberMessage,
  (error) => keywordMessages[error.keyword]?.(error),
  (_error, property) =>
    elicitationChoices(property) ? 'Choose an available option.' : undefined,
];

export function errorMessage(
  error: ErrorObject,
  property: ElicitationPropertySchema,
): string {
  for (const rule of errorRules) {
    const message = rule(error, property);
    if (message !== undefined) return message;
  }
  return valueMessage(error);
}

const valueMessage = (error: ErrorObject): string =>
  error.message ? `Value ${error.message}.` : 'Enter a valid value.';

function numberMessage(
  error: ErrorObject,
  property: ElicitationPropertySchema,
): string | undefined {
  if (!numericProperty(property)) return undefined;
  if (error.keyword === 'type') return `Enter ${numberNouns[property.type]}.`;
  return boundsMessage(property);
}

function boundsMessage(property: NumericProperty): string | undefined {
  const { minimum, maximum } = property;
  if (minimum === undefined) return maximumMessage(maximum);
  return maximum === undefined
    ? `Enter ${minimum} or more.`
    : `Enter ${numberNouns[property.type]} from ${minimum} to ${maximum}.`;
}

function maximumMessage(maximum: number | undefined): string | undefined {
  return maximum === undefined ? undefined : `Enter ${maximum} or less.`;
}
