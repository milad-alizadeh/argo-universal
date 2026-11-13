import { z } from 'zod';
import { WireJson } from '#plugin-wire-json';

/*
 * A Plugin's own Operations: what an Agent runs with `argo run <plugin-id>.<name>` (ADR-0044). A Plugin
 * declares each one in its manifest, so core knows the Operation and its tier before the worker starts,
 * and registers the handler as it starts.
 */

// One Operation's name within its Plugin; its id is `<plugin-id>.<name>`.
/*
 * How long one of a Plugin's Operations may run before the Server fails its call. An Operation is an Agent's
 * own step, not a drawing deadline, so it is given far longer than a Slot's batched call. The worker knows
 * it too: once it has passed, the run is no longer the Server's to mark, and a later change marks as usual.
 */
export const operationLimitMs = 30_000;

export const PluginOperationName = z
  .string()
  .regex(
    /^[a-z][a-zA-Z0-9]*$/,
    'An Operation name starts with a lower-case letter and holds only letters and digits',
  );

/*
 * A declared param: its type, whether it must be given, and the line `argo operations` prints for it.
 * A string param may list its `choices`, the only values it takes. Core checks the params against these
 * before the Plugin ever sees them.
 * A string param may be `secret`, as a pasted token is (ADR-0051): the only way a `FieldGroup.SecretField`'s value
 * reaches a Plugin, and one Argo never logs, records in a Session's history or answers back.
 */
export const PluginOperationParam = z
  .strictObject({
    type: z.enum(['string', 'number', 'boolean']),
    description: z.string().trim().min(1),
    required: z.boolean().optional(),
    choices: z.array(z.string().min(1)).min(1).optional(),
    secret: z.boolean().optional(),
  })
  .refine(
    ({ type, choices }) => choices === undefined || type === 'string',
    'Only a string param lists choices',
  )
  .refine(
    ({ type, secret }) => secret !== true || type === 'string',
    'Only a string param is secret',
  )
  .refine(
    ({ choices, secret }) => secret !== true || choices === undefined,
    'A secret param lists no choices',
  )
  .refine(
    ({ choices = [] }) => new Set(choices).size === choices.length,
    'A param lists each choice once',
  );

export type PluginOperationParam = z.infer<typeof PluginOperationParam>;

// What stands in for a secret param's value wherever Argo would otherwise show or keep it.
export const redactedSecret = '[secret]';

// The params an Operation marks secret, by name.
export const secretParamNames = (
  params: Readonly<Record<string, PluginOperationParam>> = {},
): ReadonlySet<string> =>
  new Set(
    Object.entries(params)
      .filter(([, param]) => param.secret === true)
      .map(([name]) => name),
  );

/*
 * The params one invocation carries: core has already checked them against what the Plugin declared,
 * so each is a plain value of a declared type and nothing else reaches the handler.
 */
export const PluginOperationParams = z.record(
  PluginOperationName,
  z.union([z.string(), z.number(), z.boolean()]),
);

export type PluginOperationParams = z.infer<typeof PluginOperationParams>;

/*
 * A Plugin reaches only its own Project and the Session that called it, so it declares `read` or `act`;
 * `confirm`, which asks the user before a call, stays core's own (ADR-0044).
 */
export const PluginOperationTier = z.enum(['read', 'act']);

export type PluginOperationTier = z.infer<typeof PluginOperationTier>;

/*
 * What an Operation needs its Caller to carry: `session`, that a Session runs it; `project`, a Project it
 * acts in. Core gives a `project` Operation a `projectId` param of its own, and the Project is the one it
 * names or else the Caller's; core refuses the run when there is none, so the handler always has one.
 */
export const PluginOperationNeed = z.enum(['project', 'session']);

export type PluginOperationNeed = z.infer<typeof PluginOperationNeed>;

// The param core adds to an Operation that needs a Project; a Plugin never declares it.
export const projectParam = 'projectId';

export const PluginOperationContribution = z.strictObject({
  name: PluginOperationName,
  label: z.string().trim().min(1),
  description: z.string().trim().min(1),
  tier: PluginOperationTier,
  params: z
    .record(PluginOperationName, PluginOperationParam)
    .refine(
      (params) => !Object.hasOwn(params, projectParam),
      'An Operation needs a Project with "caller": ["project"], not a projectId param',
    )
    .optional(),
  caller: z
    .array(PluginOperationNeed)
    .refine(
      (needs) => new Set(needs).size === needs.length,
      'An Operation names each need once',
    )
    .optional(),
  keywords: z.array(z.string().trim().min(1)).optional(),
});

export type PluginOperationContribution = z.infer<
  typeof PluginOperationContribution
>;

// Every Operation one manifest declares, each named once.
export const PluginOperationContributions = z
  .array(PluginOperationContribution)
  .refine(
    (declared) =>
      new Set(declared.map((operation) => operation.name)).size ===
      declared.length,
    'Operation names must be unique',
  );

/*
 * Who ran the Operation: the Session whose token called it, and the Project that Session works in. A tap
 * is run by the person at an App, so it says `person` and carries the page's Project and Session as its
 * scope only; it is not a Session, and an Operation that needs one refuses it.
 */
export const PluginOperationCaller = z.strictObject({
  sessionId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  person: z.literal(true).optional(),
});

export type PluginOperationCaller = z.infer<typeof PluginOperationCaller>;

// The worker's answer that one call Argo asked of it failed, by the call's id, and why.
export const WorkerCallFailed = z.strictObject({
  action: z.literal('failed'),
  id: z.number().int().nonnegative(),
  error: z.string(),
});

// The worker's answer to one invocation, by the id it arrived with.
export const PluginOperationCall = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('result'),
    id: z.number().int().nonnegative(),
    result: WireJson,
  }),
  WorkerCallFailed,
]);

export type PluginOperationCall = z.infer<typeof PluginOperationCall>;

// The full id an Agent runs, which names the Plugin before the Operation.
export const pluginOperationId = (pluginId: string, name: string): string =>
  `${pluginId}.${name}`;

// The Plugin and the Operation within it that one id names.
export const PluginOperationRef = z.strictObject({
  pluginId: z.string().min(1),
  name: PluginOperationName,
});

export type PluginOperationRef = z.infer<typeof PluginOperationRef>;

const operationIdPattern = /^(?<pluginId>[^.]+)\.(?<name>[^.]+)$/;

// The Plugin and Operation an id names, for an id of that shape.
export const splitPluginOperationId = (
  id: string,
): PluginOperationRef | null => {
  const parsed = PluginOperationRef.safeParse(
    operationIdPattern.exec(id)?.groups,
  );

  return parsed.success ? parsed.data : null;
};
