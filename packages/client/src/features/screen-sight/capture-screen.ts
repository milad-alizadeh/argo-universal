import type { ScreenCaptureAnswer } from '@repo/contracts/operations';

// A stream of the screen: all that is done with it once drawn is to stop it.
export type DisplayStream = { getTracks: () => { stop: () => void }[] };

// What capturing a screen needs of the browser: the display-share prompt, and a way to draw one frame of its stream.
export type ScreenCapturePort<Stream extends DisplayStream = DisplayStream> = {
  getDisplayMedia: () => Promise<Stream>;
  frameOf: (stream: Stream) => Promise<string>;
  // Whether the App runs on a Mac, where a missing Screen Recording permission is the usual reason a capture fails.
  onMac?: boolean;
};

const missingPermission =
  'Argo could not read the screen. Grant Screen Recording to Argo in System Settings under Privacy & Security, then restart Argo.';

const isDeclined = (error: Error): boolean =>
  error instanceof DOMException && error.name === 'NotAllowedError';

// What went wrong, in words that say the real cause; the Mac setting is named only when a Mac refused to let Argo read.
const unavailableReason = (error: Error, onMac: boolean): string =>
  onMac && error.name === 'NotReadableError'
    ? missingPermission
    : `Argo could not capture the screen (${error.name}: ${error.message}).`;

// The person closing or refusing the share prompt is a refusal; anything else is the system not letting the App capture.
const answerToFailure = (error: Error, onMac: boolean): ScreenCaptureAnswer =>
  isDeclined(error)
    ? { status: 'refused', reason: 'declined' }
    : { status: 'not_available', reason: unavailableReason(error, onMac) };

function stop(stream: DisplayStream): void {
  for (const track of stream.getTracks()) track.stop();
}

async function takeFrame<Stream extends DisplayStream>(
  port: ScreenCapturePort<Stream>,
): Promise<ScreenCaptureAnswer> {
  const stream = await port.getDisplayMedia();

  try {
    const data = await port.frameOf(stream);

    return { status: 'captured', image: { mimeType: 'image/png', data } };
  } finally {
    stop(stream);
  }
}

/*
 * One still picture of the whole screen the person chooses in the browser's or the system's own share prompt. The
 * stream stops as soon as the frame is drawn, so nothing keeps watching, and the picture is only returned.
 */
export const captureScreen = <Stream extends DisplayStream>(
  port: ScreenCapturePort<Stream>,
): Promise<ScreenCaptureAnswer> =>
  takeFrame(port).catch((error: Error) =>
    answerToFailure(error, port.onMac ?? false),
  );
