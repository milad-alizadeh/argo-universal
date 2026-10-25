import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';
import { accountHost } from '#mocks/account-plugins';

const journeyMs = 30_000;

it(
  'sets the provider header, replaces borrower casing, and never returns the credential to the borrower',
  async () => {
    const run = await borrow(
      "{ const r = await argo.fetch('https://api.github.com/done', { account: 'api.github.com', headers: { 'x-api-key': 'borrower-value' } }); return r && r.json(); }",
    );

    expect(run.received).toEqual([
      { host: accountHost, token: 'synthetic-token' },
    ]);
    expect(run.result).toEqual({ result: { value: { worked: true } } });
    const [account] = await run.caller.plugins.accounts.list();

    if (!account) throw new Error('Missing fixture Account');
    expect(
      await run.caller.plugins.accounts.grants({ id: account.id }),
    ).toEqual([
      {
        host: accountHost,
        account: account.id,
        plugin: 'borrower',
        allowed: true,
      },
    ]);
  },
  journeyMs,
);

it(
  'refuses a borrow to another host before sending any request',
  async () => {
    const run = await borrow(
      "argo.fetch('https://other.example/done', { account: 'api.github.com' })",
    );

    expect(run.received).toEqual([]);
    expect(run.result).toEqual({
      result: {
        error: expect.stringContaining('cannot be sent to other.example'),
      },
    });
  },
  journeyMs,
);

it(
  'drops the provider header when a 302 leaves the Account host',
  async () => {
    const run = await borrow(
      "{ const r = await argo.fetch('https://api.github.com/redirect', { account: 'api.github.com' }); return r && r.json(); }",
    );

    expect(run.received).toEqual([
      { host: accountHost, token: 'synthetic-token' },
      { host: 'other.example', token: undefined },
    ]);
  },
  journeyMs,
);
