import { operations, type OperationId } from '@repo/contracts/operations';
import type { DirectorySession, SessionDirectory } from '../../sessions';
import type { SessionCaller } from '../session-tokens';
import { inCallerProject, mayPrompt, ownsSession } from './rules';
import type { ScopeTarget } from './targets';

type SessionTarget = Extract<ScopeTarget, { kind: 'session' }>;

// Whether the caller's scope covers an Operation's target, read through the Session directory.
export class ScopeCoverage {
  public constructor(private readonly directory: SessionDirectory) {}
  public covers(
    caller: SessionCaller,
    { id, target }: { id: OperationId; target: ScopeTarget },
  ): boolean {
    return id === 'app.open'
      ? this.opens(caller, target)
      : this.covered(caller, { id, target });
  }

  // Opening a Screen changes nothing: the caller's Project covers a Session or a Project; the rest asks.
  private opens(caller: SessionCaller, target: ScopeTarget): boolean {
    return target.kind !== 'global' && this.inProject(caller, target);
  }

  // confirm always asks; read stays in the caller's Project; act needs a Session the caller owns.
  private covered(
    caller: SessionCaller,
    { id, target }: { id: OperationId; target: ScopeTarget },
  ): boolean {
    const { tier } = operations[id];

    if (tier === 'confirm') return false;

    return tier === 'read'
      ? this.inProject(caller, target)
      : this.ownsSession(caller, target);
  }

  public inProject(caller: SessionCaller, target: ScopeTarget): boolean {
    if (target.kind === 'global') return true;

    if (target.kind === 'project')
      return inCallerProject(caller, target.projectId);

    return inCallerProject(caller, this.read(target).projectId);
  }
  public mayPrompt(caller: SessionCaller, target: ScopeTarget): boolean {
    if (target.kind !== 'session') return false;

    return mayPrompt(caller, { ...this.read(target), ...target });
  }
  private ownsSession(caller: SessionCaller, target: ScopeTarget): boolean {
    if (target.kind !== 'session') return false;

    return ownsSession(caller, { ...this.read(target), ...target });
  }
  private read(target: SessionTarget): DirectorySession {
    return target.opening
      ? this.directory.opening(target.sessionId)
      : this.directory.session(target.sessionId);
  }
}
