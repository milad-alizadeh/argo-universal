import { rm, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { borrow } from '#mocks/account-journey';
import { startEngineTestHost } from '#mocks/engine';
import { probeResult } from '#mocks/probe-plugin';

const journeyMs = 30_000;

const fetchAccount =
  "argo.fetch('https://api.github.com/done', { account: 'api.github.com' }).then((r) => r && r.json())";

const missingAccount = 'Missing fixture Account';

const hostName = 'api.github.com';

it(
  'keeps Grants and the Project choice after restart and wakes the sleeping provider on borrow',
  async () => {
    const run = await borrow(fetchAccount);
    const [account] = await run.caller.plugins.accounts.list();

    if (!account) throw new Error(missingAccount);
    await run.stop();
    await rm(join(run.borrowerData, 'out.json'));

    const second = await startEngineTestHost({
      home: run.home,
      keychain: run.keychain,
      pluginNetwork: run.pluginNetwork,
    });

    expect(
      await second.caller.plugins.accounts.get({
        projectId: run.projectId,
        host: hostName,
      }),
    ).toEqual(account);
    expect(
      await second.caller.plugins.accounts.grants({ id: account.id }),
    ).toEqual([
      {
        host: hostName,
        account: account.id,
        plugin: 'borrower',
        allowed: true,
      },
    ]);

    const view = await second.caller.plugins.view({
      pluginId: 'borrower',
      path: '/',
      projectId: run.projectId,
    });

    await view[Symbol.asyncIterator]().next();
    await expect
      .poll(() => probeResult(run.borrowerData).catch(() => null), {
        timeout: 10_000,
      })
      .toEqual({ result: { value: { worked: true } } });
  },
  journeyMs,
);

it(
  'remembers a refused Grant and sends nothing when borrowing is revoked',
  async () => {
    const run = await borrow(fetchAccount, async (engine) => {
      const [account] = await engine.caller.plugins.accounts.list();

      if (!account) throw new Error(missingAccount);
      await engine.caller.plugins.accounts.grant({
        host: hostName,
        account: account.id,
        plugin: 'borrower',
        allowed: false,
      });
    });

    expect(run.result).toEqual({ result: { value: null } });
    expect(run.received).toEqual([]);
  },
  journeyMs,
);

it(
  'signs out Account-wide, deleting the token, Grants and Project choice',
  async () => {
    const run = await borrow(fetchAccount);
    const [account] = await run.caller.plugins.accounts.list();

    if (!account) throw new Error(missingAccount);
    await run.caller.plugins.accounts.signOut({ id: account.id });
    expect(await run.caller.plugins.accounts.list()).toEqual([]);
    expect(
      await run.caller.plugins.accounts.grants({ id: account.id }),
    ).toEqual([]);
    expect(
      await run.caller.plugins.accounts.get({
        projectId: run.projectId,
        host: hostName,
      }),
    ).toBeNull();
    expect([...run.keychain.entries.values()]).not.toContain('synthetic-token');
  },
  journeyMs,
);

it.each(['clean', 'third-party'])(
  'removes a deleted Plugin’s Accounts despite %s discovery',
  async (discovery) => {
    const run = await borrow(fetchAccount);
    const [account] = await run.caller.plugins.accounts.list();

    if (!account) throw new Error(missingAccount);

    if (discovery === 'third-party') {
      const root = join(run.home, 'plugins');
      await mkdir(root, { recursive: true });
      const unrelated = join(root, 'unrelated');
      await cp(run.code, unrelated, { recursive: true });
      const manifest = join(unrelated, 'plugin.json');
      await writeFile(
        manifest,
        (await readFile(manifest, 'utf8')).replace('"probe"', '"unrelated"'),
      );
    }

    await rm(run.code, { recursive: true });
    await run.caller.plugins.list();
    expect(await run.caller.plugins.accounts.list()).toEqual([]);
    expect(
      await run.caller.plugins.accounts.grants({ id: account.id }),
    ).toEqual([]);
    expect(
      await run.caller.plugins.accounts.get({
        projectId: run.projectId,
        host: hostName,
      }),
    ).toBeNull();
    expect([...run.keychain.entries.values()]).not.toContain('synthetic-token');
  },
  journeyMs,
);

it(
  'returns nothing when the providing Plugin is disabled',
  async () => {
    const run = await borrow(fetchAccount, async (engine) => {
      await engine.caller.plugins.setEnabled({
        pluginId: 'probe',
        enabled: false,
      });
    });

    expect(run.result).toEqual({ result: { value: null } });
    expect(run.received).toEqual([]);
  },
  journeyMs,
);
