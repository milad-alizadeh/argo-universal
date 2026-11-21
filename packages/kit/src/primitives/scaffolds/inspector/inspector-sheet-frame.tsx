import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Sheet } from '#primitives/overlays/sheet';
import type { InspectorProps } from './inspector-props';
import { inspectorSearch } from './inspector-search';

interface InspectorSheetFrameProps {
  inspector: InspectorProps;
  // The sheet page's own header title, where the platform's sheet draws one.
  screenTitle?: string;
  children: ReactNode;
}

// The Inspector's sheet, at its medium detent first, with one page for its content; a page there can push more.
export function InspectorSheetFrame({
  inspector,
  screenTitle,
  children,
}: InspectorSheetFrameProps): ReactElement {
  return (
    <Sheet {...sheetProps(inspector)}>
      <Sheet.Screen
        name="inspector"
        title={screenTitle}
        closeLabel={inspector.closeLabel}
        action={fixedCloseAction(inspector)}
        search={inspectorSearch(inspector)}
        keepsHeaderInset
      >
        {children}
      </Sheet.Screen>
    </Sheet>
  );
}

// Fixed native sheets close through the toolbar even though swipe dismissal is disabled.
function fixedCloseAction(
  inspector: InspectorProps,
): React.ComponentProps<typeof Sheet.Screen>['action'] {
  if (Platform.OS === 'web' || inspector.scrollable !== false) return undefined;

  return {
    label: inspector.closeLabel ?? 'Close',
    onPress: () => inspector.onOpenChange(false),
  };
}

const sheetProps = ({
  open,
  onOpenChange,
  title,
  sheetHeader,
  scrollable,
}: InspectorProps): Omit<React.ComponentProps<typeof Sheet>, 'children'> => ({
  open,
  onOpenChange,
  label: title,
  detents: scrollable === false ? ['large'] : sheetDetents,
  dismissible: scrollable === false ? false : undefined,
  floating: sheetHeader !== undefined,
  contentScrolls: true,
});

const sheetDetents: ('medium' | 'large')[] = ['medium', 'large'];
