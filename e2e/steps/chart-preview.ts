import { readControlToken } from '@repo/engine/server-runtime';
import { z } from 'zod';
import { expect, type App } from '../fixtures';
import { test, Then } from './fixtures';

const ChartCapture = z.object({
  valid: z.literal(true),
  status: z.literal('captured'),
  platform: z.literal('web'),
  width: z.literal(360),
  theme: z.literal('dark'),
  image: z.object({ mimeType: z.literal('image/png'), data: z.base64() }),
});

const OperationReply = z.object({
  result: z.object({
    data: z.object({ kind: z.literal('result'), result: z.json() }),
  }),
});

const fence = [
  '```chart',
  '{"kind":"line","label":"Weekly deliveries","series":[{"name":"Delivered","tone":"info","points":[{"x":1,"y":12},{"x":2,"y":19},{"x":3,"y":26}]}]}',
  '```',
].join('\n');

type DesktopApp = App & { desktop: NonNullable<App['desktop']> };

async function requestPreview({
  page,
  httpUrl,
  desktop,
}: DesktopApp): Promise<
  z.output<typeof OperationReply>['result']['data']['result']
> {
  const token = await readControlToken(desktop.home);

  const response = await page.request.post(`${httpUrl}/trpc/operations.run`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      id: 'chart.preview',
      params: { fence, width: 360, theme: 'dark' },
    },
  });

  expect(response.ok(), await response.text()).toBe(true);

  const reply = OperationReply.parse(await response.json());

  return reply.result.data.result;
}

function expectCroppedPng(image: Buffer): void {
  // PNG's IHDR begins at this offset, with the pixel width followed by the height.
  const dimensionOffset = 16;

  const heightOffset = 20;

  const width = image.readUInt32BE(dimensionOffset);
  const height = image.readUInt32BE(heightOffset);

  expect(image.subarray(1, 4).toString()).toBe('PNG');
  expect(height / width).toBeCloseTo(9 / 16, 2);
}

Then(
  'the Chart preview Operation returns a cropped dark web PNG',
  async ({ app }) => {
    const { desktop, page } = app;

    if (!desktop) throw new Error('Expected the desktop App');

    const pageUrl = page.url();

    const chart = ChartCapture.parse(await requestPreview({ ...app, desktop }));

    const image = Buffer.from(chart.image.data, 'base64');

    expectCroppedPng(image);
    expect(page.url()).toBe(pageUrl);
    expect(desktop.application.windows()).toEqual([page]);
    await test
      .info()
      .attach('chart-preview', { body: image, contentType: 'image/png' });
  },
);

Then(
  'the Chart preview Operation explains when the drawing cannot load',
  async ({ app }) => {
    const { desktop } = app;

    if (!desktop) throw new Error('Expected the desktop App');

    // The isolated renderer starts with no CanvasKit module in memory.
    await desktop.application.evaluate(({ session }): void => {
      const preview = session.fromPartition('argo-chart-preview');

      preview.webRequest.onBeforeRequest((request, complete): void => {
        complete({
          cancel: new URL(request.url).pathname === '/canvaskit.wasm',
        });
      });
    });

    expect(await requestPreview({ ...app, desktop })).toEqual({
      valid: true,
      status: 'unavailable',
      reason: 'The Chart and its labels did not finish drawing.',
    });
  },
);
