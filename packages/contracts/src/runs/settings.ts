import { z } from 'zod';
import { ProjectsBranchesInput } from '../projects';
import { RunNameParams } from './run';

const highestPort = 65_535;

export const RunSettingsEnv = z.record(z.string(), z.string());

const port = z.int().min(1).max(highestPort).nullable();

export const RunSettingsResult = z.strictObject({
  env: RunSettingsEnv,
  port,
  autoStart: z.boolean(),
  canAutoStart: z.boolean(),
});

export type RunSettingsResult = z.infer<typeof RunSettingsResult>;

export const RunSettingsProject = ProjectsBranchesInput;

export const RunSettingsList = z.array(
  RunSettingsResult.extend({ name: RunNameParams.shape.name }),
);

export type RunSettingsList = z.infer<typeof RunSettingsList>;

export const RunSettingsUpdate = RunNameParams.extend({
  projectId: RunSettingsProject.shape.projectId.optional(),
  env: RunSettingsEnv.optional().describe(
    'Replace the personal environment overrides.',
  ),
  port: port
    .optional()
    .describe('The personal pinned port, or null to clear it.'),
  autoStart: z.boolean().optional(),
}).refine(
  ({ sessionId, projectId }) =>
    sessionId === undefined || projectId === undefined,
  {
    message: 'Choose either a Project or a Session.',
  },
);

export type RunSettingsUpdate = z.infer<typeof RunSettingsUpdate>;
