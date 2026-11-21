import { once } from 'node:events';
import { validateChartFence } from '@repo/contracts/chart-fence';
import {
  ChartPreviewDraft,
  type ChartPreviewAnswer,
} from '@repo/contracts/operations/chart';
import { BaseWindow, ipcMain, session, WebContentsView } from 'electron';
import { z } from 'zod';
import { appOrigin, handleAppProtocol } from './app-protocol';
import { isTrustedWindow } from './trusted-window';

const deadlineMs = 17_000;

const viewportHeight = 760;

const Rect = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

function unavailable(reason: string): ChartPreviewAnswer {
  return { status: 'unavailable', reason };
}

// This script runs only in the fixed preview document. The draft is data, never interpolated as code.
function previewScript(draft: ChartPreviewDraft): string {
  return `(async () => {
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    while (!window.argoDrawChart) await frame();
    if (!window.argoDrawChart(${JSON.stringify(draft)})) return null;

    const read = () => {
      const root = document.getElementById('chart-preview');
      const canvas = root?.querySelector('canvas');
      const labels = root?.querySelector('[data-testid="chart-axes"], [data-testid="chart-legend"]');

      if (!canvas?.width || !canvas.height || !labels?.childElementCount) return null;

      const rect = root.getBoundingClientRect();
      const plot = canvas.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0 && plot.width > 0 && plot.height > 0) {
        return {
          x: Math.floor(rect.left),
          y: Math.floor(rect.top),
          width: Math.ceil(rect.right) - Math.floor(rect.left),
          height: Math.ceil(rect.bottom) - Math.floor(rect.top),
        };
      }
      return null;
    };

    while (!read()) await frame();
    await document.fonts.ready;
    await frame();
    await frame();

    return read();
  })()`;
}

interface Drawing {
  page: string;
  view: WebContentsView;
  draft: ChartPreviewDraft;
}

async function draw({
  page,
  view,
  draft,
}: Drawing): Promise<ChartPreviewAnswer> {
  const contents = view.webContents;

  await contents.loadURL(page);

  const bounds = Rect.safeParse(
    await contents.executeJavaScript(previewScript(draft)),
  );

  if (!bounds.success || bounds.data.width !== draft.width)
    return unavailable('The Chart did not draw at the requested Feed width.');

  const painted = once(contents, 'paint');
  contents.invalidate();

  await painted;

  const picture = await contents.capturePage(bounds.data, { stayHidden: true });

  if (picture.isEmpty())
    return unavailable('The Chart preview capture was empty.');

  return {
    status: 'captured',
    image: { mimeType: 'image/png', data: picture.toPNG().toString('base64') },
  };
}

function previewView(
  host: BaseWindow,
  width: number,
  rendererSession: Electron.Session,
): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      session: rendererSession,
      sandbox: true,
      offscreen: true,
      backgroundThrottling: false,
    },
  });

  host.contentView.addChildView(view);
  view.setBounds({ width, height: viewportHeight, x: 0, y: 0 });
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  view.webContents.on('will-navigate', (event) => event.preventDefault());
  view.webContents.on('will-redirect', (event) => event.preventDefault());

  return view;
}

async function capture(
  draft: ChartPreviewDraft,
  page: string,
  rendererSession: Electron.Session,
): Promise<ChartPreviewAnswer> {
  const host = new BaseWindow({
    width: draft.width,
    height: viewportHeight,
    show: false,
  });

  const view = previewView(host, draft.width, rendererSession);

  const timeout = Promise.withResolvers<ChartPreviewAnswer>();

  const deadline = setTimeout(
    () =>
      timeout.resolve(
        unavailable('The Chart and its labels did not finish drawing.'),
      ),
    deadlineMs,
  );

  try {
    return await Promise.race([draw({ page, view, draft }), timeout.promise]);
  } catch {
    return unavailable(
      'The desktop Chart renderer could not draw the preview.',
    );
  } finally {
    clearTimeout(deadline);
    view.webContents.close();
    host.destroy();
  }
}

export function handleChartPreview(
  origin: string,
  developmentUrl: string | undefined,
  exportDirectory: string,
): void {
  const rendererSession = session.fromPartition('argo-chart-preview');

  if (!developmentUrl)
    handleAppProtocol(exportDirectory, rendererSession.protocol);

  const page = new URL('/chart-preview', developmentUrl ?? appOrigin).href;

  ipcMain.handle(
    'chart:preview',
    async (event, input: ChartPreviewDraft): Promise<ChartPreviewAnswer> => {
      if (
        event.senderFrame !== event.sender.mainFrame ||
        !isTrustedWindow(event, origin)
      )
        throw new Error('Untrusted Chart preview request');

      const draft = ChartPreviewDraft.safeParse(input);

      if (!draft.success || !validateChartFence(draft.data.fence).valid)
        return unavailable('The Chart data could not be drawn.');

      return capture(draft.data, page, rendererSession);
    },
  );
}
