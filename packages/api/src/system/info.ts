import { SystemInfo } from '@repo/contracts';
import { publicProcedure } from '../trpc';

export const info = publicProcedure
  .output(SystemInfo)
  .query(({ ctx }): SystemInfo => ctx.services.system.info());
