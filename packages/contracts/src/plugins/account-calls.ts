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

// `projectId` names the Project whose choice this Account becomes; a sign-in that names none records none.
export const AccountSave = AccountFields.extend({
  projectId: z.string().optional(),
});

export const AccountProvider = AccountHostField.extend({
  header: z.string().regex(/^[!#$%&'*+.^`|~\w-]+$/),
  prefix: z.string().refine((value) => !/[\r\n]/.test(value)),
});

// `projectId` names the Project whose Account this is, such as a Project the page lists; it defaults to the call's own.
export const AccountGet = z.object({
  action: z.literal('get'),
  projectId: z.string().optional(),
});

export const AccountCall = z.discriminatedUnion('action', [
  AccountSave.extend({ action: z.literal('save') }),
  AccountHostField.extend(AccountGet.shape),
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
