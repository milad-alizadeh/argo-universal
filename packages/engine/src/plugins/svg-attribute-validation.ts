import { referenceAttributes, urlAttributes } from './svg-attribute-rules';
import { validateNumericAttribute } from './svg-numeric-validation';
import type { SvgAttributeValue } from './svg-types';

const colorValidators = new Set(['fill', 'stroke', 'stopColor']);

const idPattern = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

const localReferencePattern = /^url\(\s*#[A-Za-z_][A-Za-z0-9_.-]*\s*\)$/;

type AttributeCheck = (value: string) => void;

const checks = new Map<string, AttributeCheck>([
  ['preserveAspectRatio', checkAspectRatio],
  ['fontWeight', checkFontWeight],
  ['fontFamily', checkFontFamily],
  ['gradientUnits', checkUnits],
  ['clipPathUnits', checkUnits],
  ['spreadMethod', checkSpreadMethod],
]);

export function attributeValue(value: SvgAttributeValue): string {
  return String(value);
}

export function validateAttribute(name: string, value: string): void {
  checkXmlCharacters(name, value);

  checkPaintValue(name, value);
  checkUrlValue(name, value);
  checkHrefValue(name, value);
  validateNumericAttribute(name, value);
  checks.get(name)?.(value);
}

export function validateId(value: string, ids: Set<string>): void {
  if (!idPattern.test(value)) throw new Error('invalid id');

  if (ids.has(value)) throw new Error(`duplicate id ${value}`);

  ids.add(value);
}

export function validateLocalReference(value: string, ids: Set<string>): void {
  const id = value.slice(1);

  if (!ids.has(id)) throw new Error(`href target ${id} is missing`);
}

export function validateUrlReference(value: string, ids: Set<string>): void {
  const id = value.slice(value.indexOf('#') + 1, -1).trim();

  if (!ids.has(id)) throw new Error(`url() target #${id} is missing`);
}

function checkXmlCharacters(name: string, value: string): void {
  if (/[&<>"']/.test(value))
    throw new Error(`attribute ${name} contains unsupported XML characters`);
}

function checkPaintValue(name: string, value: string): void {
  if (!colorValidators.has(name)) return;

  checkPaint(name, value);
}

function checkPaint(name: string, value: string): void {
  if (isSafePaint(name, value)) return;

  throw new Error(`color ${value} refused for ${name}`);
}

function isSafePaint(name: string, value: string): boolean {
  return isCurrentColor(value) || isLocalPaint(name, value);
}

function isCurrentColor(value: string): boolean {
  return value === 'currentColor' || value === 'none';
}

function isLocalPaint(name: string, value: string): boolean {
  return name !== 'stopColor' && localReferencePattern.test(value);
}

function checkUrlValue(name: string, value: string): void {
  if (!value.toLowerCase().includes('url(')) return;

  checkUrl(name, value);
}

function checkUrl(name: string, value: string): void {
  if (!urlAttributes.has(name))
    throw new Error(`url() is not allowed in ${name}`);

  if (!localReferencePattern.test(value))
    throw new Error(`external url() refused in ${name}`);
}

function checkHrefValue(name: string, value: string): void {
  if (referenceAttributes.has(name) && !value.startsWith('#'))
    throw new Error(`external href refused in ${name}`);
}

function checkAspectRatio(value: string): void {
  if (
    !/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: meet| slice)?)$/.test(value)
  )
    throw new Error('invalid preserveAspectRatio');
}

function checkFontWeight(value: string): void {
  if (!/^(?:normal|bold|[1-9]00)$/.test(value))
    throw new Error('invalid fontWeight');
}

function checkFontFamily(value: string): void {
  if (!/^[A-Za-z0-9 _-]{1,64}$/.test(value))
    throw new Error('invalid fontFamily');
}

function checkUnits(value: string): void {
  if (!/^(?:userSpaceOnUse|objectBoundingBox)$/.test(value))
    throw new Error('invalid units');
}

function checkSpreadMethod(value: string): void {
  if (!/^(?:pad|reflect|repeat)$/.test(value))
    throw new Error('invalid spreadMethod');
}
