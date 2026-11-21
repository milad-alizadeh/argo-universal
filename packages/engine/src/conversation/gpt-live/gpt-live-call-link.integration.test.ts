import { afterEach, describe, expect, it } from 'vitest';
import { delegationCreated, delegationItem } from '#mocks/gpt-live-frames';
import type { SentMessage } from '#mocks/gpt-live-link-message';
import { heard, startedCall, type GptLiveFixture } from '#mocks/gpt-live-setup';
import type { ConversationProviderEvent } from '../provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

async function startConversation(
  ...options: Parameters<typeof startedCall>
): ReturnType<typeof startedCall> {
  const started = await startedCall(...options);
  fixture = started;

  return started;
}

const textOf = (message: SentMessage): string =>
  'content' in message ? message.content.map(({ text }) => text).join('') : '';

describe('GPT-Live call speaking', () => {
  it('answers a request and speaks unprompted, and says close when the call ends', async () => {
    const { endpoint, call } = await startConversation();

    call.reply(delegationItem, 'Done', 'speak');
    call.tell('Tests are failing', 'background');
    call.end();
    call.end();

    await expect.poll(() => endpoint.received.length).toBe(3);
    expect(endpoint.received).toEqual([
      {
        type: 'delegation.context.append',
        delegation_item_id: delegationItem,
        channel: 'speakable',
        content: [{ type: 'input_text', text: 'Done' }],
      },
      {
        type: 'session.context.append',
        channel: 'commentary',
        content: [{ type: 'input_text', text: 'Tests are failing' }],
      },
      { type: 'session.close' },
    ]);
  });

  it('sends a long answer in pieces the service takes, which join back to the whole', async () => {
    const { endpoint, call } = await startConversation();
    const long = `${'a'.repeat(499)}é${'b'.repeat(600)}`;

    call.reply(delegationItem, long, 'speak');

    await expect.poll(() => endpoint.received.length).toBe(3);
    expect(endpoint.received.map(textOf).join('')).toBe(long);
  });
});

describe('GPT-Live call losing its link', () => {
  it('ends the call as lost when the control link stays down past the grace period', async () => {
    const { endpoint, call } = await startConversation({ lostLinkMs: 300 });
    const events = heard(call);

    endpoint.refuseLinks = true;
    endpoint.dropLink();

    await expect
      .poll(() => events.at(-1))
      .toMatchObject({ type: 'closed', reason: 'lost' });
    expect(events).toContainEqual({ type: 'status', status: 'disconnected' });
  });

  it('keeps the call when the control link comes back, and it still works on the new link', async () => {
    const { endpoint, call } = await startConversation();
    const events = heard(call);

    endpoint.dropLink();
    await expect
      .poll(() => events.at(-1))
      .toEqual({ type: 'status', status: 'connected' });
    endpoint.send(delegationCreated);

    await expect
      .poll(() => events.at(-1))
      .toMatchObject({ type: 'work.requested' });
    expect(events.map(({ type }) => type)).not.toContain('closed');
    call.tell('Back again', 'speak');
    await expect.poll(() => endpoint.received.length).toBe(1);
  });

  it('delivers the work that arrived while rejoining, once and in order', async () => {
    const { endpoint, call } = await startConversation();
    const events = heard(call);
    const originalTopic = 'Original topic';

    call.tell(originalTopic, 'background');
    await expect
      .poll(() => endpoint.received.map(textOf))
      .toEqual([originalTopic]);

    endpoint.refuseLinks = true;
    endpoint.dropLink();
    await expect
      .poll(() => events)
      .toContainEqual({
        type: 'status',
        status: 'disconnected',
      });
    call.reply(delegationItem, 'The Agent is working', 'background');
    call.tell('Allow once or reject?', 'speak', 'live');
    call.reply(delegationItem, 'Nothing was allowed or rejected', 'speak');
    call.tell('The design is ready for review', 'speak');
    endpoint.refuseLinks = false;

    await expect
      .poll(() => endpoint.received.map(textOf))
      .toEqual([
        originalTopic,
        'The Agent is working',
        'The design is ready for review',
      ]);
  });
});

const notesOf = (events: ConversationProviderEvent[]): string[] =>
  events.flatMap((event) => (event.type === 'trail' ? [event.note] : []));

describe('the GPT-Live control link’s keepalive', () => {
  it('keeps a link that answers its pings', async () => {
    const { endpoint, call } = await startConversation({ pingMs: 50 });
    const events = heard(call);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(events).toEqual([]);
    expect(endpoint.links).toHaveLength(1);
  });

  it('drops a link that stops answering and joins the call again', async () => {
    const { endpoint, call } = await startConversation({ pingMs: 50 });
    const events = heard(call);

    endpoint.silent = true;
    await expect
      .poll(() => events)
      .toContainEqual({ type: 'status', status: 'disconnected' });
    endpoint.silent = false;

    await expect
      .poll(() => events.at(-1))
      .toEqual({ type: 'status', status: 'connected' });
    expect(endpoint.links.length).toBeGreaterThan(1);
    expect(notesOf(events)).toContainEqual(
      expect.stringContaining('answered no ping'),
    );
  });
});
