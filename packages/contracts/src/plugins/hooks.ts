import { z } from 'zod';
import { ContentBlock } from '../feed/content-block';
import { PendingPermission } from '../sessions/snapshot';
import { StopReason } from '../sessions/turn';
import { HookEventName } from './hook-protocol';

export { HookEventName } from './hook-protocol';

const SessionStart = z.strictObject({
  sessionId: z.string(),
  projectId: z.string(),
  agent: z.string(),
});

const PromptSubmit = z.strictObject({
  sessionId: z.string(),
  prompt: z.array(ContentBlock).min(1),
});

const ToolCall = z.strictObject({
  sessionId: z.string(),
  request: PendingPermission,
});

const TurnComplete = z.strictObject({
  sessionId: z.string(),
  turnId: z.string(),
  stopReason: StopReason,
});

// `pluginId` names the Plugin whose `argo.process` call this is.
const ProcessSpawn = z.strictObject({
  pluginId: z.string(),
  argv: z.array(z.string()).min(1),
  cwd: z.string().optional(),
});

/*
 * What each event's chain resolves to: core's own answer at the bottom, or a hook's.
 * `tool.call`'s `ask` leaves the Permission request to the person, as core does.
 */
export const hookEvents = {
  'session.start': { event: SessionStart, answer: z.null() },
  'prompt.submit': {
    event: PromptSubmit,
    answer: z.union([
      z.strictObject({ prompt: PromptSubmit.shape.prompt }),
      z.strictObject({ dropped: z.literal(true) }),
    ]),
  },
  'tool.call': {
    event: ToolCall,
    answer: z.strictObject({ decision: z.enum(['ask', 'allow', 'deny']) }),
  },
  'turn.complete': { event: TurnComplete, answer: z.null() },
  'process.spawn': {
    event: ProcessSpawn,
    answer: z.union([
      ProcessSpawn.pick({ argv: true, cwd: true }),
      z.strictObject({ blocked: z.string() }),
    ]),
  },
} as const;

type HookEvents = typeof hookEvents;

export type HookEvent<Name extends HookEventName> = z.infer<
  HookEvents[Name]['event']
>;

export type HookAnswer<Name extends HookEventName> = z.infer<
  HookEvents[Name]['answer']
>;

// Each event's Hook chain over core, resolving to its answer; with no Plugins, core answers alone.
export type CoreHooks = {
  [Name in HookEventName]: (
    event: HookEvent<Name>,
  ) => Promise<HookAnswer<Name>>;
};
