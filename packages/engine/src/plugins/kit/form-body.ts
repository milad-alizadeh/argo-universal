// An `application/x-www-form-urlencoded` body from its fields.
export const form = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
