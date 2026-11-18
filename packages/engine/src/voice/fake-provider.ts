import type { VoiceAvailability } from '@repo/contracts';
import type {
  VoiceClosedReason,
  VoiceDelivery,
  VoiceOption,
  VoiceProvider,
  VoiceProviderCall,
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
  public readonly calls: FakeVoiceCall[] = [];
  private options: FakeVoiceOptions;

  public constructor(options: FakeVoiceOptions = {}) {
    this.options = options;
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
    return Promise.resolve([{ id: 'fake', label: 'Fake voice' }]);
  }

  public start(request: VoiceStartRequest): Promise<FakeVoiceCall> {
    const { failStart } = this.options;

    if (failStart !== undefined) return Promise.reject(new Error(failStart));
    const call = new FakeVoiceCall(request);
    this.calls.push(call);
    this.scheduleConnect(call);

    return Promise.resolve(call);
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
}

export class FakeVoiceCall implements VoiceProviderCall {
  public readonly answer: string;
  public readonly sent: FakeVoiceMessage[] = [];
  public ended = false;
  private readonly listeners = new Set<(event: VoiceProviderEvent) => void>();

  public constructor(public readonly request: VoiceStartRequest) {
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

  public connect(): void {
    this.emit({ type: 'status', status: 'connected' });
  }

  public personSays(text: string, id = 'person'): void {
    this.emit({ type: 'person.transcript', id, text, final: true });
  }

  public requestWork(requestId: string, text: string): void {
    this.emit({ type: 'work.requested', requestId, text });
  }

  public close(reason: VoiceClosedReason = 'ended'): void {
    this.emit({ type: 'closed', reason });
  }
}
