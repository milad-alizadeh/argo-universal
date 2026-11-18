import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { FeedSubscribeOutput, SessionUpdate } from '@repo/contracts';
import { feedRow, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { FakeVoiceProvider } from '../src/voice/fake-provider';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';
import {
  scenarioOf,
  steeringScenario,
  type Scenario,
  type VoiceAgentReply,
} from './voice-agent';
import { offer } from './voice-engine';

export type { VoiceAgentReply } from './voice-agent';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type VoiceWorkOptions = {
  provider?: FakeVoiceProvider;
  // The Agent supports steering and takes what it is given into the running Turn.
  steering?: boolean;
  // How long the call may pass without speech before it ends by itself, in milliseconds.
  idleMs?: number;
};

// What a test holds of the Session it drives.
type WorkParts = {
  host: Host;
  provider: FakeVoiceProvider;
  sessionId: string;
  // Every Prompt the mock Agent received, in order.
  prompts: PromptRequest[];
  // Resolves with the request the Agent was steered with.
  steered: Promise<unknown>;
};

const hasTurnEnd = (row: SessionUpdate): boolean =>
  JSON.stringify(row).includes('"turnEnd"');

const endedTurns = (events: readonly FeedSubscribeOutput[]): number =>
  events.filter((event) => JSON.stringify(event).includes('"Turn ended"'))
    .length;

// The text of the Prompt the Agent received.
export const promptText = (request: PromptRequest | undefined): string =>
  (request?.prompt ?? [])
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n');

async function openSession(host: Host): Promise<string> {
  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Hello' }],
  });

  await waitForAcpSessionIdle(host, sessionId);

  return sessionId;
}

// A Session with a mock Agent and a fake Voice provider: what a test drives and what it reads back.
export class VoiceWork {
  public readonly host: Host;
  public readonly provider: FakeVoiceProvider;
  public readonly sessionId: string;
  public readonly prompts: PromptRequest[];
  public readonly steered: Promise<unknown>;

  public constructor(parts: WorkParts) {
    this.host = parts.host;
    this.provider = parts.provider;
    this.sessionId = parts.sessionId;
    this.prompts = parts.prompts;
    this.steered = parts.steered;
  }

  // Starts the call and connects it.
  public async start(): Promise<void> {
    await this.host.caller.voice.start({ sessionId: this.sessionId, offer });
    this.provider.call.connect();
  }

  public readonly feed = async (): Promise<SessionUpdate[]> => {
    const page = await this.host.caller.feed.page({
      sessionId: this.sessionId,
      direction: 'tail',
    });

    return page.rows;
  };

  public readonly promptRows = async (): Promise<SessionUpdate[]> =>
    (await this.feed()).filter((row) => row.sessionUpdate === 'prompt_message');

  public readonly turnEnds = async (): Promise<SessionUpdate[]> =>
    (await this.feed()).filter(hasTurnEnd);

  // The stored Turn: when it started, and how it ended.
  public turnRecord(turnId: string): typeof turn.$inferSelect | undefined {
    return this.host.database
      .select()
      .from(turn)
      .where(eq(turn.id, turnId))
      .get();
  }

  // The Agent messages as storage holds them, whatever the Feed shows.
  public storedMessages(): string {
    return JSON.stringify(
      this.host.database
        .select()
        .from(feedRow)
        .where(eq(feedRow.sessionUpdate, 'agent_message'))
        .all(),
    );
  }

  // What a subscriber is sent until `ends` Turns have ended: from now, or from the first row when `fromStart`.
  public async subscription(
    ends: number,
    fromStart = false,
  ): Promise<FeedSubscribeOutput[]> {
    const controller = new AbortController();
    const after = fromStart ? { epoch: 0, revision: 0 } : null;

    const events = await this.host
      .createCaller({ signal: controller.signal })
      .feed.subscribe({ sessionId: this.sessionId, after });

    return collect(events, ends, controller);
  }
}

// Reads events until `ends` Turns have ended, then stops the subscription.
async function collect(
  events: AsyncIterable<FeedSubscribeOutput>,
  ends: number,
  controller: AbortController,
): Promise<FeedSubscribeOutput[]> {
  const received: FeedSubscribeOutput[] = [];

  for await (const event of events) {
    received.push(event);

    if (endedTurns(received) >= ends) controller.abort();
  }

  return received;
}

type Play = Pick<WorkParts, 'provider' | 'prompts' | 'steered'> & {
  scenario: Scenario;
};

// What the mock Agent is to do, and what is kept to read back what it saw.
function playOf(
  replies: readonly VoiceAgentReply[],
  options: VoiceWorkOptions,
): Play {
  const prompts: PromptRequest[] = [];
  const steered = Promise.withResolvers<unknown>();

  const provider =
    options.provider ?? new FakeVoiceProvider({ connect: 'manual' });

  const base = scenarioOf(replies, { prompts, provider });

  const scenario: Scenario = {
    ...(options.steering ? { ...base, ...steeringScenario(steered) } : base),
    voiceIdleMs: options.idleMs,
  };

  return { provider, prompts, steered: steered.promise, scenario };
}

// The Engine with a fake Voice provider and a mock Agent that answers the Prompts a test names.
export async function startVoiceWork(
  replies: readonly VoiceAgentReply[],
  options: VoiceWorkOptions = {},
): Promise<VoiceWork> {
  const { scenario, ...play } = playOf(replies, options);
  const host = await startAcpEngine(scenario);

  return new VoiceWork({ ...play, host, sessionId: await openSession(host) });
}
