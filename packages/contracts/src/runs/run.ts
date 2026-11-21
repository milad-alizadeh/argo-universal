import { z } from 'zod';
import { runColumns } from '../columns';

export const RunStatus = runColumns.shape.status;

export type RunStatus = z.infer<typeof RunStatus>;

// What a Run Configuration shows as: a Checkout with no Run of it, or one whose Run ended by Stop, is Stopped.
export const RunConfigurationStatus = z.enum([
  'stopped',
  'starting',
  'ready',
  'crashed',
  'lost',
]);

export type RunConfigurationStatus = z.infer<typeof RunConfigurationStatus>;

const sessionId = z
  .string()
  .optional()
  .describe(
    'The Session whose Checkout runs it; a Session that runs this uses its own.',
  );

const name = z.string().min(1).describe('The Run Configuration’s name.');

const longestStartMs = 300_000;

const longestTail = 100_000;

const timeoutMs = z
  .int()
  .min(1)
  .max(longestStartMs)
  .optional()
  .describe('How long to wait until the Run is ready; 60 seconds by default.');

export const RunNameParams = z.strictObject({ sessionId, name });

export type RunNameParams = z.infer<typeof RunNameParams>;

export const RunStartParams = z.strictObject({ sessionId, name, timeoutMs });

export type RunStartParams = z.infer<typeof RunStartParams>;

const groupName = z
  .string()
  .min(1)
  .describe('The Run Configuration group’s name.');

export const RunGroupNameParams = z.strictObject({
  sessionId,
  name: groupName,
});

export const RunGroupStartParams = RunGroupNameParams.extend({ timeoutMs });

export const RunStatusParams = z.strictObject({ sessionId });

export type RunStatusParams = z.infer<typeof RunStatusParams>;

export const RunLogsParams = z.strictObject({
  sessionId,
  name,
  tail: z
    .int()
    .min(1)
    .max(longestTail)
    .optional()
    .describe(
      'How many characters from the end of the output; 4,000 by default.',
    ),
});

export type RunLogsParams = z.infer<typeof RunLogsParams>;

// Ready: where the app answers. Not ready: why not yet, with the end of its output.
export const RunStartResult = z.union([
  z.strictObject({
    ready: z.literal(true),
    name: z.string(),
    url: z.string(),
    port: z.int(),
  }),
  z.strictObject({
    ready: z.literal(false),
    name: z.string(),
    status: RunConfigurationStatus,
    exitCode: z.int().nullable(),
    tail: z.string(),
  }),
]);

export type RunStartResult = z.infer<typeof RunStartResult>;

export const RunStopResult = z.strictObject({
  name: z.string(),
  status: RunConfigurationStatus,
});

export type RunStopResult = z.infer<typeof RunStopResult>;

export const RunGroupStartResult = z.strictObject({
  name: z.string(),
  members: z.array(
    RunStartResult.or(z.strictObject({ name: z.string(), error: z.string() })),
  ),
});

export type RunGroupStartResult = z.infer<typeof RunGroupStartResult>;

export const RunGroupStopResult = z.strictObject({
  name: z.string(),
  members: z.array(RunStopResult),
});

export type RunGroupStopResult = z.infer<typeof RunGroupStopResult>;

export const RunConfigurationRow = z.strictObject({
  name: z.string(),
  command: z.string(),
  status: RunConfigurationStatus,
  port: z.int().nullable(),
  url: z.string().nullable(),
  exitCode: z.int().nullable(),
  startedAt: z.int().nullable(),
});

export type RunConfigurationRow = z.infer<typeof RunConfigurationRow>;

export const RunDefaultGroup = z.strictObject({
  name: z.string(),
  members: z.array(z.string()),
  readyCount: z.int().nonnegative(),
  url: z.string().nullable(),
});

export type RunDefaultGroup = z.infer<typeof RunDefaultGroup>;

export const RunStatusResult = z.strictObject({
  configurations: z.array(RunConfigurationRow),
  defaultGroup: RunDefaultGroup.optional(),
});

export type RunStatusResult = z.infer<typeof RunStatusResult>;

export const RunLogsResult = z.strictObject({
  name: z.string(),
  status: RunConfigurationStatus,
  exitCode: z.int().nullable(),
  output: z.string(),
});

export type RunLogsResult = z.infer<typeof RunLogsResult>;

export const RunDraftParams = z.strictObject({
  sessionId,
  overwrite: z
    .boolean()
    .optional()
    .describe(
      'Replace an existing .argo/run.json. Leave it out to refuse when the file exists.',
    ),
});

export type RunDraftParams = z.infer<typeof RunDraftParams>;

export const RunDraftResult = z.strictObject({
  path: z.string(),
  configurations: z.array(
    z.strictObject({
      name: z.string(),
      command: z.string(),
      port: z.int().nullable(),
      source: z.string().describe('The file it was drafted from.'),
    }),
  ),
  skipped: z.array(
    z.strictObject({
      source: z.string(),
      name: z.string(),
      reason: z.string(),
    }),
  ),
});

export type RunDraftResult = z.infer<typeof RunDraftResult>;
