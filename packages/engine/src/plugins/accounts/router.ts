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
const accountReadRouter = routerFactory((accounts: PluginAccounts) =>
  router({
    list: publicProcedure
      .output(z.array(PluginAccount))
      .query(() => accounts.list()),
    grants: publicProcedure
      .input(AccountTarget)
      .output(z.array(PluginAccountGrant))
      .query(({ input }) => accounts.grants(input.id)),
    get: publicProcedure
      .input(AccountProjectHost)
      .output(PluginAccount.nullable())
      .query(({ input }) => selectAccount(accounts, input)),
  }),
);

const accountWriteRouter = routerFactory((accounts: PluginAccounts) =>
  router({
    choose: publicProcedure
      .input(AccountChoice)
      .mutation(({ input }) => accounts.choose(input)),
    grant: publicProcedure
      .input(AccountGrantChange)
      .mutation(({ input }) => accounts.grant(input)),
    signOut: publicProcedure
      .input(AccountTarget)
      .mutation(({ input }) => accounts.signOut(input.id)),
  }),
);

export const accountsRouter = routerFactory((accounts: PluginAccounts) =>
  mergeRouters(accountReadRouter(accounts), accountWriteRouter(accounts)),
);

function selectAccount(
  accounts: PluginAccounts,
  input: z.infer<typeof AccountProjectHost>,
): Promise<PluginAccount | null> {
  return accounts.get(input.host, input.projectId);
}
