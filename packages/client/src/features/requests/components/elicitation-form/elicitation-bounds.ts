import type { ElicitationPropertySchema } from '@repo/contracts';
import {
  amount,
  items,
  text,
  type CheckedValue,
  type ElicitationCheck,
  type ElicitationKeyword,
  type ElicitationProblem,
} from './elicitation-checks';
import type { NumericProperty } from './elicitation-property';

type StringProperty = Extract<ElicitationPropertySchema, { type: 'string' }>;

type ArrayProperty = Extract<ElicitationPropertySchema, { type: 'array' }>;

type Limit = {
  limit: number | undefined;
  keyword: ElicitationKeyword;
  broken: (value: CheckedValue, limit: number) => boolean;
};

type Measure = {
  minimum: number | undefined;
  maximum: number | undefined;
  size: (value: CheckedValue) => number;
  keywords: readonly [ElicitationKeyword, ElicitationKeyword];
};

// A bound the form did not set asks nothing of the answer.
const limitChecks = ({ limit, keyword, broken }: Limit): ElicitationCheck[] =>
  limit === undefined
    ? []
    : [
        (value): ElicitationProblem | undefined =>
          broken(value, limit) ? { keyword, limit } : undefined,
      ];

const leastChecks = ({
  minimum,
  size,
  keywords,
}: Measure): ElicitationCheck[] =>
  limitChecks({
    limit: minimum,
    keyword: keywords[0],
    broken: (value, limit) => size(value) < limit,
  });

const mostChecks = ({ maximum, size, keywords }: Measure): ElicitationCheck[] =>
  limitChecks({
    limit: maximum,
    keyword: keywords[1],
    broken: (value, limit) => size(value) > limit,
  });

const measureChecks = (measure: Measure): ElicitationCheck[] => [
  ...leastChecks(measure),
  ...mostChecks(measure),
];

const surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

// JSON Schema counts code points, so a character stored as a surrogate pair counts once.
const codePoints = (value: string): number =>
  value.length - (value.match(surrogatePairs)?.length ?? 0);

export const lengthChecks = (property: StringProperty): ElicitationCheck[] =>
  measureChecks({
    minimum: property.minLength,
    maximum: property.maxLength,
    size: (value) => codePoints(text(value)),
    keywords: ['minLength', 'maxLength'],
  });

export const countChecks = (property: ArrayProperty): ElicitationCheck[] =>
  measureChecks({
    minimum: property.minItems,
    maximum: property.maxItems,
    size: (value) => items(value).length,
    keywords: ['minItems', 'maxItems'],
  });

export const rangeChecks = (property: NumericProperty): ElicitationCheck[] =>
  measureChecks({
    minimum: property.minimum,
    maximum: property.maximum,
    size: amount,
    keywords: ['minimum', 'maximum'],
  });
