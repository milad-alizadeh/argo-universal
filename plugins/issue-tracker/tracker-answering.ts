import type { Argo } from '@argo/plugin-kit';
import { createGitHubTracker, type TrackerClient } from './github-tracker';
import type { JsonObject } from './json';

type Fetch = Argo['fetch'];

export type Sent = { url: string; init: Parameters<Fetch>[1] };

type Body = JsonObject;

const firstErrorStatus = 400;

export const reply = (
  status: number,
  body: Body,
): Awaited<ReturnType<Fetch>> => ({
  ok: status < firstErrorStatus,
  status,
  statusText: '',
  headers: {},
  body: JSON.stringify(body),
  truncated: false,
  text: () => Promise.resolve(JSON.stringify(body)),
  json: () => Promise.resolve(body),
});

// A tracker whose every call gets one answer, and the calls it made.
export type Answering = { sent: Sent[]; tracker: TrackerClient };

const trackerFor = (fetch: Fetch): TrackerClient =>
  createGitHubTracker(fetch, {
    projectId: 'project-1',
    repository: 'owner/repository',
  });

export function trackerAnswering(
  answer: Awaited<ReturnType<Fetch>>,
): Answering {
  const sent: Sent[] = [];

  const tracker = trackerFor((url, init) => {
    sent.push({ url, init });

    return Promise.resolve(answer);
  });

  return { sent, tracker };
}

// The JSON a call sent, as an object.
export const bodyOf = (calls: Sent[]): Body =>
  Object(JSON.parse(calls.map(({ init }) => init?.body).at(0) ?? '{}'));
