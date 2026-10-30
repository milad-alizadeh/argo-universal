import { z } from 'zod';
import { WireJson } from '#plugin-wire-json';

/*
 * A Plugin's own Operations: what an Agent runs with `argo run <plugin-id>.<name>` (ADR-0044). A Plugin
 * declares each one in its manifest, so core knows the Operation and its tier before the worker starts,
 * and registers the handler as it starts.
 */

// One Operation's name within its Plugin; its id is `<plugin-id>.<name>`.
export const PluginOperationName = z
  .string()
  .regex(
    /^[a-z][a-zA-Z0-9]*$/,
    'An Operation name starts with a lower-case letter and holds only letters and digits',
  );

/*
 * A declared param: its type, whether it must be given, and the line `argo operations` prints for it.
 * Core checks the params against these before the Plugin ever sees them.
 */
export const PluginOperationParam = z.strictObject({
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string().trim().min(1),
  required: z.boolean().optional(),
});

export type PluginOperationParam = z.infer<typeof PluginOperationParam>;

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

export const PluginOperationContribution = z.strictObject({
  name: PluginOperationName,
  label: z.string().trim().min(1),
  description: z.string().trim().min(1),
  tier: PluginOperationTier,
  params: z.record(PluginOperationName, PluginOperationParam).optional(),
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

// Who ran the Operation: the Session whose token called it, and the Project that Session works in.
export const PluginOperationCaller = z.strictObject({
  sessionId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
});

export type PluginOperationCaller = z.infer<typeof PluginOperationCaller>;

// The worker's answer to one invocation, by the id it arrived with.
export const PluginOperationCall = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('result'),
    id: z.number().int().nonnegative(),
    result: WireJson,
  }),
  z.strictObject({
    action: z.literal('failed'),
    id: z.number().int().nonnegative(),
    error: z.string(),
  }),
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
