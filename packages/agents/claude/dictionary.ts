function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

export function dictionary(value: unknown): Record<string, unknown> {
  if (!isObject(value) || Array.isArray(value))
    throw new Error('Expected an object');
  return Object.fromEntries(Object.entries(value));
}
