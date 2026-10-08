import { clock } from './clock';
import { info, type SystemDeps } from './info';
import type { SystemService } from './service';

export type { SystemDeps } from './info';

export const createSystemService = (deps: SystemDeps): SystemService => ({
  info: (): ReturnType<SystemService['info']> => info(deps),
  clock: (signal): ReturnType<typeof clock> => clock(signal),
});

export { systemRouter } from './router';
export type { SystemService } from './service';
