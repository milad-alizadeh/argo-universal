import {
  ChartPreviewReply,
  ChartPreviewRequest,
} from '@repo/contracts/operations/chart';
import { z } from 'zod';
import { publicProcedure, router, routerFactory, zAsyncIterable } from '../rpc';
import type { ChartPreview } from './index';

// App plumbing like screen sight. The desktop can answer only the capture it was asked for.
export const createChartPreviewRouter = routerFactory(
  ({ chartPreview }: { chartPreview: ChartPreview }) =>
    router({
      requests: publicProcedure
        .output(zAsyncIterable({ yield: ChartPreviewRequest }))
        .subscription(({ ctx, signal }) =>
          chartPreview.requests(ctx.connection, signal),
        ),
      answer: publicProcedure
        .input(ChartPreviewReply)
        .output(z.void())
        .mutation(({ ctx, input }) =>
          chartPreview.answer(ctx.connection, input),
        ),
    }),
);
