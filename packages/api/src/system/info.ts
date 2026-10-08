import { SystemInfo } from '@repo/contracts';
import { publicProcedure } from '../trpc';

export const info = publicProcedure
  .output(SystemInfo)
  .query(
    ({
      ctx,
    }): { version: string; startedAt: string; pid: number; name: string } =>
      ctx.services.system.info(),
  );
