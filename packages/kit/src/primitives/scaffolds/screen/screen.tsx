import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#kit/scroll-column';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import {
  ActionShortcutScope,
  ShortcutAnchor,
} from '#primitives/actions/action';
import { SvgBudget } from '#primitives/visual';
import { ScreenAccessory } from './screen-accessory';
import { useScreenColumn } from './screen-column';
import { ScreenHeading } from './screen-heading';
import { ScreenNavigation } from './screen-navigation';
import { screenPrimaryAction } from './screen-primary-action';
import type { ScreenProps } from './screen-props';
import { useScreenHeader, type ScreenHeader } from './use-screen-header';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Screen(props: ScreenProps): ReactElement {
  return (
    <SvgBudget>
      <ActionShortcutScope>
        <ScreenSurface {...props} />
      </ActionShortcutScope>
    </SvgBudget>
  );
}

// The Screen declares its header from its props; its content adds none.
function ScreenSurface(props: ScreenProps): ReactElement {
  const header = useScreenHeader(props);

  // Web: the window paints the content colour, so the sidebar's shadow falls on it uncovered.
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent"
    >
      <ShortcutAnchors header={header} />
      <ScreenNavigation {...props} header={header} />
      <ScreenHeading {...props} header={header} />
      <ScreenBody {...props} />
      <ScreenAccessory {...props} />
    </View>
  );
}

// The Actions' shortcuts run while their node is shown, so each keeps an empty one, out of the Screen's layout, ahead of the content's.
function ShortcutAnchors({ header }: { header: ScreenHeader }): ReactElement {
  return (
    <View className="absolute">
      {header.anchors.map((id) => (
        <ShortcutAnchor key={id} id={id} />
      ))}
    </View>
  );
}

function ScreenBody(props: ScreenProps): ReactElement {
  const { column, className } = useScreenBody(props);

  return (
    <View className={className}>
      <ScrollColumnContext value={column}>{props.children}</ScrollColumnContext>
    </View>
  );
}

function useScreenBody(props: ScreenProps): ScreenBodyStyle {
  const wide = useWide();
  const inherited = use(ScrollColumnContext);
  const column = useScreenColumn();

  return {
    column: wide ? column : inherited,
    className: bodyClass(props, wide),
  };
}

interface ScreenBodyStyle {
  column: React.ContextType<typeof ScrollColumnContext>;
  className: string;
}

function bodyClass(props: ScreenProps, wide: boolean): string {
  return cn(
    'min-h-0 flex-1',
    !wide && hasFab(props) && 'android:pb-safe-offset-22',
  );
}

// Android's FAB, which the body's end clears; an unavailable primary Action shows none.
function hasFab(props: ScreenProps): boolean {
  const action = screenPrimaryAction(props);

  return Boolean(action && !action.disabled);
}
