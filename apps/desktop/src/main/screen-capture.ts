import type { ScreenCaptureAnswer } from '@repo/contracts/operations';

// A display the App could draw: its id and its picture as base64 PNG, empty when the system gave none.
export type ScreenSource = { displayId: string; png: string };

// What capturing the screen needs of the system: Electron's in the App, a fake in a test.
export type ScreenPort = {
  platform: NodeJS.Platform;
  // Whether the system lets the App read the screen; only macOS ever says no.
  access: () => 'granted' | 'denied';
  mainDisplayId: () => string;
  sources: () => Promise<ScreenSource[]>;
};

const missingPermission =
  'Argo could not read the screen. Grant Screen Recording to Argo in System Settings under Privacy & Security, then restart Argo.';

const unavailable = (reason: string): ScreenCaptureAnswer => ({
  status: 'not_available',
  reason,
});

// Why the screen could not be read, naming the Mac setting only on a Mac.
const unreadable = ({ platform }: ScreenPort): ScreenCaptureAnswer =>
  unavailable(
    platform === 'darwin'
      ? missingPermission
      : 'Argo could not read the screen: the system gave no picture.',
  );

// The main display's picture; any display's when the main one is not among them.
const pictureOf = (sources: ScreenSource[], mainId: string): string =>
  [...sources.filter(({ displayId }) => displayId === mainId), ...sources][0]
    ?.png ?? '';

const failedWith = (error: Error | string): ScreenCaptureAnswer =>
  unavailable(
    `Argo could not capture the screen (${error instanceof Error ? error.message : error}).`,
  );

async function take(port: ScreenPort): Promise<ScreenCaptureAnswer> {
  const data = pictureOf(await port.sources(), port.mainDisplayId());

  return data
    ? { status: 'captured', image: { mimeType: 'image/png', data } }
    : unreadable(port);
}

/*
 * One still picture of the main display (screen sight, ADR-0064). The desktop App owns the capture: it knows the
 * system, so the page is told only what came of it. The person has already been asked by the Operation's `confirm`.
 */
export function captureMainScreen(
  port: ScreenPort,
): Promise<ScreenCaptureAnswer> {
  if (port.access() === 'denied') return Promise.resolve(unreadable(port));

  return take(port).catch((error: Error | string) => failedWith(error));
}
