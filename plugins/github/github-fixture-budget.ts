import { createHash } from 'node:crypto';
import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';

// GitHub's hourly rate limit as the fixture keeps it: what a token may spend, and what it has spent.
export type FixtureBudget = { limit: number; used: number };

export const budgetOf = (): FixtureBudget => ({ limit: 5000, used: 0 });

const okStatus = 200;

const notModifiedStatus = 304;

// When the fixture's limit resets, as an epoch second; the test clock never reaches it.
const resetSeconds = 4_000_000_000;

const etagOf = (answer: FixtureAnswer): string =>
  `"${createHash('sha256')
    .update(JSON.stringify(answer.json ?? answer.text ?? null))
    .digest('hex')}"`;

const resourceOf = (path: string): string =>
  path === '/graphql' ? 'graphql' : 'core';

// The rate-limit headers GitHub sends with each answer.
type LimitHeaders = {
  'x-ratelimit-limit': string;
  'x-ratelimit-remaining': string;
  'x-ratelimit-used': string;
  'x-ratelimit-reset': string;
  'x-ratelimit-resource': string;
};

const limitHeaders = (budget: FixtureBudget, path: string): LimitHeaders => ({
  'x-ratelimit-limit': String(budget.limit),
  'x-ratelimit-remaining': String(Math.max(budget.limit - budget.used, 0)),
  'x-ratelimit-used': String(budget.used),
  'x-ratelimit-reset': String(resetSeconds),
  'x-ratelimit-resource': resourceOf(path),
});

const isGet = ({ method }: Pick<FixtureRequest, 'method'>): boolean =>
  method === 'GET';

const failedFirst = 400;

const succeeded = (answer: FixtureAnswer): boolean =>
  (answer.status ?? okStatus) < failedFirst;

const unchanged = (
  request: FixtureRequest,
  answer: FixtureAnswer,
  etag: string,
): boolean =>
  isGet(request) &&
  (answer.status ?? okStatus) === okStatus &&
  request.headers['if-none-match'] === etag;

/*
 * What GitHub does with a call to `api.github.com`: a successful GET carries an ETag of its body, the same GET asked
 * with that ETag is a 304 that spends nothing, and every other call spends one request. Each answer says what is left.
 */
export function metered(
  budget: FixtureBudget,
  request: FixtureRequest,
  answer: FixtureAnswer,
): FixtureAnswer {
  const etag = etagOf(answer);

  if (unchanged(request, answer, etag))
    return {
      status: notModifiedStatus,
      text: '',
      headers: { etag, ...limitHeaders(budget, request.path) },
    };

  budget.used += 1;

  // A refusal says only what the test has GitHub say of it, such as when a spent limit resets.
  if (!succeeded(answer)) return answer;

  return {
    ...answer,
    headers: {
      ...(isGet(request) && { etag }),
      ...limitHeaders(budget, request.path),
      ...answer.headers,
    },
  };
}
