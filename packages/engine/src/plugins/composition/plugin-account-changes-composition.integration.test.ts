import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';

const journeyMs = 30_000;

const fetchAccount =
  "argo.fetch('https://api.github.com/done', { account: 'api.github.com' }).then((r) => r && r.json())";

const missingAccount = 'Missing fixture Account';

it(
  'tells a watching App which Plugins used an Account that signed out',
  async () => {
    const run = await borrow(fetchAccount);
    const [account] = await run.caller.plugins.accounts.list();

    if (!account) throw new Error(missingAccount);

    const users = [
      account.providedBy,
      ...(await run.caller.plugins.accounts.grants({ id: account.id })).map(
        ({ plugin }) => plugin,
      ),
    ];

    const controller = new AbortController();

    const changes = (
      await run
        .createCaller({ signal: controller.signal })
        .plugins.listChanges()
    )[Symbol.asyncIterator]();

    const told = [changes.next(), changes.next()];
    await run.caller.plugins.accounts.signOut({ id: account.id });

    const results = await Promise.all(told);
    controller.abort();

    expect(new Set(results.map(({ value }) => value?.pluginId))).toEqual(
      new Set(users),
    );
    expect(new Set(users).size).toBe(told.length);
  },
  journeyMs,
);
