import { ipcMain, nativeImage } from 'electron';
import { z } from 'zod';
import { reportUnrecognised } from './report-unrecognised';

const largestPointSize = 512;

const SymbolImageRequest = z.object({
  name: z.string().regex(/^[a-z\d]+(?:\.[a-z\d]+)*$/),
  pointSize: z.number().int().min(1).max(largestPointSize),
});

type SymbolImageRequest = z.infer<typeof SymbolImageRequest>;

// Apple's licence allows SF Symbols only in apps for Apple platforms, so macOS draws them at runtime and no file ships.
function renderSymbolImage({
  name,
  pointSize,
}: SymbolImageRequest): string | null {
  const image = nativeImage.createFromNamedImage(name, { pointSize });
  return image.isEmpty() ? null : image.toDataURL();
}

export function handleSymbolImages(windowOrigin: string): void {
  ipcMain.handle('symbol:render', (event, input: unknown): string | null => {
    if (event.senderFrame?.origin !== windowOrigin) return null;
    const request = SymbolImageRequest.safeParse(input);
    if (request.success) return renderSymbolImage(request.data);
    reportUnrecognised('symbol image request', request.error);
    return null;
  });
}
