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
import { asRequestError } from './admission/refused-choice';
import { archiveSession, unarchiveSession } from './archive/archive-commands';
import { readSessionChanges, readSessionDiff } from './change-readers';
import { applySessionConfig } from './configuration';
import type { SessionList } from './list/session-list';
import type { OpenSessions } from './open-sessions';
import { createSessionAgentReader, listSessionBranches } from './readers';
import { cancelSession, closeSession } from './session-closure';
import { renameSession } from './session-rename';
import { saveSessionPlan } from './session-save-plan';
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
  open: OpenSessions,
  list: SessionList,
): SessionOperationImplementations => ({
  ...actImplementations(open),
  ...feedReads(open),
  ...rowReads(open, list),
});

const actImplementations = (
  open: OpenSessions,
): Pick<SessionOperationImplementations, ActId> => ({
  'session.cancel': async ({ sessionId }) => cancelSession(open, sessionId),
  'session.archive': ({ sessionId }) => archiveSession(open, sessionId),
  'session.unarchive': ({ sessionId }) => unarchiveSession(open, sessionId),
  'session.savePlan': (input) => saveSessionPlan(open, input),
  'session.close': ({ sessionId }) => closeSession(open, sessionId),
  'session.setConfigOption': (input) => configureSession(open, input),
  'session.rename': (input) => renameSession(open, input),
  'shell.stop': async (input) => stopShell(open, input),
});

function feedReads(
  open: OpenSessions,
): Pick<SessionOperationImplementations, FeedReadId> {
  const feed = createAgentMessageReader(open);
  const agents = createSessionAgentReader(open);

  return {
    'session.feed': async (input) => feed(input),
    'session.get': createSessionSnapshotReader(open),
    'session.listAgents': async (input) => agents(input),
  };
}

const rowReads = (
  open: OpenSessions,
  list: SessionList,
): Pick<SessionOperationImplementations, Exclude<ReadId, FeedReadId>> => ({
  'session.list': (input) => list.list(input),
  'session.listShells': async ({ sessionId }) =>
    listSessionShells(open, sessionId),
  'session.diff': (input) => readSessionDiff(open, input),
  'session.changes': (input) => readSessionChanges(open, input),
  'session.listBranches': (input) => listSessionBranches(open, input),
});

// A thin Session handler (ADR-0016 §10): the Session configuration module checks and applies the choice.
async function configureSession(
  open: OpenSessions,
  input: SessionSetConfigOptionInput,
): Promise<SessionSetConfigOptionOutput> {
  const session = await open.ready(input.sessionId, 'session.setConfigOption');

  open.admit();

  const configOptions = await applySessionConfig(session, input).catch(
    asRequestError,
  );

  return { configOptions };
}
