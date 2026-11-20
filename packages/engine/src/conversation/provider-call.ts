import { fromCallback } from 'xstate';
import {
  providerEvent,
  type SendBack,
  type ConversationEvent,
  type VoiceSay,
} from './conversation-types';
import type {
  ConversationSetup,
  ConversationProvider,
  ConversationProviderEvent,
  ConversationStartRequest,
} from './provider';

// What the provider reports as the call hangs up, once the machine no longer hears it, such as the words said so far.
type LastWords = (event: ConversationProviderEvent) => void;

export type ProviderCallInput = {
  provider: ConversationProvider;
  offer: string;
  briefing: string;
  setup?: ConversationSetup;
  lastWords: LastWords;
};

type StartedCall = Awaited<ReturnType<ConversationProvider['start']>>;

function deliver(call: StartedCall, say: VoiceSay): void {
  if (say.kind === 'reply') call.reply(say.requestId, say.text, say.delivery);
  else call.tell(say.text, say.delivery);
}

// The provider's call, from the moment it answers to the moment the machine stops wanting it.
class ProviderHold {
  private released = false;
  private call: StartedCall | undefined;
  private unlisten: (() => void) | undefined;

  public constructor(
    private readonly sendBack: SendBack,
    private readonly lastWords: LastWords,
  ) {}

  public adopt(call: StartedCall): void {
    if (this.released) return call.end();
    this.call = call;
    this.unlisten = call.listen((event) => this.heard(event));
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

  // Hangs up; what the call reports while it ends goes to `lastWords`.
  public release(): void {
    this.released = true;
    this.call?.end();
    this.unlisten?.();
  }

  private heard(event: ConversationProviderEvent): void {
    if (this.released) this.lastWords(event);
    else this.sendBack(providerEvent(event));
  }
}

const asError = (error: Error | string): Error =>
  typeof error === 'string' ? new Error(error) : error;

const requestOf = ({
  offer,
  briefing,
  setup,
}: ProviderCallInput): ConversationStartRequest => ({ ...setup, offer, briefing });

// Starts the provider's call, passes its events on, and ends it when the machine leaves `running`.
export const providerCall = fromCallback<ConversationEvent, ProviderCallInput>(
  ({ input, sendBack, receive }) => {
    const hold = new ProviderHold(sendBack, input.lastWords);
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
