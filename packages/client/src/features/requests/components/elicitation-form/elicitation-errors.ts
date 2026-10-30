import type { ElicitationPropertySchema } from '@repo/contracts';
import {
  elicitationChoices,
  numericProperty,
  type NumericProperty,
} from './elicitation-property';
import type { ElicitationIssue } from './elicitation-validate';

type ErrorRule = (
  error: ElicitationIssue,
  property: ElicitationPropertySchema,
) => string | undefined;

const requestedFormat = 'Use the requested format.';

const formatMessages = new Map([
  ['email', 'Enter an email address.'],
  ['uri', 'Enter a complete URL.'],
  ['date', 'Enter a valid date.'],
  ['date-time', 'Enter a valid date and time.'],
]);

const keywordMessages = new Map<string, (error: ElicitationIssue) => string>([
  [
    'format',
    (error): string =>
      formatMessages.get(String(error.format)) ?? requestedFormat,
  ],
  ['pattern', (): string => requestedFormat],
  ['minLength', (error): string => `Enter ${error.limit} characters or more.`],
  ['maxLength', (error): string => `Enter ${error.limit} characters or fewer.`],
  ['minItems', (error): string => `Choose ${error.limit} or more.`],
  ['maxItems', (error): string => `Choose ${error.limit} or fewer.`],
]);

const numberNouns = { integer: 'a whole number', number: 'a number' } as const;

// An answer off the list of what the form offers.
const chosenMessage = (
  error: ElicitationIssue,
  property: ElicitationPropertySchema,
): string | undefined =>
  error.keyword === 'enum' && elicitationChoices(property)
    ? 'Choose an available option.'
    : undefined;

// The first rule that knows the error words it.
const errorRules: readonly ErrorRule[] = [
  (error) =>
    error.keyword === 'required' ? 'This field is required.' : undefined,
  numberMessage,
  (error) => keywordMessages.get(error.keyword)?.(error),
  chosenMessage,
];

export function errorMessage(
  error: ElicitationIssue,
  property: ElicitationPropertySchema,
): string {
  for (const rule of errorRules) {
    const message = rule(error, property);

    if (message !== undefined) return message;
  }

  return 'Enter a valid value.';
}

function numberMessage(
  error: ElicitationIssue,
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
