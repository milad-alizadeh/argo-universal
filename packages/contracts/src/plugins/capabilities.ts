import { z } from 'zod';

/*
 * What a Plugin's manifest declares it needs from the machine (ADR-0030). The Server checks every
 * `argo.process` and `argo.fetch` call against these; reading Projects and the Plugin's own data
 * folder needs none.
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

const ProcessCapability = z.strictObject({
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
});

export type ProcessCapability = z.infer<typeof ProcessCapability>;

const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

// Hosts that reach this Mac or anywhere at all; each needs a `reason` the consent screen shows.
const specialHostnames: ((name: string) => boolean)[] = [
  (name) => name === '*' || name === 'localhost',
  (name) => name.startsWith('['),
  (name) => ipv4.test(name),
  (name) => name.endsWith('.localhost'),
];

const isSpecialHost = (host: string): boolean =>
  specialHostnames.some((special) => special(hostnameOf(host)));

const hostnameOf = (host: string): string =>
  host.startsWith('[')
    ? host.slice(0, host.indexOf(']') + 1)
    : (host.split(':').at(0) ?? host);

const parsesTo = (host: string): boolean =>
  URL.canParse(`https://${host}`) && new URL(`https://${host}`).host === host;

// A host is written as the URL parser normalises it, so what is declared is exactly what a call is compared with.
const normalHost = (host: string): boolean =>
  host === '*' || (parsesTo(host) && !/[/@?#]/.test(host));

// The host a failing capability names, for its message.
const HostOf = z.object({ host: z.string() }).catch({ host: 'This host' });

const FetchCapability = z
  .strictObject({
    kind: z.literal('fetch'),
    host: z.string().refine(normalHost, {
      error: 'host must be a lower-case host name, with a port if not 443',
    }),
    reason: z.string().trim().min(1).optional(),
  })
  .refine(
    (capability) => capability.reason || !isSpecialHost(capability.host),
    {
      error: ({ input }) => `${HostOf.parse(input).host} needs a reason`,
    },
  );

export type FetchCapability = z.infer<typeof FetchCapability>;

export const PluginCapability = z.discriminatedUnion('kind', [
  ProcessCapability,
  FetchCapability,
]);

export type PluginCapability = z.infer<typeof PluginCapability>;
