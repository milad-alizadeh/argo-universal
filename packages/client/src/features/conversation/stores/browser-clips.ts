import type { VoicePreviewClip } from '@repo/contracts';
import type {
  VoicePlayback,
  VoiceRecording,
} from '../types/conversation-environment';
import { AudioElementPlayback } from './speaker-sink';

// The largest slice `btoa` is given at once, so a long clip never overflows the call's arguments.
const sliceBytes = 0x8000;

function base64Of(bytes: Uint8Array): string {
  let binary = '';

  for (let at = 0; at < bytes.length; at += sliceBytes)
    binary += String.fromCharCode(...bytes.subarray(at, at + sliceBytes));

  return btoa(binary);
}

// The blob's audio type without its codecs, such as `audio/webm`; null for no sound or no audio at all.
const audioTypeOf = (type: string): string | null =>
  /^(audio\/[\w.+-]+)/.exec(type)?.[1] ?? null;

// The recorded blob as a clip; null when the browser recorded no audio.
async function clipOf(blob: Blob): Promise<VoicePreviewClip | null> {
  const mimeType = blob.size > 0 ? audioTypeOf(blob.type) : null;

  if (!mimeType) return null;

  return {
    mimeType,
    data: base64Of(new Uint8Array(await blob.arrayBuffer())),
  };
}

// Records the voice's stream until it is finished or cancelled.
export class BrowserRecording implements VoiceRecording {
  private readonly recorder: MediaRecorder;
  private readonly chunks: Blob[] = [];

  public constructor(stream: MediaStream) {
    this.recorder = new MediaRecorder(stream);
    this.recorder.addEventListener('dataavailable', ({ data }) =>
      this.chunks.push(data),
    );
    this.recorder.start();
  }

  public finish(): Promise<VoicePreviewClip | null> {
    return new Promise((resolve, reject) => {
      this.recorder.addEventListener('stop', () => {
        clipOf(new Blob(this.chunks, { type: this.recorder.mimeType })).then(
          resolve,
          reject,
        );
      });
      this.recorder.addEventListener('error', () => resolve(null));
      this.recorder.stop();
    });
  }

  public cancel(): void {
    if (this.recorder.state !== 'inactive') this.recorder.stop();
  }
}

// A stored greeting playing on an audio element; it has no level to show, as the band is not drawn for a preview.
export class BrowserClipPlayback
  extends AudioElementPlayback
  implements VoicePlayback
{
  public constructor(clip: VoicePreviewClip, speaker: string | null) {
    super(new Audio(`data:${clip.mimeType};base64,${clip.data}`));
    this.setSpeaker(speaker);
    this.audio.play().catch(() => {});
  }

  public level(): number {
    return 0;
  }

  public spectrum(into: Float32Array): void {
    into.fill(0);
  }

  public stop(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
  }
}
