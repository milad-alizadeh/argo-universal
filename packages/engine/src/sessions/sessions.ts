import type { SessionNewInput, SessionPromptInput } from '@repo/contracts';
import { startSessionCreation } from './creation/session-creation';
import { createSessionList } from './list/session-list';
import { OpenSessions } from './open-sessions';
import {
  beginOperationCall,
  type CalledOperation,
  type SessionOperationCall,
} from './operation-call';
import type { NativeStartRequest } from './prompt-sender';
import { createSessionRouter } from './router';
import {
  createSessionDirectory,
  type SessionDirectory,
} from './session-directory';
import {
  sessionOperationImplementations,
  type SessionOperationImplementations,
} from './session-operations';
import { startSessionPrompt } from './session-prompt';
import type { SessionSources } from './session-sources';
import { createSessionWorkSource, type SessionWorkSource } from './work-source';

/*
 * The one interface Operations and the Engine's router reach Sessions through. Each Session Operation and
 * procedure resolves its Session, admits the command and sends one event (ADR-0016 §10); what Sessions run
 * with stays behind this interface.
 */
export class Sessions {
  // The Session Operations that answer with their result, keyed by Operation id.
  public readonly implementations: SessionOperationImplementations;
  // The Sessions a Session caller's scope can see.
  public readonly directory: SessionDirectory;
  // The native Session work an Operation waits for.
  public readonly work: SessionWorkSource;
  // The Session procedures that are not Operations.
  public readonly router: ReturnType<typeof createSessionRouter>;
  private readonly open: OpenSessions;
  public constructor(sources: SessionSources) {
    const list = createSessionList(sources);

    this.open = new OpenSessions(sources);
    this.implementations = sessionOperationImplementations(this.open, list);
    this.directory = createSessionDirectory(this.open);
    this.work = createSessionWorkSource(this.open);
    this.router = createSessionRouter({ open: this.open, list });
  }
  // Starts a new Session; the request's signal also stops its admission.
  public create(
    input: SessionNewInput,
    request: NativeStartRequest,
  ): ReturnType<typeof startSessionCreation> {
    return startSessionCreation(this.open, input, request);
  }
  // Starts a Prompt's Turn; the request's signal also stops its admission.
  public prompt(
    input: SessionPromptInput,
    request: NativeStartRequest,
  ): ReturnType<typeof startSessionPrompt> {
    return startSessionPrompt(this.open, input, request);
  }
  // Begins the Tool call of an Operation that a Session calls.
  public call(
    sessionId: string,
    operation: CalledOperation,
  ): SessionOperationCall {
    return beginOperationCall(this.open, sessionId, operation);
  }
}
