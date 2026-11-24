import { expect, it } from 'vitest';
import { cliPath, cliTitle } from './github-cli-fixture';
import { attach } from './journey-calls-fixture';
import { caller, journey, rowSlot } from './journey-fixture';
import {
  changePull,
  idOf,
  openChanges,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

const closedOnGitHub = { state: 'closed', merged: true } as const;

const forbidden = 403;

const sso = 'required; url=https://github.com/orgs/owner/sso';

it(
  'shows a pull request merged on GitHub in the Changes, the Session row and a second App within one Slot tick',
  async () => {
    const run = await journey();

    await attach(run, '#12');

    const first = openChanges(run);
    const second = openChanges(run);
    const row = openChanges(run, caller, rowSlot);

    await Promise.all([first.next(), second.next(), row.next()]);

    changePull(run, 12, closedOnGitHub);
    await tick(run);

    expect(await first.next()).toMatchObject([
      { id: idOf(12), stage: 'merged' },
    ]);
    expect(await second.next()).toMatchObject([
      { id: idOf(12), stage: 'merged' },
    ]);
    expect(await row.next()).toMatchObject([{ change: { stage: 'merged' } }]);
  },
  slow,
);

it(
  'reads with the CLI login when GitHub refuses the Account, though the setting is off, and the new stage shows',
  async () => {
    const run = await journey({
      path: await cliPath('success', closedOnGitHub),
    });

    await attach(run, '#12');

    const open = openChanges(run);

    expect(await open.next()).toMatchObject([{ stage: 'open' }]);

    run.github.failWith.status = forbidden;
    run.github.failWith.message = 'Resource protected by organization SAML';
    await tick(run);

    expect(await open.next()).toMatchObject([
      { title: cliTitle, stage: 'merged' },
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
