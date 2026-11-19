import { fromCallback } from 'xstate';
import {
  providerEvent,
  type SendBack,
  type VoiceCallEvent,
  type VoiceSay,
} from './call-types';
import type {
  VoiceCallSetup,
  VoiceProvider,
  VoiceStartRequest,
} from './provider';

export type ProviderCallInput = {
  provider: VoiceProvider;
  offer: string;
  briefing: string;
  setup?: VoiceCallSetup;
};

type StartedCall = Awaited<ReturnType<VoiceProvider['start']>>;

function deliver(call: StartedCall, say: VoiceSay): void {
  if (say.kind === 'reply') call.reply(say.requestId, say.text, say.delivery);
  else call.tell(say.text, say.delivery);
}

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

  // Tells the voice something; a call that is gone hears nothing.
  public say(say: VoiceSay): void {
    if (!this.released && this.call) deliver(this.call, say);
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

const requestOf = ({
  offer,
  briefing,
  setup,
}: ProviderCallInput): VoiceStartRequest => ({ ...setup, offer, briefing });

// Starts the provider's call, passes its events on, and ends it when the machine leaves `running`.
export const providerCall = fromCallback<VoiceCallEvent, ProviderCallInput>(
  ({ input, sendBack, receive }) => {
    const hold = new ProviderHold(sendBack);
    receive((event) => {
      if (event.type === 'voice.say') hold.say(event.say);
    });
    void input.provider.start(requestOf(input)).then(
      (call) => hold.adopt(call),
      (error: Error | string) => hold.fail(asError(error)),
    );

    return (): void => hold.release();
  },
);
