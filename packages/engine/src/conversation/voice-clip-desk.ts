import type {
  VoicePreviewClipInput,
  VoicePreviewClipOutput,
  VoiceStorePreviewClipInput,
  VoiceStorePreviewClipOutput,
} from '@repo/contracts';
import type { ConversationProvider } from './provider';
import { noProviderReason, unavailable } from './unavailable';
import type { VoiceChoices } from './voice-choices';
import { VoicePreviewClips, type PreviewClipKey } from './voice-preview-clips';

/*
 * The greetings the App recorded from previews (ADR-0064), asked for by the voice a preview would play. What a greeting
 * sounds like depends on the provider, the voice, its style and the name it greets with, so the clip is kept by all four.
 */
export class VoiceClipDesk {
  private readonly clips: VoicePreviewClips;

  public constructor(
    directory: string,
    private readonly choices: Pick<VoiceChoices, 'previewed'>,
    private readonly provider: () => ConversationProvider | null,
  ) {
    this.clips = new VoicePreviewClips(directory);
  }

  // The stored greeting; null when none is stored or no provider is set.
  public async get(
    input: VoicePreviewClipInput,
  ): Promise<VoicePreviewClipOutput> {
    const key = await this.keyOf(input);

    return { clip: key ? await this.clips.read(key) : null };
  }

  public async store({
    clip,
    ...input
  }: VoiceStorePreviewClipInput): Promise<VoiceStorePreviewClipOutput> {
    const key = await this.keyOf(input);

    if (!key) throw unavailable(noProviderReason);
    await this.clips.write(key, clip);

    return { stored: true };
  }

  private async keyOf(
    input: VoicePreviewClipInput,
  ): Promise<PreviewClipKey | null> {
    const provider = this.provider();

    if (!provider) return null;
    const { voice, style, label } = await this.choices.previewed(input);

    return { provider: provider.id, voice, style, label };
  }
}
