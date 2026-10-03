import { SystemInfo } from '@argo/contracts';
import { publicProcedure } from '../trpc';

export const info = publicProcedure
  .output(SystemInfo)
  .query(({ ctx }) => ctx.services.system.info());
