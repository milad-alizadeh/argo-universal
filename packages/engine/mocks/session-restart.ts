import { emptySessionInput, type startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const startPrompt = [{ type: 'text' as const, text: 'Start' }];

// A Session whose first Turn has ended, so it is kept and idle.
export async function startIdleSession(
  host: Host,
): Promise<{ sessionId: string }> {
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: startPrompt,
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  return created;
}

// The title of the Notice that ends the Feed, or nothing when the Feed ends with another row.
export async function lastNoticeTitle(
  host: Host,
  sessionId: string,
): Promise<string | undefined> {
  const { rows } = await host.caller.feed.page({
    sessionId,
    direction: 'tail',
  });

  const last = rows.at(-1);

  return last?.sessionUpdate === 'notice' ? last.title : undefined;
}
