import { expect, it } from 'vitest';
import { cliPath, cliTitle } from './github-cli-fixture';
import { attach, changesOf } from './journey-calls-fixture';
import { journey } from './journey-fixture';
import { openChanges, refreshed, tick } from './journey-watch-fixture';

const slow = 60_000;

const closedOnGitHub = { state: 'closed', merged: true } as const;

const forbidden = 403;

const sso = 'required; url=https://github.com/orgs/owner/sso';

const remaining = { 'x-ratelimit-remaining': '4999' };

it.each([
  ['a plain refusal', {}],
  [
    'a refusal that still has requests left, as GitHub sends on every reply',
    remaining,
  ],
])(
  'reads with the CLI login when GitHub refuses the Account with %s, though the setting is off, and the new stage shows',
  async (_name, headers) => {
    const run = await journey({
      path: await cliPath('success', closedOnGitHub),
    });

    await attach(run, '#12');

    const open = openChanges(run);

    expect(await open.next()).toMatchObject([{ stage: 'open' }]);

    run.github.failWith.status = forbidden;
    run.github.failWith.message = 'Resource protected by organization SAML';
    run.github.failWith.headers = headers;
    await tick(run);

    expect(await open.next()).toMatchObject([
      { title: cliTitle, stage: 'merged' },
    ]);
  },
  slow,
);

it.each([
  ['no requests left', { 'x-ratelimit-remaining': '0' }],
  ['a retry-after', { 'retry-after': '60' }],
])(
  'leaves a spent rate limit with %s to the fetch gate and never asks the CLI',
  async (_name, headers) => {
    const run = await journey({
      path: await cliPath('success', closedOnGitHub),
    });

    await attach(run, '#12');

    run.github.failWith.status = forbidden;
    run.github.failWith.headers = headers;
    await refreshed(run);

    expect(await changesOf(run)).toMatchObject([
      { stage: 'open', stale: 'rateLimited' },
    ]);
  },
  slow,
);

it(
  'keeps the Account refusal, with what GitHub said, when no CLI is logged in',
  async () => {
    const run = await journey();

    run.github.failWith.status = forbidden;
    run.github.failWith.message =
      'The organization has enabled OAuth App access restrictions';
    run.github.failWith.headers = { 'x-github-sso': sso };

    await expect(attach(run, '#12')).rejects.toThrow(
      /GitHub answered 403\..*OAuth App access restrictions.*SSO: required; url=https:\/\/github\.com\/orgs\/owner\/sso/s,
    );
  },
  slow,
);
