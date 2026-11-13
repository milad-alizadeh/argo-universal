// An `application/x-www-form-urlencoded` body from its fields.
export const form = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

// A token endpoint's request (RFC 6749 sections 4.1.3 and 6): the fields as a form, asking for a JSON answer.
export type FormPost = {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
};

export const formPost = (fields: Record<string, string>): FormPost => ({
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: form(fields),
});
