import { SystemInfo } from '@repo/contracts';
import { publicProcedure } from '../../engine/trpc';
import { readSystemInfo } from './info';

export const info = publicProcedure
  .output(SystemInfo)
  .query(({ ctx: engineContext }): SystemInfo => readSystemInfo(engineContext));
