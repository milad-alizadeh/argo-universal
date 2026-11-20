import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { ComposerConversation } from '#features/composer';
import { FakeConversationConnection } from '../../../../mocks/conversation/fake-conversation-connection';
import type { ConversationBandProps } from '../components/conversation-band/conversation-band';
import { sessionConversation } from './session-conversation';
import {
  sessionPageConversation,
  type SessionPageConversation,
} from './session-conversation-page';
import { callIn, inputOf, statusOf } from './session-conversation.test.mocks';

const edge: ReactNode = 'the band';

// Stands in for drawing the band, which needs the UI: it puts the band on a call's slot when there is one.
const drawn = (
  slot: ComposerConversation | undefined,
  band: ConversationBandProps | undefined,
): ComposerConversation | undefined =>
  slot && band && (slot.kind === 'connecting' || slot.kind === 'connected')
    ? { ...slot, edge }
    : slot;

const pageOf = (
  call: ReturnType<typeof callIn> | null,
  connection: FakeConversationConnection | null = new FakeConversationConnection(),
): SessionPageConversation =>
  sessionPageConversation(
    connection,
    sessionConversation(inputOf(statusOf(call), 's1')),
    drawn,
  );

describe("the Session page's Conversation slot", () => {
  it('is named `conversation`, as the Composer props read it, with the band on its edge while a call runs here', () => {
    const page = pageOf(callIn('s1'));

    expect(page.conversation).toMatchObject({ kind: 'connected', edge });
    expect(page).not.toHaveProperty('voice');
  });

  it('draws the band while the call connects', () => {
    const page = pageOf(
      callIn('s1', { status: 'connecting', startedAt: null }),
    );

    expect(page.conversation).toMatchObject({ kind: 'connecting', edge });
  });

  it('offers the voice button and no band while no call runs', () => {
    const page = pageOf(null);

    expect(page.conversation).toMatchObject({ kind: 'start' });
    expect(page.conversation).not.toHaveProperty('edge');
  });

  it('points at a call in another Session and draws no band', () => {
    const page = pageOf(callIn('s-call'));

    expect(page.conversation).toMatchObject({ kind: 'elsewhere' });
    expect(page.conversation).not.toHaveProperty('edge');
  });

  it('offers nothing where the App carries no audio', () => {
    expect(pageOf(callIn('s1'), null).conversation).toBeUndefined();
  });
});
