import type { Argo } from '@argo/plugin-kit';
import { isReply, parseJson, type Json } from './reply';
import type { Tokens } from './tokens';

// Where the Account's label comes from: a call the token opens, and the field of its JSON answer that names the person.
export type LabelSource = {
  url: string;
  // A dotted path into the answer, such as `login` or `data.viewer.email`. It must identify one person, so a login or
  // an email works and a display name does not: signing in with the same label reuses that Account's row.
  field: string;
  // Sent as a JSON POST, for a service such as a GraphQL one that reads that way.
  body?: string;
};

type Calls = Pick<Argo, 'fetch' | 'accounts' | 'secrets'>;

type Target = { host: string; name: string; label: LabelSource };

const fieldOf = (answer: Json | undefined, path: string): Json | undefined =>
  path
    .split('.')
    .reduce<Json | undefined>(
      (value, key) => (isReply(value) ? value[key] : undefined),
      answer,
    );

const jsonPost = (
  body: string,
  headers: Record<string, string>,
): Parameters<Argo['fetch']>[1] => ({
  method: 'POST',
  headers: { ...headers, 'content-type': 'application/json' },
  body,
});

const labelRequest = (
  body: string | undefined,
  access: string,
): Parameters<Argo['fetch']>[1] => {
  const headers = {
    authorization: `Bearer ${access}`,
    accept: 'application/json',
  };

  return body === undefined
    ? { method: 'GET', headers }
    : jsonPost(body, headers);
};

const answerOf = async (
  response: Awaited<ReturnType<Argo['fetch']>>,
): Promise<Json | undefined> =>
  response ? parseJson(await response.text()) : undefined;

// Only the Plugin's service knows whose token this is, and Argo stores that as the Account's label (ADR-0036).
async function labelOf(
  { fetch }: Calls,
  { name, label }: Target,
  access: string,
): Promise<string> {
  const response = await fetch(label.url, labelRequest(label.body, access));
  const value = fieldOf(await answerOf(response), label.field);

  if (typeof value !== 'string' || value === '')
    throw new Error(`${name} did not say who signed in.`);

  return value;
}

type Saved = { tokens: Tokens; projectId?: string };

// The Account's row is the Engine's to find or add, so a sign-in never has to know whose token it replaces.
export async function saveAccount(
  calls: Calls,
  target: Target,
  { tokens, projectId }: Saved,
): Promise<string> {
  const label = await labelOf(calls, target, tokens.access);
  const account = await calls.accounts.save(target.host, { label, projectId });

  await calls.secrets.set(account, JSON.stringify(tokens));

  return label;
}
