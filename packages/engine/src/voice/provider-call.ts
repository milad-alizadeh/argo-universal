import { fromCallback } from 'xstate';
import {
  providerEvent,
  type SendBack,
  type VoiceCallEvent,
} from './call-types';
import type { VoiceProvider } from './provider';

export type ProviderCallInput = {
  provider: VoiceProvider;
  offer: string;
  briefing: string;
};

type StartedCall = Awaited<ReturnType<VoiceProvider['start']>>;

// The provider's call, from the moment it answers to the moment the machine stops wanting it.
class ProviderHold {
  private released = false;
  private call: StartedCall | undefined;
  private unlisten: (() => void) | undefined;

  public constructor(private readonly sendBack: SendBack) {}

  public adopt(call: StartedCall): void {
    if (this.released) return call.end();
    this.call = call;
    this.unlisten = call.listen((event) => this.sendBack(providerEvent(event)));
    this.sendBack({ type: 'call.answered', answer: call.answer });
  }

  public fail(error: Error): void {
    if (!this.released)
      this.sendBack({ type: 'call.failed', message: error.message });
  }

  public release(): void {
    this.released = true;
    this.unlisten?.();
    this.call?.end();
  }
}

const asError = (error: Error | string): Error =>
  typeof error === 'string' ? new Error(error) : error;

// Starts the provider's call, passes its events on, and ends it when the machine leaves `running`.
export const providerCall = fromCallback<VoiceCallEvent, ProviderCallInput>(
  ({ input, sendBack }) => {
    const hold = new ProviderHold(sendBack);
    void input.provider
      .start({ offer: input.offer, briefing: input.briefing })
      .then(
        (call) => hold.adopt(call),
        (error: Error | string) => hold.fail(asError(error)),
      );

    return (): void => hold.release();
  },
);
