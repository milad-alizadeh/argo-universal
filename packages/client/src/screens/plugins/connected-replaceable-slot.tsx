import {
  renderReasonLimit,
  type ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import type { ReplaceableSlotId } from '@repo/contracts/plugins/wire';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  type ReplaceableSlotProps,
  type ReplaceableSlotViewProps,
} from '../../lib/product/plugin-registry/replaceable-slot';
import { usePluginOpener } from './use-plugin-opener';

const noSlots: readonly ReplaceableSlotId[] = [];

const renderConnectedSlot = (
  props: ReplaceableSlotProps,
): React.JSX.Element => <ConnectedReplaceableSlot {...props} />;

/*
 * One check of the Plugin list for every Slot below it, so a row no Plugin can replace asks nothing and core draws
 * it from the start. `select` keeps its answer's identity across rereads, so a reread that changes nothing draws no row.
 */
export function ConnectedReplaceableSlots({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const replaced = useReplacedSlots();

  const drawing = useMemo(
    () => ({ replaced, render: renderConnectedSlot }),
    [replaced],
  );

  return (
    <ReplaceableSlotRenderer value={drawing}>
      {children}
    </ReplaceableSlotRenderer>
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
function ConnectedReplaceableSlot(
  props: ReplaceableSlotProps,
): React.JSX.Element {
  const state = useReplaceableState(props.input);
  const actions = useSlotActions(props.input, state.replacement);

  return <ReplaceableSlotView {...props} {...actions} state={state} />;
}

type SlotActions = Pick<
  ReplaceableSlotViewProps,
  'onEvent' | 'onOpenPage' | 'onPageCall' | 'onFallback'
>;

/*
 * What the Slot's drawing reports back: the Operations its Component events run and the pages its
 * `navigate` Actions open, for the Plugin that drew it, and a drawing that fell back.
 */
function useSlotActions(
  input: ReplaceableInput,
  replacement: SlotReplacement | null,
): SlotActions {
  const onFallback = useDrawingFallback(input, replacement);
  const opener = usePluginOpener();
  const onPageCall = useSlotRun(replacement);

  if (!replacement) return { onEvent: noEvents, onFallback };

  return {
    onEvent: noEvents,
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

// A pure render passes no Plugin events (ADR-0050).
const noEvents = (): Promise<void> =>
  Promise.reject(new Error('A Replaceable Slot sends no Plugin events'));

// A replacement has no Page state, so the one call it makes is an Operation run, which says itself when it fails.
function useSlotRun(replacement: SlotReplacement | null): OnPageCall {
  const run = useMutation(useTRPC().plugins.run.mutationOptions());

  return async (call) => {
    if (!replacement || !('operation' in call)) return;
    const { operation, args } = call;

    await run
      .mutateAsync({ pluginId: replacement.pluginId, operation, args })
      .then(noAnswer, noAnswer);
  };
}

const noAnswer = (): void => undefined;

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
