import type { SessionUpdate } from '@repo/contracts';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { FeedRowsJob } from '../src/feed';
import type { HeaderHost } from './composition-live-header';
import { requireScriptedProcessAt } from './scripted-agent';
import type { scriptedEngineInput } from './scripted-engine';

function activeTurnId(host: Pick<HeaderHost, 'database'>): string {
  const row = host.database.$client
    .prepare('SELECT id FROM turn WHERE session_id = ? AND status = ?')
    .get('session-1', 'running');
  if (typeof row?.id !== 'string')
    throw new Error('Session has no running Turn');
  return row.id;
}

function headerWrite(row: SessionUpdate, revision: number): FeedRowsJob {
  return new FeedRowsJob({
    sessionId: 'session-1',
    rows: [{ ...row, revision }],
    maxRevision: revision,
    activityAt: Date.now(),
  });
}

export async function publishStoredHeaderRow(
  host: Pick<HeaderHost, 'caller' | 'database' | 'databaseWriter'>,
  row: SessionUpdate,
): Promise<number> {
  const revision = await nextRevision(host);
  const stored = { ...row, sessionId: 'session-1', turnId: activeTurnId(host) };
  host.databaseWriter.send({
    type: 'writer.write',
    job: headerWrite(stored, revision),
  });
  return revision;
}

function configurationAt(revision: number): typeof acpConfiguration {
  const currentValue = revision % 2 === 0 ? 'small' : 'large';
  return acpConfiguration.map((option) =>
    option.type === 'select' && option.id === 'model'
      ? { ...option, currentValue }
      : option,
  );
}

export async function notifyHeaderChange(
  input: Pick<ReturnType<typeof scriptedEngineInput>, 'agent'>,
  revision: number,
): Promise<void> {
  const update = {
    sessionUpdate: 'config_option_update',
    configOptions: configurationAt(revision),
  } as const;
  await requireScriptedProcessAt(input.agent.processes).play(
    [{ type: 'update', update }],
    'owned-1',
  );
}

async function nextRevision(host: Pick<HeaderHost, 'caller'>): Promise<number> {
  const page = await host.caller.feed.page({
    sessionId: 'session-1',
    direction: 'tail',
  });
  return Math.max(1, ...page.rows.map((stored) => stored.revision)) + 1;
}
