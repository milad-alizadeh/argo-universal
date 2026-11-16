import { jiraApiUrl } from './atlassian';
import { failureOf, unreachable } from './jira-failures';
import { parseJson, type Json } from './json';

/*
 * Jira Cloud's REST API v3, as the Plugin uses it: each call is a request (`jira-requests.ts`) and a reader
 * (`jira-readers.ts`) that turns the reply into the Plugin's own JSON. The transport is passed in, so a page's named
 * read borrows the Account and the sign-in check sends the pasted token. Add a call by adding a request and a reader.
 */
export type JiraRequest = Readonly<{
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Json;
}>;

// Why Jira gave no answer, in words the page shows; the kind decides the page's next step.
export type JiraFailure = Readonly<{
  kind: 'signed-out' | 'forbidden' | 'not-found' | 'rate-limited' | 'failed';
  message: string;
}>;

export type JiraAnswer<Value> =
  | { ok: true; value: Value }
  | { ok: false; failure: JiraFailure };

// What a fetch answers, as `argo.fetch` does: null when no Account answers the borrow.
export type JiraReply = Readonly<{ status: number; body: string }> | null;

type JiraHeaders = Readonly<{ Accept: string; 'Content-Type'?: string }>;

type JiraInit = { method: string; headers: JiraHeaders; body?: string };

export type JiraSend = (url: string, init: JiraInit) => Promise<JiraReply>;

export type JiraCall<Value> = Readonly<{
  send: JiraSend;
  cloudId: string;
  request: JiraRequest;
  read: (json: Json | undefined) => Value | null;
}>;

const readsJson: JiraHeaders = { Accept: 'application/json' };

const sendsJson: JiraHeaders = {
  ...readsJson,
  'Content-Type': 'application/json',
};

function initOf({ method = 'GET', body }: JiraRequest): JiraInit {
  if (body === undefined) return { method, headers: readsJson };

  return { method, headers: sendsJson, body: JSON.stringify(body) };
}

async function sent(
  send: JiraSend,
  url: string,
  request: JiraRequest,
): Promise<JiraReply | JiraFailure> {
  try {
    return await send(url, initOf(request));
  } catch {
    return unreachable;
  }
}

const isFailure = (value: JiraReply | JiraFailure): value is JiraFailure =>
  value !== null && 'kind' in value;

const lowestOk = 200;

const lowestRedirect = 300;

const succeeded = (status: number): boolean =>
  status >= lowestOk && status < lowestRedirect;

const unexpected: JiraFailure = {
  kind: 'failed',
  message: 'Jira answered something unexpected.',
};

const valueAnswer = <Value>(value: Value | null): JiraAnswer<Value> =>
  value === null ? { ok: false, failure: unexpected } : { ok: true, value };

function answerOf<Value>(
  reply: JiraReply,
  read: JiraCall<Value>['read'],
): JiraAnswer<Value> {
  if (!reply || !succeeded(reply.status))
    return { ok: false, failure: failureOf(reply) };

  return valueAnswer(read(parseJson(reply.body)));
}

/*
 * One call to one site's Jira: the reply read into the Plugin's JSON, or why there is none. Nothing throws, so a
 * named read keeps a failure as its answer and the page draws it.
 */
export async function callJira<Value>({
  send,
  cloudId,
  request,
  read,
}: JiraCall<Value>): Promise<JiraAnswer<Value>> {
  const reply = await sent(send, jiraApiUrl(cloudId, request.path), request);

  return isFailure(reply)
    ? { ok: false, failure: reply }
    : answerOf(reply, read);
}
