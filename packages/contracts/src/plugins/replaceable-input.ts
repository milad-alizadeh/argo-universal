import { z } from 'zod';
import { Plan, PlanEntry } from '../feed/plan';
import {
  AgentMessage,
  ToolCallUpdate,
  UserMessage,
} from '../feed/session-update';
import {
  toolCallSlotId,
  messageSlotId,
  composerAboveSlotId,
} from './wire-slot';

export {
  toolCallSlotId,
  messageSlotId,
  composerAboveSlotId,
  ReplaceableSlotId,
} from './wire-slot';

const work = z.strictObject({
  count: z.int().nonnegative(),
  running: z.boolean(),
});

export const ComposerTrayProps = z.strictObject({
  wide: z.boolean(),
  inactive: z.boolean(),
  status: z
    .strictObject({
      plan: z.array(PlanEntry).optional(),
      subagents: work.optional(),
      shells: work.optional(),
    })
    .optional(),
  writtenPlan: z.union([Plan.options[1], Plan.options[2]]).optional(),
});

export const ReplaceableInput = z.discriminatedUnion('slotId', [
  z.strictObject({
    slotId: z.literal(toolCallSlotId),
    props: z.strictObject({ row: ToolCallUpdate }),
  }),
  z.strictObject({
    slotId: z.literal(messageSlotId),
    props: z.strictObject({ row: z.union([UserMessage, AgentMessage]) }),
  }),
  z.strictObject({
    slotId: z.literal(composerAboveSlotId),
    props: ComposerTrayProps,
  }),
]);

export type ReplaceableInput = z.infer<typeof ReplaceableInput>;

export const RenderAnswer = z.union([
  z.strictObject({ input: ReplaceableInput }),
  z.strictObject({ treePath: z.string().startsWith('render:') }),
  z.strictObject({
    pluginId: z.string(),
    path: z.string().startsWith('render:'),
  }),
]);

export const renderReasonLimit = 1024;

export type RenderAnswer = z.infer<typeof RenderAnswer>;

export function replaceableRewriteSchema(
  original: ReplaceableInput,
): z.ZodType<ReplaceableInput> {
  return ReplaceableInput.refine(
    (rewritten) => preservesCoreActions(original, rewritten),
    'A rewrite cannot add a core action',
  );
}

function preservesCoreActions(
  original: ReplaceableInput,
  rewritten: ReplaceableInput,
): boolean {
  if (
    original.slotId !== composerAboveSlotId ||
    rewritten.slotId !== composerAboveSlotId
  )
    return true;

  return workActionsAvailable(original.props.status, rewritten.props.status);
}

function workActionsAvailable(
  original: z.infer<typeof ComposerTrayProps>['status'],
  rewritten: z.infer<typeof ComposerTrayProps>['status'],
): boolean {
  const source = workStatus(original);
  const target = workStatus(rewritten);

  return (
    actionAvailable(source.shells, target.shells) &&
    actionAvailable(source.subagents, target.subagents)
  );
}

const actionAvailable = (
  original: z.infer<typeof work> | undefined,
  rewritten: z.infer<typeof work> | undefined,
): boolean => !rewritten || Boolean(original);

const workStatus = (
  status: z.infer<typeof ComposerTrayProps>['status'],
): NonNullable<z.infer<typeof ComposerTrayProps>['status']> => status ?? {};
