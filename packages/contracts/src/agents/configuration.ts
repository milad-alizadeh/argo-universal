import { z } from 'zod';
import { agentColumns } from '../columns';

const maxValueLength = 4096;
const maxEntries = 64;
const maxNameLength = 64;
const withoutNul = (value: string): boolean => !value.includes('\0');
const isAbsolutePath = (value: string): boolean =>
  value.startsWith('/') || /^[A-Za-z]:\\/.test(value);
const isCommandName = (value: string): boolean =>
  /^[A-Za-z0-9._+-]+$/.test(value);
// Names that usually hold a credential; credentials stay with the Agent's own sign-in.
const secretName =
  /TOKEN|SECRET|PASSWORD|PASSWD|PASSPHRASE|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY|CREDENTIAL|AUTH|COOKIE/i;
// A flag such as --api-key=… or --token carries a credential the same way.
const isSecretFlag = (argument: string): boolean => {
  const flag = /^-{1,2}([\w-]+)/.exec(argument)?.[1];
  return flag !== undefined && secretName.test(flag.replaceAll('-', '_'));
};
const credentialMessage =
  'Argo does not store credentials. Sign in through the Agent instead.';
const singleCommandMessage =
  'One path or command, without spaces. Put arguments below.';

export const AgentExecutable = z
  .string()
  .trim()
  .min(1, 'Enter a path or command.')
  .refine(withoutNul, 'A path cannot contain a NUL character.')
  .refine(
    (value): boolean => isAbsolutePath(value) || isCommandName(value),
    singleCommandMessage,
  );

export const AgentArgument = z
  .string()
  .max(maxValueLength)
  .refine(withoutNul, 'An argument cannot contain a NUL character.')
  .refine((value): boolean => !isSecretFlag(value), credentialMessage);

export const EnvironmentVariable = z.strictObject({
  name: z
    .string()
    .regex(
      /^[A-Za-z_]\w*$/,
      'Use letters, digits and underscores, not starting with a digit.',
    )
    .refine((name): boolean => !secretName.test(name), credentialMessage),
  value: z
    .string()
    .max(maxValueLength)
    .refine(withoutNul, 'A value cannot contain a NUL character.'),
});
export type EnvironmentVariable = z.infer<typeof EnvironmentVariable>;

const hasUniqueNames = (variables: readonly EnvironmentVariable[]): boolean =>
  new Set(variables.map(({ name }) => name)).size === variables.length;

export const EnvironmentVariables = z
  .array(EnvironmentVariable)
  .max(maxEntries)
  .refine(hasUniqueNames, 'Each environment variable can be set once.');

export const AgentOverrides = z.strictObject({
  args: z.array(AgentArgument).max(maxEntries),
  env: EnvironmentVariables,
});

export const CustomAgentDefinition = z.strictObject({
  name: z.string().trim().min(1, 'Enter a name.').max(maxNameLength),
  executable: AgentExecutable,
  ...AgentOverrides.shape,
});
export type CustomAgentDefinition = z.infer<typeof CustomAgentDefinition>;

export const AgentConfiguration = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('registry'),
    release: z.string().nullable(),
    overrides: AgentOverrides,
  }),
  z.strictObject({
    source: z.literal('custom'),
    definition: CustomAgentDefinition,
  }),
]);
export type AgentConfiguration = z.infer<typeof AgentConfiguration>;

export const AgentId = z.strictObject({ agentId: agentColumns.shape.id });
export type AgentId = z.infer<typeof AgentId>;

export const ConfiguredAgent = z.strictObject({
  id: agentColumns.shape.id,
  enabled: agentColumns.shape.enabled,
  configuration: AgentConfiguration,
});
export type ConfiguredAgent = z.infer<typeof ConfiguredAgent>;

export const AgentCheck = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('ready') }),
  z.strictObject({ status: z.literal('failed'), failure: z.string() }),
]);
export type AgentCheck = z.infer<typeof AgentCheck>;

export const CustomAgentEditInput = AgentId.extend({
  definition: CustomAgentDefinition,
});
export type CustomAgentEditInput = z.infer<typeof CustomAgentEditInput>;

export const AgentRegistration = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('ready'),
    agentId: agentColumns.shape.id,
  }),
  z.strictObject({ status: z.literal('failed'), failure: z.string() }),
]);
export type AgentRegistration = z.infer<typeof AgentRegistration>;

export const AgentEnablementInput = AgentId.extend({
  enabled: agentColumns.shape.enabled,
});
export type AgentEnablementInput = z.infer<typeof AgentEnablementInput>;
