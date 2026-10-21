import { z } from 'zod';
import { pluginAccountColumns } from '#contract-columns';
import { AccountHost } from '#plugin-capabilities';

const AccountFields = pluginAccountColumns
  .pick({ host: true, label: true })
  .extend({
    host: pluginAccountColumns.shape.host.pipe(AccountHost),
    label: pluginAccountColumns.shape.label.trim().min(1),
  });

const AccountHostField = AccountFields.pick({ host: true });

export const AccountAdd = AccountFields;

export const AccountProvider = AccountHostField.extend({
  header: z.string().regex(/^[!#$%&'*+.^`|~\w-]+$/),
  prefix: z.string().refine((value) => !/[\r\n]/.test(value)),
});

export const AccountCall = z.discriminatedUnion('action', [
  AccountAdd.extend({ action: z.literal('add') }),
  AccountHostField.extend({ action: z.literal('get') }),
  AccountProvider.extend({ action: z.literal('provide') }),
  z.object({
    action: z.literal('provided'),
    id: z.number(),
    token: z.string().nullable(),
  }),
]);

export const OAuthStart = z.object({
  redirectUri: z.string(),
  state: z.string(),
  codeChallenge: z.string(),
  codeChallengeMethod: z.literal('S256'),
});

export const OAuthResult = z.object({ code: z.string(), verifier: z.string() });

export const WebUrl = z.url({ protocol: /^https?$/ });

export const OAuthCall = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('await'), state: z.string(), url: WebUrl }),
]);

export const AccountInvocation = z.object({
  type: z.literal('accountToken'),
  id: z.number(),
  account: z.json(),
});

export type AccountInvocation = z.infer<typeof AccountInvocation>;
