import type { ElicitationPropertySchema } from '@repo/contracts';
import { formatValid } from './elicitation-formats';
import { elicitationChoices } from './elicitation-property';

export type CheckedValue = string | number | boolean | string[];

// Every rule an Elicitation property may set, which is every way an answer can be wrong.
export type ElicitationKeyword =
  | 'required'
  | 'type'
  | 'enum'
  | 'pattern'
  | 'format'
  | 'minLength'
  | 'maxLength'
  | 'minItems'
  | 'maxItems'
  | 'minimum'
  | 'maximum';

// The rule one answer broke, with the bound or format the rule named.
export type ElicitationProblem = {
  keyword: ElicitationKeyword;
  format?: string;
  limit?: number;
};

export type ElicitationCheck = (
  value: CheckedValue,
) => ElicitationProblem | undefined;

const typeTests: Record<
  ElicitationPropertySchema['type'],
  (value: CheckedValue) => boolean
> = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && !Number.isNaN(value),
  integer: (value) => Number.isInteger(value),
  boolean: (value) => typeof value === 'boolean',
  array: (value) => Array.isArray(value),
};

export const text = (value: CheckedValue): string =>
  typeof value === 'string' ? value : '';

export const items = (value: CheckedValue): string[] =>
  Array.isArray(value) ? value : [];

export const amount = (value: CheckedValue): number =>
  typeof value === 'number' ? value : Number.NaN;

const chosen = (value: CheckedValue): string[] =>
  Array.isArray(value) ? value : [String(value)];

export const typeCheck =
  (property: ElicitationPropertySchema): ElicitationCheck =>
  (value) =>
    typeTests[property.type](value) ? undefined : { keyword: 'type' };

export function choiceChecks(
  property: ElicitationPropertySchema,
): ElicitationCheck[] {
  const choices = elicitationChoices(property);

  if (!choices) return [];
  const allowed = new Set(choices.map(({ const: option }) => option));

  return [
    (value): ElicitationProblem | undefined =>
      chosen(value).every((option) => allowed.has(option))
        ? undefined
        : { keyword: 'enum' },
  ];
}

// An unreadable pattern throws here, which is how a form Argo cannot check is found.
export function patternChecks(pattern: string | undefined): ElicitationCheck[] {
  if (pattern === undefined) return [];
  const expression = new RegExp(pattern, 'u');

  return [
    (value): ElicitationProblem | undefined =>
      expression.test(text(value)) ? undefined : { keyword: 'pattern' },
  ];
}

export const formatChecks = (format: string | undefined): ElicitationCheck[] =>
  format === undefined
    ? []
    : [
        (value): ElicitationProblem | undefined =>
          formatValid(format, text(value))
            ? undefined
            : { keyword: 'format', format },
      ];
