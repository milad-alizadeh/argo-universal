import type { SystemService } from '@repo/api';
import { clock } from './clock';
import { info, type SystemDeps } from './info';

export type { SystemDeps } from './info';

export const createSystemService = (deps: SystemDeps): SystemService => ({
  info: () => info(deps),
  clock: (signal) => clock(signal),
});
