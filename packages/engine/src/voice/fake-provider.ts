import type { VoiceAvailability } from '@repo/contracts';
import type { ScreenImage } from '@repo/contracts/operations';
import type {
  VoiceClosedReason,
  VoiceDelivery,
  VoiceOption,
  VoiceProvider,
  VoiceProviderCall,
  VoicePreviewRequest,
  VoiceProviderEvent,
  VoiceStartRequest,
} from './provider';

export interface FakeVoiceOptions {
  // Whether the provider is usable; the reason is what it says when it is not.
  usable?: boolean;
  reason?: string;
  // When the call reports itself connected: after a delay in milliseconds, or only when a test calls `connect()`.
  connect?: number | 'manual';
  // Makes starting a call fail with this message.
  failStart?: string;
  // The voices it lists; one by default.
  voices?: VoiceOption[];
  // Whether its calls take images, as a provider with the capability does; off by default.
  images?: boolean;
}

// Something the Engine told the voice, as a test reads it back.
export type FakeVoiceMessage =
  | { kind: 'reply'; requestId: string; text: string; delivery: VoiceDelivery }
  | { kind: 'tell'; text: string; delivery: VoiceDelivery };

const defaultConnectDelay = 400;

/*
 * A Voice provider that carries no audio, for Engine tests and for development (`ARGO_VOICE_PROVIDER=fake`).
 * It implements the real interface; a test drives what the person says through the call it returns.
 */
export class FakeVoiceProvider implements VoiceProvider {
  public readonly id = 'fake';
  public readonly label = 'Fake voice provider';
  public readonly experimental = true;
  public readonly calls: FakeVoiceCall[] = [];
  public readonly previews: FakeVoiceCall<VoicePreviewRequest>[] = [];
  private options: FakeVoiceOptions;

  public constructor(options: FakeVoiceOptions = {}) {
    this.options = options;
  }

  public get images(): boolean {
    return this.options.images === true;
  }

  public configure(options: FakeVoiceOptions): void {
    this.options = { ...this.options, ...options };
  }

  public availability(): Promise<VoiceAvailability> {
    return Promise.resolve(
      this.options.usable === false
        ? { usable: false, reason: this.options.reason ?? 'Not available' }
        : { usable: true },
    );
  }

  public voices(): Promise<VoiceOption[]> {
    return Promise.resolve(
      this.options.voices ?? [{ id: 'fake', label: 'Fake voice' }],
    );
  }

  public start(request: VoiceStartRequest): Promise<FakeVoiceCall> {
    const { failStart } = this.options;

    if (failStart !== undefined) return Promise.reject(new Error(failStart));
    const call = new FakeVoiceCall(request);

    if (this.images) call.takeImages();
    this.calls.push(call);
    this.scheduleConnect(call);

    return Promise.resolve(call);
  }

  public preview(
    request: VoicePreviewRequest,
  ): Promise<FakeVoiceCall<VoicePreviewRequest>> {
    const preview = new FakeVoiceCall(request);
    this.previews.push(preview);

    return Promise.resolve(preview);
  }

  private scheduleConnect(call: FakeVoiceCall): void {
    const { connect = defaultConnectDelay } = this.options;

    if (connect !== 'manual') setTimeout(() => call.connect(), connect);
  }

  // The call most recently started.
  public get call(): FakeVoiceCall {
    const call = this.calls.at(-1);

    if (!call) throw new Error('No Voice call was started');

    return call;
  }

  // The preview most recently started.
  public get previewing(): FakeVoiceCall<VoicePreviewRequest> {
    const preview = this.previews.at(-1);

    if (!preview) throw new Error('No voice preview was started');

    return preview;
  }
}

export class FakeVoiceCall<
  Request extends { offer: string } = VoiceStartRequest,
> implements VoiceProviderCall {
  public readonly answer: string;
  public readonly sent: FakeVoiceMessage[] = [];
  // The images the Engine gave the voice, when the provider takes them.
  public readonly images: ScreenImage[] = [];
  public sendImage?: (image: ScreenImage) => void;

  // The call can be given images, as a provider with the capability allows.
  public takeImages(): void {
    this.sendImage = (image: ScreenImage): void => {
      this.images.push(image);
    };
  }
  public ended = false;
  private readonly listeners = new Set<(event: VoiceProviderEvent) => void>();

  public constructor(public readonly request: Request) {
    this.answer = `fake-answer:${request.offer}`;
  }

  public listen(listener: (event: VoiceProviderEvent) => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  public reply(requestId: string, text: string, delivery: VoiceDelivery): void {
    this.sent.push({ kind: 'reply', requestId, text, delivery });
  }

  public tell(text: string, delivery: VoiceDelivery): void {
    this.sent.push({ kind: 'tell', text, delivery });
  }

  public end(): void {
    this.ended = true;
  }

  // What a test makes the provider report.
  public emit(event: VoiceProviderEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  // A call that ended reports no connection, however late a scheduled connect fires.
  public connect(): void {
    if (!this.ended) this.emit({ type: 'status', status: 'connected' });
  }

  public personSays(text: string, id = 'person'): void {
    this.emit({ type: 'person.transcript', id, text, final: true });
  }

  public voiceSays(text: string, id = 'voice'): void {
    this.emit({ type: 'voice.transcript', id, text, final: true });
  }

  public requestWork(requestId: string, text: string): void {
    this.emit({ type: 'work.requested', requestId, text });
  }

  // The voice asks to look at the person's screen.
  public requestFrame(requestId: string): void {
    this.emit({ type: 'frame.requested', requestId });
  }

  // The provider closes the call; `why` is its own reason in plain words, when it gives one.
  public close(reason: VoiceClosedReason = 'ended', why?: string): void {
    this.emit(
      why === undefined
        ? { type: 'closed', reason }
        : { type: 'closed', reason, why },
    );
  }

  // Something the provider notes for the Server's log.
  public note(note: string): void {
    this.emit({ type: 'trail', note });
  }
}
