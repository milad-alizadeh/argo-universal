import type { Argo } from '@argo/plugin-kit';

// What `JSON.parse` may answer, so a reader narrows a reply instead of asserting its shape.
export type Json = string | number | boolean | null | Json[] | Reply;

export type Reply = { [key: string]: Json };

export type Fields = Record<string, string>;

export const isReply = (value: Json | undefined): value is Reply =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const text = (reply: Reply, key: string): string | null => {
  const value = reply[key];

  return typeof value === 'string' && value !== '' ? value : null;
};

export const seconds = (reply: Reply, key: string): number | null => {
  const value = reply[key];

  return typeof value === 'number' ? value : null;
};

export function parseJson(body: string): Json | undefined {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export const withScope = (fields: Fields, scope: string | undefined): Fields =>
  scope ? { ...fields, scope } : fields;

export const form = (fields: Fields): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

const formPost = (fields: Fields): Parameters<Argo['fetch']>[1] => ({
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: form(fields),
});

export type PostTarget = { url: string; name: string };

/*
 * The two endpoints of OAuth (RFC 6749) take a form and answer JSON, some only when asked. A reply that is not JSON is
 * an empty one, which each flow reads as a refusal.
 */
export async function postForm(
  fetch: Argo['fetch'],
  { url, name }: PostTarget,
  fields: Fields,
): Promise<Reply> {
  const response = await fetch(url, formPost(fields));

  if (!response) throw new Error(`${name} could not be reached.`);

  const reply = parseJson(await response.text());

  return isReply(reply) ? reply : {};
}
