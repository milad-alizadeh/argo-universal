import { cn } from '@repo/kit/utils';
import type { ComponentProps, ReactElement } from 'react';
import {
  useFocusedInputHandler,
  useReanimatedFocusedInput,
  type FocusedInputLayoutChangedEvent,
  type FocusedInputSelectionChangedEvent,
} from 'react-native-keyboard-controller';
import Animated, {
  measure,
  scrollTo,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import type { ComposerDraftScrollProps } from './composer-draft-scroll';

export function ComposerDraftScroll(
  props: ComposerDraftScrollProps,
): ReactElement {
  const caret = useDraftCaret(props.followsCaret);

  return (
    <Animated.ScrollView
      {...caret}
      className={cn('min-h-0 grow-0 shrink', props.followsCaret && 'max-h-72')}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {props.children}
    </Animated.ScrollView>
  );
}

type CaretScrollProps = Pick<
  ComponentProps<typeof Animated.ScrollView>,
  'ref' | 'onLayout'
>;

type Selection = FocusedInputSelectionChangedEvent['selection'];

function caretScrollDelta(
  selection: Selection,
  fieldTop: number,
  height: number,
): number {
  'worklet';
  const end = fieldTop + selection.end.y;

  return end > height
    ? end - height
    : Math.min(0, fieldTop + selection.start.y);
}

// Follow the caret when it moves. Swiping the viewport still lets the user return to the attachments.
function useDraftCaret(enabled: boolean): CaretScrollProps {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollOffset(ref);
  const viewportTag = useSharedValue<number | null>(null);
  useRevealDraftCaret({ enabled, ref, offset, viewportTag });

  return { ref, onLayout: () => viewportTag.set(ref.getTag?.() ?? null) };
}

interface DraftCaret {
  enabled: boolean;
  ref: AnimatedRef<Animated.ScrollView>;
  offset: SharedValue<number>;
  viewportTag: SharedValue<number | null>;
}

const ownsCaret = (
  focused: FocusedInputLayoutChangedEvent | null,
  target: number,
  viewportTag: number | null,
): focused is FocusedInputLayoutChangedEvent => {
  'worklet';

  return (
    focused?.target === target && focused.parentScrollViewTarget === viewportTag
  );
};

function revealCaret(
  { ref, offset }: DraftCaret,
  fieldTop: number,
  selection: Selection,
): void {
  'worklet';
  const viewport = measure(ref);

  if (!viewport) return;

  const delta = caretScrollDelta(
    selection,
    fieldTop - viewport.pageY,
    viewport.height,
  );

  if (delta !== 0) scrollTo(ref, 0, offset.value + delta, false);
}

function useRevealDraftCaret(caret: DraftCaret): void {
  const { input } = useReanimatedFocusedInput();

  useFocusedInputHandler({
    onSelectionChange: ({ target, selection }) => {
      'worklet';
      const focused = input.value;

      if (caret.enabled && ownsCaret(focused, target, caret.viewportTag.value))
        revealCaret(caret, focused.layout.absoluteY, selection);
    },
  });
}
