import type { PluginServices } from '../services/plugin-services';

// The Plugin services the runtime's resources reach.
export type ResourceServices = Pick<
  PluginServices,
  | 'handle'
  | 'projectIds'
  | 'heldSecrets'
  | 'onStorageWrite'
  | 'watchProjects'
  | 'activate'
  | 'release'
>;
