import { z } from 'zod';
import {
  AccountAdd,
  AccountProvider,
  OAuthStart,
  OAuthResult,
  WebUrl,
} from './account-calls';
import { PluginAccount } from './accounts';

export const accountApiCalls = {
  accounts: z
    .object({
      add: z.function({
        input: [AccountAdd.shape.host, AccountAdd.pick({ label: true })],
        output: z.promise(z.string()),
      }),
      get: z.function({
        input: [AccountAdd.shape.host],
        output: z.promise(PluginAccount.nullable()),
      }),
    })
    .readonly(),
  oauth: z
    .object({
      start: z.function({
        input: [],
        output: z.promise(OAuthStart.nullable()),
      }),
      await: z.function({
        input: [OAuthStart.shape.state, WebUrl],
        output: z.promise(OAuthResult.nullable()),
      }),
    })
    .readonly(),
};

export type AccountProviderRegistration = Readonly<{
  provide: (
    host: string,
    options: Pick<z.infer<typeof AccountProvider>, 'header' | 'prefix'>,
    handler: (
      account: z.infer<typeof PluginAccount>,
    ) => string | null | Promise<string | null>,
  ) => Promise<void>;
}>;
