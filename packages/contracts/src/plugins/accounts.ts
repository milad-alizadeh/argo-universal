import { z } from 'zod';
import {
  pluginAccountColumns,
  pluginAccountGrantColumns,
  projectAccountColumns,
} from '../columns';

export const PluginAccount = pluginAccountColumns;

export type PluginAccount = z.infer<typeof PluginAccount>;

export const PluginAccountGrant = pluginAccountGrantColumns;

export type PluginAccountGrant = z.infer<typeof PluginAccountGrant>;

export const ProjectAccount = projectAccountColumns;

export const AccountTarget = PluginAccount.pick({ id: true });

export const AccountGrantChange = PluginAccountGrant;

export const AccountChoice = ProjectAccount;

export type AccountChoice = z.infer<typeof AccountChoice>;

export const AccountProjectHost = ProjectAccount.pick({
  projectId: true,
  host: true,
});
