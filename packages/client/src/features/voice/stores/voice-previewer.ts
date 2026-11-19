import type { VoicePreviewClip, VoicePreviewClipInput } from '@repo/contracts';
import type { VoiceConnection } from '../types/voice-connection';

// What a preview asks of the Server, for the voice and the unsaved custom voice the input names.
export interface PreviewServer {
  // The stored greeting, or null when the Server has none.
  clipOf: (input: VoicePreviewClipInput) => Promise<VoicePreviewClip | null>;
  // The connection answer to an offer, for a live preview.
  answer: (input: VoicePreviewClipInput, offer: string) => Promise<string>;
  // Keeps a greeting the App recorded.
  storeClip: (
    input: VoicePreviewClipInput,
    clip: VoicePreviewClip,
  ) => Promise<void>;
}

/*
 * Settings' voice previews as the App plays them. A voice the Server holds a greeting for plays from that greeting, with
 * no provider call. The first preview of a voice plays live and its recording is kept for next time; one that fails to
 * record or to upload keeps nothing, so the next tap records again. Picking a voice stops whatever plays or loads.
 */
export class VoicePreviewer {
  // Counts the taps, so a lookup that answers after a later tap plays nothing.
  private taps = 0;

  public constructor(
    private readonly connection: VoiceConnection,
    private readonly server: PreviewServer,
  ) {}

  public async play(input: VoicePreviewClipInput): Promise<void> {
    const tap = ++this.taps;
    this.connection.endPreview();
    const clip = await this.server.clipOf(input).catch(() => null);

    if (tap !== this.taps) return;

    if (clip) this.connection.playClip(clip);
    else await this.playLive(input);
  }

  // Ends the preview and any lookup still under way, as when the page is left.
  public stop(): void {
    this.taps += 1;
    this.connection.endPreview();
  }

  private async playLive(input: VoicePreviewClipInput): Promise<void> {
    await this.connection
      .preview(
        (offer) => this.server.answer(input, offer),
        (clip) => void this.server.storeClip(input, clip).catch(() => {}),
      )
      .catch(() => {});
  }
}
