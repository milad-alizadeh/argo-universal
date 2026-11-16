import { z } from 'zod';
import { FetchCapability } from '#plugin-fetch-capability';

export {
  AccountHost,
  FetchCapability,
  isSpecialHost,
  sameHost,
} from '#plugin-fetch-capability';

/*
 * What a Plugin's manifest declares it needs from the machine (ADR-0030). The Server checks every
 * `argo.fs`, `argo.process`, `argo.fetch` and `argo.sessions` call: `argo.fs` reaches only the
 * registered Projects, read-only, and the Plugin's own data folder, which need no Capability;
 * `argo.process`, `argo.fetch` and `argo.sessions` reach only what these declare (`sessions:read`, `sessions:archive`).
 */

// Variables that load code or name a program bypass any command allowlist, so no Plugin may set them (ADR-0030).
const refusedVariables = [
  /^LD_/,
  /^DYLD_/,
  /^NODE_OPTIONS$/,
  /^NODE_PATH$/,
  /^ELECTRON_RUN_AS_NODE$/,
  /^PYTHON(PATH|STARTUP|HOME)$/,
  /^PERL5(OPT|LIB)$/,
  /^RUBY(OPT|LIB)$/,
  /^BASH_ENV$/,
  /^ENV$/,
  /^GIT_/,
  /^(PATH|HOME|XDG_CONFIG_HOME|GH_CONFIG_DIR)$/,
  /^(EDITOR|VISUAL|PAGER|BROWSER|GH_BROWSER|GH_PAGER|SSH_ASKPASS)$/,
  /^JAVA_TOOL_OPTIONS$/,
  // Shell start-up and pager hooks, and npm's config, which names scripts and Node options.
  /^(ZDOTDIR|SHELLOPTS|BASHOPTS|PS4|PROMPT_COMMAND)$/,
  /^(LESSOPEN|LESSCLOSE|MANPAGER)$/,
  /^NPM_CONFIG_/,
];

// Names are compared upper-cased, so a lower-case spelling can never slip past.
export const isRefusedVariable = (name: string): boolean =>
  refusedVariables.some((pattern) => pattern.test(name.toUpperCase()));

const VariableName = z
  .string()
  .regex(/^[A-Za-z_]\w*$/, 'env names must be variable names')
  .refine((name) => !isRefusedVariable(name), {
    error: ({ input }) => `${String(input)} is never allowed`,
  });

// `*` takes one argument and `**` the rest; anything else is one exact argument.
const ArgumentPattern = z
  .string()
  .refine((pattern) => !/\*/.test(pattern) || /^\*\*?$/.test(pattern), {
    error: 'An args pattern is *, ** or an exact argument',
  });

// Programs that read the OS secret store, where every Secret on the machine lives; only the Server reaches it (ADR-0051).
const secretStoreTools = new Set(['security', 'secret-tool', 'cmdkey']);

const powerShells = new Set(['pwsh', 'powershell']);

// The CredentialManager and SecretManagement cmdlets, which read Windows Credential Manager and other vaults.
const credentialCmdlet =
  /\b(?:(?:get|new|remove)-storedcredential|(?:get|set|remove)-secret(?:info)?)\b/i;

const programName = (command: string): string =>
  (command.split('/').at(-1) ?? command).toLowerCase().replace(/\.exe$/, '');

const isStoreProgram = (program: string): boolean =>
  secretStoreTools.has(program) || credentialCmdlet.test(program);

const runsCredentialCmdlet = (program: string, args: string[]): boolean =>
  powerShells.has(program) && args.some((arg) => credentialCmdlet.test(arg));

function reachesSecretStore({
  command,
  args,
}: {
  command: string;
  args: string[];
}): boolean {
  const program = programName(command);

  return isStoreProgram(program) || runsCredentialCmdlet(program, args);
}

// The command a failing capability names, for its message.
const CommandOf = z
  .object({ command: z.string() })
  .catch({ command: 'This command' });

const ProcessCapability = z
  .strictObject({
    kind: z.literal('process:exec'),
    // A bare name found on the Server's PATH, or an absolute path; never relative to a working directory.
    command: z
      .string()
      .regex(
        /^(?:[A-Za-z0-9][\w.+-]*|\/[^\0]+)$/,
        'command must be a program name or an absolute path',
      ),
    args: z
      .array(ArgumentPattern)
      .refine((args) => !args.slice(0, -1).includes('**'), {
        error: '** must be the last args pattern',
      }),
    env: z.array(VariableName).optional(),
  })
  .refine((capability) => !reachesSecretStore(capability), {
    error: ({ input }) =>
      `No Plugin may run an OS secret-store tool (ADR-0051): ${CommandOf.parse(input).command} reaches every Secret on this machine. Keep Secrets through argo.secrets or a secret Setting.`,
  });

export type ProcessCapability = z.infer<typeof ProcessCapability>;

// Hooking `process.spawn` sees every other Plugin's commands, so it is a Capability of its own (ADR-0030).
const HookCapability = z.strictObject({
  kind: z.literal('hook'),
  event: z.literal('process.spawn'),
});

// `argo.sessions.get` tells a Plugin which branch the user works on in each Session, so it is declared too.
const SessionsCapability = z.strictObject({ kind: z.literal('sessions:read') });

// `argo.sessions.prompt` starts Turns in the Plugin's Projects with the Plugin as sender (ADR-0055).
const SessionsPromptCapability = z.strictObject({
  kind: z.literal('sessions:prompt'),
});

// `argo.sessions.archive` archives a Session as the App does, with no confirm tier: the person's choice in the Plugin is the consent (ADR-0055).
const SessionsArchiveCapability = z.strictObject({
  kind: z.literal('sessions:archive'),
});

export const PluginCapability = z.discriminatedUnion('kind', [
  ProcessCapability,
  FetchCapability,
  HookCapability,
  SessionsCapability,
  SessionsArchiveCapability,
  SessionsPromptCapability,
]);

export type PluginCapability = z.infer<typeof PluginCapability>;

/*
 * What turning on a Plugin that declares a Capability tells the person it may do (ADR-0030, ADR-0055).
 * `sessions:archive` names the act, since it carries no confirm tier of its own.
 */
const fixedCopy = {
  'sessions:prompt': 'May start Turns in its Projects',
  'sessions:archive': 'May archive Sessions in its Projects',
  'sessions:read': 'May read the branch and Project of your Sessions',
  hook: 'May hook the commands other Plugins run',
};

export function consentCopy(capability: PluginCapability): string {
  switch (capability.kind) {
    case 'process:exec':
      return `May run ${capability.command}`;
    case 'fetch':
      return `May reach ${capability.host}`;
    default:
      return fixedCopy[capability.kind];
  }
}
