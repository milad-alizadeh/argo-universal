import type {
  ElicitationPropertySchema,
  PendingElicitation,
} from '@repo/contracts';
import { countChecks, lengthChecks, rangeChecks } from './elicitation-bounds';
import {
  choiceChecks,
  formatChecks,
  patternChecks,
  typeCheck,
  type CheckedValue,
  type ElicitationCheck,
  type ElicitationProblem,
} from './elicitation-checks';
import { numericProperty } from './elicitation-property';

type RequestedSchema = PendingElicitation['requestedSchema'];

// A problem, and the property of the form whose answer has it.
export type ElicitationIssue = ElicitationProblem & { property: string };

export type ElicitationContent = Record<string, CheckedValue>;

export type ElicitationValidate = (
  content: ElicitationContent,
) => ElicitationIssue[];

export type ElicitationValidator = {
  validate?: ElicitationValidate;
  error?: string;
};

type CheckedProperty = { property: string; checks: ElicitationCheck[] };

/*
 * The checks a form's answers must pass, read straight from the form rather than compiled into
 * code, so they run where no runtime may build a function from a string. Reading the form can
 * only fail on a `pattern` that is no regular expression, which no answer could ever satisfy.
 */
export function elicitationValidator(
  schema: RequestedSchema,
): ElicitationValidator {
  try {
    return { validate: validateWith(checkedProperties(schema), schema) };
  } catch {
    return { error: 'The Agent provided an invalid form.' };
  }
}

const stringChecks = (
  property: Extract<ElicitationPropertySchema, { type: 'string' }>,
): ElicitationCheck[] => [
  ...lengthChecks(property),
  ...patternChecks(property.pattern),
  ...formatChecks(property.format),
];

const listChecks = (property: ElicitationPropertySchema): ElicitationCheck[] =>
  property.type === 'array' ? countChecks(property) : [];

function keywordChecks(
  property: ElicitationPropertySchema,
): ElicitationCheck[] {
  if (property.type === 'string') return stringChecks(property);

  return numericProperty(property)
    ? rangeChecks(property)
    : listChecks(property);
}

const propertyChecks = (
  property: ElicitationPropertySchema,
): ElicitationCheck[] => [
  typeCheck(property),
  ...choiceChecks(property),
  ...keywordChecks(property),
];

const checkedProperties = (schema: RequestedSchema): CheckedProperty[] =>
  Object.entries(schema.properties).map(([property, value]) => ({
    property,
    checks: propertyChecks(value),
  }));

const validateWith =
  (properties: CheckedProperty[], schema: RequestedSchema) =>
  (content: ElicitationContent): ElicitationIssue[] => [
    ...missing(schema.required ?? [], content),
    ...answered(properties, content),
  ];

const missing = (
  required: readonly string[],
  content: ElicitationContent,
): ElicitationIssue[] =>
  required.flatMap((property) =>
    content[property] === undefined ? [{ property, keyword: 'required' }] : [],
  );

const answered = (
  properties: CheckedProperty[],
  content: ElicitationContent,
): ElicitationIssue[] =>
  properties.flatMap(({ property, checks }) =>
    firstProblem(checks, content[property]).map((problem) => ({
      ...problem,
      property,
    })),
  );

// An answer shows one problem at a time, so the checks after the first to fire say nothing.
const firstProblem = (
  checks: ElicitationCheck[],
  value: CheckedValue | undefined,
): ElicitationProblem[] => {
  if (value === undefined) return [];

  const problem = checks
    .map((check) => check(value))
    .find((found) => found !== undefined);

  return problem ? [problem] : [];
};
