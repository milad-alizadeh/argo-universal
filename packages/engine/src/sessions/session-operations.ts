import type {
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import type {
  operations,
  readerOperations,
  sessionOperations,
} from '@repo/contracts/operations';
import type { z } from 'zod';
import { createAgentMessageReader } from '../feed';
import { archiveSession, unarchiveSession } from './archive/archive-commands';
import { readSessionChanges, readSessionDiff } from './change-readers';
import { applySessionConfig } from './configuration';
import type { SessionList } from './list/session-list';
import type { OpenSessions } from './open-sessions';
import { createSessionAgentReader, listSessionBranches } from './readers';
import { cancelSession, closeSession } from './session-closure';
import { renameSession } from './session-rename';
import { saveSessionPlan } from './session-save-plan';
import type { SessionHandlerSources } from './session-sources';
import { listSessionShells } from './shells/list';
import { stopShell } from './shells/stop';
import { createSessionSnapshotReader } from './snapshot';

// The Session Operations that answer with their result; a new Session and a Prompt start native work instead.
type SessionOperationId = Exclude<
  keyof typeof sessionOperations | keyof typeof readerOperations,
  'session.new' | 'session.prompt'
>;

export type SessionOperationImplementations = {
  [Id in SessionOperationId]: (
    params: z.output<(typeof operations)[Id]['params']>,
  ) => Promise<z.output<(typeof operations)[Id]['result']>>;
};

type ActId = Exclude<SessionOperationId, keyof typeof readerOperations>;

type ReadId = Exclude<SessionOperationId, ActId>;

// The reads built once, over the Feed and the live Session.
type FeedReadId = 'session.feed' | 'session.get' | 'session.listAgents';

export const sessionOperationImplementations = (
  sources: SessionHandlerSources,
  list: SessionList,
): SessionOperationImplementations => ({
  ...actImplementations(sources),
  ...feedReads(sources),
  ...rowReads(sources, list),
});

const actImplementations = (
  sources: SessionHandlerSources,
): Pick<SessionOperationImplementations, ActId> => ({
  'session.cancel': async ({ sessionId }) =>
    cancelSession(sources.open, sessionId),
  'session.archive': ({ sessionId }) => archiveSession(sources, sessionId),
  'session.unarchive': ({ sessionId }) => unarchiveSession(sources, sessionId),
  'session.savePlan': (input) => saveSessionPlan(sources.open, input),
  'session.close': ({ sessionId }) => closeSession(sources.open, sessionId),
  'session.setConfigOption': (input) => configureSession(sources.open, input),
  'session.rename': (input) => renameSession(sources.open, input),
  'shell.stop': async (input) => stopShell(sources, input),
});

function feedReads(
  sources: SessionHandlerSources,
): Pick<SessionOperationImplementations, FeedReadId> {
  const feed = createAgentMessageReader(sources);
  const agents = createSessionAgentReader(sources);

  return {
    'session.feed': async (input) => feed(input),
    'session.get': createSessionSnapshotReader(sources),
    'session.listAgents': async (input) => agents(input),
  };
}

const rowReads = (
  sources: SessionHandlerSources,
  list: SessionList,
): Pick<SessionOperationImplementations, Exclude<ReadId, FeedReadId>> => ({
  'session.list': (input) => list.list(input),
  'session.listShells': async ({ sessionId }) =>
    listSessionShells(sources, sessionId),
  'session.diff': (input) => readSessionDiff(sources, input),
  'session.changes': (input) => readSessionChanges(sources, input),
  'session.listBranches': (input) => listSessionBranches(sources, input),
});

// A thin Session handler (ADR-0016 §10): the Session configuration module checks and applies the choice.
async function configureSession(
  open: Pick<OpenSessions, 'admit' | 'ready'>,
  input: SessionSetConfigOptionInput,
): Promise<SessionSetConfigOptionOutput> {
  const session = await open.ready(input.sessionId, 'session.setConfigOption');

  open.admit();

  const configOptions = await applySessionConfig(session, input);

  return { configOptions };
}
