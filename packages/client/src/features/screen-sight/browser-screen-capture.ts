import type { ScreenCapturePort } from './capture-screen';

const pngPrefix = /^data:image\/png;base64,/;

// The stream playing in a video element, so a frame of it can be drawn.
async function playing(stream: MediaStream): Promise<HTMLVideoElement> {
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = stream;
  await video.play();

  return video;
}

function drawn(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')?.drawImage(video, 0, 0);

  return canvas;
}

// One frame of the stream as base64 PNG, without the `data:` prefix.
async function frameOf(stream: MediaStream): Promise<string> {
  const video = await playing(stream);
  const canvas = drawn(video);
  video.srcObject = null;

  return canvas.toDataURL('image/png').replace(pngPrefix, '');
}

// The browser's own display-share prompt, asked each time and for video only.
export const browserScreenCapture: ScreenCapturePort<MediaStream> = {
  getDisplayMedia: () =>
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }),
  frameOf,
  onMac: /Mac/.test(navigator.platform),
};
