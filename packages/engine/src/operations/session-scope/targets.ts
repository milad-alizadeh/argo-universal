import type { OperationId } from '@repo/contracts/operations';
import type { OperationParams } from '../implementations';
import type { SessionCaller } from '../session-tokens';
import {
  callerSessionParam,
  ownSession,
  ownSessionOnly,
} from './caller-session-targets';
import { openedScreen } from './opened-screen-target';

// What an Operation reaches: nothing in particular, one Project, or one Session.
export type ScopeTarget =
  | { kind: 'global' }
  | { kind: 'project'; projectId: string }
  | { kind: 'session'; sessionId: string; opening: boolean };

// The target, and the params the Operation then runs with.
export type Targeted<Params> = { target: ScopeTarget; params: Params };

type TargetRule<Params> = (
  params: Params,
  caller: SessionCaller,
) => Targeted<Params>;

type TargetRules = { [Id in OperationId]: TargetRule<OperationParams<Id>> };

const global = <Params>(params: Params): Targeted<Params> => ({
  target: { kind: 'global' },
  params,
});

const projectParam = <Params extends { projectId: string }>(
  params: Params,
): Targeted<Params> => ({
  target: { kind: 'project', projectId: params.projectId },
  params,
});

const sessionParam = <Params extends { sessionId: string }>(
  params: Params,
): Targeted<Params> => ({
  target: { kind: 'session', sessionId: params.sessionId, opening: false },
  params,
});

// Only a close acts on a Session that is still opening (owner, 2026-10-28).
const openingSessionParam = <Params extends { sessionId: string }>(
  params: Params,
): Targeted<Params> => ({
  target: { kind: 'session', sessionId: params.sessionId, opening: true },
  params,
});

// A Session lists and starts Sessions in its own Project unless it names another Project.
const callerProject = <Params extends { projectId?: string }>(
  params: Params,
  caller: SessionCaller,
): Targeted<Params & { projectId: string }> => {
  const projectId = params.projectId ?? caller.projectId;

  return {
    target: { kind: 'project', projectId },
    params: { ...params, projectId },
  };
};

// Every Operation names its target when it enters the registry.
const targetRules = {
  'app.open': openedScreen,
  'app.screenshot': ownSession,
  'project.list': global,
  'project.add': global,
  'project.clone': global,
  'project.create': global,
  'project.update': projectParam,
  'project.listBranches': projectParam,
  'session.list': callerProject,
  'session.get': sessionParam,
  'session.feed': sessionParam,
  'session.changes': sessionParam,
  'session.diff': sessionParam,
  'session.listAgents': sessionParam,
  'session.listShells': sessionParam,
  'session.listBranches': sessionParam,
  'session.new': callerProject,
  'session.schedulePrompt': sessionParam,
  'session.manageSchedule': sessionParam,
  'session.listSchedules': sessionParam,
  'session.queue': sessionParam,
  'session.submit': sessionParam,
  'session.prompt': sessionParam,
  'session.cancel': sessionParam,
  'session.rename': callerSessionParam,
  'session.setConfigOption': sessionParam,
  'session.savePlan': sessionParam,
  'session.declareSubagentRole': callerSessionParam,
  'session.setTodos': callerSessionParam,
  'session.setTodoStep': callerSessionParam,
  'session.close': openingSessionParam,
  'session.reload': sessionParam,
  'session.clear': sessionParam,
  'shell.stop': sessionParam,
  'session.archive': sessionParam,
  'session.unarchive': sessionParam,
  'registry.get': global,
  'diagram.validate': global,
  'registry.refresh': global,
  'registry.sync': global,
  'agent.list': global,
  'agent.install': global,
  'agent.remove': global,
  'agent.setEnvironment': global,
  'agent.getSuggestionModels': global,
  'agent.setSuggestionModel': global,
  'agent.getAccess': global,
  'agent.setAccess': global,
  'agent.getTodoList': global,
  'agent.setTodoList': global,
  'agent.installInstructions': global,
  'plugin.list': global,
  'plugin.guide': global,
  'plugin.new': callerSessionParam,
  'plugin.activate': global,
  'plugin.setEnabled': global,
  'plugin.getSettings': global,
  'plugin.setSetting': global,
  'conversation.status': global,
  'conversation.listDevices': global,
  'conversation.chooseDevices': global,
  'conversation.start': sessionParam,
  'conversation.getSettings': global,
  'conversation.setSettings': global,
  'voice.listVoices': global,
  'voice.saveCustomVoice': global,
  'voice.setVoice': global,
  'voice.deleteCustomVoice': global,
  'conversation.setInstructions': global,
  'conversation.setOptions': global,
  'voice.preview': global,
  'voice.getPreviewClip': global,
  'voice.storePreviewClip': global,
  'conversation.end': callerSessionParam,
  'conversation.hangUp': ownSessionOnly,
} satisfies TargetRules;

const targets: TargetRules = targetRules;

export function scopeTarget<Id extends OperationId>(
  id: Id,
  params: OperationParams<Id>,
  caller: SessionCaller,
): Targeted<OperationParams<Id>> {
  return targets[id](params, caller);
}
