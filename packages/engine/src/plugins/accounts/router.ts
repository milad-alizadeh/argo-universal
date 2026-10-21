import {
  AccountTarget,
  AccountChoice,
  AccountProjectHost,
  AccountGrantChange,
  PluginAccount,
  PluginAccountGrant,
} from '@repo/contracts/plugins/accounts';
import { z } from 'zod';
import {
  publicProcedure,
  router,
  routerFactory,
  mergeRouters,
} from '../../rpc';
import type { PluginAccounts } from './plugin-accounts';

// Inventory and management for the Accounts screens; these answers contain no credentials.
function requireAccounts(accounts: PluginAccounts | undefined): PluginAccounts {
  if (!accounts) throw new Error('Accounts are unavailable');

  return accounts;
}

const accountReadRouter = routerFactory(
  (accounts: PluginAccounts | undefined) =>
    router({
      list: publicProcedure
        .output(z.array(PluginAccount))
        .query(() => requireAccounts(accounts).list()),
      grants: publicProcedure
        .input(AccountTarget)
        .output(z.array(PluginAccountGrant))
        .query(({ input }) => requireAccounts(accounts).grants(input.id)),
      get: publicProcedure
        .input(AccountProjectHost)
        .output(PluginAccount.nullable())
        .query(({ input }) => selectAccount(accounts, input)),
    }),
);

const accountWriteRouter = routerFactory(
  (accounts: PluginAccounts | undefined) =>
    router({
      choose: publicProcedure
        .input(AccountChoice)
        .mutation(({ input }) => requireAccounts(accounts).choose(input)),
      grant: publicProcedure
        .input(AccountGrantChange)
        .mutation(({ input }) => requireAccounts(accounts).grant(input)),
      signOut: publicProcedure
        .input(AccountTarget)
        .mutation(({ input }) => requireAccounts(accounts).signOut(input.id)),
    }),
);

export const accountsRouter = routerFactory(
  (accounts: PluginAccounts | undefined) =>
    mergeRouters(accountReadRouter(accounts), accountWriteRouter(accounts)),
);

function selectAccount(
  accounts: PluginAccounts | undefined,
  input: z.infer<typeof AccountProjectHost>,
): Promise<PluginAccount | null> {
  return requireAccounts(accounts).get(input.host, input.projectId);
}
