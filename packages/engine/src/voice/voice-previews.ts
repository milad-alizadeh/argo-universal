import type { VoicePreviewInput, VoicePreviewOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type {
  VoiceOption,
  VoiceProvider,
  VoiceProviderCall,
  VoiceProviderEvent,
} from './provider';

// The longest a preview may play when the voice never says it has finished.
const previewLimitMs = 20_000;

const greetingOf = ({ label }: VoiceOption): string =>
  `Hi, I'm ${label}. This is how I'll sound on your calls.`;

// The voice has finished its greeting, or the call is over.
const finished = (event: VoiceProviderEvent): boolean =>
  (event.type === 'speaking' && !event.speaking) || event.type === 'closed';

async function optionOf(
  provider: VoiceProvider,
  voice: string,
): Promise<VoiceOption> {
  const option = (await provider.voices()).find(({ id }) => id === voice);

  if (!option)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `There is no voice ${voice}`,
    });

  return option;
}

/*
 * Settings' voice previews: a call that says one greeting in the voice picked, then hangs up by itself.
 * A preview is no Voice call: it has no Session, no orb and no Feed rows, and only one plays at a time.
 */
export class VoicePreviews {
  private playing: VoiceProviderCall | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  // Counts the previews asked for, so one that answers after a later one was asked for is ended at once.
  private asked = 0;

  public async play(
    provider: VoiceProvider,
    input: VoicePreviewInput,
  ): Promise<VoicePreviewOutput> {
    this.end();
    const ask = ++this.asked;
    const words = greetingOf(await optionOf(provider, input.voice));
    const call = await provider.preview({ ...input, words });

    if (ask === this.asked) this.hold(call);
    else call.end();

    return { answer: call.answer };
  }

  // Ends the preview playing, and any still being asked for.
  public end(): void {
    this.asked += 1;
    clearTimeout(this.timer);
    this.playing?.end();
    this.playing = null;
  }

  private hold(call: VoiceProviderCall): void {
    this.playing = call;
    this.timer = setTimeout(() => this.endCall(call), previewLimitMs);
    call.listen((event) => {
      if (finished(event)) this.endCall(call);
    });
  }

  private endCall(call: VoiceProviderCall): void {
    if (call === this.playing) this.end();
    else call.end();
  }
}
