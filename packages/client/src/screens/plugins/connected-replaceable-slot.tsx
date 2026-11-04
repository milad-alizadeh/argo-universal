import {
  renderReasonLimit,
  type ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import type { ReplaceableSlotId } from '@repo/contracts/plugins/wire';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPC } from '#features/connection';
import {
  coreSlotState,
  ReplaceableSlotRenderer,
  replaceableState,
  replacedSlots,
  type OnPageCall,
  type ReplaceableState,
  type SlotReplacement,
} from '../../lib/product/plugin-registry';
import {
  ReplaceableSlotView,
  type ReplaceableSlotDrawing,
  type ReplaceableSlotProps,
  type ReplaceableSlotViewProps,
} from '../../lib/product/plugin-registry/replaceable-slot';
import { slotCallsPorts, type SlotSession } from './slot-calls-ports';
import { usePluginOpener } from './use-plugin-opener';
import { useOperationRunner, useTreeCalls } from './use-tree-calls';

const noSlots: readonly ReplaceableSlotId[] = [];

const renderConnectedSlotIn =
  (session: SlotSession) =>
  (props: ReplaceableSlotProps): React.JSX.Element => (
    <ConnectedReplaceableSlot {...props} session={session} />
  );

/*
 * One check of the Plugin list for every Slot of one Session's Feed, so a row no Plugin can replace asks nothing
 * and core draws it from the start. `select` keeps its answer's identity across rereads, so a reread that changes
 * nothing draws no row. A replacement's Operations run for that Session and its Project.
 */
export function ConnectedReplaceableSlots({
  session,
  children,
}: React.PropsWithChildren<{ session: SlotSession }>): React.JSX.Element {
  return (
    <ReplaceableSlotRenderer value={useSlotDrawing(session)}>
      {children}
    </ReplaceableSlotRenderer>
  );
}

// The same Slots and Session draw with the same renderer, so a reread that changes neither draws no row.
function useSlotDrawing({
  sessionId,
  projectId,
}: SlotSession): ReplaceableSlotDrawing {
  const replaced = useReplacedSlots();

  return useMemo(
    () => ({
      replaced,
      render: renderConnectedSlotIn({ sessionId, projectId }),
    }),
    [replaced, sessionId, projectId],
  );
}

function useReplacedSlots(): readonly ReplaceableSlotId[] {
  const { data } = useQuery({
    ...useTRPC().plugin.list.queryOptions(),
    select: replacedSlots,
  });

  return data?.length ? data : noSlots;
}

// A Replaceable Slot as the connected Server answers it, once for its props; a failed answer leaves core's own drawing.
function ConnectedReplaceableSlot({
  session,
  ...props
}: ReplaceableSlotProps & { session: SlotSession }): React.JSX.Element {
  const state = useReplaceableState(props.input);
  const actions = useSlotActions(props.input, state.replacement, session);

  return <ReplaceableSlotView {...props} {...actions} state={state} />;
}

type SlotActions = Pick<
  ReplaceableSlotViewProps,
  'onOpenPage' | 'onPageCall' | 'onFallback'
>;

/*
 * What the Slot's drawing reports back: the Operations its Component events run and the pages its
 * `navigate` Actions open, for the Plugin that drew it, and a drawing that fell back.
 */
function useSlotActions(
  input: ReplaceableInput,
  replacement: SlotReplacement | null,
  session: SlotSession,
): SlotActions {
  const onFallback = useDrawingFallback(input, replacement);
  const opener = usePluginOpener();
  const onPageCall = useSlotCalls(input, replacement, session);

  if (!replacement) return { onFallback };

  return {
    onOpenPage: opener(replacement.pluginId),
    onPageCall,
    onFallback,
  };
}

// The props are the question, so new props ask again; the same props draw the same tree, so an answer stays fresh.
function useReplaceableState(input: ReplaceableInput): ReplaceableState {
  const { data } = useQuery({
    ...useTRPC().plugins.render.queryOptions(input),
    select: (answer) => replaceableState(input, answer),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return data ?? coreSlotState(input);
}

// A replacement's calls, on the answer its Slot keeps; the Slot hands them on only while a replacement is drawn.
function useSlotCalls(
  input: ReplaceableInput,
  replacement: SlotReplacement | null,
  session: SlotSession,
): OnPageCall {
  const answer = {
    client: useQueryClient(),
    queryKey: useTRPC().plugins.render.queryKey(input),
  };

  const pluginId = replacement?.pluginId ?? '';

  return useTreeCalls(
    slotCallsPorts(answer, { pluginId, session }, useOperationRunner()),
  );
}

function useDrawingFallback(
  input: ReplaceableInput,
  replacement: SlotReplacement | null,
): (reason: string) => void {
  const failure = useMutation(useTRPC().plugins.renderFailed.mutationOptions());

  return (reason) => {
    if (!replacement) return;
    failure.mutate({
      pluginId: replacement.pluginId,
      slotId: input.slotId,
      reason: reason.slice(0, renderReasonLimit),
    });
  };
}
