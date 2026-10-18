import { checkTransform } from './svg-transform';

const numberPattern = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi;

const forbiddenNumberWord =
  /(?:^|[^a-z])(?:nan|[+-]?inf(?:inity)?)(?:$|[^a-z])/i;

const allowedNumericRemainder =
  /^(?:userSpaceOnUse|objectBoundingBox|meet|slice|none)$/;

const numericAttributes = new Set([
  'x',
  'y',
  'width',
  'height',
  'viewBox',
  'd',
  'transform',
  'gradientTransform',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x1',
  'y1',
  'x2',
  'y2',
  'dx',
  'dy',
  'rotate',
  'strokeWidth',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'fillOpacity',
  'strokeOpacity',
  'opacity',
  'fontSize',
  'letterSpacing',
  'textLength',
  'offset',
  'fr',
  'fx',
  'fy',
  'points',
]);

export function validateNumericAttribute(name: string, value: string): void {
  if (numericAttributes.has(name)) validateFiniteNumbers(name, value);
}

function validateFiniteNumbers(name: string, value: string): void {
  rejectNonFiniteWord(name, value);

  const numbers = value.match(numberPattern)?.map(Number) ?? [];

  assertFiniteNumbers(name, numbers);

  validateRemainder(name, value);
}

function rejectNonFiniteWord(name: string, value: string): void {
  if (forbiddenNumberWord.test(value))
    throw new Error(`non-finite number in ${name}`);
}

function assertFiniteNumbers(name: string, numbers: number[]): void {
  const invalidNumber = numbers.some((number) => !Number.isFinite(number));

  if (numbers.length === 0 || invalidNumber)
    throw new Error(`invalid numeric value in ${name}`);
}

function validateRemainder(name: string, value: string): void {
  const rest = value.replaceAll(numberPattern, '').replaceAll(/[\s,%.]/g, '');
  const validator = remainderValidators.get(name);

  if (validator) return validator(name, value, rest);

  validateGenericRemainder(name, rest);
}

type RemainderValidator = (name: string, value: string, rest: string) => void;

const remainderValidators = new Map<string, RemainderValidator>([
  ['d', validatePathRemainder],
  ['points', validatePathRemainder],
  ['transform', validateTransformRemainder],
  ['gradientTransform', validateTransformRemainder],
]);

function validateGenericRemainder(name: string, rest: string): void {
  if (rest && !allowedNumericRemainder.test(rest))
    throw new Error(`invalid numeric value in ${name}`);
}

function validatePathRemainder(
  _name: string,
  _value: string,
  rest: string,
): void {
  if (!/^[a-zA-Z]*$/.test(rest)) throw new Error('invalid path data');
}

function validateTransformRemainder(
  _name: string,
  value: string,
  _rest: string,
): void {
  checkTransform(value);
}
