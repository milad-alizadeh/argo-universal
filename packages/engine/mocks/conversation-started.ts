import { FakeConversationProvider } from '../src/conversation/fake-provider';
import { emptySessionInput } from './acp-engine';
import { offer } from './conversation-engine';
import { runOperation } from './operations';
import {
  delegationJourney,
  type DelegationJourney,
} from './session-delegation';

// What a Started Session is asked to do.
export const build = 'Build the lights dashboard';

export type Replies = NonNullable<
  Parameters<typeof delegationJourney>[0]
>['replies'];

export type Calling = {
  journey: DelegationJourney;
  provider: FakeConversationProvider;
};

// A Session with Agent access, not yet on a call; the mock Agent answers the Prompts `replies` name.
export async function withAccess(replies: Replies): Promise<Calling> {
  const provider = new FakeConversationProvider({ connect: 'manual' });

  const journey = await delegationJourney({
    agent: { conversationProvider: provider },
    replies,
  });

  return { journey, provider };
}

export async function startCall({ journey, provider }: Calling): Promise<void> {
  await journey.host.caller.conversation.start({
    sessionId: journey.caller.sessionId,
    offer,
  });
  provider.call.connect();
}

// A Session with Agent access in a Conversation.
export async function calling(replies: Replies): Promise<Calling> {
  const call = await withAccess(replies);

  await startCall(call);

  return call;
}

// The call's Session starts another Session through the Argo Operation, as its Agent would; its Turn is not waited for.
export function startSession({ journey }: Calling): void {
  void runOperation(journey.caller.caller.operations, {
    id: 'session.new',
    params: { ...emptySessionInput, prompt: [{ type: 'text', text: build }] },
  }).catch(() => {});
}

export const spoken =
  ({ provider }: Calling) =>
  (): string[] =>
    provider.call.sent
      .filter((say) => say.kind === 'tell' && say.delivery === 'speak')
      .map((say) => say.text);
