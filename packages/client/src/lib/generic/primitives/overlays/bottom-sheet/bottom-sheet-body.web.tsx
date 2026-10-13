import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';

export function SheetBody(props: {
  children: ReactNode;
  label?: string;
  footer?: ReactNode;
  expanded: boolean;
  onResize?: (expanded: boolean) => void;
}): ReactElement {
  return (
    <View className={cn('shrink min-h-0', props.expanded && 'flex-1')}>
      <SheetGrip expanded={props.expanded} onResize={props.onResize} />
      <ScrollView
        className={cn('shrink min-h-0', props.expanded && 'flex-1')}
        keyboardShouldPersistTaps="handled"
        role="region"
        accessibilityLabel={documentLabel(props.label)}
      >
        {props.children}
      </ScrollView>
      {props.footer}
    </View>
  );
}

function SheetGrip(props: {
  expanded: boolean;
  onResize?: (expanded: boolean) => void;
}): ReactElement {
  const ref = useRef<View>(null);
  useGripKeyboard(ref, props.onResize);
  return (
    <View
      ref={ref}
      className="items-center py-3 web:touch-none web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring"
      {...gripAccessibility(props)}
    >
      <View className="w-9 h-1.25 rounded-full bg-muted-foreground/40" />
    </View>
  );
}

function useGripKeyboard(
  ref: React.RefObject<View | null>,
  onResize?: (expanded: boolean) => void,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!(element instanceof HTMLElement) || !onResize) return;
    const resize = (event: KeyboardEvent): void => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      onResize(event.key === 'ArrowUp' || event.key === 'End');
    };
    element.addEventListener('keydown', resize);
    return (): void => element.removeEventListener('keydown', resize);
  }, [ref, onResize]);
}

function gripAccessibility(props: {
  expanded: boolean;
  onResize?: (expanded: boolean) => void;
}): React.ComponentProps<typeof View> {
  if (!props.onResize) return {};
  return {
    role: 'slider',
    accessibilityLabel: 'Sheet size',
    tabIndex: 0,
    'aria-valuemin': 0,
    'aria-valuemax': 1,
    'aria-valuenow': props.expanded ? 1 : 0,
    'aria-valuetext': sheetSize(props.expanded),
  };
}

function sheetSize(expanded: boolean): string {
  return expanded ? 'Expanded' : 'Compact';
}

function documentLabel(label: string | undefined): string {
  return `${label ?? 'Sheet'} document`;
}
