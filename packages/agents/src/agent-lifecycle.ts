import {
  ContextUsage,
  PendingPermission,
  PendingElicitation,
  PendingPlanProposal,
  SessionConfigOption,
  SessionInfo,
  StopReason,
  TurnUsage,
  TurnError,
} from '@repo/contracts';
import { z } from 'zod';
import { AgentCapabilities } from './agent-capabilities';
import { AgentShell } from './agent-shell';
import { AgentSubagent } from './agent-subagent';

export const AgentReadyEvent = z.strictObject({
  type: z.literal('agent.ready'),
  vendorSessionId: z.string(),
  configOptions: z.array(SessionConfigOption),
  capabilities: AgentCapabilities,
  continuedOutside: z.boolean(),
});

export const AgentReadyData = AgentReadyEvent.omit({ type: true });

export const AgentLifecycleEvent = z
  .discriminatedUnion('type', [
    AgentReadyEvent,
    z.strictObject({
      type: z.literal('agent.messageRejected'),
      reason: z.string(),
    }),
    z.strictObject({
      type: z.literal('agent.permissionRequested'),
      request: PendingPermission.omit({ requestId: true }),
    }),
    z.strictObject({
      type: z.literal('agent.elicitationRequested'),
      request: PendingElicitation.omit({ requestId: true }),
    }),
    z.strictObject({ type: z.literal('agent.usage'), usage: ContextUsage }),
    z.strictObject({
      type: z.literal('agent.configOptionsChanged'),
      configOptions: z.array(SessionConfigOption),
    }),
    z.strictObject({ type: z.literal('agent.turnStarted') }),
    z.strictObject({
      type: z.literal('agent.turnEnded'),
      stopReason: StopReason,
      usage: TurnUsage.optional(),
      error: TurnError.optional(),
    }),
    PendingPlanProposal.extend({ type: z.literal('agent.planProposed') }),
    z.strictObject({
      type: z.literal('agent.titleChanged'),
      title: SessionInfo.shape.title,
    }),
    z.strictObject({
      type: z.literal('agent.subagentChanged'),
      subagent: AgentSubagent,
    }),
    z.strictObject({
      type: z.literal('agent.shellChanged'),
      shell: AgentShell,
    }),
    z.strictObject({
      type: z.literal('agent.shellOutput'),
      shellId: AgentShell.shape.id,
      text: z.string(),
    }),
  ])
  .refine(
    (event): boolean =>
      Object.values(event).every((value): boolean => value !== undefined),
    'Omit absent optional event fields',
  );
