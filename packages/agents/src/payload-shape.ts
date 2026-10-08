export type PayloadPredicate<Value = unknown> = (
  value: unknown,
) => value is Value;
export type PayloadFields = Record<string, (value: unknown) => boolean>;
export function acceptsNamedPayload(
  predicates: PayloadFields,
  name: string,
  value: unknown,
): boolean {
  if (!Object.hasOwn(predicates, name)) return false;
  const accepts = predicates[name];
  return typeof accepts === 'function' && accepts(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasFields(value: unknown, fields: PayloadFields): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(fields).every(([name, accepts]): boolean =>
    accepts(value[name]),
  );
}

export const isString = (value: unknown): value is string =>
  typeof value === 'string';
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number';
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';
export const optional =
  (accepts: (value: unknown) => boolean): ((value: unknown) => boolean) =>
  (value): boolean =>
    value === undefined || accepts(value);
export const nullable =
  (accepts: (value: unknown) => boolean): ((value: unknown) => boolean) =>
  (value): boolean =>
    value === null || accepts(value);
export const oneOf =
  (...values: readonly unknown[]): ((value: unknown) => boolean) =>
  (value): boolean =>
    values.includes(value);
export const arrayOf =
  <Value>(accepts: PayloadPredicate<Value>): PayloadPredicate<Value[]> =>
  (value): value is Value[] =>
    Array.isArray(value) && value.every(accepts);
export const recordOf =
  <Value>(
    accepts: PayloadPredicate<Value>,
  ): PayloadPredicate<Record<string, Value>> =>
  (value): value is Record<string, Value> =>
    isRecord(value) && Object.values(value).every(accepts);
