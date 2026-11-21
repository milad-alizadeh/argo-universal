import type {
  SentPromptSender,
  SessionNewInput,
  SessionPromptInput,
} from '@repo/contracts';
import type {
  PluginPromptAnswer,
  PluginWithdrawAnswer,
} from '@repo/contracts/plugins/argo-calls';
import { ProjectSchedules } from '../projects/project-schedules';
import { archiveSessionFromPlugin } from './archive/plugin-archive';
import { SessionArchives } from './archive/session-archives';
import { ConversationSessionWork } from './conversation-session-work';
import { startSessionCreation } from './creation/session-creation';
import { createSessionList } from './list/session-list';
import { OpenSessions } from './open-sessions';
import {
  beginOperationCall,
  type CalledOperation,
  type SessionOperationCall,
} from './operation-call';
import type { NativeStart, NativeStartRequest } from './prompt-sender';
import { requireNoTurn } from './restart/restart-session';
import { createSessionRouter } from './router';
import { Schedules } from './schedules';
import { requireTaken, sendPrompt, withdrawPrompt } from './sent-prompt';
import { requireWritableSession } from './session-command';
import {
  createSessionDirectory,
  type SessionDirectory,
} from './session-directory';
import {
  sessionOperationImplementations,
  type SessionOperationImplementations,
} from './session-operations';
import { admitSessionPrompt, type PromptLanding } from './session-prompt';
import type { SessionHandlerSources, SessionSources } from './session-sources';
import { createSessionWorkSource, type SessionWorkSource } from './work-source';

/*
 * The one interface Operations and the Engine's router reach Sessions through. Each Session Operation and
 * procedure resolves its Session, admits the command and sends one event (ADR-0016 §10); what Sessions run
 * with stays behind this interface.
 */
export class Sessions {
  public readonly projectSchedules: ProjectSchedules;
  public readonly archives: SessionArchives;
  // The Session Operations that answer with their result, keyed by Operation id.
  public readonly implementations: SessionOperationImplementations;
  // The Sessions a Session caller's scope can see.
  public readonly directory: SessionDirectory;
  // The native Session work an Operation waits for.
  public readonly work: SessionWorkSource;
  // What a Conversation reaches its Session's work through.
  public readonly conversation: ConversationSessionWork;
  // The Session procedures that are not Operations.
  public readonly router: ReturnType<typeof createSessionRouter>;
  private readonly sources: SessionHandlerSources;
  public constructor(sources: SessionSources) {
    const list = createSessionList(sources);

    this.sources = handlerSources(sources);
    this.projectSchedules = new ProjectSchedules(
      this.sources,
      sources.sessionCommandSignal,
    );
    this.implementations = this.operations(sources, list);
    this.directory = createSessionDirectory(this.sources);
    this.work = createSessionWorkSource(this.sources);
    this.router = createSessionRouter({ sources: this.sources, list });
    this.archives = new SessionArchives(this.sources);
    this.conversation = new ConversationSessionWork(
      this.sources,
      this.implementations,
    );
  }
  private operations(
    { sessionCommandSignal }: SessionSources,
    list: ReturnType<typeof createSessionList>,
  ): SessionOperationImplementations {
    const schedules = new Schedules(this.sources, sessionCommandSignal);

    return sessionOperationImplementations(this.sources, list, schedules);
  }
  // Opens a Session from storage, or waits for its open, without a Turn.
  public async open(sessionId: string): Promise<void> {
    await this.sources.open.ready(sessionId, 'session.open');
  }
  // Starts a new Session; the request's signal also stops its admission.
  public create(
    input: SessionNewInput,
    request: NativeStartRequest,
  ): ReturnType<typeof startSessionCreation> {
    return startSessionCreation(this.sources, input, request);
  }
  /*
   * The user's Prompt starts a Turn; another Session's is a Sent Prompt, steered into a running Turn or queued behind
   * it (ADR-0054), under an id allocated first so its caller can follow the Turn it lands in. The request's signal
   * also stops its admission.
   */
  public prompt(
    input: SessionPromptInput,
    { sender, signal }: NativeStartRequest,
  ): NativeStart<PromptLanding> {
    const id = this.sources.createId();

    const accepted =
      sender.type === 'user'
        ? admitSessionPrompt(this.sources, input, { id, sender, signal })
        : sendPrompt(this.sources, input, { id, sender, signal });

    return { sessionId: input.sessionId, turnId: id, accepted };
  }
  // A Plugin's Prompt: starts a Turn on an idle Session, else joins the end of its queue (ADR-0055).
  public async promptFromPlugin(
    input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
    sender: SentPromptSender,
  ): Promise<PluginPromptAnswer> {
    const sent = requireTaken(
      await sendPrompt(this.sources, input, { sender }),
    );

    return sent.status === 'queued'
      ? { status: 'queued', queuedId: sent.queuedId }
      : { status: 'started' };
  }
  // Takes back a Queued Prompt the Plugin sent; one that started, is gone or is held for editing stays (ADR-0055).
  public async withdrawFromPlugin(
    sessionId: string,
    queuedId: string,
    pluginId: string,
  ): Promise<PluginWithdrawAnswer> {
    const withdrawal = { sessionId, queuedId, pluginId };

    return { withdrawn: await withdrawPrompt(this.sources, withdrawal) };
  }
  // A Plugin's archive: the App's, refused while the Checkout has uncommitted files (ADR-0055).
  public archiveFromPlugin(
    sessionId: string,
  ): ReturnType<typeof archiveSessionFromPlugin> {
    return archiveSessionFromPlugin(this.sources, sessionId);
  }
  public requireClearTarget(sessionId: string): void {
    requireWritableSession(this.sources.readSession(sessionId));
    const live = this.sources.open.session(sessionId);

    if (live) requireNoTurn(live);
  }
  // Begins the Tool call of an Operation that a Session calls.
  public call(
    sessionId: string,
    operation: CalledOperation,
  ): SessionOperationCall {
    return beginOperationCall(this.sources, sessionId, operation);
  }
}

// Handlers reach the open Sessions' actor and command signal only through `OpenSessions`.
const handlerSources = (sources: SessionSources): SessionHandlerSources => ({
  ...sources,
  open: new OpenSessions(sources),
});
